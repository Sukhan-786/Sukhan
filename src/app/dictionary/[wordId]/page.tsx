import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionaryEntry } from "@/lib/dictionary-data";
import { DictionaryDefinition } from "@/components/dictionary-definition";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ wordId: string }>;
}): Promise<Metadata> {
  const { wordId } = await params;
  const entry = await getDictionaryEntry(wordId);
  return entry
    ? {
        title: `${entry.roman || entry.word_id} — Sukhan Dictionary`,
        description: entry.english_meanings.join("; ").slice(0, 160),
        alternates: { canonical: `/dictionary/${entry.word_id}` },
      }
    : { title: "Word not found", robots: { index: false } };
}
export default async function Page({
  params,
}: {
  params: Promise<{ wordId: string }>;
}) {
  const { wordId } = await params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(wordId) || wordId.length > 100)
    notFound();
  const entry = await getDictionaryEntry(wordId);
  if (!entry) notFound();
  return (
    <div className="reading-shell">
      <Link href="/dictionary">← Sukhan Dictionary</Link>
      <header className="work-heading">
        <p className="eyebrow">Reviewed dictionary entry</p>
        <h1>{entry.roman || entry.word_id}</h1>
      </header>
      <DictionaryDefinition entry={entry} fullLink={false} />
      <p>
        These are general dictionary meanings. A poem-specific reviewed note may
        explain a different nuance.
      </p>
    </div>
  );
}
