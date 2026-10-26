import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import {
  adminKinds,
  editorialTitle,
  type AdminCount,
  type AdminPage,
} from "@/lib/admin";
import { AdminRows } from "@/components/admin-library";
export default async function Dashboard() {
  const { db, role } = await requireStaff();
  const [counts, recent] = await Promise.all([
    db.rpc("editorial_overview"),
    db.rpc("editorial_page", { record_type: "kalam" }),
  ]);
  if (counts.error || recent.error)
    throw new Error(
      "Unable to load the studio. Check that all database migrations have been applied.",
    );
  const totals = counts.data as Record<(typeof adminKinds)[number], AdminCount>;
  const items = (recent.data as AdminPage).items.slice(0, 6);
  const drafts = adminKinds.reduce((sum, k) => sum + totals[k].draft, 0);
  return (
    <>
      <div className="admin-heading">
        <div>
          <p className="eyebrow">The editorial studio</p>
          <h1>Good words start here.</h1>
          <p className="hint">
            A little writing. A careful review. A new voice in the archive.
          </p>
        </div>
        <Link className="button" href="/admin/kalam/new">
          Write a kalam +
        </Link>
      </div>
      <div className="admin-grid">
        {adminKinds.map((kind, i) => (
          <Link className="stat" key={kind} href={`/admin/${kind}`}>
            <span className="stat-number">0{i + 1}</span>
            <span>{editorialTitle(kind)}</span>
            <strong>{totals[kind].total}</strong>
            <span className="stat-details">
              {totals[kind].published} published{" "}
              <span aria-hidden="true">·</span> {totals[kind].draft} drafts
            </span>
          </Link>
        ))}
      </div>
      <section className="studio-review">
        <div>
          <span className="eyebrow">Ready when you are</span>
          <h2>
            {drafts
              ? `${drafts} ${drafts === 1 ? "draft is" : "drafts are"} waiting in your studio.`
              : "Your archive is ready for a new story."}
          </h2>
          <p>
            {role === "admin"
              ? "Review the words, credit the source, then share them with the world."
              : "Save your work as a draft. Your administrator will review and publish it."}
          </p>
        </div>
        <Link
          className="button button-secondary"
          href="/admin/kalam?status=draft"
        >
          Review kalam drafts →
        </Link>
      </section>
      <section className="studio-section">
        <div className="studio-section-heading">
          <h2>Recently edited kalam</h2>
          <Link href="/admin/kalam">See all →</Link>
        </div>
        {items.length ? (
          <AdminRows kind="kalam" items={items} readOnly={role === "editor"} />
        ) : (
          <div className="studio-empty">
            <span aria-hidden="true">✦</span>
            <h2>A home for your first poem.</h2>
            <p>
              Start by adding its poet, then create the kalam in any of the six
              scripts.
            </p>
            <Link className="button" href="/admin/artists/new">
              Add a poet +
            </Link>
          </div>
        )}
      </section>
      <section className="studio-start">
        <h2>Your publishing checklist</h2>
        <ol>
          <li>
            <strong>Introduce the voice.</strong> Add a poet or artist and their
            source notes.
          </li>
          <li>
            <strong>Give the words a home.</strong> Add titles and text in the
            available scripts.
          </li>
          <li>
            <strong>Listen, review, publish.</strong> Attach recordings, check
            captions and preview the text.
          </li>
        </ol>
        <p className="hint">
          You’re signed in as{" "}
          {role === "admin" ? "an administrator" : "an editor"}. Staff roles are
          managed by the project owner.
        </p>
      </section>
    </>
  );
}
