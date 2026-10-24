import type { Metadata } from "next";
import Link from "next/link";
import { listKalam } from "@/lib/data";
import { firstParam, pageNumber } from "@/lib/query";
import { forms } from "@/lib/types";
import { KalamCard } from "@/components/kalam-card";
export const metadata: Metadata = {
  title: "Explore kalam",
  description:
    "Find your next poem. Search the Sukhan library across four scripts.",
  alternates: { canonical: "/catalogue" },
};
export default async function Catalogue({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    form?: string | string[];
    page?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const q = firstParam(params.q).slice(0, 160);
  const form = forms.includes(firstParam(params.form) as (typeof forms)[number])
    ? firstParam(params.form)
    : undefined;
  const page = pageNumber(params.page);
  const { items, hasNext } = await listKalam({ q, form, page });
  function pageUrl(n: number) {
    const s = new URLSearchParams({ page: String(n) });
    if (q) s.set("q", q);
    if (form) s.set("form", form);
    return `/catalogue?${s}`;
  }
  return (
    <div className="page-shell">
      <div className="page-heading">
        <p className="eyebrow">A world between the lines</p>
        <h1>The library</h1>
        <p>Find a verse for the way you feel.</p>
      </div>
      <form className="search-form" role="search" aria-label="Catalogue search">
        <label htmlFor="q">Search words, titles or poets</label>
        <div className="search-row">
          <input
            id="q"
            name="q"
            type="search"
            maxLength={160}
            defaultValue={q}
            placeholder="Try ‘light’, ‘لفظ’ or a poet’s name…"
          />
          <label className="sr-only" htmlFor="form">
            Literary form
          </label>
          <select id="form" name="form" defaultValue={form || ""}>
            <option value="">All forms</option>
            {forms.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <button className="button">Search ↗</button>
        </div>
      </form>
      <p className="results-note" aria-live="polite">
        {items.length} {items.length === 1 ? "work" : "works"} on this page
        {q ? ` for “${q}”` : ""}
      </p>
      {items.length ? (
        <div className="card-grid">
          {items.map((k, i) => (
            <KalamCard key={k.id} kalam={k} index={(page - 1) * 24 + i} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>No works found</h2>
          <p>Try another word, script or literary form.</p>
          <Link href="/catalogue">Clear search</Link>
        </div>
      )}
      <nav className="pagination" aria-label="Catalogue pages">
        {page > 1 && <Link href={pageUrl(page - 1)}>← Previous</Link>}
        <span>Page {page}</span>
        {hasNext && <Link href={pageUrl(page + 1)}>Next →</Link>}
      </nav>
    </div>
  );
}
