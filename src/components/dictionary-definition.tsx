import Link from "next/link";
import { spellingFields, type DictionaryEntry } from "@/lib/dictionary";
import {
  languageDirection,
  languageLabels,
  languageTags,
  type Language,
} from "@/lib/types";
export function DictionaryDefinition({
  entry,
  fullLink = true,
}: {
  entry: DictionaryEntry;
  fullLink?: boolean;
}) {
  const Heading = fullLink ? "h3" : "h2";
  return (
    <article
      className="dictionary-definition"
      aria-label={`Dictionary entry ${entry.word_id}`}
    >
      <Heading lang="ur-Latn">{entry.roman || entry.word_id}</Heading>
      <dl className="dictionary-spellings">
        {Object.entries(spellingFields).map(([language, field]) =>
          entry[field] ? (
            <div key={field}>
              <dt>{languageLabels[language as Language]}</dt>
              <dd
                lang={languageTags[language as Language]}
                dir={languageDirection(language as Language)}
              >
                {entry[field]}
              </dd>
            </div>
          ) : null,
        )}
      </dl>
      <p className="dictionary-pos">{entry.part_of_speech}</p>
      <ul>
        {entry.english_meanings.map((m, i) => (
          <li key={i}>{m}</li>
        ))}
      </ul>
      {entry.root_word && (
        <p>
          Root word: <span dir="auto">{entry.root_word}</span>
        </p>
      )}
      {entry.audio_url && (
        <div>
          <p>Pronunciation: {entry.roman || entry.word_id}</p>
          <audio
            controls
            preload="none"
            src={entry.audio_url}
            aria-label={`Pronunciation of ${entry.roman || entry.word_id}`}
          >
            Your browser does not support audio playback.
          </audio>
        </div>
      )}
      <p className="meaning-source" dir="auto">
        Source: {entry.source_note}
      </p>
      {fullLink && (
        <Link href={`/dictionary/${entry.word_id}`}>
          View full entry in Sukhan Dictionary →
        </Link>
      )}
    </article>
  );
}
