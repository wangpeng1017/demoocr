import { z } from "zod";
import type { ProductItem } from "./types";

const ProductSchema = z.object({
  product_name: z.string().catch(""),
  price: z.string().catch(""),
});

export function parseProductsJSON(text: string): ProductItem[] {
  if (!text) return [];
  // Try to extract JSON array from possible wrapping text
  const match = text.match(/\[([\s\S]*)\]/);
  let json = text;
  if (match) json = `[${match[1]}]`;
  try {
    const data = JSON.parse(json);
    const arr = z.array(ProductSchema).safeParse(data);
    if (arr.success) return arr.data as ProductItem[];
  } catch {}
  return [];
}

function normalizeName(s: string) {
  return s.trim().toLowerCase().replace(/[\p{P}\p{S}]+/gu, "").replace(/\s+/g, " ");
}
function normalizePrice(s: string) {
  return s.trim().replace(/\s+/g, "").replace(/,/g, "");
}

export function dedupe(items: ProductItem[]): ProductItem[] {
  const seen = new Set<string>();
  const out: ProductItem[] = [];
  for (const it of items) {
    const key = `${normalizeName(it.product_name)}|${normalizePrice(it.price)}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(it);
    }
  }
  return out;
}

