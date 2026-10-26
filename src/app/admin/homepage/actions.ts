"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { parseHomepageConfig, homepageConfigSchema } from "@/lib/homepage";
import { homepageImageType } from "@/lib/homepage-images";
export async function saveHomepageDraft(
  _state: { error: string },
  form: FormData,
) {
  const { db } = await requireStaff();
  let config;
  try {
    config = parseHomepageConfig(String(form.get("config") || ""));
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Check the homepage fields.",
    };
  }
  const { error } = await db.rpc("save_homepage_draft", {
    payload: config,
    expected_updated_at: String(form.get("version") || "") || null,
  });
  if (error)
    return {
      error:
        error.code === "40001"
          ? "The draft changed. Reload before saving."
          : "The homepage draft could not be saved.",
    };
  revalidatePath("/admin/homepage");
  revalidatePath("/admin/homepage/preview");
  redirect("/admin/homepage?notice=saved");
}
export async function publishHomepage(
  _state: { error: string },
  form: FormData,
) {
  const { db, role } = await requireStaff();
  if (role !== "admin")
    return { error: "Only administrators can publish the homepage." };
  const { data, error: readError } = await db
    .from("homepage_draft")
    .select("config")
    .eq("id", true)
    .single();
  if (readError || !homepageConfigSchema.safeParse(data?.config).success)
    return { error: "The saved draft needs valid homepage settings." };
  const { error } = await db.rpc("publish_homepage", {
    expected_draft_at: String(form.get("draft_version") || "") || null,
    expected_public_at: String(form.get("public_version") || "") || null,
  });
  if (error)
    return {
      error:
        error.code === "40001"
          ? "The homepage changed. Reload and preview the latest draft before publishing."
          : "The homepage could not be published.",
    };
  revalidatePath("/");
  revalidatePath("/admin/homepage");
  redirect("/admin/homepage?notice=published");
}
export async function uploadHomepageImage(
  form: FormData,
): Promise<{ url?: string; error?: string }> {
  const { db, role } = await requireStaff();
  if (role !== "admin")
    return { error: "Only administrators can upload public banner images." };
  const file = form.get("image");
  if (!(file instanceof File) || !file.size || file.size > 3145728)
    return { error: "Choose a JPG, PNG, WebP or AVIF image under 3 MB." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const extension = homepageImageType(bytes, file.type);
  if (!extension)
    return {
      error:
        "The image contents do not match a supported image type. SVG and executable files are not accepted.",
    };
  const path = `${crypto.randomUUID()}.${extension}`;
  const { error } = await db.storage
    .from("homepage-assets")
    .upload(path, bytes, {
      contentType: file.type,
      upsert: false,
      cacheControl: "31536000",
    });
  if (error)
    return {
      error:
        "The image could not be uploaded. Check the homepage image bucket and your access.",
    };
  const { data } = db.storage.from("homepage-assets").getPublicUrl(path);
  return { url: data.publicUrl };
}
