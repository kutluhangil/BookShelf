import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Needed to parse large base64 image data
  app.use(express.json({ limit: '50mb' }));

  // AI Quote Scanner (OCR)
  app.post("/api/gemini/quote", async (req, res) => {
    try {
      const { imageBase64 } = req.body;
      if (!imageBase64) return res.status(400).json({ error: "No image provided" });
      
      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: imageBase64
            }
          },
          "Extract all the readable text from this page. Only return the text exactly as it is written in the book, nothing else."
        ]
      });

      res.json({ text: response.text });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to extract text" });
    }
  });

  // AI Recommendations
  app.post("/api/gemini/recommend", async (req, res) => {
    try {
      const { books } = req.body;
      
      const prompt = `
        Based on the following list of books I have in my library:
        ${JSON.stringify(books.map((b: any) => ({ title: b.title, author: b.author, genre: b.tags })))},
        Please recommend 3 new books that I might enjoy. Return the response in a structured JSON format with a 'recommendations' array containing objects with 'title', 'author', and 'reason' (a 1-sentence reason why).
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      res.json({ data: response.text });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to generate recommendations" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
