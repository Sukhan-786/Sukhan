import type { Metadata } from "next";
import Link from "next/link";
import { listArtists } from "@/lib/data";
export const metadata: Metadata = {
  title: "Poets & artists",
  alternates: { canonical: "/artists" },
};
export default async function Artists() {
  const artists = await listArtists();
  return (
    <div className="page-shell">
      <div className="page-heading">
        <p className="eyebrow">The people behind the words</p>
        <h1>Poets & artists</h1>
        <p>Meet the voices that make this a living archive.</p>
      </div>
      <div className="card-grid">
        {artists.map((a) => (
          <article className="artist-card" key={a.id}>
            <div className="artist-monogram" aria-hidden="true">
              {a.name.slice(0, 1)}
            </div>
            <p lang="ur" dir="rtl" className="artist-urdu">
              {a.name_ur}
            </p>
            <p className="eyebrow">{a.kind}</p>
            <h2>
              <Link href={`/artists/${a.slug}`}>{a.name}</Link>
            </h2>
            <p>{a.bio.slice(0, 200)}</p>
            <Link className="text-link" href={`/artists/${a.slug}`}>
              Explore their work ↗
            </Link>
          </article>
        ))}
      </div>
      {!artists.length && (
        <p className="empty-state">
          Artist profiles will appear here after editorial review.
        </p>
      )}
    </div>
  );
}
