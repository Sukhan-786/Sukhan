import type { Metadata } from "next";
import Link from "next/link";
import { listArtists } from "@/lib/data";
import { normalizeSearch } from "@/lib/validation";
import { firstParam } from "@/lib/query";
export const metadata: Metadata = {
  title: "Poets & artists",
  description:
    "Find Urdu and Persian poets and explore their published literature in the Sukhan library.",
  alternates: { canonical: "/artists" },
};
export default async function Artists({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const q = firstParam((await searchParams).q).slice(0, 160),
    all = await listArtists(),
    artists = all.filter((a) =>
      normalizeSearch(a.name + " " + a.name_ur).includes(normalizeSearch(q)),
    );
  return (
    <div className="page-shell">
      <div className="page-heading">
        <p className="eyebrow">The people behind the words</p>
        <h1>Poets & artists</h1>
        <p>Meet the voices that make this a living archive.</p>
      </div>
      <form className="artist-search" role="search" aria-label="Poet search">
        <label className="sr-only" htmlFor="poet-search">
          Search poets and artists
        </label>
        <input
          id="poet-search"
          name="q"
          type="search"
          defaultValue={q}
          maxLength={160}
          placeholder="Search a poet · شاعر تلاش کریں"
        />
        <button className="button">Find poet</button>
      </form>
      <p className="results-note">
        {artists.length} published profiles{q ? ` for “${q}”` : ""}
      </p>
      <div className="artist-directory">
        {artists.map((a) => (
          <article className="artist-directory-row" key={a.id}>
            <span className="artist-initial" aria-hidden="true">
              {Array.from(a.name_ur || a.name)[0]}
            </span>
            <div>
              <h2 dir="auto">
                <Link href={`/artists/${a.slug}`}>{a.name}</Link>
              </h2>
              {a.name_ur && (
                <p lang="ur" dir="rtl">
                  {a.name_ur}
                </p>
              )}
              <small>
                {a.kind === "both"
                  ? "Poet & performing artist"
                  : a.kind === "poet"
                    ? "Poet"
                    : "Artist"}
              </small>
            </div>
            <Link
              href={`/artists/${a.slug}`}
              aria-label={`Explore ${a.name}`}
              className="directory-open"
            >
              ↗
            </Link>
          </article>
        ))}
      </div>
      {!artists.length && (
        <p className="empty-state">
          {q
            ? "No profiles matched this name. Try another spelling."
            : "Artist profiles will appear here after editorial review."}
        </p>
      )}
    </div>
  );
}
