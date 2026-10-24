import type { MetadataRoute } from "next";
import { listKalam, listArtists } from "@/lib/data";
import { siteUrl } from "@/lib/config";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const works = [];
  for (let page = 1; page <= 1000; page++) {
    const batch = await listKalam({ page });
    works.push(...batch.items);
    if (!batch.hasNext) break;
  }
  const artists = await listArtists();
  return [
    ...["", "/catalogue", "/artists", "/media"].map((path) => ({
      url: new URL(path, base).href,
    })),
    ...works.map((k) => ({
      url: new URL(`/kalam/${k.slug}`, base).href,
      lastModified: k.updated_at,
    })),
    ...artists.map((a) => ({ url: new URL(`/artists/${a.slug}`, base).href })),
  ];
}
