"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { normalizeSearch, queryTerms } from "@/lib/validation";
import type { Artist } from "@/lib/types";

export function ArtistDirectorySearch({ initialArtists }: { initialArtists: Artist[] }) {
  const [query, setQuery] = useState("");

  const filteredArtists = useMemo(() => {
    const terms = queryTerms(query);
    if (!terms.length) return initialArtists;

    return initialArtists.filter((a) => {
      const haystack = normalizeSearch(`${a.name} ${a.name_ur}`);
      return terms.every((t) => haystack.includes(t));
    });
  }, [query, initialArtists]);

  return (
    <>
      <div className="artist-search" role="search" aria-label="Poet search">
        <label className="sr-only" htmlFor="poet-search">
          Search poets and artists
        </label>
        <input
          id="poet-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxLength={160}
          autoComplete="off"
          placeholder="Search a poet · شاعر تلاش کریں"
        />
        {query && (
          <button
            type="button"
            className="search-clear-btn"
            onClick={() => setQuery("")}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      <p className="results-note" aria-live="polite">
        {filteredArtists.length} published {filteredArtists.length === 1 ? "profile" : "profiles"}
        {query ? ` for “${query}”` : ""}
      </p>

      <div className="artist-directory">
        {filteredArtists.map((a) => {
          const displayInitial = Array.from((a.name_ur || a.name).trim())[0] || "";
          return (
            <article className="artist-directory-row" key={a.id}>
              <span
                className="artist-initial"
                aria-hidden="true"
                dir={a.name_ur ? "rtl" : "ltr"}
                lang={a.name_ur ? "ur" : "en"}
              >
                {displayInitial}
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
          );
        })}
      </div>

      {!filteredArtists.length && (
        <p className="empty-state">
          {query
            ? "No profiles matched this name. Try another spelling."
            : "Artist profiles will appear here after editorial review."}
        </p>
      )}
    </>
  );
}
