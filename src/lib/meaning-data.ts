import "server-only";
import { createHash } from "node:crypto";
import { createPublicClient } from "./supabase/public";
import { meaningColumns, type WordMeaning } from "./word-meanings";
import type { KalamText } from "./types";
export function bodyHash(body: string) {
  return createHash("sha256").update(body, "utf8").digest("hex");
}
export async function publishedMeanings(kalamId: string, texts: KalamText[]) {
  const db = createPublicClient();
  if (!db) return [];
  const { data, error } = await db
    .from("word_meanings")
    .select(meaningColumns)
    .eq("kalam_id", kalamId)
    .eq("status", "published")
    .order("start_offset")
    .limit(500);
  if (error)
    throw new Error("Word meanings could not be loaded. Please try again.");
  const hashes = new Map(texts.map((t) => [t.language, bodyHash(t.body)]));
  return ((data || []) as WordMeaning[]).filter(
    (m) => hashes.get(m.language) === m.text_hash,
  );
}
