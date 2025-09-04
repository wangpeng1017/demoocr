import { GoogleGenAI } from "@google/genai";
import type { ProductItem } from "../types";
import { parseProductsJSON } from "../extract";

const MODEL = "gemini-2.5-pro"; // per PRD first stage

export async function callGeminiProForImageBytes(
  imageBytes: Uint8Array,
  mimeType: string,
  prompt: string
): Promise<{ structured: ProductItem[]; rawText?: string }> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("Missing GOOGLE_API_KEY");
  const ai = new GoogleGenAI({ apiKey });

  const contents = [
    { inlineData: { mimeType, data: Buffer.from(imageBytes).toString("base64") } },
    { text: prompt },
  ];
  const resp = await ai.models.generateContent({ model: MODEL, contents });
  const text = resp.text ?? "";
  const structured = parseProductsJSON(text);
  return { structured, rawText: text };
}

export const PRODUCT_PROMPT = `你是一名信息抽取助手。请从提供的图像中识别全部“商品标签”，并提取以下字段，严格输出为 JSON 数组，无任何附加说明或注释：
[
  { "product_name": "商品A", "price": "19.99" }
]
要求：
- product_name：字符串；尽量与标签文本一致，去除无关描述
- price：字符串；保留货币符号（如￥、¥、RMB 或 $），或保留数字（如 8.50）；未知返回空字符串 ""
- 若图中没有商品标签，返回 []
请仅输出 JSON 数组，不要输出其它任何文字。`;

