import { notFound } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { bodyHash } from "@/lib/meaning-data";
import { meaningColumns, type WordMeaning } from "@/lib/word-meanings";
import { MeaningEditor } from "@/components/meaning-editor";
import type { KalamText } from "@/lib/types";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ entry?: string; notice?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();
  const { db, role } = await requireStaff();
  const [work, entries] = await Promise.all([
    db
      .from("kalam")
      .select("id,slug,texts:kalam_texts(*)")
      .eq("id", id)
      .maybeSingle(),
    db
      .from("word_meanings")
      .select(meaningColumns)
      .eq("kalam_id", id)
      .order("language")
      .order("start_offset")
      .limit(500),
  ]);
  if (work.error || entries.error)
    throw new Error("Word meanings could not be loaded. Please try again.");
  if (!work.data) notFound();
  const texts = work.data.texts as KalamText[];
  const meanings = (entries.data || []) as WordMeaning[];
  const record = query.entry
    ? meanings.find((m) => m.id === query.entry)
    : null;
  if (query.entry && !record) notFound();
  const hashes = Object.fromEntries(
    texts.map((t) => [t.language, bodyHash(t.body)]),
  );
  return (
    <>
      <div className="admin-heading">
        <p className="eyebrow">Kalam · {work.data.slug}</p>
        <h1>Word meanings</h1>
        <Link href={`/admin/kalam/${id}`}>Back to poem editor</Link>
      </div>
      {query.notice === "saved" && (
        <p role="status" className="notice">
          Meaning saved. Only reviewed, published meanings appear on the public
          poem.
        </p>
      )}
      <MeaningEditor
        key={`${record?.id || "new"}:${record?.updated_at || ""}`}
        kalamId={id}
        texts={texts}
        hashes={hashes}
        entries={meanings}
        record={record || null}
        role={role}
      />
    </>
  );
}
