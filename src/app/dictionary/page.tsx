import Link from "next/link";
import { WordBankDefinition } from "@/components/word-bank-definition";
import { lookupDictionary, lookupWordBank } from "@/lib/dictionary-data";
import { createPublicClient } from "@/lib/supabase/public";
import { dictionaryColumns, type DictionaryEntry } from "@/lib/dictionary";
import { languages, languageLabels, type Language } from "@/lib/types";
export const dynamic = "force-dynamic";
export const metadata = {
  robots: { index: false, follow: true },
  alternates: { canonical: "/dictionary" },
  title: "Sukhan Dictionary",
  description:
    "Reviewed spellings, roots and meanings for the words of Sukhan.",
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; language?: string }>;
}) {
  const query = await searchParams;
  const q = (query.q || "").trim().slice(0, 200);
  const language = languages.includes(query.language as Language)
    ? (query.language as Language)
    : "roman";
  let entries: DictionaryEntry[] = [];
  if (q) entries = await lookupDictionary(language, q);
  else {
    const db = createPublicClient();
    if (db) {
      const { data, error } = await db
        .from("dictionary_entries")
        .select(dictionaryColumns)
        .order("word_id")
        .limit(50);
      if (error) throw Error("The dictionary could not be loaded.");
      entries = (data || []) as DictionaryEntry[];
    }
  }
  const wordBank =
    q && !entries.length ? await lookupWordBank(language, q) : [];
  return (
    <section className="section">
      <p className="eyebrow">Words in their many voices</p>
      <h1>Sukhan Dictionary</h1>
      <form className="editor dictionary-search" method="get">
        <label>
          Word
          <input name="q" defaultValue={q} maxLength={200} />
        </label>
        <label>
          Word script
          <select name="language" defaultValue={language}>
            {languages.map((l) => (
              <option key={l} value={l}>
                {languageLabels[l]}
              </option>
            ))}
          </select>
        </label>
        <button className="button">Look up word</button>
      </form>
      <p>
        Exact spellings in the selected script, with normalized letter variants.
        General definitions are reviewed by Sukhan editors.
      </p>
      <ul className="dictionary-list">
        {entries.map((e) => (
          <li key={e.id}>
            <Link href={`/dictionary/${e.word_id}`}>
              {e.roman || e.word_id}
            </Link>
            <span>{e.english_meanings.join("; ")}</span>
          </li>
        ))}
      </ul>
      {!entries.length && <p>No reviewed entries found yet.</p>}
      {wordBank.map((e) => (
        <WordBankDefinition key={e.headword} entry={e} />
      ))}
      <p>
        <Link href="/dictionary/word-bank">
          Browse the Urdu source word bank and wazan candidates
        </Link>{" "}
        · <Link href="/dictionary/sources">Data sources</Link>
      </p>
      {!q && (
        <p>
          Showing up to 50 published entries. Use the word lookup to find
          others.
        </p>
      )}
    </section>
  );
}
