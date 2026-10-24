import Link from "next/link";
import { requireStaff } from "@/lib/auth";
export default async function Dashboard() {
  const { db, role } = await requireStaff();
  const results = await Promise.all(
    ["kalam", "artists", "media"].map((t) =>
      db.from(t).select("id", { count: "exact", head: true }),
    ),
  );
  if (results.some((r) => r.error))
    throw new Error("Unable to load dashboard counts.");
  return (
    <>
      <div className="admin-heading">
        <div>
          <p className="eyebrow">The editorial studio</p>
          <h1>Make room for good words.</h1>
        </div>
        <Link className="button" href="/admin/kalam/new">
          New kalam +
        </Link>
      </div>
      <div className="admin-grid">
        {["kalam", "artists", "media"].map((name, i) => (
          <Link className="stat" key={name} href={`/admin/${name}`}>
            <span>{name === "artists" ? "Poets & artists" : name}</span>
            <strong>{results[i].count || 0}</strong>
          </Link>
        ))}
      </div>
      <p className="notice mt-8">
        {role === "admin"
          ? "You can edit, publish and delete archive records. Review text, rights, and media accessibility before publishing."
          : "You can create and edit drafts. An administrator reviews and publishes your work."}
      </p>
      <p className="hint">
        Staff access is managed in Supabase by a trusted project owner. No
        public account can grant itself a role.
      </p>
    </>
  );
}
