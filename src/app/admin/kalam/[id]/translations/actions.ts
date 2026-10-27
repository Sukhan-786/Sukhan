"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { translationSchema } from "@/lib/couplet-translations";
import { z } from "zod";
export async function saveTranslation(
  kalamId: string,
  recordId: string | null,
  _state: { error: string },
  form: FormData,
) {
  const { db, role } = await requireStaff();
  if (
    !z.uuid().safeParse(kalamId).success ||
    (recordId && !z.uuid().safeParse(recordId).success)
  )
    return { error: "Invalid work or translation." };
  const get = (key: string) => String(form.get(key) || "");
  const parsed = translationSchema.safeParse({
    kalam_id: kalamId,
    language: get("language"),
    target_language: get("target_language"),
    start_offset: Number(get("start_offset")),
    end_offset: Number(get("end_offset")),
    surface: (() => {
      try {
        return JSON.parse(get("surface_json"));
      } catch {
        return "";
      }
    })(),
    text_hash: get("text_hash"),
    translation: get("translation"),
    source_note: get("source_note"),
    status: get("status"),
    review_confirmed: form.get("review_confirmed") === "yes",
  });
  if (!parsed.success)
    return {
      error: parsed.error.issues[0]?.message || "Check the translation fields.",
    };
  if (role !== "admin" && parsed.data.status !== "draft")
    return {
      error: "Only administrators can publish or archive translations.",
    };
  const { error, data } = await db.rpc("save_couplet_translation", {
    record_id: recordId,
    payload: parsed.data,
    expected_updated_at: recordId ? get("version") : null,
  });
  if (error)
    return {
      error:
        error.code === "40001"
          ? "The text or translation changed. Reload and select the passage again."
          : error.code === "22023"
            ? error.message
            : "The translation could not be saved. Check your role and connection.",
    };
  const { data: work } = await db
    .from("kalam")
    .select("slug")
    .eq("id", kalamId)
    .maybeSingle();
  if (work) revalidatePath(`/kalam/${work.slug}`);
  revalidatePath(`/admin/kalam/${kalamId}/translations`);
  redirect(`/admin/kalam/${kalamId}/translations?entry=${data}&notice=saved`);
}
