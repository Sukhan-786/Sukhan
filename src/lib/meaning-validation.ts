import { z } from "zod";
import { languages } from "./types";
import { meaningLanguages } from "./word-meanings";
export const meaningSchema = z
  .object({
    kalam_id: z.uuid(),
    language: z.enum(languages),
    start_offset: z.number().int().min(0),
    end_offset: z.number().int().max(100000),
    surface: z.string().trim().min(1).max(200),
    text_hash: z.string().regex(/^[a-f0-9]{64}$/),
    meaning_ur: z.string().trim().max(1000),
    meaning_en: z.string().trim().max(1000),
    meaning_hi: z.string().trim().max(1000),
    meaning_ar: z.string().trim().max(1000),
    context_note: z.string().trim().max(1000),
    source_note: z.string().trim().max(1000),
    status: z.enum(["draft", "published", "archived"]),
    review_confirmed: z.boolean(),
  })
  .refine((v) => v.end_offset > v.start_offset, {
    message: "Choose a word or phrase occurrence.",
    path: ["surface"],
  })
  .refine((v) => meaningLanguages.some((l) => v[`meaning_${l}`].trim()), {
    message: "Add a meaning in at least one language.",
    path: ["meaning_en"],
  })
  .refine((v) => v.status !== "published" || !!v.source_note, {
    message: "Add a source or editorial attribution before publishing.",
    path: ["source_note"],
  })
  .refine((v) => v.status !== "published" || v.review_confirmed, {
    message: "Confirm your review before publishing.",
    path: ["review_confirmed"],
  });
