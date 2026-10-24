import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/header";
import { supabaseConfig, siteUrl } from "@/lib/config";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: {
    default: "Sukhan — A home for words & voices",
    template: "%s | Sukhan",
  },
  description:
    "Discover literature in Urdu, Roman Urdu, Persian and English. Read kalam, meet poets and artists, and explore their voices.",
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
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const demo = !supabaseConfig();
  return (
    <html lang="en">
      <body>
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
      </body>
    </html>
  );
}
