import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import {
  adminFilters,
  adminHref,
  editDate,
  editorialTitle,
  type AdminKind,
  type AdminPage,
  type AdminParams,
  type AdminRow,
} from "@/lib/admin";
import { forms, languageLabels } from "@/lib/types";
export function AdminRows({
  kind,
  items,
  readOnly = false,
}: {
  kind: AdminKind;
  items: AdminRow[];
  readOnly?: boolean;
}) {
  return (
    <div className="table-wrap studio-table">
      <table>
        <caption className="sr-only">
          {editorialTitle(kind)} records, most recently edited first
        </caption>
        <thead>
          <tr>
            <th scope="col">{kind === "artists" ? "Name" : "Title"}</th>
            <th scope="col">
              {kind === "kalam" ? "Author & scripts" : "Type"}
            </th>
            <th scope="col">Status</th>
            <th scope="col">Updated</th>
            <th scope="col">Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.id}>
              <td>
                <Link
                  className="record-title"
                  href={`/admin/${kind}/${row.id}`}
                >
                  {row.title}
                </Link>
                {row.slug && <small>/{row.slug}</small>}
              </td>
              <td>
                {kind === "kalam" ? (
                  <>
                    <span>{row.poet || "Unassigned"}</span>
                    <div className="script-markers">
                      {row.scripts.map((l) => (
                        <span key={l} title={languageLabels[l]}>
                          {l === "roman" ? "ROM" : l.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  row.kind
                )}
              </td>
              <td>
                <span className={`status status-${row.status}`}>
                  {row.status}
                </span>
              </td>
              <td>
                <time dateTime={row.updated_at}>
                  {editDate(row.updated_at)}
                </time>
              </td>
              <td>
                <Link
                  aria-label={`${readOnly && row.status === "published" ? "View" : "Edit"} ${row.title}`}
                  href={`/admin/${kind}/${row.id}`}
                >
                  {readOnly && row.status === "published" ? "View" : "Edit"} ↗
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export async function AdminLibrary({
  kind,
  params,
}: {
  kind: AdminKind;
  params: AdminParams;
}) {
  const { db, role } = await requireStaff();
  const filters = adminFilters(kind, params);
  const { data, error } = await db.rpc("editorial_page", {
    record_type: kind,
    search_query: filters.q,
    filter_status: filters.status,
    filter_type: filters.type,
    cursor_time: filters.time,
    cursor_id: filters.id,
    previous_page: filters.previous,
  });
  if (error)
    throw new Error(
      "The library could not be loaded. Check the database migrations and try again.",
    );
  const page = data as AdminPage;
  const noun =
    kind === "kalam" ? "kalam" : kind === "artists" ? "profile" : "recording";
  const selected = !!(filters.q || filters.status || filters.type);
  const canPrevious =
    !!filters.cursor && (filters.previous ? page.has_more : true);
  const canNext = filters.previous ? !!filters.cursor : page.has_more;
  const types =
    kind === "kalam"
      ? forms
      : kind === "artists"
        ? ["poet", "artist", "both"]
        : ["audio", "video"];
  const notice =
    params.notice === "saved"
      ? "Your changes were saved."
      : params.notice === "deleted"
        ? "The record was deleted."
        : "";
  return (
    <>
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Your archive</p>
          <h1>{editorialTitle(kind)}</h1>
          <p className="hint">
            {kind === "kalam"
              ? "Write, translate and publish your poetry."
              : kind === "artists"
                ? "The people behind every word and performance."
                : "Audio and video, with credits and accessible transcripts."}
          </p>
        </div>
        <Link className="button" href={`/admin/${kind}/new`}>
          New {noun} +
        </Link>
      </div>
      {notice && (
        <p role="status" className="studio-success">
          ✓ {notice}
        </p>
      )}
      <form
        className="studio-filters"
        role="search"
        aria-label={`Search ${editorialTitle(kind)}`}
      >
        <div className="field">
          <label htmlFor="archive-search">Search</label>
          <input
            name="q"
            id="archive-search"
            defaultValue={filters.q}
            maxLength={160}
            placeholder={
              kind === "kalam" ? "Title, author or URL slug…" : "Name or title…"
            }
          />
        </div>
        <div className="field">
          <label htmlFor="archive-status">Status</label>
          <select
            id="archive-status"
            name="status"
            defaultValue={filters.status}
          >
            <option value="">All statuses</option>
            <option value="draft">Drafts</option>
            <option value="published">Published</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="archive-type">
            {kind === "kalam" ? "Literary form" : "Type"}
          </label>
          <select id="archive-type" name="type" defaultValue={filters.type}>
            <option value="">All types</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <button className="button">Apply filters</button>
        {selected && (
          <Link href={`/admin/${kind}`} className="text-link">
            Clear
          </Link>
        )}
      </form>
      <div className="studio-results">
        <p>
          {page.total} {page.total === 1 ? "record" : "records"}
          {selected ? " matching your filters" : " in your archive"}
        </p>
        <span>Most recently edited first</span>
      </div>
      {page.items.length ? (
        <AdminRows
          kind={kind}
          items={page.items}
          readOnly={role === "editor"}
        />
      ) : (
        <div className="studio-empty">
          <span aria-hidden="true">✦</span>
          <h2>
            {selected
              ? "No matches this time."
              : filters.cursor
                ? "You’ve reached the end."
                : `Your first ${noun} starts here.`}
          </h2>
          <p>
            {selected
              ? "Try a different title, script or filter."
              : kind === "kalam"
                ? "Create a poet profile, then give their words a home."
                : "Start with a draft. You can review everything before publishing."}
          </p>
          <Link
            className="button"
            href={
              selected
                ? `/admin/${kind}`
                : filters.cursor
                  ? adminHref(kind, filters)
                  : `/admin/${kind}/new`
            }
          >
            {selected
              ? "Reset filters"
              : filters.cursor
                ? "Back to first results"
                : `Create ${noun}`}
          </Link>
          {kind === "kalam" && !selected && !filters.cursor && (
            <Link className="text-link" href="/admin/artists/new">
              Create a poet profile
            </Link>
          )}
        </div>
      )}
      {(filters.cursor || page.has_more) && (
        <nav className="studio-pagination" aria-label="Archive pagination">
          <Link href={adminHref(kind, filters)}>First results</Link>
          <div>
            {canPrevious && page.items[0] && (
              <Link href={adminHref(kind, filters, page.items[0], true)}>
                ← Newer
              </Link>
            )}
            {canNext && page.items.at(-1) && (
              <Link href={adminHref(kind, filters, page.items.at(-1))}>
                Older →
              </Link>
            )}
          </div>
        </nav>
      )}
    </>
  );
}
