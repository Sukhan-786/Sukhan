"use server";
import { createHash } from "node:crypto";
import { requireStaff } from "@/lib/auth";
import { poetryBatchSchema, type PoetryProgress } from "@/lib/poetry-import";
export async function poetryProgress(): Promise<PoetryProgress[]> {
  const { db, role } = await requireStaff();
  if (role !== "admin") throw Error("Administrator access required.");
  const { data, error } = await db
    .from("poetry_imports")
    .select("source_id,total,processed,inserted,skipped,updated_at")
    .order("source_id");
  if (error)
    throw Error(
      "Poetry import progress could not be loaded. Check the migration.",
    );
  return data;
}
export async function importPoetryBatch(
  input: unknown,
): Promise<PoetryProgress> {
  const { db, role } = await requireStaff();
  if (role !== "admin") throw Error("Administrator access required.");
  if (new TextEncoder().encode(JSON.stringify(input)).length > 800000)
    throw Error("This poetry batch is too large.");
  const parsed = poetryBatchSchema.safeParse(input);
  if (!parsed.success) throw Error("Invalid poetry source rows.");
  for (const row of parsed.data.rows) {
    const t = row.texts[0],
      key = createHash("sha256")
        .update(`${row.poet_slug}\n${t.language}\n${t.body}`)
        .digest("hex");
    if (key !== row.source_key)
      throw Error("The source identity does not match this text.");
  }
  const { data, error } = await db.rpc("import_poetry_batch", {
    dataset_id: parsed.data.source_id,
    batch_offset: parsed.data.offset,
    batch_rows: parsed.data.rows,
  });
  if (error)
    throw Error(
      error.code === "40001"
        ? "Import progress changed in another window. Resume to continue."
        : "This batch was not saved. Resume to retry safely; existing poems have not been overwritten.",
    );
  return data as PoetryProgress;
}
