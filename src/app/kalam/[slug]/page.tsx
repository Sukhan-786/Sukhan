import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getKalam } from "@/lib/data";
import { Reader } from "@/components/reader";
import { MediaPlayer } from "@/components/media-player";
import { siteUrl } from "@/lib/config";
import {
  requestedReadingLanguage,
  kalamScriptPath,
  kalamAlternates,
} from "@/lib/kalam-language";
import { languageTags, languageDirection } from "@/lib/types";
import { firstParam } from "@/lib/query";
import { publishedTranslations } from "@/lib/translation-data";
import { publishedMeanings } from "@/lib/meaning-data";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string | string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const k = await getKalam(slug);
  if (!k) return { title: "Work not found", robots: { index: false } };
  const lang = firstParam((await searchParams).lang),
    active = requestedReadingLanguage(k.texts, lang),
    chosen = k.texts.find((t) => t.language === active);
  const rawTitle =
    (lang ? chosen : k.texts.find((t) => t.language === "en") || chosen)
      ?.title || k.slug;
  const title = k.rights_note.startsWith("User-supplied")
      ? `${rawTitle}${chosen?.language === "fa" && /[\p{N}]/u.test(rawTitle) ? ": " + chosen.body.split("\n")[0].slice(0, 90) : ""} — ${k.poet?.name || "Sukhan"}`
      : rawTitle,
    description = (
      k.summary ||
      chosen?.body.replace(/\s+/g, " ") ||
      title
    ).slice(0, 180),
    canonical = kalamScriptPath(k.slug, active, k.texts);
  return {
    title,
    description,
    alternates: { canonical, languages: kalamAlternates(k.slug, k.texts) },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "article",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}
export default async function KalamPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string | string[] }>;
}) {
  const { slug } = await params;
  const k = await getKalam(slug);
  if (!k) notFound();
  const [meanings, translations] = await Promise.all([
    publishedMeanings(k.id, k.texts),
    publishedTranslations(k.id, k.texts),
  ]);
  const requested = firstParam((await searchParams).lang),
    active = requestedReadingLanguage(k.texts, requested),
    chosen = k.texts.find((t) => t.language === active);
  const title =
    (requested ? chosen : k.texts.find((t) => t.language === "en") || chosen)
      ?.title || k.slug;
  const json = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: title,
    description: k.summary,
    inLanguage: k.texts.map((t) =>
      t.language === "roman" ? "ur-Latn" : t.language,
    ),
    author: k.poet ? { "@type": "Person", name: k.poet.name } : undefined,
    url: new URL(kalamScriptPath(k.slug, active, k.texts), siteUrl()).href,
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
        <h1
          lang={requested ? languageTags[active] : undefined}
          dir={requested ? languageDirection(active) : "auto"}
        >
          {title}
        </h1>
        {k.poet && <Link href={`/artists/${k.poet.slug}`}>{k.poet.name}</Link>}
        <p>{k.summary}</p>
      </header>
      <Reader
        initialLanguage={active}
        key={`${k.id}:${active}`}
        texts={k.texts}
        meanings={meanings}
        translations={translations}
        prose={k.form === "prose"}
      />
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
        {k.rights_note.startsWith("User-supplied") && (
          <Link href="/poetry-sources">
            Poetry source notices and attribution →
          </Link>
        )}
        <p>Last edited {new Date(k.updated_at).toISOString().slice(0, 10)}</p>
      </aside>
    </div>
  );
}
