"use client";
import { useActionState, useState } from "react";
import { saveRecord } from "@/app/admin/actions";
import {
  forms,
  languages,
  languageLabels,
  languageTags,
  type Artist,
  type Kalam,
  type Media,
  type StaffRole,
  type Language,
} from "@/lib/types";
export type Editable = Partial<
  Omit<Artist, "kind"> & Omit<Kalam, "poet"> & Omit<Media, "kind">
> & { kind?: string };
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
  dir?: "rtl";
}) {
  const [current, setCurrent] = useState(initial);
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
        maxLength={
          name === "url" || name === "caption_url"
            ? 2048
            : name === "slug"
              ? 120
              : 300
        }
      />
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
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <textarea
        id={name}
        name={name}
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        maxLength={
          name === "transcript" ? 100000 : name === "bio" ? 12000 : 2000
        }
      />
    </div>
  );
}
function PersistedSelect({
  defaultValue,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const [value, setValue] = useState(defaultValue);
  return (
    <select
      {...props}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
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
  artists: Artist[];
  media: Media[];
  role: StaffRole;
}) {
  const action = saveRecord.bind(null, kind, record?.id || null);
  const [state, formAction, pending] = useActionState(action, { error: "" });
  const [selectedMedia, setSelectedMedia] = useState<string[]>(
    record?.media?.map((m) => m.id) || [],
  );
  const [language, setLanguage] = useState<Language>("ur");
  const [bodies, setBodies] = useState<Record<string, string>>(
    Object.fromEntries(record?.texts?.map((t) => [t.language, t.body]) || []),
  );
  const [preview, setPreview] = useState(false);
  const locked = role === "editor" && record?.status === "published";
  return (
    <form action={formAction} className="editor stack">
      <input type="hidden" name="version" value={record?.updated_at || ""} />
      {locked && (
        <p className="notice">
          Published records can only be changed by an administrator.
        </p>
      )}
      <fieldset disabled={pending || locked}>
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
              <Field name="name" label="Name" initial={record?.name} required />
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
        <fieldset disabled={pending || locked}>
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
              >
                {languageLabels[l]}
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
              <Field
                name={`${l}_title`}
                label={`${languageLabels[l]} title`}
                initial={record?.texts?.find((t) => t.language === l)?.title}
                dir={l === "ur" || l === "fa" ? "rtl" : undefined}
              />
              <div className="field">
                <label htmlFor={`${l}_body`}>{languageLabels[l]} text</label>
                <textarea
                  className="poem-editor"
                  id={`${l}_body`}
                  name={`${l}_body`}
                  dir={l === "ur" || l === "fa" ? "rtl" : "ltr"}
                  value={bodies[l] || ""}
                  onChange={(e) =>
                    setBodies({ ...bodies, [l]: e.target.value })
                  }
                  maxLength={100000}
                />
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
              dir={language === "ur" || language === "fa" ? "rtl" : "ltr"}
            >
              {bodies[language] || "No text in this script yet."}
            </div>
          )}
        </fieldset>
      )}
      {kind === "kalam" && (
        <fieldset disabled={pending || locked}>
          <legend>Related audio & video</legend>
          <p className="hint">
            Create recordings in the media library, then attach them here.
          </p>
          <div className="check-list">
            {media.map((m) => (
              <label key={m.id}>
                <input
                  type="checkbox"
                  name="media_ids"
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
          {!media.length && <p>No recordings yet.</p>}
        </fieldset>
      )}
      <fieldset disabled={pending || locked}>
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
            Publish the author profile before a work. Publish recordings before
            they appear on public pages. Video captions need a CORS-enabled
            WebVTT URL.
          </p>
        </div>
      </fieldset>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      <div className="editor-actions">
        <button
          className="button"
          name="intent"
          value="save"
          disabled={pending || locked}
        >
          {pending ? "Saving…" : "Save changes ↗"}
        </button>
        {record?.id && !locked && (
          <>
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
          </>
        )}
      </div>
    </form>
  );
}
