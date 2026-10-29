import type { Metadata } from "next";
import { listArtists } from "@/lib/data";
import { ArtistDirectorySearch } from "./artist-directory-search";

export const metadata: Metadata = {
  title: "Poets & artists",
  description:
    "Find Urdu and Persian poets and explore their published literature in the Sukhan library.",
  alternates: { canonical: "/artists" },
};

// Revalidate once per hour so the page stays statically cached at Edge CDN
export const revalidate = 3600;

export default async function ArtistsPage() {
  const artists = await listArtists();

  return (
    <div className="page-shell">
      <div className="page-heading">
        <p className="eyebrow">The people behind the words</p>
        <h1>Poets & artists</h1>
        <p>Meet the voices that make this a living archive.</p>
      </div>

      <ArtistDirectorySearch initialArtists={artists} />
    </div>
  );
}
