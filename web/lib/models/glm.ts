// GLM-4V via OpenAI-compatible API
// We will use the OpenAI SDK shape to post to Zhipu's baseURL.

export type GLMClientOptions = {
  apiKey?: string;
  baseURL?: string;
};

const DEFAULT_BASE_URL = "https://open.bigmodel.cn/api/paas/v4";

export async function callGLM4VForImageBase64(
  imageBase64: string,
  mimeType: string,
  prompt: string,
  options?: GLMClientOptions
): Promise<{ text: string }> {
  const apiKey = options?.apiKey ?? process.env.ZHIPUAI_API_KEY;
  const baseURL = options?.baseURL ?? DEFAULT_BASE_URL;
  if (!apiKey) throw new Error("Missing ZHIPUAI_API_KEY");

  // OpenAI-compatible chat completions endpoint
  const url = `${baseURL}/chat/completions`;

  // Many OpenAI-compatible providers accept content with image_url or base64
  // Here we use base64 data URI to be safe.
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

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GLM-4V http ${res.status}`);
  const data = await res.json();
  const text: string = data?.choices?.[0]?.message?.content ?? "";
  return { text };
}

