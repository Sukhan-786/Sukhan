"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  importWordBankBatch,
  wordBankProgress,
} from "@/app/admin/dictionary/word-bank/actions";
import {
  readWordBankLines,
  wordBankHash,
  wordBankTotal,
  type WordBankRow,
  type WordBankProgress,
} from "@/lib/word-bank";
export function WordBankImporter({ initial }: { initial: WordBankProgress }) {
  const [progress, setProgress] = useState(initial),
    [running, setRunning] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const paused = useRef(false);
  useEffect(
    () => () => {
      paused.current = true;
    },
    [],
  );
  async function start() {
    setRunning(true);
    setError("");
    paused.current = false;
    let count = 0;
    try {
      let saved = await wordBankProgress();
      setProgress(saved);
      if (saved.processed === wordBankTotal) {
        setMessage("The source word bank has been imported.");
        return;
      }
      setMessage("Checking the source file…");
      const response = await fetch("/data/urdu-word-bank.jsonl.gz", {
        cache: "no-store",
      });
      if (!response.ok) throw Error("Source file could not be downloaded.");
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength > 4000000)
        throw Error("Unexpected source file size.");
      const hash = Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
        (v) => v.toString(16).padStart(2, "0"),
      ).join("");
      if (hash !== wordBankHash)
        throw Error("The source file checksum does not match. Import stopped.");
      let batch: WordBankRow[] = [];
      setMessage("Importing word forms and candidate weights…");
      for await (const row of readWordBankLines(
        new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip")),
      )) {
        if (paused.current) {
          setMessage(
            "Paused. Saved progress is kept; resume whenever you are ready.",
          );
          return;
        }
        if (count++ < saved.processed) continue;
        batch.push(row);
        if (batch.length === 1000) {
          saved = await importWordBankBatch({
            offset: saved.processed,
            rows: batch,
          });
          setProgress(saved);
          batch = [];
        }
      }
      if (count !== wordBankTotal)
        throw Error("The source row count does not match.");
      if (batch.length) {
        saved = await importWordBankBatch({
          offset: saved.processed,
          rows: batch,
        });
        setProgress(saved);
      }
      setMessage(
        `Import complete: ${saved.inserted.toLocaleString()} word forms. Arabic definitions still need to be added and reviewed.`,
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Import stopped. Resume to retry from saved progress.",
      );
    } finally {
      setRunning(false);
    }
  }
  return (
    <section className="word-bank-import" aria-label="Bulk Urdu word import">
      <h2>Import the Urdu word bank</h2>
      <p>
        154,781 word forms · 130,445 with sourced wazan candidates · 0 supplied
        Arabic definitions. Existing reviewed dictionary entries are never
        overwritten.
      </p>
      <p>
        Words: UrduHack (MIT). Wazan data: Aruuz Nigar (GPL-3.0).{" "}
        <Link href="/dictionary/sources">Read source notes and licenses</Link>.
      </p>
      <progress
        value={progress.processed}
        max={wordBankTotal}
        aria-label="Word bank import progress"
      />
      <p role="status">
        {progress.processed.toLocaleString()} / {wordBankTotal.toLocaleString()}{" "}
        source rows processed · {progress.inserted.toLocaleString()} new forms
        saved.
      </p>
      <p role="status">{message}</p>
      {error && <p role="alert">{error}</p>}
      <button
        type="button"
        className="button"
        onClick={start}
        disabled={running || progress.processed === wordBankTotal}
      >
        {progress.processed === wordBankTotal
          ? "Import complete"
          : progress.processed
            ? "Resume word bank import"
            : "Import 154,781 Urdu word forms"}
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
      <p>
        Keep this page open while importing. A pause, refresh or lost connection
        can be resumed without duplicate entries.
      </p>
    </section>
  );
}
