import Link from "next/link";
import { displayWazanCandidate, type WordBankRow } from "@/lib/word-bank";
export function WordBankList({
  rows,
  q,
  after,
  admin = false,
}: {
  rows: WordBankRow[];
  q: string;
  after: string;
  admin?: boolean;
}) {
  const path = admin ? "/admin/dictionary/word-bank" : "/dictionary/word-bank";
  const shown = rows.slice(0, 50);
  return (
    <section aria-label="Urdu source words">
      <form className="editor dictionary-search" method="get">
        <label>
          Urdu word or prefix
          <input
            name="q"
            defaultValue={q}
            lang="ur"
            dir="rtl"
            maxLength={200}
          />
        </label>
        <button className="button">Search word bank</button>
      </form>
      <p>
        Source forms and candidates are awaiting editorial review. Meanings,
        including Arabic definitions, are added in the reviewed dictionary.
      </p>
      <ul className="dictionary-list">
        {shown.map((e) => (
          <li key={e.headword}>
            <strong lang="ur" dir="rtl">
              {e.headword}
            </strong>
            <span dir="ltr">
              {e.wazan_candidates.length
                ? e.wazan_candidates.map(displayWazanCandidate).join(" / ")
                : "Wazan pending"}
            </span>
            {admin ? (
              <Link
                href={`/admin/dictionary?${new URLSearchParams({ ur: e.headword })}`}
              >
                Create reviewed definition
              </Link>
            ) : (
              <Link
                href={`/dictionary?${new URLSearchParams({ language: "ur", q: e.headword })}`}
              >
                Look up word
              </Link>
            )}
          </li>
        ))}
      </ul>
      {!rows.length && <p>No source word forms found.</p>}
      <nav aria-label="Word bank pages">
        {after && (
          <Link href={`${path}?${new URLSearchParams({ q })}`}>First page</Link>
        )}
        {rows.length > 50 && (
          <Link
            href={`${path}?${new URLSearchParams({ q, after: shown[49].headword })}`}
          >
            Next 50 words →
          </Link>
        )}
      </nav>
      <p>
        <Link href="/dictionary/sources">
          Wazan notation, sources and licenses
        </Link>
      </p>
    </section>
  );
}
