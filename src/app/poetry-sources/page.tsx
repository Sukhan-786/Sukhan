import type { Metadata } from "next";
import Link from "next/link";
import { poetryManifest } from "@/lib/poetry-import";
export const metadata: Metadata = {
  title: "Poetry sources & attribution",
  description:
    "Provenance and source notices for the Urdu and Persian poetry supplied to Sukhan.",
  alternates: { canonical: "/poetry-sources" },
};
export default function Page() {
  return (
    <div className="page-shell">
      <div className="page-heading">
        <p className="eyebrow">The library’s sources</p>
        <h1>Poetry sources & attribution</h1>
        <p>
          The site owner supplied these datasets. Each imported work keeps its
          credited author and source note.
        </p>
      </div>
      <section className="provenance">
        <h2>Urdu literature</h2>
        <p>
          The supplied ghazal and couplet datasets credit Rekhta. These source
          notices do not assert an independent license for the underlying poems.
          Urdu, Devanagari and Roman Urdu texts are preserved where supplied;
          Roman Urdu is transliteration, not English translation.
        </p>
        <h2>Persian literature</h2>
        <p>
          The supplied Chronological Persian Poetry Dataset describes its source
          as the Ganjoor database and includes a Creative Commons
          Attribution-ShareAlike 4.0 license. Changes made for this import:
          source space separators restored as line or paragraph breaks, Unicode
          NFC normalization and exact duplicate removal. The adapted Persian
          dataset is shared under the same CC BY-SA 4.0 terms.
        </p>
        <p>
          <a href="/data/poetry/PERSIAN-CC-BY-SA-4.0.txt">
            Read the supplied Persian dataset license
          </a>
          {" · "}
          <a href="/data/poetry/README.txt">Import and adaptation notes</a>
        </p>
        <h2>What is included</h2>
        <ul>
          {poetryManifest.datasets.map((d) => (
            <li key={d.id}>
              {d.label}: {d.rows.toLocaleString()} prepared records from{" "}
              {d.input_rows.toLocaleString()} source rows;{" "}
              {d.duplicates_removed} exact duplicates removed.
            </li>
          ))}
        </ul>
        <p>
          These are prepared source counts; public availability depends on
          completion of the administrator import. No translations, audio
          recordings, images, biographies or dates were supplied by this import.
          The separate normalized and stopword-removed line corpus was excluded
          to avoid duplicating or altering complete literary works.
        </p>
        <p>
          <a href="/data/poetry/manifest.json">
            Source checksums and downloadable shard manifest
          </a>
        </p>
        <h2>Corrections</h2>
        <p>
          Imported transcriptions and attributions can need correction. Editors
          can revise a text and its source notes in the studio; administrators
          review publication.
        </p>
        <Link href="/catalogue">Explore the library →</Link>
      </section>
    </div>
  );
}
