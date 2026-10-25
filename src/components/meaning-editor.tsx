"use client";
import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useClientReady } from "@/lib/use-client-ready";
import {
  saveMeaning,
  type MeaningState,
} from "@/app/admin/kalam/[id]/meanings/actions";
import {
  languageDirection,
  languageLabels,
  languageTags,
  type KalamText,
  type Language,
  type StaffRole,
} from "@/lib/types";
import {
  meaningLanguages,
  phraseOccurrences,
  wordTokens,
  type WordMeaning,
} from "@/lib/word-meanings";
export function MeaningEditor({
  kalamId,
  texts,
  hashes,
  entries,
  record,
  role,
}: {
  kalamId: string;
  texts: KalamText[];
  hashes: Record<string, string>;
  entries: WordMeaning[];
  record: WordMeaning | null;
  role: StaffRole;
}) {
  const ready = useClientReady();
  const [state, action, pending] = useActionState<MeaningState, FormData>(
    saveMeaning.bind(null, kalamId, record?.id || null),
    { error: "" },
  );
  const [language, setLanguage] = useState<Language>(
    record?.language || texts[0]?.language || "ur",
  );
  const [surface, setSurface] = useState(record?.surface || "");
  const [anchor, setAnchor] = useState<{
    start: number;
    end: number;
    hash: string;
  } | null>(
    record
      ? {
          start: record.start_offset,
          end: record.end_offset,
          hash: record.text_hash,
        }
      : null,
  );
  const [status, setStatus] = useState(record?.status || "draft");
  const [review, setReview] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [content, setContent] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      [
        ...meaningLanguages.map((l) => `meaning_${l}`),
        "context_note",
        "source_note",
      ].map((key) => [key, String(record?.[key as keyof WordMeaning] || "")]),
    ),
  );
  const body = texts.find((t) => t.language === language)?.body || "";
  const tokens = useMemo(() => wordTokens(body), [body]);
  const selection = useMemo(() => {
    const points = Array.from(body);
    const words = tokens.map((token, index) => ({
      ...token,
      before: points
        .slice(index ? tokens[index - 1].end : 0, token.start)
        .join(""),
    }));
    return { words, after: points.slice(tokens.at(-1)?.end || 0).join("") };
  }, [body, tokens]);
  const occurrences = useMemo(
    () => phraseOccurrences(body, surface),
    [body, surface],
  );
  const locked = role === "editor" && !!record && record.status !== "draft";
  const stale = !!anchor && anchor.hash !== hashes[language];
  useEffect(() => {
    if (!dirty || pending) return;
    const unload = (e: BeforeUnloadEvent) => e.preventDefault();
    const navigate = (e: MouseEvent) => {
      const link =
        e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (
        !link ||
        e.defaultPrevented ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.altKey ||
        e.button !== 0 ||
        link.getAttribute("target") === "_blank"
      )
        return;
      if (
        !window.confirm(
          "You have unsaved meaning changes. Leave this page and discard them?",
        )
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
    };
  }, [dirty, pending]);
  function choose(surface: string, start: number, end: number) {
    setSurface(surface);
    setAnchor({ start, end, hash: hashes[language] || "" });
    setDirty(true);
    setReview(false);
  }
  function error(name: string) {
    return state.fields?.[name] ? (
      <p className="field-error" id={`meaning-${name}-error`}>
        {state.fields[name]}
      </p>
    ) : null;
  }
  const snippet = anchor
    ? Array.from(body)
        .slice(Math.max(0, anchor.start - 30), anchor.end + 30)
        .join("")
    : "";
  return (
    <div className="meaning-studio">
      <section aria-label="Meaning editor">
        <p className="hint">
          Select a word or phrase in this poem, add meanings, then save a draft
          for review. English meanings and Roman Urdu text are separate.
        </p>
        {record && (
          <Link className="text-link" href={`/admin/kalam/${kalamId}/meanings`}>
            Add another meaning +
          </Link>
        )}
        {locked && (
          <p className="notice">
            Only an administrator can change a published or archived meaning.
          </p>
        )}
        <form
          action={action}
          className="editor stack"
          aria-busy={pending || !ready}
          onChange={(e) => {
            setDirty(true);
            if (
              !(e.target instanceof HTMLInputElement) ||
              e.target.name !== "review_confirmed"
            )
              setReview(false);
          }}
        >
          <input
            type="hidden"
            name="version"
            value={record?.updated_at || ""}
          />
          <input
            type="hidden"
            name="text_hash"
            value={anchor?.hash || hashes[language] || ""}
          />
          <input
            type="hidden"
            name="start_offset"
            value={anchor?.start ?? ""}
          />
          <input type="hidden" name="end_offset" value={anchor?.end ?? ""} />
          {state.error && (
            <div role="alert" className="form-error">
              {state.error}
              {state.fields && (
                <ul>
                  {Object.entries(state.fields).map(([name, message]) => (
                    <li key={name}>
                      <a href={`#meaning-${name}`}>{message}</a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <fieldset disabled={pending || locked || !ready} className="stack">
            <legend>Select the word or phrase</legend>
            <div className="field">
              <label htmlFor="meaning-language">Poem script</label>
              <select
                id="meaning-language"
                name="language"
                value={language}
                onChange={(e) => {
                  setLanguage(e.target.value as Language);
                  setSurface("");
                  setAnchor(null);
                }}
              >
                {record &&
                  !texts.some((t) => t.language === record.language) && (
                    <option value={record.language} disabled>
                      {languageLabels[record.language]} — removed from poem
                    </option>
                  )}
                {texts.map((t) => (
                  <option key={t.language} value={t.language}>
                    {languageLabels[t.language]}
                  </option>
                ))}
              </select>
            </div>
            <details open className="meaning-selection">
              <summary>Choose a word from the poem</summary>
              <p
                lang={languageTags[language]}
                dir={languageDirection(language)}
              >
                {selection.words.map((token) => (
                  <span key={token.start}>
                    {token.before}
                    <button
                      type="button"
                      aria-label={`Select ${token.surface} at character ${token.start + 1}`}
                      aria-pressed={
                        anchor?.start === token.start &&
                        surface === token.surface &&
                        !stale
                      }
                      onClick={() =>
                        choose(token.surface, token.start, token.end)
                      }
                    >
                      {token.surface}
                    </button>
                  </span>
                ))}
                {selection.after}
              </p>
            </details>
            <div className="field">
              <label htmlFor="meaning-surface">Word or phrase</label>
              <input
                id="meaning-surface"
                name="surface"
                value={surface}
                lang={languageTags[language]}
                dir={languageDirection(language)}
                maxLength={200}
                onChange={(e) => {
                  setSurface(e.target.value);
                  setAnchor(null);
                }}
                aria-invalid={!!state.fields?.surface}
                aria-describedby={
                  state.fields?.surface ? "meaning-surface-error" : undefined
                }
              />
              {error("surface")}
            </div>
            <div className="field">
              <label htmlFor="meaning-occurrence">
                Occurrence in this poem
              </label>
              <select
                id="meaning-occurrence"
                value={anchor && !stale ? String(anchor.start) : ""}
                onChange={(e) => {
                  const found = occurrences.find(
                    (o) => o.start === Number(e.target.value),
                  );
                  if (found && e.target.value !== "")
                    choose(found.surface, found.start, found.end);
                  else setAnchor(null);
                }}
              >
                <option value="">Select the intended occurrence</option>
                {occurrences.map((o, index) => (
                  <option key={o.start} value={o.start}>
                    {index + 1}.{" "}
                    {Array.from(body)
                      .slice(Math.max(0, o.start - 18), o.end + 18)
                      .join("")
                      .replaceAll("\n", " ")}{" "}
                    (character {o.start + 1})
                  </option>
                ))}
              </select>
              {!occurrences.length && surface && (
                <p className="hint">
                  No exact match. Select a word from the poem above, or copy the
                  phrase exactly.
                </p>
              )}
            </div>
            {stale && (
              <p role="status" className="notice">
                The poem text changed. Select the word again before saving or
                publishing. Its previous meaning is hidden from readers.
              </p>
            )}
            {anchor && !stale && (
              <p
                className="meaning-context"
                lang={languageTags[language]}
                dir={languageDirection(language)}
              >
                Selected context: {snippet}
              </p>
            )}
          </fieldset>
          <fieldset disabled={pending || locked || !ready} className="stack">
            <legend>Write the contextual meaning</legend>
            {meaningLanguages.map((l) => (
              <div className="field" key={l}>
                <label htmlFor={`meaning-meaning_${l}`}>
                  {languageLabels[l]} meaning
                </label>
                <textarea
                  id={`meaning-meaning_${l}`}
                  name={`meaning_${l}`}
                  lang={languageTags[l]}
                  dir={languageDirection(l)}
                  maxLength={1000}
                  value={content[`meaning_${l}`]}
                  onChange={(e) =>
                    setContent({ ...content, [`meaning_${l}`]: e.target.value })
                  }
                  aria-invalid={!!state.fields?.[`meaning_${l}`]}
                  aria-describedby={
                    state.fields?.[`meaning_${l}`]
                      ? `meaning-meaning_${l}-error`
                      : undefined
                  }
                />
                {error(`meaning_${l}`)}
              </div>
            ))}
            {["context_note", "source_note"].map((name) => (
              <div className="field" key={name}>
                <label htmlFor={`meaning-${name}`}>
                  {name === "context_note"
                    ? "Context note (optional)"
                    : "Source or editorial attribution"}
                </label>
                <textarea
                  id={`meaning-${name}`}
                  name={name}
                  maxLength={1000}
                  value={content[name]}
                  onChange={(e) =>
                    setContent({ ...content, [name]: e.target.value })
                  }
                  aria-invalid={!!state.fields?.[name]}
                  aria-describedby={
                    state.fields?.[name] ? `meaning-${name}-error` : undefined
                  }
                />
                {error(name)}
              </div>
            ))}
            <div className="field">
              <label htmlFor="meaning-status">Meaning status</label>
              <select
                id="meaning-status"
                name="status"
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as WordMeaning["status"])
                }
              >
                <option value="draft">Draft — awaiting review</option>
                {role === "admin" && (
                  <>
                    <option value="published">
                      Published — reviewed and visible
                    </option>
                    {record && (
                      <option value="archived">
                        Archived — hidden from readers
                      </option>
                    )}
                  </>
                )}
              </select>
            </div>
            {role === "admin" && status === "published" && (
              <div className="field">
                <label
                  className="meaning-review-check"
                  htmlFor="meaning-review_confirmed"
                >
                  <input
                    id="meaning-review_confirmed"
                    name="review_confirmed"
                    type="checkbox"
                    value="yes"
                    checked={review}
                    onChange={(e) => setReview(e.target.checked)}
                  />
                  I reviewed this word’s meaning in the selected poem context
                  and checked its attribution.
                </label>
                {error("review_confirmed")}
              </div>
            )}
            <button
              type="submit"
              className="button"
              disabled={pending || locked || !ready}
            >
              {pending
                ? "Saving meaning…"
                : status === "published"
                  ? "Publish reviewed meaning"
                  : status === "archived"
                    ? "Archive meaning"
                    : "Save meaning draft"}
            </button>
          </fieldset>
        </form>
      </section>
      <section
        aria-label="Meanings for this poem"
        className="meaning-entry-list"
      >
        <h2>Meanings for this poem</h2>
        <p className="hint">
          {entries.length} / 500 entries. Archived entries can be edited and
          reused.
        </p>
        {!entries.length ? (
          <p>No meanings yet. Select a word above to begin.</p>
        ) : (
          <ul>
            {entries.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/admin/kalam/${kalamId}/meanings?entry=${m.id}`}
                  lang={languageTags[m.language]}
                >
                  {m.surface}
                </Link>
                <span>
                  {languageLabels[m.language]} · {m.status}
                  {m.status !== "archived" && hashes[m.language] !== m.text_hash
                    ? " · text changed — needs review"
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
