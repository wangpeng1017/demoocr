// Minimal Baidu OCR via REST requires access_token. In production, cache token.
async function fetchAccessToken(apiKey: string, secretKey: string) {
  const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${encodeURIComponent(
    apiKey
  )}&client_secret=${encodeURIComponent(secretKey)}`;
  const res = await fetch(url, { method: "POST" });
  if (!res.ok) throw new Error(`Baidu token http ${res.status}`);
  const data = (await res.json()) as { access_token?: string; error?: string };
  if (!data.access_token) throw new Error(`Baidu token error: ${data.error}`);
  return data.access_token;
}

export async function callBaiduOCR(imageBytes: Uint8Array) {
  const API_KEY = process.env.BAIDU_OCR_API_KEY;
  const SECRET_KEY = process.env.BAIDU_OCR_SECRET_KEY;
  if (!API_KEY || !SECRET_KEY) throw new Error("Missing Baidu OCR credentials");

  const token = await fetchAccessToken(API_KEY, SECRET_KEY);
  const url = `https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic?access_token=${token}`;
  const body = new URLSearchParams();
  body.set("image", Buffer.from(imageBytes).toString("base64"));
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`Baidu OCR http ${res.status}`);
  const data = await res.json();
  // Combine words_result into rawText
  const rawText = Array.isArray(data?.words_result)
    ? data.words_result.map((x: any) => x.words).join("\n")
    : JSON.stringify(data);
  return { rawText } as { rawText: string };
}

