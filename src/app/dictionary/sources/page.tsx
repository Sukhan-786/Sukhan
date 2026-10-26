import Link from "next/link";
export const metadata = { title: "Dictionary data sources | Sukhan" };
export default function Page() {
  return (
    <section className="section">
      <h1>Dictionary data sources</h1>
      <p>
        The source word bank contains 154,781 Urdu word forms and compounds. It
        is a spelling resource, not a complete dictionary of definitions.
        130,445 forms have source wazan candidates. None of these imported
        candidates are marked as editor-reviewed.
      </p>
      <p>
        Arabic meanings are added and reviewed separately. Missing meanings
        remain empty. Reviewed Sukhan entries take priority over source
        candidates.
      </p>
      <h2>Word forms · MIT</h2>
      <p>
        Copyright 2018 UrduHack. Underscores in compound forms are displayed as
        spaces; Unicode is normalized to NFC.
      </p>
      <p>
        <a href="https://github.com/urduhack/urdu-words/tree/c37cc6fcf903c4b6c954c9b19f91d3f20ef14de1">
          Pinned UrduHack source
        </a>{" "}
        · <a href="/data/urdu-sources/URDUHACK-LICENSE.txt">MIT license</a> ·{" "}
        <a href="/data/urdu-sources/words.txt.gz">Original words</a>
      </p>
      <h2>Wazan candidates · GPL-3.0</h2>
      <p>
        Adapted from Aruuz Nigar’s word_vazn_metadata.json. Original Aruuz work
        is credited by the upstream project to Sayed Zeeshan Haider (GPL-2.0);
        the Python port is GPL-3.0. Source candidates intentionally
        over-generate and may be incorrect. Only exact source word keys are
        joined; no pronunciation is inferred.
      </p>
      <p>
        Source notation: = means long (2), - means short (1), x means either.
        Candidates are not a complete verse scansion or a bahr verdict. Invalid
        source patterns were excluded.
      </p>
      <p>
        <a href="https://github.com/tariquesani/aruuz-nigar/tree/91fa27ac2002d9f36b93b27c6592c9622efd60d9">
          Pinned Aruuz Nigar source
        </a>{" "}
        ·{" "}
        <a href="/data/urdu-sources/ARUUZ-NIGAR-LICENSE.txt">GPL-3.0 license</a>{" "}
        ·{" "}
        <a href="/data/urdu-sources/ARUUZ-NIGAR-README.md">
          Upstream acknowledgements
        </a>{" "}
        ·{" "}
        <a href="/data/urdu-sources/word-vazn-metadata.json.gz">
          Original wazan data
        </a>
      </p>
      <h2>Adapted data and reproducible source</h2>
      <p>
        The combined word bank and data adapter are distributed under
        GPL-3.0-only, with the MIT word-list notice preserved. The rest of the
        Sukhan application is separate from this data package.
      </p>
      <p>
        <a href="/data/urdu-word-bank.jsonl.gz">
          Download the adapted JSONL corpus
        </a>{" "}
        ·{" "}
        <a href="/data/urdu-word-bank.manifest.json">
          Counts and SHA-256 manifest
        </a>{" "}
        ·{" "}
        <a href="https://github.com/Sukhan-786/Sukhan/blob/main/scripts/build-urdu-word-bank.py">
          Data adapter source
        </a>
      </p>
      <Link href="/dictionary">Back to dictionary</Link>
    </section>
  );
}
