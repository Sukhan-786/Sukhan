"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  poetryProgress,
  importPoetryBatch,
} from "@/app/admin/import-poetry/actions";
import {
  poetryManifest,
  readPoetryLines,
  type PoetryProgress,
  type PoetryRow,
} from "@/lib/poetry-import";
export function PoetryImporter({ initial }: { initial: PoetryProgress[] }) {
  const [progress, setProgress] = useState(initial),
    [running, setRunning] = useState(false),
    [review, setReview] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const paused = useRef(false);
  useEffect(
    () => () => {
      paused.current = true;
    },
    [],
  );
  const processed = progress.reduce((n, p) => n + p.processed, 0),
    inserted = progress.reduce((n, p) => n + p.inserted, 0),
    skipped = progress.reduce((n, p) => n + p.skipped, 0),
    complete = processed === poetryManifest.total_rows;
  function update(p: PoetryProgress) {
    setProgress((previous) =>
      previous.map((v) => (v.source_id === p.source_id ? p : v)),
    );
  }
  async function start() {
    setRunning(true);
    setError("");
    paused.current = false;
    try {
      const latest = await poetryProgress();
      setProgress(latest);
      for (const dataset of poetryManifest.datasets) {
        let saved = latest.find((p) => p.source_id === dataset.id);
        if (!saved || saved.total !== dataset.rows)
          throw Error("The database and source manifest do not match.");
        if (saved.processed === dataset.rows) continue;
        for (const shard of dataset.shards) {
          if (shard.offset + shard.rows <= saved.processed) continue;
          if (paused.current) {
            setMessage("Paused. Saved progress is kept.");
            return;
          }
          setMessage(
            `Checking ${dataset.label}: source part ${dataset.shards.indexOf(shard) + 1} of ${dataset.shards.length}…`,
          );
          const response = await fetch(`/data/poetry/${shard.file}`, {
            cache: "no-store",
          });
          if (!response.ok)
            throw Error("A poetry source file could not be downloaded.");
          const bytes = await response.arrayBuffer();
          if (bytes.byteLength !== shard.bytes)
            throw Error("Source file size mismatch. Import stopped.");
          const hash = Array.from(
            new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
            (v) => v.toString(16).padStart(2, "0"),
          ).join("");
          if (hash !== shard.sha256)
            throw Error("The source checksum does not match. Import stopped.");
          let count = 0,
            batch: PoetryRow[] = [],
            batchBytes = 2;
          async function commit() {
            if (!saved || !batch.length) return;
            const expected = saved.processed + batch.length;
            saved = await importPoetryBatch({
              source_id: dataset.id,
              offset: saved.processed,
              rows: batch,
            });
            update(saved);
            batch = [];
            batchBytes = 2;
            if (saved.processed !== expected)
              throw Error(
                "Another import window changed progress. Resume to continue from the saved point.",
              );
          }
          setMessage(`Importing ${dataset.label}…`);
          for await (const row of readPoetryLines(
            new Blob([bytes])
              .stream()
              .pipeThrough(new DecompressionStream("gzip")),
          )) {
            const position = shard.offset + count++;
            if (position < saved.processed) continue;
            if (paused.current) {
              setMessage("Paused. Resume to continue safely.");
              return;
            }
            const size =
              new TextEncoder().encode(JSON.stringify(row)).length + 1;
            if (
              batch.length &&
              (batch.length >= 200 || batchBytes + size > 750000)
            ) {
              await commit();
              if (paused.current) {
                setMessage("Paused. Saved progress is kept.");
                return;
              }
            }
            batch.push(row);
            batchBytes += size;
          }
          if (count !== shard.rows)
            throw Error("Unexpected source row count. Import stopped.");
          await commit();
        }
      }
      setMessage(
        "Import complete. Source attributions are kept on every published work. Translations can now be added in the poem editor.",
      );
    } catch (e) {
      const detail = e instanceof Error ? e.message : "";
      setMessage("");
      setError(
        /Minified React error|Server Components render/.test(detail)
          ? "The server request was interrupted. Your saved progress is safe. Resume the import to continue."
          : detail || "Import stopped. Resume to retry safely.",
      );
    } finally {
      setRunning(false);
    }
  }
  return (
    <section className="poetry-import-panel">
      <h2>
        {poetryManifest.total_rows.toLocaleString()} unique literary works
      </h2>
      <p>
        Urdu ghazals and couplets, plus Persian poems and literary texts, from{" "}
        {poetryManifest.authors} credited authors. Exact duplicates have been
        removed. Roman Urdu is a script version, not an English translation.
      </p>
      <p>
        Existing profiles and works remain unchanged. Conflicting entries are
        skipped for manual review. No translations, recordings, biographies or
        poet dates are generated.
      </p>
      <Link href="/poetry-sources">
        Source files, attribution and import details →
      </Link>
      <div className="poetry-import-progress">
        <label htmlFor="poetry-progress">Poetry import progress</label>
        <progress
          id="poetry-progress"
          max={poetryManifest.total_rows}
          value={processed}
        />
        <p>
          {processed.toLocaleString()} /{" "}
          {poetryManifest.total_rows.toLocaleString()} processed ·{" "}
          {inserted.toLocaleString()} new works saved
          {skipped
            ? ` · ${skipped.toLocaleString()} conflicts left unchanged`
            : ""}
        </p>
      </div>
      <ul>
        {poetryManifest.datasets.map((d) => {
          const p = progress.find((x) => x.source_id === d.id);
          return (
            <li key={d.id}>
              {d.label}
              <strong>
                {p?.processed.toLocaleString() || 0} / {d.rows.toLocaleString()}
              </strong>
            </li>
          );
        })}
      </ul>
      {!complete && (
        <label className="meaning-review-check">
          <input
            type="checkbox"
            checked={review}
            onChange={(e) => setReview(e.target.checked)}
            disabled={running}
          />
          I have checked the supplied source notices and want to import and
          publish these texts.
        </label>
      )}
      {error && (
        <p role="alert" className="editor-error">
          {error}
        </p>
      )}
      <p role="status">{message}</p>
      <button
        type="button"
        className="button"
        disabled={running || complete || !review}
        onClick={() => void start()}
      >
        {complete
          ? "Poetry import complete"
          : processed
            ? "Resume poetry import"
            : "Import and publish supplied poetry"}
      </button>
      {running && (
        <button
          type="button"
          className="button secondary"
          onClick={() => {
            paused.current = true;
          }}
        >
          Pause after current batch
        </button>
      )}
    </section>
  );
}
