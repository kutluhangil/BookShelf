import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { createApp } from "./src/server/app";
import { createAuth } from "./src/server/auth";

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const PORT = Number(process.env.PORT) || 3000;

if (!GEMINI_API_KEY) {
  throw new Error(
    "GEMINI_API_KEY is not set. Copy .env.example to .env and add your Gemini API key before starting the server."
  );
}

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

async function startServer() {
  const isProduction = process.env.NODE_ENV === "production";
  const trustProxy = readTrustProxy();

  if (isProduction && trustProxy === false) {
    console.warn(
      "[warn] TRUST_PROXY is not set. Behind a load balancer or reverse proxy every request then " +
        "carries the proxy's address, so the address-keyed rate limit applies to all anonymous " +
        "callers at once. Set TRUST_PROXY to the number of proxy hops in front of this server."
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

  const auth = await createAuth();
  const app = createApp({ ai, model: GEMINI_MODEL, auth, isProduction, trustProxy });

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
