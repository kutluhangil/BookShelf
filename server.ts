import express, { type NextFunction, type Request, type Response } from "express";
import path from "path";
import compression from "compression";
import helmet from "helmet";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { createAuth } from "./src/server/auth";

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const PORT = Number(process.env.PORT) || 3000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** Image uploads need room for the base64 payload; every other route does not. */
const IMAGE_BODY_LIMIT = "12mb";
const JSON_BODY_LIMIT = "256kb";

if (!GEMINI_API_KEY) {
  throw new Error(
    "GEMINI_API_KEY is not set. Copy .env.example to .env and add your Gemini API key before starting the server."
  );
}

const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "bookshelf-server",
    },
  },
});

/**
 * Express derives `req.ip` from the socket unless it is told how many proxies
 * sit in front of it. Behind a load balancer every request then carries the
 * proxy's address, so a per-IP rate limit degrades into one shared bucket for
 * the whole internet. Trusting `X-Forwarded-For` unconditionally is the
 * opposite mistake — any client could then forge its own address — so the hop
 * count is configuration, not a guess.
 */
function readTrustProxy(): boolean | number | string {
  const raw = process.env.TRUST_PROXY?.trim();
  if (!raw) return false;
  if (raw === "true") return true;
  if (raw === "false") return false;
  const hops = Number(raw);
  if (Number.isInteger(hops) && hops >= 0) return hops;
  // Anything else is passed through verbatim: Express also accepts subnet
  // names ("loopback", "uniquelocal") and comma-separated CIDR lists.
  return raw;
}

/**
 * Fixed-window limiter for the paid Gemini endpoints.
 *
 * The bucket is keyed by user id whenever the request is authenticated: the
 * quota belongs to the account that spends it, and keying by address alone
 * lets one account burn the project's quota from many addresses while placing
 * everyone behind a shared NAT in the same bucket. The address is only the
 * fallback for the development mode where authentication is off.
 */
function createRateLimiter(options: { windowMs: number; max: number }) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  // Without pruning, the map keeps one entry per client for the lifetime of
  // the process and grows without bound.
  const sweeper = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }, options.windowMs);
  sweeper.unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.user?.uid ? `uid:${req.user.uid}` : `ip:${req.ip ?? "unknown"}`;
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + options.windowMs });
      next();
      return;
    }

    entry.count += 1;
    if (entry.count > options.max) {
      const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.status(429).json({
        error: "Rate limit exceeded",
        detail: `Max ${options.max} AI requests per ${options.windowMs / 1000}s. Retry in ${retryAfterSeconds}s.`,
      });
      return;
    }
    next();
  };
}

/** Client-side input problems, so they map to 400 instead of an upstream 502. */
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * The `hint` is the first stack frame, which names a file inside this server.
 * It is genuinely useful while developing and is an information leak in
 * production, so it is only produced outside production.
 */
function describeError(error: unknown): { message: string; detail?: string } {
  if (!(error instanceof Error)) return { message: String(error) };
  if (process.env.NODE_ENV === "production") return { message: error.message };
  return { message: error.message, detail: error.stack?.split("\n")[1]?.trim() };
}

/** Rejects payloads that are missing, malformed, or too large, with an actionable message. */
function readImageBase64(req: Request): string {
  const { imageBase64 } = req.body ?? {};
  if (typeof imageBase64 !== "string" || imageBase64.length === 0) {
    throw new ValidationError("Request body must contain a non-empty `imageBase64` string (raw base64, no data: prefix).");
  }
  const payload = imageBase64.includes(",") ? imageBase64.slice(imageBase64.indexOf(",") + 1) : imageBase64;
  const approximateBytes = (payload.length * 3) / 4;
  if (approximateBytes > MAX_IMAGE_BYTES) {
    throw new ValidationError(
      `Image is ~${Math.round(approximateBytes / 1024 / 1024)}MB, the limit is ${MAX_IMAGE_BYTES / 1024 / 1024}MB. Capture at a lower resolution.`
    );
  }
  return payload;
}

/** Gemini may wrap JSON in a markdown fence even in JSON mode; unwrap defensively. */
function parseJsonResponse<T>(text: string | undefined, context: string): T {
  if (!text) throw new Error(`${context}: Gemini returned an empty response.`);
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : text).trim();
  try {
    return JSON.parse(candidate) as T;
  } catch (error) {
    throw new Error(`${context}: Gemini response was not valid JSON. Raw response: ${candidate.slice(0, 400)}`);
  }
}

