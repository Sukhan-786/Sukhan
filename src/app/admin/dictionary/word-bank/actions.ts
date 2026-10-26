"use server";
import { requireStaff } from "@/lib/auth";
import { wordBankBatchSchema } from "@/lib/word-bank";
import type { WordBankProgress } from "@/lib/word-bank";
export async function wordBankProgress(): Promise<WordBankProgress> {
  const { db, role } = await requireStaff();
  if (role !== "admin") throw Error("Administrator access required.");
  const { data, error } = await db
    .from("word_bank_import")
    .select("source_id,processed,inserted,updated_at")
    .single();
  if (error || !data)
    throw Error(
      "Word bank progress is unavailable. Check the database migration.",
    );
  return data;
}
export async function importWordBankBatch(
  input: unknown,
): Promise<WordBankProgress> {
  const { db, role } = await requireStaff();
  if (role !== "admin") throw Error("Administrator access required.");
  const parsed = wordBankBatchSchema.safeParse(input);
  if (!parsed.success) throw Error("Invalid word bank batch.");
  const { data, error } = await db.rpc("import_urdu_word_batch", {
    batch_offset: parsed.data.offset,
    batch_rows: parsed.data.rows,
  });
  if (error)
    throw Error(
      error.code === "40001"
        ? "Progress changed in another window. Resume to continue."
        : "This batch was not saved. Resume to retry safely.",
    );
  return data as WordBankProgress;
}
