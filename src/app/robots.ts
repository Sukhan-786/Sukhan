import type { MetadataRoute } from "next";
import { siteUrl, supabaseConfig } from "@/lib/config";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: supabaseConfig() ? "/" : undefined,
      disallow: supabaseConfig() ? ["/admin/", "/login"] : "/",
    },
    sitemap: new URL("/sitemap.xml", siteUrl()).href,
  };
}
