import type { MetadataRoute } from "next";
import { listArtists } from "@/lib/data";
import { sitemapPage } from "@/lib/sitemap-data";
import { siteUrl } from "@/lib/config";
// A small core sitemap. The index and numbered metadata-only sitemaps cover the complete library.
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [artists, first] = await Promise.all([
      listArtists(),
      sitemapPage("poetry", 0),
    ]),
    base = siteUrl();
  return [
    ...[
      "/",
      "/catalogue",
      "/artists",
      "/media",
      "/dictionary",
      "/poetry-sources",
    ].map((p) => ({ url: new URL(p, base).href })),
    ...artists.map((a) => ({ url: new URL(`/artists/${a.slug}`, base).href })),
    ...first.map((k) => ({
      url: new URL(k.path, base).href,
      lastModified: k.updated_at,
    })),
  ];
}
