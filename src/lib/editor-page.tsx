import { notFound } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "./auth";
import { Editor, type Editable } from "@/components/editor";
import type { Artist, Media } from "./types";
export async function renderEditor(
  kind: "kalam" | "artists" | "media",
  id: string,
) {
  const { db, role } = await requireStaff();
  if (id !== "new" && !z.uuid().safeParse(id).success) notFound();
  const [artistsResult, mediaResult] = await Promise.all([
    db.from("artists").select("*").order("name").limit(500),
    db.from("media").select("*").order("title").limit(500),
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
      <Editor
        key={id}
        kind={kind}
        record={record as Editable | null}
        artists={artistsResult.data as Artist[]}
        media={mediaResult.data as Media[]}
        role={role}
      />
    </>
  );
}
