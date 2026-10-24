import Link from "next/link";
import { requireStaff } from "@/lib/auth";
export default async function ArtistsAdmin() {
  const { db } = await requireStaff();
  const { data, error } = await db
    .from("artists")
    .select("id,name,kind,status")
    .order("name")
    .limit(200);
  if (error) throw new Error("Unable to load artists.");
  return (
    <>
      <div className="admin-heading">
        <h1>Poets & artists</h1>
        <Link className="button" href="/admin/artists/new">
          New profile +
        </Link>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {data.map((a) => (
              <tr key={a.id}>
                <td>{a.name}</td>
                <td>{a.kind}</td>
                <td>
                  <span className={`status status-${a.status}`}>
                    {a.status}
                  </span>
                </td>
                <td>
                  <Link href={`/admin/artists/${a.id}`}>Edit</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
