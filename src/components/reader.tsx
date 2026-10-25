"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useClientReady } from "@/lib/use-client-ready";
import {
  meaningLanguages,
  meaningSegments,
  type WordMeaning,
} from "@/lib/word-meanings";
import type { KalamText, Language } from "@/lib/types";
import {
  languages,
  languageLabels,
  languageTags,
  languageDirection,
} from "@/lib/types";
export function Reader({
  texts,
  meanings = [],
}: {
  texts: KalamText[];
  meanings?: WordMeaning[];
}) {
  const [language, setLanguage] = useState<Language>(
    texts.some((t) => t.language === "ur") ? "ur" : texts[0]?.language || "en",
  );
  const ready = useClientReady();
  const [size, setSize] = useState(28);
  const [selected, setSelected] = useState<WordMeaning | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();
  useEffect(() => {
    if (selected && !dialog.current?.open) dialog.current?.showModal();
    if (!selected && dialog.current?.open) dialog.current.close();
  }, [selected]);
  const text = texts.find((t) => t.language === language);
  const available = meanings.filter((m) => m.language === language);
  return (
    <section className="reader" aria-label="Multilingual reading room">
      <div className="reader-toolbar">
        <div className="script-tabs" role="group" aria-label="Reading language">
          {languages.map((lang) => (
            <button
              key={lang}
              type="button"
              aria-pressed={language === lang}
              disabled={!ready || !texts.some((t) => t.language === lang)}
              onClick={() => {
                setLanguage(lang);
                setSelected(null);
              }}
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
            disabled={!ready}
            min="20"
            max="44"
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
          />
        </label>
      </div>
      {available.length > 0 && (
        <p className="meaning-hint">
          Select an underlined word or phrase for its reviewed meaning.
        </p>
      )}
      <div
        className="poem"
        lang={languageTags[language]}
        dir={languageDirection(language)}
      >
        <h2>{text?.title}</h2>
        <p style={{ fontSize: size }}>
          {text
            ? meaningSegments(text.body, available).map((part, index) =>
                part.meaning ? (
                  <button
                    key={part.meaning.id}
                    type="button"
                    className="meaning-word"
                    aria-haspopup="dialog"
                    disabled={!ready}
                    aria-label={`Meaning of ${part.text}`}
                    onClick={(event) => {
                      opener.current = event.currentTarget;
                      setSelected(part.meaning!);
                    }}
                  >
                    {part.text}
                  </button>
                ) : (
                  <span key={index}>{part.text}</span>
                ),
              )
            : "This script is not available yet."}
        </p>
      </div>
      <dialog
        ref={dialog}
        className="meaning-dialog"
        aria-labelledby={titleId}
        onClose={() => {
          setSelected(null);
          if (opener.current?.isConnected) opener.current.focus();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <button
          type="button"
          className="meaning-close"
          onClick={() => dialog.current?.close()}
          aria-label="Close meaning"
        >
          Close ×
        </button>
        <h2
          id={titleId}
          lang={selected ? languageTags[selected.language] : undefined}
          dir={selected ? languageDirection(selected.language) : undefined}
        >
          {selected?.surface || "Word meaning"}
        </h2>
        <p className="meaning-reviewed">Reviewed for this poem</p>
        <dl>
          {selected &&
            meaningLanguages.map((l) =>
              selected[`meaning_${l}`] ? (
                <div key={l}>
                  <dt lang={languageTags[l]}>{languageLabels[l]}</dt>
                  <dd lang={languageTags[l]} dir={languageDirection(l)}>
                    {selected[`meaning_${l}`]}
                  </dd>
                </div>
              ) : null,
            )}
        </dl>
        {selected?.context_note && <p dir="auto">{selected.context_note}</p>}
        {selected?.source_note && (
          <p className="meaning-source" dir="auto">
            Source: {selected.source_note}
          </p>
        )}
      </dialog>
      <p className="reader-note">
        Take your time. Every line has a world within it.
      </p>
    </section>
  );
}
