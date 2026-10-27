"use client";
import { useState } from "react";
import { readingPassages } from "@/lib/reading-passages";
import type { CoupletTranslation } from "@/lib/couplet-translations";
import {
  languageLabels,
  languageTags,
  languageDirection,
  type KalamText,
  type Language,
} from "@/lib/types";
export function PassageReader({
  text,
  translations,
  size,
  prose,
}: {
  text: KalamText;
  translations: CoupletTranslation[];
  size: number;
  prose: boolean;
}) {
  const available = translations.filter(
      (t) =>
        t.language === text.language &&
        t.status === "published" &&
        t.reviewed_at,
    ),
    targets = [...new Set(available.map((t) => t.target_language))];
  const [chosen, setChosen] = useState<Language | "">(
    targets.includes("ur") ? "ur" : targets[0] || "",
  );
  const target = targets.includes(chosen as Language)
    ? chosen
    : targets[0] || "";
  const rows = available.filter((t) => t.target_language === target),
    byStart = new Map(rows.map((t) => [t.start_offset, t]));
  return (
    <div className="passage-reader">
      {targets.length ? (
        <label className="translation-language" dir="ltr">
          Translation language
          <select
            value={target}
            onChange={(e) => setChosen(e.target.value as Language)}
          >
            {targets.map((t) => (
              <option value={t} key={t}>
                {languageLabels[t]}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="translation-empty" dir="ltr">
          Translations have not been published for this text yet.
        </p>
      )}
      {readingPassages(text.body, prose).map((p) => {
        const t = byStart.get(p.start),
          valid = t && t.end_offset === p.end && t.surface === p.surface;
        return (
          <div className="passage" key={p.start}>
            <p className="passage-original" style={{ fontSize: size }}>
              {p.surface}
            </p>
            {valid && (
              <div
                className="passage-translation"
                lang={languageTags[t.target_language]}
                dir={languageDirection(t.target_language)}
              >
                <p>{t.translation}</p>
                <details>
                  <summary>Translator / source</summary>
                  <small dir="auto">{t.source_note}</small>
                </details>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
