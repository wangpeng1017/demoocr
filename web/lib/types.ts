export type ProductItem = {
  product_name: string;
  price: string;
  source?: string;
  bbox?: number[]; // [x1,y1,x2,y2] optional
};

export type ModelResultBase = {
  name: string;
  status: "fulfilled" | "rejected";
  durationMs: number;
  error?: string;
};

export type ModelResultLLM = ModelResultBase & {
  type: "llm";
  structured?: ProductItem[];
  rawText?: string;
};

export type ModelResultOCR = ModelResultBase & {
  type: "ocr";
  rawText?: string;
};

export type ProcessInput = {
  type: "image" | "video";
  filename: string;
  framesProcessed?: number;
};

export type ProcessResponse = {
  input: ProcessInput;
  models: Record<string, ModelResultLLM | ModelResultOCR>;
  aggregated: {
    items: ProductItem[];
    dedupedBy: string;
  };
};

export const MODEL_KEYS = {
  GEMINI_PRO: "gemini_pro",
  GEMINI_FLASH: "gemini_flash",
  GLM_4V: "glm_4v",
  BAIDU_OCR: "baidu_ocr",
  ALIYUN_OCR: "aliyun_ocr",
} as const;
export type ModelKey = typeof MODEL_KEYS[keyof typeof MODEL_KEYS];

