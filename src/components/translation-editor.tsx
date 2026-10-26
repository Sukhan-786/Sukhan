"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { saveTranslation } from "@/app/admin/kalam/[id]/translations/actions";
import {
  readingPassages,
  type CoupletTranslation,
} from "@/lib/couplet-translations";
import {
  languageLabels,
  languageTags,
  languageDirection,
  languages,
  type KalamText,
  type Language,
  type StaffRole,
} from "@/lib/types";
import { useClientReady } from "@/lib/use-client-ready";
import { useUnsavedChanges } from "@/lib/use-unsaved-changes";
export function TranslationEditor({
  kalamId,
  texts,
  entries,
  record,
  hashes,
  prose,
  role,
  saved,
}: {
  kalamId: string;
  texts: KalamText[];
  entries: CoupletTranslation[];
  record: CoupletTranslation | null;
  hashes: Record<string, string>;
  prose: boolean;
  role: StaffRole;
  saved: boolean;
}) {
  const [language, setLanguage] = useState<Language>(
      record?.language || texts[0].language,
    ),
    [selected, setSelected] = useState(record?.start_offset || 0),
    [target, setTarget] = useState<Language>(record?.target_language || "ur"),
    [dirty, setDirty] = useState(false);
  const [translation, setTranslation] = useState(record?.translation || ""),
    [sourceNote, setSourceNote] = useState(record?.source_note || ""),
    [status, setStatus] = useState(record?.status || "draft"),
    [reviewed, setReviewed] = useState(false);
  const [state, action, pending] = useActionState(
    saveTranslation.bind(null, kalamId, record?.id || null),
    { error: "" },
  );
  const ready = useClientReady();
  useUnsavedChanges(dirty, pending, "Leave without saving this translation?");
  const text = texts.find((t) => t.language === language)!,
    passages = readingPassages(text.body, prose),
    passage = passages.find((p) => p.start === selected) || passages[0],
    readOnly =
      role !== "admin" &&
      record?.status !== undefined &&
      record.status !== "draft",
    stale = record && hashes[record.language] !== record.text_hash;
  return (
    <div className="translation-editor">
      <form
        action={action}
        aria-busy={pending}
        className="editor"
        onChange={() => setDirty(true)}
      >
        <p role="status">
          {pending
            ? "Saving translation…"
            : dirty
              ? "Unsaved translation changes."
              : saved
                ? record?.status === "published"
                  ? "Translation saved. Reviewed translation published for readers."
                  : "Translation saved as a private draft."
                : ""}
        </p>
        {state.error && (
          <p role="alert" className="editor-error">
            {state.error}
          </p>
        )}
        {stale && (
          <p className="notice">
            The original text changed. Select its current passage and review
            this translation again.
          </p>
        )}
        <fieldset disabled={!ready || pending || readOnly}>
          <legend>Original passage</legend>
          <label>
            Original language
            <select
              name="language"
              value={language}
              onChange={(e) => {
                setLanguage(e.target.value as Language);
                setSelected(0);
                if (target === e.target.value) setTarget("ur");
              }}
            >
              {texts.map((t) => (
                <option key={t.language} value={t.language}>
                  {languageLabels[t.language]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Passage
            <select
              value={passage?.start || 0}
              onChange={(e) => setSelected(Number(e.target.value))}
            >
              {passages.map((p, i) => (
                <option key={p.start} value={p.start}>
                  {i + 1}. {p.surface.slice(0, 100).replaceAll("\n", " / ")}
                </option>
              ))}
            </select>
          </label>
          <blockquote
            className="translation-original"
            lang={languageTags[language]}
            dir="rtl"
          >
            {passage?.surface}
          </blockquote>
          <input
            type="hidden"
            name="start_offset"
            value={passage?.start || 0}
          />
          <input type="hidden" name="end_offset" value={passage?.end || 0} />
          <input
            type="hidden"
            name="surface_json"
            value={JSON.stringify(passage?.surface || "")}
          />
          <input type="hidden" name="text_hash" value={hashes[language]} />
          <input
            type="hidden"
            name="version"
            value={record?.updated_at || ""}
          />
          <label>
            Translation language
            <select
              name="target_language"
              value={target}
              onChange={(e) => setTarget(e.target.value as Language)}
            >
              {languages
                .filter((l) => l !== language)
                .map((l) => (
                  <option value={l} key={l}>
                    {languageLabels[l]}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Passage translation
            <textarea
              name="translation"
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              rows={5}
              maxLength={12000}
              required
              lang={languageTags[target]}
              dir={languageDirection(target)}
            />
          </label>
          <label>
            Translator and source
            <textarea
              name="source_note"
              value={sourceNote}
              onChange={(e) => setSourceNote(e.target.value)}
              rows={2}
              maxLength={2000}
            />
          </label>
          <label>
            Publication status
            <select
              name="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
            >
              <option value="draft">Draft</option>
              {role === "admin" && (
                <>
                  <option value="published">Published</option>
                  {record && <option value="archived">Archived</option>}
                </>
              )}
            </select>
          </label>
          {role === "admin" && (
            <label className="meaning-review-check">
              <input
                type="checkbox"
                name="review_confirmed"
                value="yes"
                checked={reviewed}
                onChange={(e) => setReviewed(e.target.checked)}
              />
              I reviewed this translation against the selected original passage.
            </label>
          )}
          <button
            className="button"
            disabled={!passage || Array.from(passage.surface).length > 20000}
          >
            {pending ? "Saving translation…" : "Save translation"}
          </button>
        </fieldset>
        <p className="hint">
          Up to 1,000 passage translations per work. Changes to the original
          hide old translations until reviewed again. Missing translations are
          never generated automatically.
        </p>
      </form>
      <section>
        <h2>Saved translations</h2>
        <Link
          className="text-link"
          href={`/admin/kalam/${kalamId}/translations`}
        >
          Add a new translation
        </Link>
        {entries.length ? (
          <ul className="translation-list">
            {entries.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/admin/kalam/${kalamId}/translations?entry=${t.id}`}
                >
                  <span lang={languageTags[t.language]} dir="rtl">
                    {t.surface.slice(0, 100)}
                  </span>
                  <small>
                    {languageLabels[t.target_language]} · {t.status}
                    {hashes[t.language] !== t.text_hash
                      ? " · source changed"
                      : ""}
                  </small>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p>No translations have been added.</p>
        )}
      </section>
    </div>
  );
}
