import type { Language } from "./types";
export const spellingFields = {
  roman: "roman",
  ur: "urdu",
  hi: "hindi",
  en: "english",
  ar: "arabic",
  fa: "persian",
} as const;
export const partsOfSpeech = [
  "verb",
  "noun",
  "adjective",
  "adverb",
  "pronoun",
  "preposition",
  "postposition",
  "conjunction",
  "interjection",
  "particle",
  "phrase",
  "other",
] as const;
export const dictionaryColumns =
  "id,word_id,roman,urdu,hindi,english,arabic,persian,part_of_speech,english_meanings,arabic_meanings,urdu_meanings,wazan,wazan_note,root_word,audio_url,source_note,status,reviewed_at,updated_at";
export type DictionaryEntry = {
  id: string;
  word_id: string;
  roman: string;
  urdu: string;
  hindi: string;
  english: string;
  arabic: string;
  persian: string;
  part_of_speech: string;
  english_meanings: string[];
  arabic_meanings?: string[];
  urdu_meanings?: string[];
  wazan?: string[];
  wazan_note?: string;
  root_word: string;
  audio_url: string | null;
  source_note: string;
  status: "draft" | "published" | "archived";
  reviewed_at: string | null;
  updated_at: string;
};
export function dictionarySpelling(entry: DictionaryEntry, language: Language) {
  return entry[spellingFields[language]] || entry.roman || entry.word_id;
}
export const dictionaryExample = {
  word_id: "dekhaa",
  roman: "dekhaa",
  urdu: "دیکھا",
  hindi: "देखा",
  part_of_speech: "verb",
  english_meanings: ["saw", "seen", "observed"],
  root_word: "dekhnaa",
  audio_url: null,
};
