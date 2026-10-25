"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import {
  artistSchema,
  kalamSchema,
  mediaSchema,
  mayWrite,
} from "@/lib/validation";
import { languages } from "@/lib/types";
import { editorErrors } from "@/lib/editor-validation";
export type FormState = { error: string; fields?: Record<string, string> };
function value(form: FormData, key: string) {
  return String(form.get(key) || "");
}
function message(error: { code?: string; message?: string }) {
  if (error.code === "23505")
    return "This slug is already in use. Choose another.";
  if (error.code === "23503")
    return "This record is still used by another work, or a selected relationship no longer exists.";
  if (error.code === "40001")
    return "This record changed while you were editing. Reload before saving.";
  if (error.code === "42501")
    return "Your role does not permit this change. Editors can manage drafts; administrators publish.";
  if (error.code === "23514" || error.code === "22023")
    return "Check the required text, rights notes, and media accessibility fields.";
  return "The change could not be saved. Check your connection and try again.";
}
export async function saveRecord(
  kind: "kalam" | "artists" | "media",
  id: string | null,
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const { db, role } = await requireStaff();
  if (!z.enum(["kalam", "artists", "media"]).safeParse(kind).success)
    return { error: "Invalid record type." };
  if (id && !z.uuid().safeParse(id).success)
    return { error: "Invalid record." };
  const intent = value(form, "intent");
  if (intent === "delete") {
    if (!id || form.get("confirm_delete") !== "yes")
      return { error: "Select the confirmation checkbox before deleting." };
    const { data, error } = await db
      .from(kind)
      .delete()
      .eq("id", id)
      .eq("updated_at", value(form, "version"))
      .select("id");
    if (error) return { error: message(error) };
    if (!data?.length)
      return {
        error:
          "The record changed, was removed, or your role cannot delete it. Reload to continue.",
      };
  } else {
    const status = value(form, "status");
    if (!mayWrite(role, status))
      return {
        error: "Only administrators can publish. Save a draft for review.",
      };
    if (kind === "kalam") {
      const texts = languages.flatMap((language) => {
        const title = value(form, `${language}_title`).trim(),
          body = value(form, `${language}_body`).trim();
        return title || body ? [{ language, title, body }] : [];
      });
      const parsed = kalamSchema.safeParse({
        slug: value(form, "slug"),
        form: value(form, "form"),
        poet_id: value(form, "poet_id"),
        summary: value(form, "summary"),
        status,
        rights_note: value(form, "rights_note"),
        texts,
        media_ids: form.getAll("media_ids"),
      });
      if (!parsed.success) return editorErrors(parsed.error.issues, texts);
      const { error } = await db.rpc("save_kalam", {
        record_id: id,
        payload: parsed.data,
        expected_updated_at: id ? value(form, "version") : null,
      });
      if (error) return { error: message(error) };
    } else {
      const raw = {
        slug: value(form, "slug"),
        name: value(form, "name"),
        name_ur: value(form, "name_ur"),
        kind: value(form, "kind"),
        bio: value(form, "bio"),
        status,
        rights_note: value(form, "rights_note"),
        title: value(form, "title"),
        url: value(form, "url"),
        caption_url: value(form, "caption_url"),
        transcript: value(form, "transcript"),
        language: value(form, "language"),
        performer_id: value(form, "performer_id") || null,
      };
      const parsed =
        kind === "artists"
          ? artistSchema.safeParse(raw)
          : mediaSchema.safeParse(raw);
      if (!parsed.success) return editorErrors(parsed.error.issues);
      const values: Record<string, unknown> = parsed.data;
      const result = id
        ? await db
            .from(kind)
            .update(values)
            .eq("id", id)
            .eq("updated_at", value(form, "version"))
            .select("id")
        : await db.from(kind).insert(values).select("id");
      if (result.error) return { error: message(result.error) };
      if (!result.data?.length)
        return {
          error:
            "The record changed or your role cannot edit it. Reload before saving.",
        };
    }
  }
  revalidatePath("/", "layout");
  redirect(
    `/admin/${kind}?notice=${intent === "delete" ? "deleted" : "saved"}`,
  );
}
