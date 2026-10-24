import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getKalam } from "@/lib/data";
import { Reader } from "@/components/reader";
import { MediaPlayer } from "@/components/media-player";
import { siteUrl } from "@/lib/config";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const k = await getKalam(slug);
  if (!k) return { title: "Work not found", robots: { index: false } };
  const title =
    (k.texts.find((t) => t.language === "en") || k.texts[0])?.title || k.slug;
  return {
    title,
    description: k.summary,
    alternates: { canonical: `/kalam/${k.slug}` },
    openGraph: {
      title,
      description: k.summary,
      url: `/kalam/${k.slug}`,
      type: "article",
    },
  };
}
export default async function KalamPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const k = await getKalam(slug);
  if (!k) notFound();
  const title =
    (k.texts.find((t) => t.language === "en") || k.texts[0])?.title || k.slug;
  const json = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: title,
    description: k.summary,
    inLanguage: k.texts.map((t) =>
      t.language === "roman" ? "ur-Latn" : t.language,
    ),
    author: k.poet ? { "@type": "Person", name: k.poet.name } : undefined,
    url: new URL(`/kalam/${k.slug}`, siteUrl()).href,
    dateModified: k.updated_at,
  };
  return (
    <div className="reading-shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(json).replace(/</g, "\u003c"),
        }}
      />
      <Link className="back-link" href="/catalogue">
        ← Back to the library
      </Link>
      <header className="work-heading">
        <p className="eyebrow">{k.form}</p>
        <h1>{title}</h1>
        {k.poet && <Link href={`/artists/${k.poet.slug}`}>{k.poet.name}</Link>}
        <p>{k.summary}</p>
      </header>
      <Reader texts={k.texts} />
      {k.media.length > 0 && (
        <section className="section">
          <h2>Listen & watch</h2>
          {k.media.map((m) => (
            <MediaPlayer key={m.id} media={m} />
          ))}
        </section>
      )}
      <aside className="provenance">
        <h2>About this text</h2>
        <p>{k.rights_note}</p>
        <p>Last edited {new Date(k.updated_at).toISOString().slice(0, 10)}</p>
      </aside>
    </div>
  );
}
