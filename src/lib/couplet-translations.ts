import { z } from "zod";
import { languages, type Language } from "./types";
export const translationColumns =
  "id,kalam_id,language,target_language,start_offset,end_offset,surface,text_hash,translation,source_note,status,reviewed_at,updated_at";
export type CoupletTranslation = {
  id: string;
  kalam_id: string;
  language: "fa" | "ar";
  target_language: Language;
  start_offset: number;
  end_offset: number;
  surface: string;
  text_hash: string;
  translation: string;
  source_note: string;
  status: "draft" | "published" | "archived";
  reviewed_at: string | null;
  updated_at: string;
};
export const translationSchema = z
  .object({
    kalam_id: z.uuid(),
    language: z.enum(["fa", "ar"]),
    target_language: z.enum(languages),
    start_offset: z.number().int().min(0),
    end_offset: z.number().int().max(200000),
    surface: z.string().min(1).max(20000),
    text_hash: z.string().regex(/^[a-f0-9]{64}$/),
    translation: z.string().trim().min(1).max(12000),
    source_note: z.string().trim().max(2000),
    status: z.enum(["draft", "published", "archived"]),
    review_confirmed: z.boolean(),
  })
  .refine(
    (v) => v.language !== v.target_language && v.end_offset > v.start_offset,
    { message: "Choose a passage and a different translation language." },
  )
  .refine(
    (v) => v.status !== "published" || (v.review_confirmed && !!v.source_note),
    {
      message:
        "Review the translation and add its translator/source before publishing.",
    },
  );
export { readingPassages } from "./reading-passages";
