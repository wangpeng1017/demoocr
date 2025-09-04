// GLM-4V via OpenAI-compatible API
// We will use the OpenAI SDK shape to post to Zhipu's baseURL.

export type GLMClientOptions = {
  apiKey?: string;
  baseURL?: string;
};

const DEFAULT_BASE_URL = "https://open.bigmodel.cn/api/paas/v4";

async function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

export async function callGLM4VForImageBase64(
  imageBase64: string,
  mimeType: string,
  prompt: string,
  options?: GLMClientOptions
): Promise<{ text: string }> {
  const apiKey = options?.apiKey ?? process.env.ZHIPUAI_API_KEY;
  const baseURL = options?.baseURL ?? DEFAULT_BASE_URL;
  if (!apiKey) throw new Error("Missing ZHIPUAI_API_KEY");

  const url = `${baseURL}/chat/completions`;
  const dataUri = `data:${mimeType};base64,${imageBase64}`;

  const body = {
    model: "glm-4v",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: dataUri } },
        ],
      },
    ],
  };

  let delay = 500;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      const text: string = data?.choices?.[0]?.message?.content ?? "";
      return { text };
    }
    if (res.status === 429 || res.status === 503) {
      if (attempt < 3) { await sleep(delay); delay *= 2; continue; }
    }
    throw new Error(`GLM-4V http ${res.status}`);
  }
  throw new Error("GLM-4V request failed after retries");
}

