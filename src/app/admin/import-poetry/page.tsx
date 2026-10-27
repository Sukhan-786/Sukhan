import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { poetryProgress } from "./actions";
import { PoetryImporter } from "@/components/poetry-importer";
export default async function Page() {
  const { role } = await requireStaff();
  return (
    <>
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Your supplied library</p>
          <h1>Import Urdu & Persian poetry</h1>
          <p className="hint">
            Resume safely after closing the tab. Original source notes are kept
            on every work.
          </p>
        </div>
        <Link href="/poetry-sources">View source notes ↗</Link>
      </div>
      {role === "admin" ? (
        <PoetryImporter initial={await poetryProgress()} />
      ) : (
        <p>Only administrators can run the supplied poetry import.</p>
      )}
    </>
  );
}
