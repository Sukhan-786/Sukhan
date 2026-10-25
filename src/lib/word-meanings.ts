import type { Language } from "./types";
export const meaningLanguages = ["ur", "en", "hi", "ar"] as const;
export type MeaningLanguage = (typeof meaningLanguages)[number];
export const meaningColumns =
  "id,kalam_id,language,start_offset,end_offset,surface,text_hash,meaning_ur,meaning_en,meaning_hi,meaning_ar,context_note,source_note,status,reviewed_at,updated_at";
export type WordMeaning = {
  id: string;
  kalam_id: string;
  language: Language;
  start_offset: number;
  end_offset: number;
  surface: string;
  text_hash: string;
  meaning_ur: string;
  meaning_en: string;
  meaning_hi: string;
  meaning_ar: string;
  context_note: string;
  source_note: string;
  status: "draft" | "published" | "archived";
  reviewed_at: string | null;
  updated_at: string;
};
export type WordToken = { surface: string; start: number; end: number };
// Storage offsets count Unicode code points, matching PostgreSQL substring.
export function wordTokens(body: string): WordToken[] {
  const result: WordToken[] = [];
  let cursor = 0,
    points = 0;
  for (const match of body.matchAll(
    /[\p{L}\p{M}\p{N}]+(?:[-'’ʼ\u200c\u200d][\p{L}\p{M}\p{N}]+)*/gu,
  )) {
    points += Array.from(body.slice(cursor, match.index)).length;
    const length = Array.from(match[0]).length;
    result.push({ surface: match[0], start: points, end: points + length });
    points += length;
    cursor = match.index + match[0].length;
  }
  return result;
}
export function phraseOccurrences(body: string, surface: string): WordToken[] {
  if (!surface || Array.from(surface).length > 200) return [];
  const result: WordToken[] = [];
  let cursor = 0,
    points = 0;
  while (cursor < body.length) {
    const index = body.indexOf(surface, cursor);
    if (index < 0) break;
    points += Array.from(body.slice(cursor, index)).length;
    const length = Array.from(surface).length;
    result.push({ surface, start: points, end: points + length });
    points += length;
    cursor = index + surface.length;
  }
  return result;
}
export function meaningSegments(body: string, meanings: WordMeaning[]) {
  const points = Array.from(body);
  const parts: { text: string; meaning?: WordMeaning }[] = [];
  let cursor = 0;
  for (const m of [...meanings].sort(
    (a, b) => a.start_offset - b.start_offset,
  )) {
    if (
      m.status !== "published" ||
      !m.reviewed_at ||
      m.start_offset < cursor ||
      m.end_offset > points.length ||
      points.slice(m.start_offset, m.end_offset).join("") !== m.surface
    )
      continue;
    if (m.start_offset > cursor)
      parts.push({ text: points.slice(cursor, m.start_offset).join("") });
    parts.push({ text: m.surface, meaning: m });
    cursor = m.end_offset;
  }
  if (cursor < points.length)
    parts.push({ text: points.slice(cursor).join("") });
  return parts;
}
