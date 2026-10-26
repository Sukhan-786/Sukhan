import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { WordBankImporter } from "@/components/word-bank-importer";
import { WordBankList } from "@/components/word-bank-list";
import type { WordBankProgress, WordBankRow } from "@/lib/word-bank";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; after?: string }>;
}) {
  const query = await searchParams;
  const q = (query.q || "").trim().slice(0, 200),
    after = (query.after || "").slice(0, 200);
  const { db, role } = await requireStaff();
  const { data, error } = await db.rpc("search_urdu_word_bank", {
    prefix: q,
    after_word: after,
  });
  if (error)
    throw Error(
      "The word bank could not be loaded. Check the database migration.",
    );
  let progress: WordBankProgress | null = null;
  if (role === "admin") {
    const result = await db
      .from("word_bank_import")
      .select("source_id,processed,inserted,updated_at")
      .single();
    if (result.error) throw Error("The import progress could not be loaded.");
    progress = result.data;
  }
  return (
    <>
      <div className="admin-heading dictionary-admin-heading">
        <p className="eyebrow">
          Source words · definitions reviewed separately
        </p>
        <h1>Urdu word bank and wazan</h1>
        <p>
          <Link href="/admin/dictionary">← Reviewed dictionary editor</Link>
        </p>
      </div>
      {progress && <WordBankImporter initial={progress} />}
      <WordBankList
        rows={(data || []) as WordBankRow[]}
        q={q}
        after={after}
        admin
      />
    </>
  );
}
