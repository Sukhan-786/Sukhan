import Link from "next/link";
import { createPublicClient } from "@/lib/supabase/public";
import { WordBankList } from "@/components/word-bank-list";
import type { WordBankRow } from "@/lib/word-bank";
export const dynamic = "force-dynamic";
export const metadata = {
  robots: { index: false, follow: true },
  alternates: { canonical: "/dictionary/word-bank" },
  title: "Urdu word bank and wazan | Sukhan",
  description:
    "Browse sourced Urdu word forms and clearly labelled wazan candidates.",
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; after?: string }>;
}) {
  const query = await searchParams,
    q = (query.q || "").trim().slice(0, 200),
    after = (query.after || "").slice(0, 200);
  const db = createPublicClient();
  let rows: WordBankRow[] = [];
  if (db) {
    const { data, error } = await db.rpc("search_urdu_word_bank", {
      prefix: q,
      after_word: after,
    });
    if (error) throw Error("The word bank is unavailable.");
    rows = data || [];
  }
  return (
    <section className="section">
      <p className="eyebrow">Source forms · Urdu</p>
      <h1>Urdu word bank and wazan</h1>
      <p>
        <Link href="/dictionary">← Reviewed dictionary</Link>
      </p>
      <WordBankList rows={rows} q={q} after={after} />
    </section>
  );
}
