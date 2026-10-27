import { notFound } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { requireStaff } from "./auth";
import {
  Editor,
  type Editable,
  type EditorArtist,
  type EditorMedia,
} from "@/components/editor";
import type { Media } from "./types";
export async function renderEditor(
  kind: "kalam" | "artists" | "media",
  id: string,
) {
  const { db, role } = await requireStaff();
  if (id !== "new" && !z.uuid().safeParse(id).success) notFound();
  const [artistsResult, mediaResult] = await Promise.all([
    kind === "artists"
      ? Promise.resolve({ data: [], error: null })
      : db
          .from("artists")
          .select("id,name,name_ur,kind,status")
          .order("name")
          .limit(500),
    kind === "kalam"
      ? db
          .from("media")
          .select("id,title,kind,status")
          .order("title")
          .limit(500)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (artistsResult.error || mediaResult.error)
    throw new Error("Unable to load editorial choices.");
  let record = null;
  if (id !== "new") {
    const { data, error } = await db
      .from(kind)
      .select(
        kind === "kalam"
          ? "*,texts:kalam_texts(*),links:kalam_media(media:media(*))"
          : "*",
      )
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error("Unable to load this record.");
    if (!data) notFound();
    const row = data as unknown as Editable & {
      links?: { media: Media | null }[];
    };
    record =
      kind === "kalam"
        ? {
            ...row,
            media: (row.links || []).flatMap((l: { media: Media | null }) =>
              l.media ? [l.media] : [],
            ),
          }
        : row;
  }
  const authorChoices = artistsResult.data as EditorArtist[];
  const authorId = kind === "kalam" ? record?.poet_id : record?.performer_id;
  if (authorId && !authorChoices.some((a) => a.id === authorId)) {
    const current = await db
      .from("artists")
      .select("id,name,name_ur,kind,status")
      .eq("id", authorId)
      .maybeSingle();
    if (current.error) throw new Error("Unable to load the credited author.");
    if (current.data) authorChoices.push(current.data);
  }
  const mediaChoices = [...mediaResult.data];
  for (const recording of record?.media || [])
    if (!mediaChoices.some((m) => m.id === recording.id))
      mediaChoices.push(recording);
  return (
    <>
      <div className="admin-heading">
        <h1>
          {id === "new" ? "Create" : "Edit"}{" "}
          {kind === "artists"
            ? "profile"
            : kind === "media"
              ? "recording"
              : "kalam"}
        </h1>
      </div>
      {kind === "kalam" && id !== "new" && (
        <p className="notice">
          <Link href={`/admin/kalam/${id}/meanings`}>
            Manage reviewed word meanings →
          </Link>
          {" · "}
          <Link href={`/admin/kalam/${id}/translations`}>
            Manage Persian / Arabic translations →
          </Link>
        </p>
      )}
      <Editor
        key={id}
        kind={kind}
        record={record as Editable | null}
        artists={authorChoices}
        media={mediaChoices as EditorMedia[]}
        role={role}
      />
    </>
  );
}
