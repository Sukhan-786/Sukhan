import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArtist, listKalam, listMedia } from "@/lib/data";
import { MediaPlayer } from "@/components/media-player";
import { KalamCard } from "@/components/kalam-card";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const a = await getArtist((await params).slug);
  return a
    ? {
        title: a.name,
        description: a.bio.slice(0, 160),
        alternates: { canonical: `/artists/${a.slug}` },
      }
    : { title: "Artist not found", robots: { index: false } };
}
export default async function ArtistPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const a = await getArtist((await params).slug);
  if (!a) notFound();
  const [{ items }, recordings] = await Promise.all([
    listKalam({ poet: a.id }),
    listMedia(undefined, a.id),
  ]);
  return (
    <div className="page-shell">
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
