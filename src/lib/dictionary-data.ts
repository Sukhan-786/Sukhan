import "server-only";
import { createPublicClient } from "./supabase/public";
import { dictionaryColumns, type DictionaryEntry } from "./dictionary";
import type { Language } from "./types";
export async function lookupDictionary(language: Language, word: string) {
  const db = createPublicClient();
  if (!db) return [];
  const { data, error } = await db.rpc("lookup_dictionary", {
    lookup_language: language,
    lookup_word: word,
  });
  if (error)
    throw new Error("Dictionary lookup is unavailable. Please try again.");
  return (data || []) as DictionaryEntry[];
}
export async function getDictionaryEntry(wordId: string) {
  const db = createPublicClient();
  if (!db) return null;
  const { data, error } = await db
    .from("dictionary_entries")
    .select(dictionaryColumns)
    .eq("word_id", wordId)
    .maybeSingle();
  if (error) throw new Error("The dictionary entry could not be loaded.");
  return data as DictionaryEntry | null;
}

export async function lookupWordBank(language: Language, word: string) {
  if (language !== "ur") return [];
  const db = createPublicClient();
  if (!db) return [];
  const { data, error } = await db.rpc("lookup_urdu_word_bank", {
    lookup_word: word,
  });
  if (error) throw Error("The source word bank could not be loaded.");
  return (data || []) as import("./word-bank").WordBankRow[];
}
