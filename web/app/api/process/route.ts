import { NextRequest, NextResponse } from "next/server";
import { MODEL_KEYS, type ModelResultLLM, type ModelResultOCR, type ProcessResponse, type ProductItem } from "@/lib/types";
import { callGeminiProForImageBytes, PRODUCT_PROMPT } from "@/lib/models/gemini";
import { callGeminiFlashForImageBytes } from "@/lib/models/geminiFlash";
import { callGLM4VForImageBase64 } from "@/lib/models/glm";
import { callBaiduOCR } from "@/lib/models/baidu";
import { callAliyunOCRPlaceholder } from "@/lib/models/aliyun";
import { dedupe } from "@/lib/extract";

export const runtime = "nodejs";
export const preferredRegion = ["iad1"]; // example

const DEFAULT_FPS = Number(process.env.EXTRACT_FPS ?? 1);
const DEFAULT_MAX_FRAMES = Number(process.env.EXTRACT_MAX_FRAMES ?? 10);

function isVideo(mime: string) {
  return mime.startsWith("video/");
}
function isImage(mime: string) {
  return mime.startsWith("image/");
}

async function fileToBytes(file: File): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const mimeType = file.type || "application/octet-stream";
  const filename = file.name || "upload";

  // Video: extract frames and run frame-level parallel recognition
  if (isVideo(mimeType)) {
    try {
      const { extractFramesFromVideo } = await import("@/lib/video");
      const bytes = await fileToBytes(file);
      const frames = await extractFramesFromVideo(bytes, { fps: DEFAULT_FPS, maxFrames: DEFAULT_MAX_FRAMES });

      // Per-frame parallel tasks for LLM models only (OCR可考虑后续优化处理多帧合并)
      const perFrame = await Promise.all(
        frames.map(async (frame) => {
          const mime = "image/jpeg";
          const base64 = Buffer.from(frame).toString("base64");
          return Promise.allSettled([
            (async () => {
              const { structured, rawText } = await callGeminiProForImageBytes(frame, mime, PRODUCT_PROMPT);
              return { key: MODEL_KEYS.GEMINI_PRO, structured, rawText };
            })(),
            (async () => {
              const { structured, rawText } = await callGeminiFlashForImageBytes(frame, mime);
              return { key: MODEL_KEYS.GEMINI_FLASH, structured, rawText };
            })(),
            (async () => {
              const { text } = await callGLM4VForImageBase64(base64, mime, PRODUCT_PROMPT);
              const { parseProductsJSON } = await import("@/lib/extract");
              const structured = parseProductsJSON(text);
              return { key: MODEL_KEYS.GLM_4V, structured, rawText: text };
            })(),
            (async () => {
              const { rawText } = await callBaiduOCR(frame, mime);
              return { key: MODEL_KEYS.BAIDU_OCR, structured: [], rawText };
            })(),
            (async () => {
              const { rawText } = await callAliyunOCRPlaceholder(frame, mime);
              return { key: MODEL_KEYS.ALIYUN_OCR, structured: [], rawText };
            })(),
          ]);
        })
      );

      // Aggregate across frames by model
      const models: ProcessResponse["models"] = {};
      const aggStructured: ProductItem[] = [];

      const modelMeta: Record<string, { name: string; type: "llm" | "ocr" }> = {
        [MODEL_KEYS.GEMINI_PRO]: { name: "Gemini 2.5 Pro", type: "llm" },
        [MODEL_KEYS.GEMINI_FLASH]: { name: "Gemini 2.5 Flash", type: "llm" },
        [MODEL_KEYS.GLM_4V]: { name: "GLM-4V", type: "llm" },
        [MODEL_KEYS.BAIDU_OCR]: { name: "百度 OCR", type: "ocr" },
        [MODEL_KEYS.ALIYUN_OCR]: { name: "阿里云 OCR", type: "ocr" },
      };

      for (const frameResults of perFrame) {
        for (const r of frameResults) {
          if (r.status === "fulfilled") {
            const { key, structured, rawText } = r.value as any;
            const meta = modelMeta[key];
            if (!models[key]) models[key] = { name: meta.name, type: meta.type, status: "fulfilled", durationMs: 0 } as any;
            if (structured?.length) aggStructured.push(...structured);
            if (rawText) {
              const prev = (models[key] as any).rawText as string | undefined;
              (models[key] as any).rawText = prev ? `${prev}\n---\n${rawText}` : rawText;
            }
          } else {
            // mark failure for that model (frame-level), but keep others
          }
        }
      }

      const response: ProcessResponse = {
        input: { type: "video", filename, framesProcessed: frames.length },
        models,
        aggregated: { items: dedupe(aggStructured), dedupedBy: "name+price" },
      };
      return NextResponse.json(response);
    } catch (e: any) {
      return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
    }
  }

  if (!isImage(mimeType)) {
    return NextResponse.json({ error: `Unsupported mime type: ${mimeType}` }, { status: 400 });
  }

  const bytes = await fileToBytes(file);

  // Parallel calls: 5 models
  const tasks = {
    [MODEL_KEYS.GEMINI_PRO]: (async () => {
      const start = Date.now();
      try {
        const { structured, rawText } = await callGeminiProForImageBytes(bytes, mimeType, PRODUCT_PROMPT);
        const durationMs = Date.now() - start;
        return { name: "Gemini 2.5 Pro", type: "llm", status: "fulfilled", durationMs, structured, rawText } satisfies ModelResultLLM;
      } catch (e: any) {
        return { name: "Gemini 2.5 Pro", type: "llm", status: "rejected", durationMs: Date.now() - start, error: e?.message ?? String(e) } satisfies ModelResultLLM;
      }
    })(),
    [MODEL_KEYS.GEMINI_FLASH]: (async () => {
      const start = Date.now();
      try {
        const { structured, rawText } = await callGeminiFlashForImageBytes(bytes, mimeType);
        const durationMs = Date.now() - start;
        return { name: "Gemini 2.5 Flash", type: "llm", status: "fulfilled", durationMs, structured, rawText } satisfies ModelResultLLM;
      } catch (e: any) {
        return { name: "Gemini 2.5 Flash", type: "llm", status: "rejected", durationMs: Date.now() - start, error: e?.message ?? String(e) } satisfies ModelResultLLM;
      }
    })(),
    [MODEL_KEYS.GLM_4V]: (async () => {
      const start = Date.now();
      try {
        const base64 = Buffer.from(bytes).toString("base64");
        const { text } = await callGLM4VForImageBase64(base64, mimeType, PRODUCT_PROMPT);
        const durationMs = Date.now() - start;
        const { parseProductsJSON } = await import("@/lib/extract");
        const structured = parseProductsJSON(text);
        return { name: "GLM-4V", type: "llm", status: "fulfilled", durationMs, structured, rawText: text } satisfies ModelResultLLM;
      } catch (e: any) {
        return { name: "GLM-4V", type: "llm", status: "rejected", durationMs: Date.now() - start, error: e?.message ?? String(e) } satisfies ModelResultLLM;
      }
    })(),
    [MODEL_KEYS.BAIDU_OCR]: (async () => {
      const start = Date.now();
      try {
        const { rawText } = await callBaiduOCR(bytes, mimeType);
        const durationMs = Date.now() - start;
        return { name: "百度 OCR", type: "ocr", status: "fulfilled", durationMs, rawText } satisfies ModelResultOCR;
      } catch (e: any) {
        return { name: "百度 OCR", type: "ocr", status: "rejected", durationMs: Date.now() - start, error: e?.message ?? String(e) } satisfies ModelResultOCR;
      }
    })(),
    [MODEL_KEYS.ALIYUN_OCR]: (async () => {
      const start = Date.now();
      try {
        const { rawText } = await callAliyunOCRPlaceholder(bytes, mimeType);
        const durationMs = Date.now() - start;
        return { name: "阿里云 OCR", type: "ocr", status: "fulfilled", durationMs, rawText } satisfies ModelResultOCR;
      } catch (e: any) {
        return { name: "阿里云 OCR", type: "ocr", status: "rejected", durationMs: Date.now() - start, error: e?.message ?? String(e) } satisfies ModelResultOCR;
      }
    })(),
  } as const;

  const settled = await Promise.allSettled(Object.values(tasks));
  const modelKeys = Object.keys(tasks) as (keyof typeof tasks)[];
  const models: ProcessResponse["models"] = {};

  let aggregated: ProductItem[] = [];

  settled.forEach((res, idx) => {
    const key = modelKeys[idx] as string;
    if (res.status === "fulfilled") {
      const val = res.value as ModelResultLLM | ModelResultOCR;
      models[key] = val;
      if ((val as any).structured) aggregated.push(...((val as any).structured as ProductItem[]));
    } else {
      const err = res.reason as Error;
      models[key] = {
        name: key,
        type: key === MODEL_KEYS.BAIDU_OCR ? "ocr" : "llm",
        status: "rejected",
        durationMs: 0,
        error: err?.message ?? String(err),
      } as any;
    }
  });

  aggregated = dedupe(aggregated);

  const response: ProcessResponse = {
    input: { type: "image", filename },
    models,
    aggregated: { items: aggregated, dedupedBy: "name+price" },
  };

  return NextResponse.json(response);
}

