import "server-only";
import { createPublicClient } from "./supabase/public";
import { bodyHash } from "./meaning-data";
import {
  translationColumns,
  type CoupletTranslation,
} from "./couplet-translations";
import type { KalamText } from "./types";
export async function publishedTranslations(
  kalamId: string,
  texts: KalamText[],
) {
  if (!texts.some((t) => t.language === "fa" || t.language === "ar")) return [];
  const db = createPublicClient();
  if (!db) return [];
  const { data, error } = await db
    .from("couplet_translations")
    .select(translationColumns)
    .eq("kalam_id", kalamId)
    .eq("status", "published")
    .order("start_offset")
    .limit(1000);
  if (error) throw Error("Passage translations could not be loaded.");
  const hashes = new Map(texts.map((t) => [t.language, bodyHash(t.body)]));
  return ((data || []) as CoupletTranslation[]).filter(
    (t) => hashes.get(t.language) === t.text_hash,
  );
}
