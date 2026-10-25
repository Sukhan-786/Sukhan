"use client";
import { useEffect, useState } from "react";
import type { DictionaryEntry } from "@/lib/dictionary";
import type { Language } from "@/lib/types";
import { DictionaryDefinition } from "./dictionary-definition";
export function DictionaryLookup({
  word,
  language,
}: {
  word: string;
  language: Language;
}) {
  const [state, setState] = useState<{
    entries: DictionaryEntry[];
    loading: boolean;
    error: string;
  }>({ entries: [], loading: true, error: "" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/dictionary?${new URLSearchParams({ word, language })}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok)
          throw Error("Dictionary lookup could not be completed.");
        const data = (await response.json()) as { entries: DictionaryEntry[] };
        if (!controller.signal.aborted)
          setState({ entries: data.entries, loading: false, error: "" });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setState({
            entries: [],
            loading: false,
            error: "Dictionary lookup is unavailable. Please try again.",
          });
      });
    return () => controller.abort();
  }, [word, language, attempt]);
  return (
    <div aria-busy={state.loading}>
      <p className="meaning-reviewed">Shared dictionary · general meanings</p>
      {state.loading && <p role="status">Looking up this word…</p>}
      {state.error && (
        <>
          <p role="alert">{state.error}</p>
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              setState({ entries: [], loading: true, error: "" });
              setAttempt((n) => n + 1);
            }}
          >
            Try lookup again
          </button>
        </>
      )}
      {!state.loading && !state.error && state.entries.length === 0 && (
        <p>
          No reviewed dictionary entry is available for this word in this script
          yet.
        </p>
      )}
      {state.entries.map((entry) => (
        <DictionaryDefinition
          key={entry.id}
          entry={entry}
          showHeading={state.entries.length > 1}
        />
      ))}
    </div>
  );
}
