import { languageTags, type KalamText, type Language } from "./types";
export function defaultReadingLanguage(texts: KalamText[]): Language {
  return (
    texts.find((t) => t.language === "ur")?.language ||
    texts.find((t) => t.language === "fa")?.language ||
    texts[0]?.language ||
    "en"
  );
}
export function requestedReadingLanguage(
  texts: KalamText[],
  value: string | undefined,
) {
  return (
    texts.find((t) => t.language === value)?.language ||
    defaultReadingLanguage(texts)
  );
}
export function kalamScriptPath(
  slug: string,
  language: Language,
  texts: KalamText[],
) {
  return `/kalam/${slug}${language === defaultReadingLanguage(texts) ? "" : `?lang=${language}`}`;
}
export function kalamAlternates(slug: string, texts: KalamText[]) {
  return Object.fromEntries(
    texts.map((t) => [
      languageTags[t.language],
      kalamScriptPath(slug, t.language, texts),
    ]),
  );
}
