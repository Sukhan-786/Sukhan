import { sitemapCounts } from "@/lib/sitemap-data";
import { siteUrl } from "@/lib/config";
import { sitemapPaths, xmlEscape } from "@/lib/seo";
export const dynamic = "force-dynamic";
export async function GET() {
  const paths = sitemapPaths(await sitemapCounts());
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((p) => `<sitemap><loc>${xmlEscape(new URL(p, siteUrl()).href)}</loc></sitemap>`).join("")}</sitemapindex>`,
    {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
