import { z } from "zod";
import { partsOfSpeech, spellingFields } from "./dictionary";
const spelling = z.string().trim().max(200).default("");
const audio = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password;
    } catch {
      return false;
    }
  }, "Use an HTTPS pronunciation URL without credentials.")
  .nullable()
  .default(null);
export const dictionaryImportSchema = z
  .object({
    word_id: z
      .string()
      .trim()
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Use lowercase letters, numbers and single hyphens.",
      )
      .max(100),
    roman: spelling,
    urdu: spelling,
    hindi: spelling,
    english: spelling,
    arabic: spelling,
    persian: spelling,
    part_of_speech: z.enum(partsOfSpeech),
    english_meanings: z.array(z.string().trim().min(1).max(500)).min(1).max(20),
    root_word: z.string().trim().max(200).default(""),
    audio_url: audio,
  })
  .strict()
  .refine((v) => Object.values(spellingFields).some((f) => v[f]), {
    message: "Add at least one spelling.",
    path: ["roman"],
  });
export const dictionarySaveSchema = z
  .object({
    entry: dictionaryImportSchema,
    source_note: z.string().trim().max(1000),
    status: z.enum(["draft", "published", "archived"]),
    review_confirmed: z.boolean(),
  })
  .refine(
    (v) => v.status !== "published" || (v.review_confirmed && !!v.source_note),
    {
      message: "Add an attribution and confirm your review before publishing.",
      path: ["review_confirmed"],
    },
  );
export function parseDictionaryImport(raw: string) {
  if (new TextEncoder().encode(raw).length > 64000)
    throw new Error("Choose one dictionary entry under 64 KB.");
  let value: unknown;
  try {
    value = JSON.parse(raw.replace(/^\uFEFF/, ""));
  } catch {
    throw new Error(
      "This is not valid JSON. Your existing fields are unchanged.",
    );
  }
  const parsed = dictionaryImportSchema.safeParse(value);
  if (!parsed.success)
    throw new Error(
      parsed.error.issues[0]?.message || "Check the dictionary JSON fields.",
    );
  return parsed.data;
}
