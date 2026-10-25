import { z } from "zod";
import { forms, languages } from "./types";
export const slug = z
  .string()
  .trim()
  .min(2)
  .max(120)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase words separated by hyphens.",
  );
export const safeUrl = z
  .string()
  .url()
  .max(2048)
  .refine((value) => {
    const u = new URL(value);
    return u.protocol === "https:" && !u.username && !u.password;
  }, "Use an HTTPS URL without credentials.");
const rights = z.string().trim().max(2000);
export const artistSchema = z
  .object({
    slug,
    name: z.string().trim().min(1).max(160),
    name_ur: z.string().trim().max(160),
    kind: z.enum(["poet", "artist", "both"]),
    bio: z.string().trim().max(12000),
    status: z.enum(["draft", "published"]),
    rights_note: rights,
  })
  .refine((v) => v.status !== "published" || v.rights_note.length > 0, {
    message: "Add rights and source notes before publishing.",
    path: ["rights_note"],
  });
export const kalamSchema = z
  .object({
    slug,
    form: z.enum(forms),
    summary: z.string().trim().max(2000),
    poet_id: z.uuid(),
    status: z.enum(["draft", "published"]),
    rights_note: rights,
    texts: z
      .array(
        z.object({
          language: z.enum(languages),
          title: z.string().trim().min(1).max(300),
          body: z.string().trim().min(1).max(100000),
        }),
      )
      .min(1)
      .max(languages.length),
    media_ids: z.array(z.uuid()).max(30),
  })
  .refine(
    (v) => new Set(v.texts.map((t) => t.language)).size === v.texts.length,
    { message: "Languages must be unique.", path: ["texts"] },
  )
  .refine((v) => v.status !== "published" || v.rights_note.length > 0, {
    message: "Add rights and source notes before publishing.",
    path: ["rights_note"],
  });
export const mediaSchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    kind: z.enum(["audio", "video"]),
    url: safeUrl,
    caption_url: z.union([z.literal(""), safeUrl]),
    transcript: z.string().trim().max(100000),
    language: z.enum(languages),
    performer_id: z.union([z.uuid(), z.null()]),
    status: z.enum(["draft", "published"]),
    rights_note: rights,
  })
  .refine((v) => v.status !== "published" || !!v.rights_note, {
    message: "Add rights and source notes before publishing.",
    path: ["rights_note"],
  })
  .refine((v) => v.status !== "published" || !!v.transcript, {
    message: "Published media needs a transcript.",
    path: ["transcript"],
  })
  .refine(
    (v) => v.status !== "published" || v.kind !== "video" || !!v.caption_url,
    {
      message: "Published video needs a WebVTT captions URL.",
      path: ["caption_url"],
    },
  );
export function mayWrite(role: string, status: string) {
  return role === "admin" || (role === "editor" && status === "draft");
}
export function normalizeSearch(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .trim();
}
export function queryTerms(value: string) {
  return normalizeSearch(value)
    .slice(0, 160)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 12);
}
export function searchKalam<
  T extends {
    summary: string;
    texts: { title: string; body: string }[];
    poet: { name: string; name_ur: string } | null;
  },
>(items: T[], query: string) {
  const terms = queryTerms(query);
  return items.filter((k) => {
    const haystack = normalizeSearch(
      [
        k.summary,
        k.poet?.name,
        k.poet?.name_ur,
        ...k.texts.flatMap((t) => [t.title, t.body]),
      ].join(" "),
    );
    return terms.every((t) => haystack.includes(t));
  });
}
