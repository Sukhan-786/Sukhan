import type { Metadata } from "next";
import Link from "next/link";
import { listKalam } from "@/lib/data";
import { firstParam, pageNumber } from "@/lib/query";
import { forms, languages, languageLabels, type Language } from "@/lib/types";
import { KalamCard } from "@/components/kalam-card";
type Params = {
  q?: string | string[];
  form?: string | string[];
  page?: string | string[];
  lang?: string | string[];
};
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Params>;
}): Promise<Metadata> {
  const p = await searchParams,
    q = firstParam(p.q).trim(),
    page = pageNumber(p.page),
    lang = firstParam(p.lang),
    s = new URLSearchParams();
  if (page > 1) s.set("page", String(page));
  if (languages.includes(lang as Language)) s.set("lang", lang);
  if (forms.includes(firstParam(p.form) as (typeof forms)[number]))
    s.set("form", firstParam(p.form));
  return {
    title: "Explore kalam",
    description:
      "Browse Urdu and Persian poetry. Read available Urdu, Roman Urdu, Hindi, English and Arabic texts, and discover poets and their works.",
    alternates: { canonical: "/catalogue" + (s.size ? "?" + s : "") },
    ...(q ? { robots: { index: false, follow: true } } : {}),
  };
}
export default async function Catalogue({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const q = firstParam(params.q).slice(0, 160);
  const form = forms.includes(firstParam(params.form) as (typeof forms)[number])
    ? firstParam(params.form)
    : undefined;
  const page = pageNumber(params.page);
  const language = languages.includes(firstParam(params.lang) as Language)
    ? (firstParam(params.lang) as Language)
    : undefined;
  const { items, hasNext } = await listKalam({ q, form, page, language });
  function pageUrl(n: number) {
    const s = new URLSearchParams({ page: String(n) });
    if (q) s.set("q", q);
    if (form) s.set("form", form);
    if (language) s.set("lang", language);
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
          <label className="sr-only" htmlFor="reading-script">
            Reading script
          </label>
          <select id="reading-script" name="lang" defaultValue={language || ""}>
            <option value="">All scripts</option>
            {languages.map((l) => (
              <option key={l} value={l}>
                {languageLabels[l]}
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
            <KalamCard
              key={k.id}
              kalam={k}
              preferredLanguage={language}
              index={(page - 1) * 24 + i}
            />
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
