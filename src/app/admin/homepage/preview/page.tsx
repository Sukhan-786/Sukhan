import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { homepageConfigSchema } from "@/lib/homepage";
import { getHomepageData } from "@/lib/homepage-data";
import { HomepageView } from "@/components/homepage-view";
export default async function HomepagePreview() {
  const { db } = await requireStaff();
  const { data, error } = await db
    .from("homepage_draft")
    .select("config")
    .eq("id", true)
    .single();
  if (error) throw Error("The saved homepage draft could not be loaded.");
  const config = homepageConfigSchema.parse(data.config);
  const resources = await getHomepageData(config);
  return (
    <div className="homepage-preview">
      <div className="homepage-preview-notice">
        Private preview of your saved draft{" "}
        <Link href="/admin/homepage">Back to editor →</Link>
      </div>
      <HomepageView config={config} {...resources} />
    </div>
  );
}
