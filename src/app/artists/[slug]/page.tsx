import type { Metadata } from "next";
import Link from "next/link";
import { pageNumber } from "@/lib/query";
import { siteUrl } from "@/lib/config";
import { notFound } from "next/navigation";
import { getArtist, listKalam, listMedia } from "@/lib/data";
import { MediaPlayer } from "@/components/media-player";
import { KalamCard } from "@/components/kalam-card";
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}): Promise<Metadata> {
  const a = await getArtist((await params).slug);
  const page = pageNumber((await searchParams).page);
  return a
    ? {
        title: a.name,
        description:
          a.bio.slice(0, 160) ||
          `Read published poetry and literature by ${a.name} in Sukhan’s library.`,
        alternates: {
          canonical: `/artists/${a.slug}${page > 1 ? `?page=${page}` : ""}`,
        },
      }
    : { title: "Artist not found", robots: { index: false } };
}
export default async function ArtistPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const a = await getArtist((await params).slug);
  if (!a) notFound();
  const page = pageNumber((await searchParams).page);
  const [{ items, hasNext }, recordings] = await Promise.all([
    listKalam({ poet: a.id, page }),
    listMedia(undefined, a.id),
  ]);
  return (
    <div className="page-shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Person",
            name: a.name,
            ...(a.name_ur ? { alternateName: a.name_ur } : {}),
            ...(a.bio ? { description: a.bio } : {}),
            url: new URL(`/artists/${a.slug}`, siteUrl()).href,
          }).replace(/</g, "\u003c"),
        }}
      />
      <header className="page-heading">
        <p className="eyebrow">{a.kind}</p>
        <h1>{a.name}</h1>
        <p className="artist-urdu" lang="ur" dir="rtl">
          {a.name_ur}
        </p>
        <p className="bio">{a.bio}</p>
      </header>
      <h2 className="subheading">In the library</h2>
      <div className="card-grid">
        {items.map((k) => (
          <KalamCard key={k.id} kalam={k} />
        ))}
      </div>
      {!items.length && <p>No published kalam yet.</p>}
      <nav className="pagination" aria-label="Poet works pages">
        {page > 1 && (
          <Link href={`/artists/${a.slug}?page=${page - 1}`}>← Previous</Link>
        )}
        <span>Page {page}</span>
        {hasNext && (
          <Link href={`/artists/${a.slug}?page=${page + 1}`}>Next →</Link>
        )}
      </nav>
      {recordings.length > 0 && (
        <section>
          <h2 className="subheading">Performances</h2>
          {recordings.map((m) => (
            <MediaPlayer key={m.id} media={m} />
          ))}
        </section>
      )}
    </div>
  );
}
