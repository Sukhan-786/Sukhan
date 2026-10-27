import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { bodyHash } from "@/lib/meaning-data";
import {
  translationColumns,
  type CoupletTranslation,
} from "@/lib/couplet-translations";
import { TranslationEditor } from "@/components/translation-editor";
import type { KalamText } from "@/lib/types";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ entry?: string; notice?: string }>;
}) {
  const { id } = await params,
    query = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();
  const { db, role } = await requireStaff();
  const [work, rows] = await Promise.all([
    db
      .from("kalam")
      .select("id,slug,form,texts:kalam_texts(*)")
      .eq("id", id)
      .maybeSingle(),
    db
      .from("couplet_translations")
      .select(translationColumns)
      .eq("kalam_id", id)
      .order("language")
      .order("start_offset")
      .limit(1000),
  ]);
  if (work.error || rows.error)
    throw Error("Translations could not be loaded.");
  if (!work.data) notFound();
  const texts = (work.data.texts as KalamText[]).filter(
      (t) => t.language === "fa" || t.language === "ar",
    ),
    entries = (rows.data || []) as CoupletTranslation[],
    record = entries.find((t) => t.id === query.entry) || null;
  if (query.entry && !record) notFound();
  return (
    <>
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Kalam · {work.data.slug}</p>
          <h1>Couplet translations</h1>
          <p className="hint">
            Add a translation beneath the original Persian or Arabic passage. No
            word-by-word entry is needed.
          </p>
        </div>
        <Link href={`/admin/kalam/${id}`}>Back to poem editor</Link>
      </div>
      {texts.length ? (
        <TranslationEditor
          key={`${record?.id || "new"}:${record?.updated_at || ""}`}
          saved={query.notice === "saved"}
          kalamId={id}
          texts={texts}
          entries={entries}
          record={record}
          hashes={Object.fromEntries(
            texts.map((t) => [t.language, bodyHash(t.body)]),
          )}
          prose={work.data.form === "prose"}
          role={role}
        />
      ) : (
        <p>Add Persian or Arabic text in the poem editor first.</p>
      )}
    </>
  );
}
