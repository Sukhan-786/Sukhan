import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { dictionaryColumns, type DictionaryEntry } from "@/lib/dictionary";
import { DictionaryEditor } from "@/components/dictionary-editor";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    entry?: string;
    q?: string;
    notice?: string;
    ur?: string;
  }>;
}) {
  const query = await searchParams;
  if (query.entry && !z.uuid().safeParse(query.entry).success) notFound();
  const { db, role } = await requireStaff();
  let listing = db
    .from("dictionary_entries")
    .select(dictionaryColumns)
    .order("word_id")
    .limit(50);
  const q = (query.q || "").trim().slice(0, 100);
  if (q) listing = listing.eq("word_id", q);
  const [list, selected] = await Promise.all([
    listing,
    query.entry
      ? db
          .from("dictionary_entries")
          .select(dictionaryColumns)
          .eq("id", query.entry)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (list.error || selected.error)
    throw new Error("The dictionary could not be loaded.");
  if (query.entry && !selected.data) notFound();
  const record = selected.data as DictionaryEntry | null;
  return (
    <>
      <div className="admin-heading dictionary-admin-heading">
        <p className="eyebrow">Shared words · reviewed by editors</p>
        <h1>Sukhan Dictionary</h1>
        <p>
          Save a word once. Published entries are found automatically in
          matching poem scripts. A poem-specific meaning takes priority.
        </p>
      </div>
      {query.notice === "saved" && (
        <p role="status" className="notice">
          Dictionary entry saved. Only reviewed, published entries are public.
        </p>
      )}
      <p>
        <Link href="/admin/dictionary/word-bank">
          Urdu word bank · bulk import, search and wazan candidates →
        </Link>
      </p>
      <div className="dictionary-studio">
        <section aria-label="Dictionary entries">
          <h2>Entries</h2>
          <form method="get" className="editor">
            <label>
              Find by word ID
              <input name="q" defaultValue={q} maxLength={100} />
            </label>
            <button className="button">Find entry</button>
          </form>
          <Link href="/admin/dictionary">New entry</Link>
          <p>
            Showing up to 50 entries. Search an exact word ID to find others.
          </p>
          <ul className="dictionary-list">
            {(list.data as DictionaryEntry[]).map((e) => (
              <li key={e.id}>
                <Link href={`/admin/dictionary?entry=${e.id}`}>
                  {e.word_id}
                </Link>{" "}
                <span>{e.status}</span>
              </li>
            ))}
          </ul>
        </section>
        <DictionaryEditor
          key={`${record?.id || "new"}:${record?.updated_at || ""}:${query.ur || ""}`}
          prefillUrdu={(query.ur || "").slice(0, 200)}
          record={record}
          role={role}
        />
      </div>
    </>
  );
}
