import express, { type NextFunction, type Request, type Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const PORT = Number(process.env.PORT) || 3000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

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
 * Fixed-window per-IP limiter. The Gemini endpoints are unauthenticated, so
 * without this anyone reaching the server can burn the project's API quota.
 */
function createRateLimiter(options: { windowMs: number; max: number }) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip ?? "unknown";
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

function describeError(error: unknown): { message: string; detail?: string } {
  if (error instanceof Error) {
    return { message: error.message, detail: (error as { stack?: string }).stack?.split("\n")[1]?.trim() };
  }
  return { message: String(error) };
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

  app.use(express.json({ limit: "12mb" }));

  const aiLimiter = createRateLimiter({ windowMs: 60_000, max: 20 });

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", model: GEMINI_MODEL });
  });

  // Shelf photo -> individual book spines (real recognition, replaces the old stub).
  app.post("/api/gemini/shelf", aiLimiter, async (req, res) => {
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
  app.post("/api/gemini/quote", aiLimiter, async (req, res) => {
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
  app.post("/api/gemini/recommend", aiLimiter, async (req, res) => {
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

  if (process.env.NODE_ENV !== "production") {
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
    console.log(`Server running on port ${PORT} (model: ${GEMINI_MODEL})`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
