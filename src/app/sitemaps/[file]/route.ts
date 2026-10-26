import { sitemapPage } from "@/lib/sitemap-data";
import { siteUrl } from "@/lib/config";
import { xmlEscape } from "@/lib/seo";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params,
    match = /^(poetry|dictionary)-(0|[1-9][0-9]{0,3})\.xml$/.exec(file);
  if (!match) return new Response("Not found", { status: 404 });
  const items = await sitemapPage(
    match[1] as "poetry" | "dictionary",
    Number(match[2]),
  );
  if (!items.length) return new Response("Not found", { status: 404 });
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items.map((i) => `<url><loc>${xmlEscape(new URL(i.path, siteUrl()).href)}</loc><lastmod>${xmlEscape(new Date(i.updated_at).toISOString())}</lastmod></url>`).join("")}</urlset>`,
    {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
