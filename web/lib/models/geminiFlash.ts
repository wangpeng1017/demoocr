import { GoogleGenAI } from "@google/genai";
import type { ProductItem } from "../types";
import { parseProductsJSON } from "../extract";
import { PRODUCT_PROMPT } from "./gemini";

const MODEL = "gemini-2.5-flash";

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
  const resp = await ai.models.generateContent({ model: MODEL, contents });
  const text = resp.text ?? "";
  const structured = parseProductsJSON(text);
  return { structured, rawText: text };
}