async function startServer() {
  const app = express();
  const isProduction = process.env.NODE_ENV === "production";

  const trustProxy = readTrustProxy();
  app.set("trust proxy", trustProxy);
  if (isProduction && trustProxy === false) {
    console.warn(
      "[warn] TRUST_PROXY is not set. Behind a load balancer or reverse proxy every request then " +
        "carries the proxy's address, so the address-keyed rate limit applies to all anonymous " +
        "callers at once. Set TRUST_PROXY to the number of proxy hops in front of this server."
    );
  }

  app.use(
    helmet({
      // Google sign-in runs in a popup that posts its result back to this
      // window; the default `same-origin` opener policy severs that channel.
      crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
      // Book covers come from Open Library, so the default `same-origin`
      // resource policy would block them.
      crossOriginResourcePolicy: { policy: "cross-origin" },
      // Vite's dev middleware serves inline module scripts and needs `eval`
      // for HMR, so this policy only describes the built application.
      contentSecurityPolicy: isProduction
        ? {
            directives: {
              "default-src": ["'self'"],
              // The built index.html references every script by URL; nothing
              // is inlined, so no hash or nonce is needed here.
              "script-src": ["'self'"],
              // Tailwind ships a stylesheet, but Motion animates through inline
              // `style` attributes, which this directive also governs.
              "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
              "font-src": ["'self'", "https://fonts.gstatic.com"],
              // data: and blob: cover the camera frames and the per-spine crops
              // the scanner draws locally.
              "img-src": [
                "'self'",
                "data:",
                "blob:",
                "https://covers.openlibrary.org",
                "https://images.unsplash.com",
                "https://lh3.googleusercontent.com",
              ],
              "connect-src": [
                "'self'",
                "https://openlibrary.org",
                "https://*.googleapis.com",
                "https://*.google.com",
                "wss://*.firebaseio.com",
              ],
              // The Firebase auth helper iframe.
              "frame-src": ["'self'", "https://*.firebaseapp.com", "https://*.google.com"],
              // The service worker registered by the PWA plugin.
              "worker-src": ["'self'", "blob:"],
              "object-src": ["'none'"],
              "base-uri": ["'self'"],
              "frame-ancestors": ["'self'"],
            },
          }
        : false,
    })
  );
  app.use(compression());

  // Only the two image endpoints may receive a multi-megabyte body. Parsing is
  // mounted per route rather than globally so an unauthenticated caller cannot
  // make the server buffer 12MB on any path it likes.
  const imageBody = express.json({ limit: IMAGE_BODY_LIMIT });
  const jsonBody = express.json({ limit: JSON_BODY_LIMIT });

  const aiLimiter = createRateLimiter({ windowMs: 60_000, max: 20 });
  const auth = await createAuth();

  // The client reads this to know whether it must send an ID token before
  // offering the AI-backed features.
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", model: GEMINI_MODEL, authRequired: auth.mode === "firebase" });
  });

  // Shelf photo -> individual book spines (real recognition, replaces the old stub).
  app.post("/api/gemini/shelf", auth.middleware, aiLimiter, imageBody, async (req, res) => {
    try {
      const imageBase64 = readImageBase64(req);

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          {
            inlineData: { mimeType: "image/jpeg", data: imageBase64 },
          },
          `You are a librarian digitizing a photo of a physical bookshelf.
Identify every book spine visible, ordered left to right.
For each spine return:
- "rawText": the text you can actually read on the spine, verbatim
- "title": your best guess of the book title (empty string if unreadable)
- "author": your best guess of the author (empty string if unreadable)
- "publisher": publisher if printed on the spine, else empty string
- "year": publication year as a number if printed, else null
- "dominantColor": the spine's dominant colour as a #RRGGBB hex string
- "confidence": a number from 0 to 1 for how sure you are of the title/author match
- "bbox": {"x","y","width","height"} as percentages (0-100) of the image, describing the spine's bounding box
Return JSON: {"spines": [...]}. Never invent books you cannot see. If a spine is unreadable, still return it with empty title/author and a low confidence.`,
        ],
        config: { responseMimeType: "application/json" },
      });

      const data = parseJsonResponse<{ spines: unknown[] }>(response.text, "Shelf recognition");
      res.json(data);
    } catch (error) {
      const { message, detail } = describeError(error);
      console.error("[/api/gemini/shelf]", error);
      if (error instanceof ValidationError) {
        res.status(400).json({ error: "Invalid request", detail: message });
        return;
      }
      res.status(502).json({ error: "Shelf recognition failed", detail: message, hint: detail });
    }
  });

  // Book page photo -> quote text (OCR).
  app.post("/api/gemini/quote", auth.middleware, aiLimiter, imageBody, async (req, res) => {
    try {
      const imageBase64 = readImageBase64(req);

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          { inlineData: { mimeType: "image/jpeg", data: imageBase64 } },
          "Extract all the readable text from this book page. Return the text exactly as printed, nothing else. If no text is legible, return an empty string.",
        ],
      });

      const text = response.text?.trim() ?? "";
      if (!text) {
        res.status(422).json({ error: "No text detected", detail: "The model could not read any text in this frame." });
        return;
      }
      res.json({ text });
    } catch (error) {
      const { message, detail } = describeError(error);
      console.error("[/api/gemini/quote]", error);
      if (error instanceof ValidationError) {
        res.status(400).json({ error: "Invalid request", detail: message });
        return;
      }
      res.status(502).json({ error: "Text extraction failed", detail: message, hint: detail });
    }
  });

  // Library -> personalised recommendations.
  app.post("/api/gemini/recommend", auth.middleware, aiLimiter, jsonBody, async (req, res) => {
    try {
      const { books } = req.body ?? {};
      if (!Array.isArray(books) || books.length === 0) {
        res.status(400).json({ error: "Invalid request", detail: "`books` must be a non-empty array." });
        return;
      }

      // Only send the fields the model needs; covers and notes are private and irrelevant.
      const summary = books.slice(0, 200).map((book: Record<string, unknown>) => ({
        title: book.title,
        author: book.author,
        category: book.category,
        tags: book.tags,
        status: book.status,
      }));

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: `These are the books in my library: ${JSON.stringify(summary)}.
Recommend 5 books I do not already own that I would likely enjoy.
Return JSON: {"recommendations":[{"title","author","year","category","reason"}]} where "reason" is one sentence explaining the match.`,
        config: { responseMimeType: "application/json" },
      });

      const data = parseJsonResponse<{ recommendations: unknown[] }>(response.text, "Recommendations");
      res.json(data);
    } catch (error) {
      const { message, detail } = describeError(error);
      console.error("[/api/gemini/recommend]", error);
      res.status(502).json({ error: "Recommendation generation failed", detail: message, hint: detail });
    }
  });

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT} (model: ${GEMINI_MODEL}, auth: ${auth.mode})`);
    if (auth.mode === "disabled") {
      console.warn(
        "[warn] Auth is disabled: the Gemini endpoints are open to anyone who can reach this server. " +
          "This is only allowed outside production."
      );
    }
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
