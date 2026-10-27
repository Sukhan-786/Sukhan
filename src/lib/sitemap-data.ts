import "server-only";
import { createPublicClient } from "./supabase/public";
import { sampleKalam } from "./sample";
export async function sitemapCounts() {
  const db = createPublicClient();
  if (!db) return { poetry: sampleKalam.length, dictionary: 0 };
  const { data, error } = await db.rpc("sitemap_counts");
  if (error) throw Error("Sitemap counts could not be loaded.");
  return data as { poetry: number; dictionary: number };
}
export async function sitemapPage(kind: "poetry" | "dictionary", page: number) {
  const db = createPublicClient();
  if (!db)
    return kind === "poetry" && page === 0
      ? sampleKalam.map((k) => ({
          path: `/kalam/${k.slug}`,
          updated_at: k.updated_at,
        }))
      : [];
  if (kind === "poetry") {
    const { data, error } = await db.rpc("sitemap_poetry", {
      page_number: page,
    });
    if (error) throw Error("Poetry sitemap could not be loaded.");
    return (data as { slug: string; updated_at: string }[]).map((k) => ({
      path: `/kalam/${k.slug}`,
      updated_at: k.updated_at,
    }));
  }
  const { data, error } = await db
    .from("dictionary_entries")
    .select("word_id,updated_at")
    .eq("status", "published")
    .order("word_id")
    .range(page * 1000, page * 1000 + 999);
  if (error) throw Error("Dictionary sitemap could not be loaded.");
  return (data || []).map((k) => ({
    path: `/dictionary/${k.word_id}`,
    updated_at: k.updated_at,
  }));
}
