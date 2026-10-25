"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { meaningSchema } from "@/lib/meaning-validation";
export type MeaningState = { error: string; fields?: Record<string, string> };
export async function saveMeaning(
  kalamId: string,
  recordId: string | null,
  _previous: MeaningState,
  form: FormData,
): Promise<MeaningState> {
  const { db, role } = await requireStaff();
  if (
    !z.uuid().safeParse(kalamId).success ||
    (recordId && !z.uuid().safeParse(recordId).success)
  )
    return { error: "Invalid meaning or work." };
  const get = (name: string) => String(form.get(name) || "");
  const parsed = meaningSchema.safeParse({
    kalam_id: kalamId,
    language: get("language"),
    start_offset: Number(get("start_offset") || -1),
    end_offset: Number(get("end_offset") || -1),
    surface: get("surface"),
    text_hash: get("text_hash"),
    meaning_ur: get("meaning_ur"),
    meaning_en: get("meaning_en"),
    meaning_hi: get("meaning_hi"),
    meaning_ar: get("meaning_ar"),
    context_note: get("context_note"),
    source_note: get("source_note"),
    status: get("status"),
    review_confirmed: form.get("review_confirmed") === "yes",
  });
  if (!parsed.success)
    return {
      error:
        "Check the selected passage and highlighted fields. Your changes are still here.",
      fields: Object.fromEntries(
        parsed.error.issues.map((i) => [
          ["start_offset", "end_offset", "text_hash"].includes(
            String(i.path[0]),
          )
            ? "surface"
            : String(i.path[0]),
          ["start_offset", "end_offset", "text_hash"].includes(
            String(i.path[0]),
          )
            ? "Select a word or phrase occurrence from the current poem."
            : i.message,
        ]),
      ),
    };
  if (role !== "admin" && parsed.data.status !== "draft")
    return {
      error:
        "Only administrators can publish, withdraw or archive reviewed meanings.",
    };
  const { data, error } = await db.rpc("save_word_meaning", {
    record_id: recordId,
    payload: parsed.data,
    expected_updated_at: recordId ? get("version") : null,
  });
  if (error) {
    if (error.code === "40001")
      return {
        error:
          "The poem text or meaning changed. Reload, then select the word again before saving.",
      };
    if (error.code === "42501")
      return {
        error:
          "Your role cannot change this meaning. Editors can prepare drafts; administrators review published entries.",
      };
    if (error.code === "22023") return { error: error.message };
    return {
      error:
        "The meaning could not be saved. Check your connection and try again.",
    };
  }
  const { data: work } = await db
    .from("kalam")
    .select("slug")
    .eq("id", kalamId)
    .maybeSingle();
  if (work) revalidatePath(`/kalam/${work.slug}`);
  revalidatePath(`/admin/kalam/${kalamId}/meanings`);
  redirect(`/admin/kalam/${kalamId}/meanings?entry=${data}&notice=saved`);
}
