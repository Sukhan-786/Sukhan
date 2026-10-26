"use client";
import { useActionState, useEffect, useState } from "react";
import { saveDictionary } from "@/app/admin/dictionary/actions";
import {
  dictionaryExample,
  partsOfSpeech,
  spellingFields,
  type DictionaryEntry,
} from "@/lib/dictionary";
import { parseDictionaryImport } from "@/lib/dictionary-validation";
import {
  languageLabels,
  languageTags,
  languageDirection,
  type Language,
  type StaffRole,
} from "@/lib/types";
import { useClientReady } from "@/lib/use-client-ready";
export function DictionaryEditor({
  record,
  role,
  prefillUrdu = "",
}: {
  record: DictionaryEntry | null;
  role: StaffRole;
  prefillUrdu?: string;
}) {
  const [state, action, pending] = useActionState(
    saveDictionary.bind(null, record?.id || null),
    { error: "" },
  );
  const ready = useClientReady();
  const [fields, setFields] = useState<Record<string, string>>(() => ({
    ...Object.fromEntries(
      [
        "word_id",
        "roman",
        "urdu",
        "hindi",
        "english",
        "arabic",
        "persian",
        "root_word",
        "audio_url",
        "source_note",
        "wazan_note",
      ].map((k) => [k, String(record?.[k as keyof DictionaryEntry] || "")]),
    ),
    urdu: record?.urdu || prefillUrdu,
    part_of_speech: record?.part_of_speech || "other",
    arabic_meanings: record?.arabic_meanings?.join("\n") || "",
    urdu_meanings: record?.urdu_meanings?.join("\n") || "",
    wazan: record?.wazan?.join("\n") || "",
    english_meanings: record?.english_meanings.join("\n") || "",
  }));
  const [status, setStatus] = useState(record?.status || "draft");
  const [review, setReview] = useState(false);
  const [raw, setRaw] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  const locked = role !== "admin" && !!record && record.status !== "draft";
  useEffect(() => {
    if (!dirty || pending) return;
    const unload = (e: BeforeUnloadEvent) => e.preventDefault();
    const click = (e: MouseEvent) => {
      const a = e.target instanceof Element ? e.target.closest("a") : null;
      if (
        a &&
        !e.defaultPrevented &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.shiftKey &&
        !e.altKey &&
        a.target !== "_blank" &&
        a.href !== window.location.href &&
        !window.confirm("Leave without saving this dictionary entry?")
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", click, true);
    };
  }, [dirty, pending]);
  const change = (name: string, value: string) => {
    setFields((f) => ({ ...f, [name]: value }));
    setReview(false);
    setDirty(true);
  };
  function loadJson(value: string) {
    try {
      const entry = parseDictionaryImport(value);
      if (record && entry.word_id !== record.word_id)
        throw Error("The imported word ID must match this saved entry.");
      setFields((f) => ({
        ...f,
        ...entry,
        audio_url: entry.audio_url || "",
        english_meanings: entry.english_meanings.join("\n"),
        arabic_meanings: entry.arabic_meanings.join("\n"),
        urdu_meanings: entry.urdu_meanings.join("\n"),
        wazan: entry.wazan.join("\n"),
      }));
      setStatus("draft");
      setReview(false);
      setDirty(true);
      setImportMessage(
        "JSON loaded into the form as a draft. Review the fields and save.",
      );
    } catch (e) {
      setImportMessage(
        e instanceof Error ? e.message : "JSON could not be loaded.",
      );
    }
  }
  return (
    <section aria-label="Dictionary editor">
      <h2>{record ? `Edit ${record.word_id}` : "Add a word"}</h2>
      {!locked && (
        <details>
          <summary>Import one word from JSON</summary>
          <p>
            Accepts your word_id, roman, urdu, hindi, part_of_speech,
            english_meanings, root_word and audio_url format. Import never
            publishes automatically.
          </p>
          <pre className="dictionary-json-example">
            {JSON.stringify(dictionaryExample, null, 2)}
          </pre>
          <label htmlFor="dictionary-json">Dictionary JSON</label>
          <textarea
            id="dictionary-json"
            value={raw}
            maxLength={64000}
            onChange={(e) => setRaw(e.target.value)}
            rows={9}
          />
          <button
            type="button"
            className="button secondary"
            disabled={!ready || pending}
            onClick={() => loadJson(raw)}
          >
            Load JSON into form
          </button>
          <label>
            Import JSON file
            <input
              type="file"
              accept=".json,application/json"
              disabled={!ready || pending}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                if (file.size > 64000) {
                  setImportMessage("Choose one dictionary entry under 64 KB.");
                  return;
                }
                try {
                  loadJson(
                    new TextDecoder("utf-8", { fatal: true }).decode(
                      await file.arrayBuffer(),
                    ),
                  );
                } catch {
                  setImportMessage("Choose a valid UTF-8 JSON file.");
                }
              }}
            />
          </label>
          <p role="status">{importMessage}</p>
        </details>
      )}
      <form action={action} className="editor" aria-busy={pending}>
        <input type="hidden" name="version" value={record?.updated_at || ""} />
        {state.error && <p role="alert">{state.error}</p>}
        {locked && (
          <p>Only an administrator can change a published or archived entry.</p>
        )}
        <fieldset disabled={!ready || pending || locked}>
          <legend>Word and spellings</legend>
          <label>
            Word ID
            <input
              name="word_id"
              value={fields.word_id}
              onChange={(e) => change("word_id", e.target.value)}
              readOnly={!!record}
              aria-describedby="dictionary-word-id-help"
              required
              maxLength={100}
            />
          </label>
          <small id="dictionary-word-id-help">
            Stable URL ID, such as dekhaa. Cannot change after saving.
          </small>
          {Object.entries(spellingFields).map(([language, field]) => (
            <label key={field}>
              {languageLabels[language as Language]} spelling
              <input
                name={field}
                lang={languageTags[language as Language]}
                dir={languageDirection(language as Language)}
                maxLength={200}
                value={fields[field]}
                onChange={(e) => change(field, e.target.value)}
              />
            </label>
          ))}
          <label htmlFor="dictionary-part-of-speech">Part of speech</label>
          <select
            id="dictionary-part-of-speech"
            name="part_of_speech"
            value={fields.part_of_speech}
            onChange={(e) => change("part_of_speech", e.target.value)}
          >
            {partsOfSpeech.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <label htmlFor="dictionary-definitions">
            English meanings — one per line
          </label>
          <textarea
            id="dictionary-definitions"
            name="english_meanings"
            value={fields.english_meanings}
            onChange={(e) => change("english_meanings", e.target.value)}
            maxLength={10020}
            rows={5}
          />
          {(
            [
              ["arabic_meanings", "Arabic meanings — one per line", "ar"],
              ["urdu_meanings", "Urdu meanings — one per line", "ur"],
            ] as const
          ).map(([name, label, lang]) => (
            <div key={name}>
              <label htmlFor={`dictionary-${name}`}>{label}</label>
              <textarea
                id={`dictionary-${name}`}
                name={name}
                value={fields[name]}
                onChange={(e) => change(name, e.target.value)}
                lang={lang}
                dir="rtl"
                rows={4}
                maxLength={10020}
              />
            </div>
          ))}
          <p>
            Spelling fields contain the word itself. Meaning fields contain
            definitions. Add at least one definition before publishing.
          </p>
          <label htmlFor="dictionary-wazan">Wazan — one pattern per line</label>
          <textarea
            id="dictionary-wazan"
            name="wazan"
            value={fields.wazan}
            onChange={(e) => change("wazan", e.target.value)}
            dir="ltr"
            rows={3}
            maxLength={820}
            aria-describedby="wazan-help"
          />
          <small id="wazan-help">
            1 = short syllable; 2 = long syllable. Examples: 22, 121, 12. Read
            left to right. Review against pronunciation; a word weight alone
            does not establish a verse’s bahr.
          </small>
          <label htmlFor="dictionary-wazan-note">
            Wazan pronunciation and context notes
          </label>
          <textarea
            id="dictionary-wazan-note"
            name="wazan_note"
            value={fields.wazan_note}
            onChange={(e) => change("wazan_note", e.target.value)}
            dir="auto"
            rows={3}
            maxLength={1000}
          />
          <label>
            Root word
            <input
              name="root_word"
              value={fields.root_word}
              onChange={(e) => change("root_word", e.target.value)}
              maxLength={200}
            />
          </label>
          <label>
            Pronunciation audio URL (optional)
            <input
              name="audio_url"
              type="url"
              value={fields.audio_url}
              onChange={(e) => change("audio_url", e.target.value)}
              maxLength={2048}
            />
          </label>
          <label htmlFor="dictionary-attribution">
            Source or editorial attribution
          </label>
          <textarea
            id="dictionary-attribution"
            name="source_note"
            value={fields.source_note}
            onChange={(e) => change("source_note", e.target.value)}
            maxLength={1000}
          />
          <label htmlFor="dictionary-status">Dictionary status</label>
          <select
            id="dictionary-status"
            name="status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as typeof status);
              setReview(false);
              setDirty(true);
            }}
          >
            <option value="draft">Draft</option>
            {role === "admin" && (
              <>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </>
            )}
          </select>
          {status === "published" && (
            <label className="meaning-review-check">
              <input
                type="checkbox"
                name="review_confirmed"
                value="yes"
                checked={review}
                onChange={(e) => setReview(e.target.checked)}
              />
              I reviewed the spellings, meanings and attribution. I also checked
              any wazan against its pronunciation.
            </label>
          )}
          <button className="button" type="submit">
            {pending
              ? "Saving…"
              : status === "published"
                ? "Publish reviewed dictionary entry"
                : status === "archived"
                  ? "Archive dictionary entry"
                  : "Save dictionary draft"}
          </button>
        </fieldset>
      </form>
    </section>
  );
}
