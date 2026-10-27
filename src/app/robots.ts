import type { MetadataRoute } from "next";
import { siteUrl, supabaseConfig } from "@/lib/config";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: supabaseConfig() ? "/" : undefined,
      disallow: supabaseConfig()
        ? [
            "/admin",
            "/login",
            "/auth/",
            "/api/",
            "/account",
            "/profile",
            "/reset-password",
            "/set-password",
          ]
        : "/",
    },
    sitemap: new URL("/sitemap-index.xml", siteUrl()).href,
  };
}
