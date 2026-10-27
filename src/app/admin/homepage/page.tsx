import { requireStaff } from "@/lib/auth";
import { homepageConfigSchema } from "@/lib/homepage";
import { getHomepageData } from "@/lib/homepage-data";
import { HomepageEditor } from "@/components/homepage-editor";
export default async function HomepageAdmin({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { db, role } = await requireStaff();
  const [draft, live, query] = await Promise.all([
    db
      .from("homepage_draft")
      .select("config,updated_at")
      .eq("id", true)
      .single(),
    db.from("homepage_public").select("updated_at").eq("id", true).single(),
    searchParams,
  ]);
  if (draft.error || live.error)
    throw Error(
      "Homepage editor is unavailable. Apply the homepage migration first.",
    );
  const initial = homepageConfigSchema.parse(draft.data.config);
  const { items, artists } = await getHomepageData(initial);
  const labels = Object.fromEntries([
    ...items.map((k) => [
      k.id,
      (k.texts.find((t) => t.language === "ur") || k.texts[0])?.title || k.slug,
    ]),
    ...artists.map((a) => [a.id, a.name]),
  ]);
  return (
    <>
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Website editor</p>
          <h1>Your homepage, your way.</h1>
          <p className="hint">
            Arrange sections, choose poetry and upload banners. Save a private
            draft, preview it, then publish.
          </p>
        </div>
      </div>
      {(query.notice === "saved" || query.notice === "published") && (
        <p role="status" className="success">
          {query.notice === "published"
            ? "Your homepage is now published."
            : "Draft saved. Your public homepage has not changed."}
        </p>
      )}
      <HomepageEditor
        key={draft.data.updated_at}
        initial={initial}
        draftVersion={draft.data.updated_at}
        publicVersion={live.data.updated_at}
        role={role}
        labels={labels}
      />
    </>
  );
}
