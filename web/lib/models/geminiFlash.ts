import { GoogleGenAI } from "@google/genai";
import type { ProductItem } from "../types";
import { parseProductsJSON } from "../extract";
import { PRODUCT_PROMPT } from "./gemini";

// Allow override via env (GEMINI_FLASH_MODEL). Default to GA-dev API identifier.
const DEFAULT_MODEL = process.env.GEMINI_FLASH_MODEL?.trim() || "gemini-2.5-flash";

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function callGeminiFlashForImageBytes(
  imageBytes: Uint8Array,
  mimeType: string
): Promise<{ structured: ProductItem[]; rawText?: string }> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("Missing GOOGLE_API_KEY");
  const ai = new GoogleGenAI({ apiKey });

  const contents = [
    { inlineData: { mimeType, data: Buffer.from(imageBytes).toString("base64") } },
    { text: PRODUCT_PROMPT },
  ];

  // Retry with exponential backoff on 503/429 or transient network errors
  const modelsToTry = [DEFAULT_MODEL];
  // If user mistakenly provides Vertex-style name like "models/gemini-2.5-flash-image-preview",
  // also allow trying the plain id without the leading "models/".
  if (DEFAULT_MODEL.startsWith("models/")) {
    const plain = DEFAULT_MODEL.replace(/^models\//, "");
    if (!modelsToTry.includes(plain)) modelsToTry.push(plain);
  }

  let lastErr: any = null;
  for (const model of modelsToTry) {
    let delay = 500;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const resp = await ai.models.generateContent({ model, contents });
        const text = resp.text ?? "";
        const structured = parseProductsJSON(text);
        return { structured, rawText: text };
      } catch (e: any) {
        lastErr = e;
        const msg = (e?.message || "").toLowerCase();
        const code = (e?.error?.code || e?.status || "").toString();
        const transient = msg.includes("unavailable") || msg.includes("overloaded") || msg.includes("retry") || code === "503" || code === "429";
        if (attempt < 3 && transient) {
          await sleep(delay);
          delay *= 2;
          continue;
        }
        break;
      }
    }
  }
  throw lastErr ?? new Error("Gemini Flash request failed");
}

