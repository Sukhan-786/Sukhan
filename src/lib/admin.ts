import { firstParam } from "./query";
import { forms, type Language, type Status } from "./types";

export const adminKinds = ["kalam", "artists", "media"] as const;
export type AdminKind = (typeof adminKinds)[number];
export type AdminParams = Record<string, string | string[] | undefined>;
export type AdminRow = {
  id: string;
  slug: string;
  title: string;
  status: Status;
  kind: string;
  updated_at: string;
  poet: string | null;
  scripts: Language[];
};
export type AdminPage = { items: AdminRow[]; total: number; has_more: boolean };
export type AdminCount = { total: number; draft: number; published: number };

export function adminFilters(kind: AdminKind, params: AdminParams) {
  const q = firstParam(params.q).trim().slice(0, 160);
  const rawStatus = firstParam(params.status);
  const status = ["draft", "published"].includes(rawStatus) ? rawStatus : "";
  const choices: readonly string[] =
    kind === "kalam"
      ? forms
      : kind === "artists"
        ? ["poet", "artist", "both"]
        : ["audio", "video"];
  const rawType = firstParam(params.type);
  const type = choices.includes(rawType) ? rawType : "";
  const rawCursor = firstParam(params.cursor);
  const [time, id, extra] = rawCursor.split("~");
  const validCursor =
    !extra &&
    /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(
      time || "",
    ) &&
    Number.isFinite(Date.parse(time)) &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      id || "",
    );
  return {
    q,
    status,
    type,
    cursor: validCursor ? rawCursor : "",
    time: validCursor ? time : null,
    id: validCursor ? id : null,
    previous: validCursor && firstParam(params.direction) === "prev",
  };
}
export function adminHref(
  kind: AdminKind,
  filters: ReturnType<typeof adminFilters>,
  row?: AdminRow,
  previous = false,
) {
  const query = new URLSearchParams();
  if (filters.q) query.set("q", filters.q);
  if (filters.status) query.set("status", filters.status);
  if (filters.type) query.set("type", filters.type);
  if (row) {
    query.set("cursor", `${row.updated_at}~${row.id}`);
    if (previous) query.set("direction", "prev");
  }
  return `/admin/${kind}${query.size ? `?${query}` : ""}`;
}
export function editorialTitle(kind: AdminKind) {
  return kind === "artists"
    ? "Poets & artists"
    : kind === "media"
      ? "Media library"
      : "Kalam";
}
export function editDate(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("en", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      }).format(date)
    : "—";
}
