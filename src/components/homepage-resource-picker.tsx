"use client";
import { useState } from "react";
export function HomepageResourcePicker({
  kind,
  value,
  onChange,
  labels,
  onResolvedLabels,
}: {
  kind: "kalam" | "artist";
  value: string[];
  onChange: (ids: string[]) => void;
  labels: Record<string, string>;
  onResolvedLabels: (labels: Record<string, string>) => void;
}) {
  const [known, setKnown] = useState(labels),
    [q, setQ] = useState(""),
    [items, setItems] = useState<{ id: string; label: string }[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function search() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(
        "/api/admin/homepage-choices?" + new URLSearchParams({ kind, q }),
        { cache: "no-store" },
      );
      if (!r.ok) throw Error("Published choices could not be loaded.");
      const found = (await r.json()).items as { id: string; label: string }[];
      setItems(found);
      onResolvedLabels(Object.fromEntries(found.map((i) => [i.id, i.label])));
      setKnown((prev) => ({
        ...prev,
        ...Object.fromEntries(found.map((i) => [i.id, i.label])),
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <fieldset className="homepage-picker">
      <legend>
        {kind === "kalam"
          ? "Choose published poetry"
          : "Choose published artists"}
      </legend>
      <p>
        Leave the selection empty to show recent published items. Selected items
        appear in the order added.
      </p>
      <label>
        Search published {kind === "kalam" ? "poetry" : "artists"}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxLength={160}
        />
      </label>
      <button
        type="button"
        className="button secondary"
        onClick={search}
        disabled={busy}
      >
        {busy ? "Searching…" : "Search choices"}
      </button>
      {error && <p role="alert">{error}</p>}
      <ul>
        {value.map((id) => (
          <li key={id}>
            <span dir="auto">
              {known[id] ||
                items.find((i) => i.id === id)?.label ||
                "Published selection"}
            </span>
            <button
              type="button"
              className="text-link"
              aria-label={`Remove ${known[id] || "selection"}`}
              onClick={() => onChange(value.filter((v) => v !== id))}
            >
              Remove selection
            </button>
          </li>
        ))}
      </ul>
      <ul>
        {items
          .filter((i) => !value.includes(i.id))
          .map((i) => (
            <li key={i.id}>
              <span dir="auto">{i.label}</span>
              <button
                type="button"
                className="text-link"
                aria-label={`Add ${i.label}`}
                disabled={value.length >= 12}
                onClick={() => onChange([...value, i.id])}
              >
                Add selection
              </button>
            </li>
          ))}
      </ul>
      <small>
        Only published works and profiles can appear on the public homepage.
      </small>
    </fieldset>
  );
}
