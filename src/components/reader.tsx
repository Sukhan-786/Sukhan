"use client";
import { useState } from "react";
import type { KalamText, Language } from "@/lib/types";
import { languages, languageLabels, languageTags } from "@/lib/types";
export function Reader({ texts }: { texts: KalamText[] }) {
  const [language, setLanguage] = useState<Language>(
    texts.some((t) => t.language === "ur") ? "ur" : texts[0]?.language || "en",
  );
  const [size, setSize] = useState(28);
  const text = texts.find((t) => t.language === language);
  return (
    <section className="reader" aria-label="Multilingual reading room">
      <div className="reader-toolbar">
        <div className="script-tabs" role="group" aria-label="Reading language">
          {languages.map((lang) => (
            <button
              key={lang}
              type="button"
              aria-pressed={language === lang}
              disabled={!texts.some((t) => t.language === lang)}
              onClick={() => setLanguage(lang)}
              lang={languageTags[lang]}
            >
              {languageLabels[lang]}
            </button>
          ))}
        </div>
        <label className="font-size">
          Text size{" "}
          <input
            type="range"
            min="20"
            max="44"
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
          />
        </label>
      </div>
      <div
        className="poem"
        lang={languageTags[language]}
        dir={language === "ur" || language === "fa" ? "rtl" : "ltr"}
      >
        <h2>{text?.title}</h2>
        <p style={{ fontSize: size }}>
          {text?.body || "This script is not available yet."}
        </p>
      </div>
      <p className="reader-note">
        Take your time. Every line has a world within it.
      </p>
    </section>
  );
}
