import Link from "next/link";
import { requireStaff } from "@/lib/auth";
export default async function MediaAdmin() {
  const { db } = await requireStaff();
  const { data, error } = await db
    .from("media")
    .select("id,title,kind,status")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error("Unable to load media.");
  return (
    <>
      <div className="admin-heading">
        <h1>Media library</h1>
        <Link className="button" href="/admin/media/new">
          New recording +
        </Link>
      </div>
      <p className="hint">
        Use direct HTTPS audio/video file URLs, with transcripts and WebVTT
        captions for video. Upload and transcoding services are a later
        milestone.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {data.map((m) => (
              <tr key={m.id}>
                <td>{m.title}</td>
                <td>{m.kind}</td>
                <td>
                  <span className={`status status-${m.status}`}>
                    {m.status}
                  </span>
                </td>
                <td>
                  <Link href={`/admin/media/${m.id}`}>Edit</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
