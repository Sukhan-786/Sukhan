"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import {
  saveHomepageDraft,
  publishHomepage,
  uploadHomepageImage,
} from "@/app/admin/homepage/actions";
import {
  homepageSectionTypes,
  homepageSectionLabels,
  newHomepageSection,
  type HomepageConfig,
  type HomepageSection,
} from "@/lib/homepage";
import { languages, languageLabels, type StaffRole } from "@/lib/types";
import { useClientReady } from "@/lib/use-client-ready";
import { useUnsavedChanges } from "@/lib/use-unsaved-changes";
import { HomepageResourcePicker } from "./homepage-resource-picker";
export function HomepageEditor({
  initial,
  draftVersion,
  publicVersion,
  role,
  labels,
}: {
  initial: HomepageConfig;
  draftVersion: string;
  publicVersion: string;
  role: StaffRole;
  labels: Record<string, string>;
}) {
  const [resolvedLabels, setResolvedLabels] = useState(labels);
  const rememberLabels = (next: Record<string, string>) =>
    setResolvedLabels((prev) => ({ ...prev, ...next }));
  const ready = useClientReady(),
    [config, setConfig] = useState(initial),
    [selected, setSelected] = useState(initial.sections[0]?.id || ""),
    [newType, setNewType] = useState<HomepageSection["type"]>("text"),
    [dirty, setDirty] = useState(false),
    [uploading, setUploading] = useState(false),
    [uploadError, setUploadError] = useState("");
  const [state, save, pending] = useActionState(saveHomepageDraft, {
      error: "",
    }),
    [publishState, publish, publishing] = useActionState(publishHomepage, {
      error: "",
    });
  useUnsavedChanges(
    dirty,
    pending || publishing,
    "Leave without saving your homepage changes?",
  );
  const section = config.sections.find((s) => s.id === selected),
    index = config.sections.findIndex((s) => s.id === selected);
  const busy = !ready || pending || publishing || uploading;
  function change(next: HomepageConfig) {
    setConfig(next);
    setDirty(true);
  }
  function patch(values: Partial<HomepageSection>) {
    if (section)
      change({
        ...config,
        sections: config.sections.map((s) =>
          s.id === section.id ? { ...s, ...values } : s,
        ),
      });
  }
  function move(from: number, to: number) {
    if (to < 0 || to >= config.sections.length) return;
    const sections = [...config.sections];
    [sections[from], sections[to]] = [sections[to], sections[from]];
    change({ ...config, sections });
  }
  function textField(label: string, name: keyof HomepageSection, max = 1000) {
    if (!section) return null;
    return (
      <label>
        {label}
        <input
          value={String(section[name])}
          onChange={(e) => patch({ [name]: e.target.value })}
          maxLength={max}
        />
      </label>
    );
  }
  async function imageUpload(file: File | undefined, slideIndex: number) {
    if (!file || !section) return;
    setUploading(true);
    setUploadError("");
    try {
      const form = new FormData();
      form.set("image", file);
      const result = await uploadHomepageImage(form);
      if (result.error) throw Error(result.error);
      if (result.url)
        patch({
          slides: section.slides.map((s, i) =>
            i === slideIndex ? { ...s, image_url: result.url! } : s,
          ),
        });
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Image upload failed.");
    } finally {
      setUploading(false);
    }
  }
  return (
    <div className="homepage-builder">
      <div className="homepage-builder-top">
        <p>{dirty ? "Unsaved changes" : "Saved draft ready to preview"}</p>
        <Link
          className="button secondary"
          href="/admin/homepage/preview"
          target="_blank"
          rel="noreferrer"
          aria-disabled={dirty || busy}
          tabIndex={dirty || busy ? -1 : 0}
          onClick={(e) => {
            if (dirty || busy) e.preventDefault();
          }}
        >
          Preview saved draft ↗
        </Link>
        {role === "admin" && (
          <form action={publish}>
            <input type="hidden" name="draft_version" value={draftVersion} />
            <input type="hidden" name="public_version" value={publicVersion} />
            <button className="button" disabled={busy || dirty}>
              {publishing ? "Publishing…" : "Publish saved homepage"}
            </button>
          </form>
        )}
      </div>
      {publishState.error && <p role="alert">{publishState.error}</p>}
      <form action={save} aria-busy={pending} className="homepage-builder-form">
        <input type="hidden" name="config" value={JSON.stringify(config)} />
        <input type="hidden" name="version" value={draftVersion} />
        {state.error && <p role="alert">{state.error}</p>}
        <fieldset disabled={busy} className="homepage-section-list">
          <legend>Homepage sections</legend>
          <ol>
            {config.sections.map((s, i) => (
              <li key={s.id} className={s.id === selected ? "selected" : ""}>
                <button
                  type="button"
                  onClick={() => setSelected(s.id)}
                  aria-pressed={s.id === selected}
                >
                  {s.title || homepageSectionLabels[s.type]}
                </button>
                <span>{s.enabled ? "Visible" : "Hidden"}</span>
                <div>
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => move(i, i - 1)}
                    aria-label={`Move ${s.title} up`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={i === config.sections.length - 1}
                    onClick={() => move(i, i + 1)}
                    aria-label={`Move ${s.title} down`}
                  >
                    ↓
                  </button>
                </div>
              </li>
            ))}
          </ol>
          <label htmlFor="homepage-add-type">New section type</label>
          <select
            id="homepage-add-type"
            value={newType}
            onChange={(e) => setNewType(e.target.value as typeof newType)}
          >
            {homepageSectionTypes.map((t) => (
              <option key={t} value={t}>
                {homepageSectionLabels[t]}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="button secondary"
            disabled={config.sections.length >= 12}
            onClick={() => {
              const s = newHomepageSection(newType, crypto.randomUUID());
              change({ ...config, sections: [...config.sections, s] });
              setSelected(s.id);
            }}
          >
            Add section
          </button>
          <small>
            Up to 12 sections. Use the arrow buttons to change their order.
          </small>
        </fieldset>
        <fieldset disabled={busy} className="editor homepage-section-fields">
          <legend>
            {section ? homepageSectionLabels[section.type] : "Select a section"}
          </legend>
          {section && (
            <>
              <label className="meaning-review-check">
                <input
                  type="checkbox"
                  checked={section.enabled}
                  onChange={(e) => patch({ enabled: e.target.checked })}
                />
                Show this section
              </label>
              {textField("Section title", "title", 120)}
              {section.type === "banner" ? (
                <>
                  {section.slides.map((slide, i) => (
                    <fieldset className="homepage-slide" key={i}>
                      <legend>Banner slide {i + 1}</legend>
                      {(
                        [
                          ["eyebrow", "Small label", 100],
                          ["title", "Banner heading", 120],
                          ["subtitle", "Banner subtitle", 240],
                          ["urdu", "Urdu display text", 100],
                          ["href", "Banner link", 2048],
                          ["button_label", "Banner button text", 60],
                          ["image_url", "Banner image URL", 2048],
                        ] as const
                      ).map(([key, label, max]) => (
                        <label key={key}>
                          {label}
                          <input
                            value={slide[key]}
                            onChange={(e) =>
                              patch({
                                slides: section.slides.map((s, n) =>
                                  n === i ? { ...s, [key]: e.target.value } : s,
                                ),
                              })
                            }
                            maxLength={max}
                            dir={key === "urdu" ? "rtl" : undefined}
                            lang={key === "urdu" ? "ur" : undefined}
                          />
                        </label>
                      ))}
                      {role === "admin" && (
                        <label>
                          Upload banner image
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/avif"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              e.target.value = "";
                              void imageUpload(file, i);
                            }}
                          />
                        </label>
                      )}
                      <small>
                        Use a wide image, ideally 1920 × 1080. JPG, PNG, WebP or
                        AVIF, under 3 MB. Uploaded banner images are public.
                      </small>
                      <button
                        type="button"
                        className="text-link"
                        disabled={section.slides.length === 1}
                        onClick={() =>
                          patch({
                            slides: section.slides.filter((_, n) => n !== i),
                          })
                        }
                      >
                        Remove banner slide {i + 1}
                      </button>
                    </fieldset>
                  ))}
                  {uploadError && <p role="alert">{uploadError}</p>}
                  {uploading && <p role="status">Uploading image…</p>}
                  <button
                    type="button"
                    className="button secondary"
                    disabled={section.slides.length >= 5}
                    onClick={() =>
                      patch({
                        slides: [
                          ...section.slides,
                          newHomepageSection("banner", "unused").slides[0],
                        ],
                      })
                    }
                  >
                    Add banner slide
                  </button>
                </>
              ) : section.type === "collections" ? (
                <>
                  {section.cards.map((card, i) => (
                    <fieldset key={i}>
                      <legend>Collection card {i + 1}</legend>
                      {(
                        [
                          ["title", "Card title", 80],
                          ["description", "Card description", 180],
                          ["urdu", "Card Urdu text", 80],
                          ["href", "Card link", 2048],
                        ] as const
                      ).map(([key, label, max]) => (
                        <label key={key}>
                          {label}
                          <input
                            value={card[key]}
                            onChange={(e) =>
                              patch({
                                cards: section.cards.map((c, n) =>
                                  n === i ? { ...c, [key]: e.target.value } : c,
                                ),
                              })
                            }
                            maxLength={max}
                          />
                        </label>
                      ))}
                      <button
                        type="button"
                        className="text-link"
                        onClick={() =>
                          patch({
                            cards: section.cards.filter((_, n) => n !== i),
                          })
                        }
                      >
                        Remove collection card {i + 1}
                      </button>
                    </fieldset>
                  ))}
                  <button
                    type="button"
                    className="button secondary"
                    disabled={section.cards.length >= 8}
                    onClick={() =>
                      patch({
                        cards: [
                          ...section.cards,
                          {
                            title: "New collection",
                            description: "",
                            urdu: "",
                            href: "/catalogue",
                          },
                        ],
                      })
                    }
                  >
                    Add collection card
                  </button>
                </>
              ) : (
                <>
                  {["word", "text", "artists"].includes(section.type) &&
                    textField("Description", "description", 1000)}
                  {["word", "text"].includes(section.type) && (
                    <>
                      <label htmlFor="homepage-section-body">
                        Section text
                      </label>
                      <textarea
                        id="homepage-section-body"
                        value={section.body}
                        onChange={(e) => patch({ body: e.target.value })}
                        maxLength={3000}
                        rows={5}
                        dir="auto"
                      />
                    </>
                  )}
                  {section.type === "word" && (
                    <>
                      {textField("Word in Roman letters", "roman", 100)}
                      {textField("Word in Urdu", "urdu", 500)}
                    </>
                  )}
                  {["daily", "library"].includes(section.type) && (
                    <>
                      <label htmlFor="homepage-reading-language">
                        Preferred reading script
                      </label>
                      <select
                        id="homepage-reading-language"
                        value={section.language}
                        onChange={(e) =>
                          patch({
                            language: e.target
                              .value as HomepageSection["language"],
                          })
                        }
                      >
                        {languages.map((l) => (
                          <option key={l} value={l}>
                            {languageLabels[l]}
                          </option>
                        ))}
                      </select>
                      <HomepageResourcePicker
                        key={section.id}
                        kind="kalam"
                        value={section.kalam_ids}
                        onChange={(kalam_ids) => patch({ kalam_ids })}
                        labels={resolvedLabels}
                        onResolvedLabels={rememberLabels}
                      />
                    </>
                  )}
                  {section.type === "artists" && (
                    <HomepageResourcePicker
                      key={section.id}
                      kind="artist"
                      value={section.artist_ids}
                      onChange={(artist_ids) => patch({ artist_ids })}
                      labels={resolvedLabels}
                      onResolvedLabels={rememberLabels}
                    />
                  )}
                  {["daily", "library", "artists"].includes(section.type) && (
                    <label>
                      Maximum items
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={section.limit}
                        onChange={(e) =>
                          patch({ limit: Number(e.target.value) })
                        }
                      />
                    </label>
                  )}
                  {section.type !== "daily" && (
                    <>
                      {textField("Section link", "href", 2048)}
                      {textField("Button text", "button_label", 80)}
                    </>
                  )}
                </>
              )}
              <button
                type="button"
                className="text-link"
                disabled={config.sections.length === 1}
                onClick={() => {
                  const sections = config.sections.filter(
                    (_, i) => i !== index,
                  );
                  change({ ...config, sections });
                  setSelected(sections[0].id);
                }}
              >
                Remove this section
              </button>
            </>
          )}
        </fieldset>
        <fieldset disabled={busy} className="editor homepage-seo">
          <legend>Homepage search appearance</legend>
          <label>
            SEO title
            <input
              value={config.seo_title}
              onChange={(e) => change({ ...config, seo_title: e.target.value })}
              maxLength={100}
              required
            />
          </label>
          <label htmlFor="homepage-seo-description">SEO description</label>
          <textarea
            id="homepage-seo-description"
            value={config.seo_description}
            onChange={(e) =>
              change({ ...config, seo_description: e.target.value })
            }
            maxLength={200}
            rows={3}
            required
          />
          <small>
            These settings change the published homepage title and description
            after publishing. Search engines decide when to refresh their
            results.
          </small>
        </fieldset>
        <button className="button homepage-save" type="submit" disabled={busy}>
          {pending ? "Saving draft…" : "Save homepage draft"}
        </button>
      </form>
    </div>
  );
}
