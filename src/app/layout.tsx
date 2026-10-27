import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { GoogleTagManager } from "@/components/google-tag-manager";
import { analyticsHostEnabled } from "@/lib/analytics";
import { MobileNavigation } from "@/components/mobile-navigation";
import { Header } from "@/components/header";
import { supabaseConfig, siteUrl } from "@/lib/config";
import "./globals.css";
import "./sukhan-theme.css";
export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: {
    default: "Sukhan — A home for words & voices",
    template: "%s | Sukhan",
  },
  description:
    "Discover literature in Urdu, Roman Urdu, Persian, Hindi, Arabic and English. Read kalam, meet poets and artists, and explore their voices.",
  openGraph: {
    type: "website",
    siteName: "Sukhan",
    locale: "en_US",
    images: ["/opengraph-image"],
  },
  twitter: { card: "summary_large_image" },
  robots: supabaseConfig()
    ? { index: true, follow: true }
    : { index: false, follow: false },
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const demo = !supabaseConfig();
  const host = (await headers()).get("host") || "";
  return (
    <html lang="en">
      <body>
        <GoogleTagManager enabled={analyticsHostEnabled(host)} />
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Header />
        <main id="main">{children}</main>
        <footer>
          <Link className="footer-brand" href="/">
            SUKHAN{" "}
            <span lang="ur" dir="rtl">
              سخن
            </span>
          </Link>
          <p>A living home for literature, in every voice.</p>
          <div>
            <Link href="/catalogue">The library</Link>
            <Link href="/artists">Our voices</Link>
            <Link href="/admin">Editorial studio</Link>
            <Link href="/poetry-sources">Poetry sources</Link>
          </div>
          <small>
            © {new Date().getFullYear()} Sukhan · Read. Listen. Belong.
          </small>
          <small className="font-attribution">
            Urdu font:{" "}
            <a
              href="https://mehrtype.com/product/mehr-nastaliq-web/"
              target="_blank"
              rel="noreferrer"
            >
              Mehr Nastaliq Web
            </a>{" "}
            · Nasrullah Mehr & Muhammad Zeeshan Nasar ·{" "}
            <a
              href="https://creativecommons.org/licenses/by-sa/4.0/"
              target="_blank"
              rel="noreferrer"
            >
              CC BY-SA 4.0
            </a>
          </small>
          {demo && (
            <div className="demo-banner">
              Foundation preview · Original sample verses · Database not
              connected
            </div>
          )}
        </footer>
        <MobileNavigation />
      </body>
    </html>
  );
}
