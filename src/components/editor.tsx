"use client";
import {
  createContext,
  useActionState,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { editorFieldLabel } from "@/lib/editor-validation";
import { decodeTextImport, maxImportBytes } from "@/lib/text-import";
import { saveRecord, type FormState } from "@/app/admin/actions";
import {
  forms,
  languages,
  languageLabels,
  languageTags,
  languageDirection,
  type Artist,
  type Kalam,
  type Media,
  type StaffRole,
  type Language,
} from "@/lib/types";
export type Editable = Partial<
  Omit<Artist, "kind"> & Omit<Kalam, "poet"> & Omit<Media, "kind">
> & { kind?: string };
export type EditorArtist = Pick<
  Artist,
  "id" | "name" | "name_ur" | "kind" | "status"
>;
export type EditorMedia = Pick<Media, "id" | "title" | "kind" | "status">;
const FieldErrors = createContext<Record<string, string>>({});
function FieldError({ name }: { name: string }) {
  const errors = useContext(FieldErrors);
  return errors[name] ? (
    <p id={`${name}-error`} className="field-error">
      {errors[name]}
    </p>
  ) : null;
}
function Field({
  name,
  label,
  initial = "",
  required = false,
  type = "text",
  dir,
}: {
  name: string;
  label: string;
  initial?: string;
  required?: boolean;
  type?: string;
  dir?: "rtl" | "ltr";
}) {
  const [current, setCurrent] = useState(initial);
  const errors = useContext(FieldErrors);
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        required={required}
        type={type}
        dir={dir}
        aria-invalid={!!errors[name]}
        aria-describedby={errors[name] ? `${name}-error` : undefined}
        maxLength={
          name === "url" || name === "caption_url"
            ? 2048
            : name === "slug"
              ? 120
              : 300
        }
      />
      {name === "slug" && (
        <small className="hint">
          Lowercase English words with hyphens, for example: a-new-morning
        </small>
      )}
      <FieldError name={name} />
    </div>
  );
}
function LongField({
  name,
  label,
  initial = "",
}: {
  name: string;
  label: string;
  initial?: string;
}) {
  const [current, setCurrent] = useState(initial);
  const errors = useContext(FieldErrors);
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <textarea
        id={name}
        name={name}
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        aria-invalid={!!errors[name]}
        aria-describedby={errors[name] ? `${name}-error` : undefined}
        maxLength={
          name === "transcript" ? 100000 : name === "bio" ? 12000 : 2000
        }
      />
      <FieldError name={name} />
    </div>
  );
}
function PersistedSelect({
  defaultValue,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const [value, setValue] = useState(defaultValue);
  const errors = useContext(FieldErrors);
  return (
    <>
      <select
        {...props}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-invalid={!!errors[props.name || ""]}
        aria-describedby={
          errors[props.name || ""] ? `${props.name}-error` : undefined
        }
      />
      <FieldError name={props.name || ""} />
    </>
  );
}
export function Editor({
  kind,
  record,
  artists,
  media,
  role,
}: {
  kind: "kalam" | "artists" | "media";
  record: Editable | null;
  artists: EditorArtist[];
  media: EditorMedia[];
  role: StaffRole;
}) {
  const action = saveRecord.bind(null, kind, record?.id || null);
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    { error: "" },
  );
  const [dirty, setDirty] = useState(false);
  const [dismissed, setDismissed] = useState<{
    result: FormState | null;
    names: string[];
  }>({ result: null, names: [] });
  const visibleFields = Object.fromEntries(
    Object.entries(state.fields || {}).filter(
      ([name]) => dismissed.result !== state || !dismissed.names.includes(name),
    ),
  );
  const showError =
    !!state.error && (!state.fields || Object.keys(visibleFields).length > 0);
  const [publication, setPublication] = useState(record?.status || "draft");
  const [mediaSearch, setMediaSearch] = useState("");
  const [titles, setTitles] = useState<Record<string, string>>(
    Object.fromEntries(record?.texts?.map((t) => [t.language, t.title]) || []),
  );
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.error) errorRef.current?.focus();
  }, [state]);
  useEffect(() => {
    if (!dirty || pending) return;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    const navigate = (event: MouseEvent) => {
      const link =
        event.target instanceof Element
          ? event.target.closest("a[href]")
          : null;
      if (
        !link ||
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0 ||
        link.getAttribute("target") === "_blank"
      )
        return;
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      const destination = new URL(href, window.location.href);
      if (destination.href === window.location.href) return;
      if (
        !window.confirm(
          "You have unsaved changes. Leave this page and discard them?",
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
    };
  }, [dirty, pending]);
  const [selectedMedia, setSelectedMedia] = useState<string[]>(
    record?.media?.map((m) => m.id) || [],
  );
  const [language, setLanguage] = useState<Language>("ur");
  const [bodies, setBodies] = useState<Record<string, string>>(
    Object.fromEntries(record?.texts?.map((t) => [t.language, t.body]) || []),
  );
  const [preview, setPreview] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    language: Language;
    message: string;
    error: boolean;
  } | null>(null);
  async function importText(file: File, script: Language) {
    setImporting(true);
    setImportResult(null);
    try {
      if (!file.name.toLowerCase().endsWith(".txt"))
        throw new Error("Choose a UTF-8 plain text (.txt) file.");
      if (file.size > maxImportBytes)
        throw new Error("Choose a text file smaller than 400 KB.");
      const body = decodeTextImport(new Uint8Array(await file.arrayBuffer()));
      setBodies((current) => ({ ...current, [script]: body }));
      setDirty(true);
      setDismissed((current) => ({
        result: state,
        names: [
          ...(current.result === state ? current.names : []),
          `${script}_body`,
        ],
      }));
      setImportResult({
        language: script,
        message:
          "Text imported. Review it, add a title, then save your changes.",
        error: false,
      });
    } catch (error) {
      setImportResult({
        language: script,
        message:
          error instanceof Error
            ? error.message
            : "Unable to read this text file.",
        error: true,
      });
    } finally {
      setImporting(false);
    }
  }
  const locked = role === "editor" && record?.status === "published";
  return (
    <FieldErrors.Provider value={visibleFields}>
      <form
        action={formAction}
        className="editor stack"
        aria-busy={pending}
        onChange={(event) => {
          const target = event.target;
          if (!(
            target instanceof HTMLInputElement ||
            target instanceof HTMLSelectElement ||
            target instanceof HTMLTextAreaElement
          ))
            return;
          if (target.id === "media-search") return;
          if (target instanceof HTMLInputElement && target.type === "file")
            return;
          setDirty(true);
          if (target.name)
            setDismissed((current) => ({
              result: state,
              names:
                current.result === state
                  ? [...current.names, target.name]
                  : [target.name],
            }));
          if (target.name === "status")
            setPublication(target.value as "draft" | "published");
          const match = target.name.match(/^(ur|roman|fa|en|hi|ar)_title$/);
          if (match)
            setTitles((current) => ({ ...current, [match[1]]: target.value }));
        }}
      >
        <input type="hidden" name="version" value={record?.updated_at || ""} />
        <div className="editor-toolbar">
          <div>
            <span className={`status status-${publication}`}>
              {publication === "published" ? "Publish on save" : "Draft"}
            </span>
            <span role="status">
              {locked
                ? "Read only"
                : pending
                  ? "Saving your changes…"
                  : dirty
                    ? "Unsaved changes"
                    : record?.id
                      ? "All changes saved"
                      : "New draft"}
            </span>
          </div>
          <Link href={`/admin/${kind}`}>Back to library</Link>
        </div>
        {showError && (
          <div
            ref={errorRef}
            tabIndex={-1}
            className="form-error editor-error"
            role="alert"
          >
            <strong>{state.error}</strong>
            {state.fields && (
              <ul>
                {Object.entries(visibleFields).map(([name, message]) => (
                  <li key={name}>
                    <a
                      href={`#${name}`}
                      onClick={() => {
                        const script = name.match(/^(ur|roman|fa|en|hi|ar)_/);
                        if (script) setLanguage(script[1] as Language);
                        requestAnimationFrame(() =>
                          document.getElementById(name)?.focus(),
                        );
                      }}
                    >
                      {editorFieldLabel(name)}: {message}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {locked && (
          <p className="notice">
            Published records can only be changed by an administrator.
          </p>
        )}
        <fieldset disabled={pending || locked || importing}>
          <legend>
            {kind === "kalam"
              ? "Work details"
              : kind === "artists"
                ? "Profile details"
                : "Recording details"}
          </legend>
          <div className="editor-grid">
            {kind !== "media" && (
              <Field
                name="slug"
                label="URL slug"
                initial={record?.slug}
                required
              />
            )}
            {kind === "kalam" ? (
              <>
                <div className="field">
                  <label htmlFor="poet_id">Poet / author</label>
                  <PersistedSelect
                    id="poet_id"
                    name="poet_id"
                    required
                    defaultValue={record?.poet_id || ""}
                  >
                    <option value="">Choose an author</option>
                    {artists
                      .filter((a) => a.kind !== "artist")
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.status})
                        </option>
                      ))}
                  </PersistedSelect>
                </div>
                <div className="field">
                  <label htmlFor="form">Literary form</label>
                  <PersistedSelect
                    name="form"
                    id="form"
                    defaultValue={record?.form || "nazm"}
                  >
                    {forms.map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </PersistedSelect>
                </div>
              </>
            ) : kind === "artists" ? (
              <>
                <Field
                  name="name"
                  label="Name"
                  initial={record?.name}
                  required
                />
                <Field
                  name="name_ur"
                  label="Name in Urdu"
                  initial={record?.name_ur}
                  dir="rtl"
                />
                <div className="field">
                  <label htmlFor="kind">Profile type</label>
                  <PersistedSelect
                    name="kind"
                    id="kind"
                    defaultValue={record?.kind || "poet"}
                  >
                    <option value="poet">Poet</option>
                    <option value="artist">Performing artist</option>
                    <option value="both">Poet & performing artist</option>
                  </PersistedSelect>
                </div>
              </>
            ) : (
              <>
                <Field
                  name="title"
                  label="Recording title"
                  initial={record?.title}
                  required
                />
                <div className="field">
                  <label htmlFor="kind">Media type</label>
                  <PersistedSelect
                    name="kind"
                    id="kind"
                    defaultValue={record?.kind || "audio"}
                  >
                    <option value="audio">Audio</option>
                    <option value="video">Video</option>
                  </PersistedSelect>
                </div>
                <Field
                  name="url"
                  label="Direct HTTPS media file URL"
                  initial={record?.url}
                  required
                  type="url"
                />
                <Field
                  name="caption_url"
                  label="WebVTT captions URL (required for published video)"
                  initial={record?.caption_url}
                  type="url"
                />
                <div className="field">
                  <label htmlFor="performer_id">Performer</label>
                  <PersistedSelect
                    name="performer_id"
                    id="performer_id"
                    defaultValue={record?.performer_id || ""}
                  >
                    <option value="">No credited performer</option>
                    {artists.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </PersistedSelect>
                </div>
                <div className="field">
                  <label htmlFor="language">Recording language</label>
                  <PersistedSelect
                    name="language"
                    id="language"
                    defaultValue={record?.language || "ur"}
                  >
                    {languages.map((l) => (
                      <option key={l} value={l}>
                        {languageLabels[l]}
                      </option>
                    ))}
                  </PersistedSelect>
                </div>
              </>
            )}
          </div>
          <div className="mt-5">
            {kind === "kalam" ? (
              <LongField
                name="summary"
                label="Short introduction"
                initial={record?.summary}
              />
            ) : kind === "artists" ? (
              <LongField name="bio" label="Biography" initial={record?.bio} />
            ) : (
              <LongField
                name="transcript"
                label="Accessible transcript"
                initial={record?.transcript}
              />
            )}
          </div>
        </fieldset>
        {kind === "kalam" && (
          <fieldset disabled={pending || locked || importing}>
            <legend>Multilingual text</legend>
            <p className="hint">
              Add a title and text for each available script. Leave both blank
              when unavailable. Line breaks are preserved; HTML is displayed as
              plain text.
            </p>
            <div
              className="script-tabs"
              role="group"
              aria-label="Editor language"
            >
              {languages.map((l) => (
                <button
                  key={l}
                  type="button"
                  aria-pressed={language === l}
                  onClick={() => setLanguage(l)}
                  lang={languageTags[l]}
                  dir={languageDirection(l)}
                >
                  {languageLabels[l]}{" "}
                  <span
                    className="script-complete"
                    aria-label={
                      titles[l]?.trim() && bodies[l]?.trim()
                        ? "Text added"
                        : "Not complete"
                    }
                  >
                    {titles[l]?.trim() && bodies[l]?.trim() ? "●" : "○"}
                  </span>
                </button>
              ))}
            </div>
            {languages.map((l) => (
              <div
                key={l}
                hidden={l !== language}
                className="stack mt-5"
                lang={languageTags[l]}
              >
                <div className="field text-import">
                  <label htmlFor={`${l}_import`}>
                    Import {languageLabels[l]} text file (.txt)
                  </label>
                  <input
                    id={`${l}_import`}
                    type="file"
                    accept=".txt,text/plain"
                    disabled={importing}
                    aria-describedby={`${l}_import-help`}
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      event.currentTarget.value = "";
                      if (file) void importText(file, l);
                    }}
                  />
                  <small id={`${l}_import-help`} className="hint">
                    UTF-8 .txt, up to 400 KB and 100,000 characters. Replaces
                    this language’s text only. Nothing is saved until you click
                    Save.
                  </small>
                  {importResult?.language === l && (
                    <p
                      role={importResult.error ? "alert" : "status"}
                      className={importResult.error ? "field-error" : "hint"}
                    >
                      {importResult.message}
                    </p>
                  )}
                </div>
                <Field
                  name={`${l}_title`}
                  label={`${languageLabels[l]} title`}
                  initial={record?.texts?.find((t) => t.language === l)?.title}
                  dir={languageDirection(l)}
                />
                <div className="field">
                  <label htmlFor={`${l}_body`}>{languageLabels[l]} text</label>
                  <textarea
                    className="poem-editor"
                    id={`${l}_body`}
                    name={`${l}_body`}
                    dir={languageDirection(l)}
                    value={bodies[l] || ""}
                    aria-invalid={!!visibleFields[`${l}_body`]}
                    aria-describedby={
                      visibleFields[`${l}_body`] ? `${l}_body-error` : undefined
                    }
                    onChange={(e) =>
                      setBodies({ ...bodies, [l]: e.target.value })
                    }
                    maxLength={100000}
                  />
                  <FieldError name={`${l}_body`} />
                  <small className="hint">
                    {(bodies[l] || "").length.toLocaleString()} / 100,000
                    characters ·{" "}
                    {
                      (bodies[l] || "")
                        .split("\n")
                        .filter((line) => line.trim()).length
                    }{" "}
                    lines
                  </small>
                </div>
              </div>
            ))}
            <button
              type="button"
              className="text-link mt-5"
              onClick={() => setPreview(!preview)}
            >
              {preview ? "Hide preview" : "Preview current script"}
            </button>
            {preview && (
              <div
                className="editor-preview mt-5"
                lang={languageTags[language]}
                dir={languageDirection(language)}
              >
                <h2>{titles[language] || "Untitled"}</h2>
                {bodies[language] || "No text in this script yet."}
              </div>
            )}
          </fieldset>
        )}
        {kind === "kalam" && (
          <fieldset disabled={pending || locked || importing}>
            <legend>Related audio & video</legend>
            <p className="hint">
              Create recordings in the media library, then attach them here.
            </p>
            <div className="field">
              <label htmlFor="media-search">Find a recording</label>
              <input
                id="media-search"
                type="search"
                value={mediaSearch}
                onChange={(e) => setMediaSearch(e.target.value)}
              />
            </div>
            {selectedMedia.map((id) => (
              <input key={id} type="hidden" name="media_ids" value={id} />
            ))}
            <div className="check-list">
              {media.map((m) => (
                <label
                  key={m.id}
                  hidden={
                    !`${m.title} ${m.kind}`
                      .toLocaleLowerCase()
                      .includes(mediaSearch.toLocaleLowerCase())
                  }
                >
                  <input
                    type="checkbox"
                    value={m.id}
                    checked={selectedMedia.includes(m.id)}
                    onChange={(e) =>
                      setSelectedMedia(
                        e.target.checked
                          ? [...selectedMedia, m.id]
                          : selectedMedia.filter((id) => id !== m.id),
                      )
                    }
                  />
                  {m.title} · {m.kind} · {m.status}
                </label>
              ))}
            </div>
            <p className="hint">
              {selectedMedia.length} recordings attached. Maximum 30.
            </p>
            {!media.length && <p>No recordings yet.</p>}
          </fieldset>
        )}
        <fieldset disabled={pending || locked || importing}>
          <legend>Publication & provenance</legend>
          <div className="stack">
            <LongField
              name="rights_note"
              label="Source, attribution & rights notes (required to publish)"
              initial={record?.rights_note}
            />
            <div className="field">
              <label htmlFor="status">Publication status</label>
              <PersistedSelect
                name="status"
                id="status"
                defaultValue={record?.status || "draft"}
              >
                <option value="draft">Draft — private to staff</option>
                {role === "admin" && (
                  <option value="published">
                    Published — visible to everyone
                  </option>
                )}
              </PersistedSelect>
            </div>
            <p className="hint">
              Publish the author profile before a work. Publish recordings
              before they appear on public pages. Video captions need a
              CORS-enabled WebVTT URL.
            </p>
          </div>
        </fieldset>
        <div className="editor-actions studio-savebar">
          <button
            className="button"
            name="intent"
            value="save"
            disabled={pending || locked || importing}
          >
            {pending
              ? "Saving…"
              : publication === "published"
                ? "Publish changes ↗"
                : "Save draft ↗"}
          </button>
          <span>
            {locked
              ? "Ask an administrator to edit this published record."
              : publication === "published"
                ? "These changes will be visible on the website."
                : "Drafts are only visible to your editorial team."}
          </span>
        </div>
        {record?.id && !locked && (
          <details className="editor-delete">
            <summary>Delete this record</summary>
            <p>
              Deletion cannot be undone. Records used by another work must be
              detached first.
            </p>
            <label className="flex items-center gap-2">
              <input name="confirm_delete" type="checkbox" value="yes" />
              Confirm permanent deletion
            </label>
            <button
              className="button danger"
              name="intent"
              value="delete"
              formNoValidate
              disabled={pending}
            >
              Delete record
            </button>
          </details>
        )}
      </form>
    </FieldErrors.Provider>
  );
}
