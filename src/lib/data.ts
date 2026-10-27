import "server-only";
import { createPublicClient } from "./supabase/public";
import { sampleArtists, sampleKalam } from "./sample";
import { searchKalam } from "./validation";
import type { Artist, Kalam, Media } from "./types";
const selection =
  "*,texts:kalam_texts(*),poet:artists!poet_id(*),links:kalam_media(media:media(*,performer:artists!performer_id(*)))";
type KalamRow = Omit<Kalam, "media"> & { links: { media: Media | null }[] };
function mapKalam(row: KalamRow): Kalam {
  return {
    ...row,
    texts: row.texts || [],
    media: (row.links || []).flatMap((l) => (l.media ? [l.media] : [])),
  };
}
export async function listKalam(
  filters: {
    q?: string;
    form?: string;
    poet?: string;
    kind?: string;
    page?: number;
    language?: string;
  } = {},
) {
  const db = createPublicClient();
  const page = Math.max(1, Math.min(filters.page || 1, 10000));
  if (!db) {
    let items = searchKalam(sampleKalam, filters.q || "");
    if (filters.language)
      items = items.filter((k) =>
        k.texts.some((t) => t.language === filters.language),
      );
    if (filters.form) items = items.filter((k) => k.form === filters.form);
    if (filters.poet) items = items.filter((k) => k.poet_id === filters.poet);
    if (filters.kind)
      items = items.filter((k) => k.media.some((m) => m.kind === filters.kind));
    return {
      items: items.slice((page - 1) * 24, page * 24),
      hasNext: items.length > page * 24,
    };
  }
  const query = db
    .rpc("search_library_page", {
      page_number: page,
      filter_language: filters.language || null,
      search_query: (filters.q || "").slice(0, 160),
      filter_form: filters.form || null,
      filter_poet: filters.poet || null,
      filter_kind: filters.kind || null,
    })
    .select(selection)
    .order("created_at", { ascending: false })
    .order("id");
  const { data, error } = await query;
  if (error)
    throw new Error("The library could not be loaded. Please try again.");
  const rows = (data || []) as unknown as KalamRow[];
  return { items: rows.slice(0, 24).map(mapKalam), hasNext: rows.length > 24 };
}
export async function getKalam(slug: string) {
  const db = createPublicClient();
  if (!db) return sampleKalam.find((k) => k.slug === slug) || null;
  const { data, error } = await db
    .from("kalam")
    .select(selection)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw new Error("Unable to load this work.");
  return data ? mapKalam(data as unknown as KalamRow) : null;
}
export async function listArtists() {
  const db = createPublicClient();
  if (!db) return sampleArtists;
  const { data, error } = await db
    .from("artists")
    .select("*")
    .eq("status", "published")
    .order("name")
    .limit(200);
  if (error) throw new Error("Unable to load artists.");
  return data as Artist[];
}
export async function getArtist(slug: string) {
  const db = createPublicClient();
  if (!db) return sampleArtists.find((a) => a.slug === slug) || null;
  const { data, error } = await db
    .from("artists")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw new Error("Unable to load this artist.");
  return data as Artist | null;
}
export async function listMedia(kind?: string, performerId?: string) {
  const db = createPublicClient();
  if (!db) return [];
  let query = db
    .from("media")
    .select("*,performer:artists!performer_id(*)")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(48);
  if (kind) query = query.eq("kind", kind);
  if (performerId) query = query.eq("performer_id", performerId);
  const { data, error } = await query;
  if (error) throw new Error("Unable to load media.");
  return data as Media[];
}

export async function homepageKalam(language?: string, ids: string[] = []) {
  const db = createPublicClient();
  if (!db)
    return sampleKalam.filter((k) =>
      ids.length
        ? ids.includes(k.id)
        : !language || k.texts.some((t) => t.language === language),
    );
  const { data, error } = await db
    .rpc("homepage_kalam", {
      feed_language: language || null,
      requested_ids: ids.slice(0, 144),
    })
    .select(selection)
    .limit(ids.length ? 144 : 24);
  if (error) throw Error("The homepage poetry could not be loaded.");
  return ((data || []) as unknown as KalamRow[]).map(mapKalam);
}
