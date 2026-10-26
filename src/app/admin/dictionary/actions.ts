"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { dictionarySaveSchema } from "@/lib/dictionary-validation";
export async function saveDictionary(
  recordId: string | null,
  _state: { error: string },
  form: FormData,
) {
  const { db, role } = await requireStaff();
  if (recordId && !z.uuid().safeParse(recordId).success)
    return { error: "Invalid dictionary entry." };
  const get = (name: string) => String(form.get(name) || "");
  const entry = Object.fromEntries(
    [
      "word_id",
      "roman",
      "urdu",
      "hindi",
      "english",
      "arabic",
      "persian",
      "part_of_speech",
      "root_word",
    ].map((k) => [k, get(k)]),
  );
  const parsed = dictionarySaveSchema.safeParse({
    entry: {
      ...entry,
      english_meanings: get("english_meanings")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      audio_url: get("audio_url") || null,
    },
    source_note: get("source_note"),
    status: get("status"),
    review_confirmed: form.get("review_confirmed") === "yes",
  });
  if (!parsed.success)
    return {
      error: parsed.error.issues[0]?.message || "Check the dictionary fields.",
    };
  if (role !== "admin" && parsed.data.status !== "draft")
    return {
      error: "Only administrators can publish or archive dictionary entries.",
    };
  const { data, error } = await db.rpc("save_dictionary_entry", {
    record_id: recordId,
    payload: {
      ...parsed.data.entry,
      source_note: parsed.data.source_note,
      status: parsed.data.status,
      review_confirmed: parsed.data.review_confirmed,
    },
    expected_updated_at: recordId ? get("version") : null,
  });
  if (error)
    return {
      error:
        error.code === "23505"
          ? "That word ID already exists. Find and edit the existing entry."
          : error.code === "40001"
            ? "This entry changed. Reload before saving."
            : error.code === "22023"
              ? error.message
              : "The entry could not be saved. Check your access and try again.",
    };
  revalidatePath("/dictionary");
  revalidatePath(`/dictionary/${parsed.data.entry.word_id}`);
  revalidatePath("/admin/dictionary");
  redirect(`/admin/dictionary?entry=${data}&notice=saved`);
}
