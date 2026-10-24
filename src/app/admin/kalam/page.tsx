import Link from "next/link";
import { requireStaff } from "@/lib/auth";
export default async function KalamAdmin() {
  const { db } = await requireStaff();
  const { data, error } = await db
    .from("kalam")
    .select("id,slug,status,form,texts:kalam_texts(title,language)")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) throw new Error("Unable to load kalam.");
  return (
    <>
      <div className="admin-heading">
        <h1>Kalam</h1>
        <Link className="button" href="/admin/kalam/new">
          New kalam +
        </Link>
      </div>
      <p className="hint">Up to 200 most recently edited works.</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Form</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {data.map((k) => (
              <tr key={k.id}>
                <td>{k.texts[0]?.title || k.slug}</td>
                <td>{k.form}</td>
                <td>
                  <span className={`status status-${k.status}`}>
                    {k.status}
                  </span>
                </td>
                <td>
                  <Link href={`/admin/kalam/${k.id}`}>Edit</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!data.length && (
        <p className="notice">
          Create a poet or artist first, then add your first kalam.
        </p>
      )}
    </>
  );
}
