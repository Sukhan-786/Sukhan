# Urdu word bank, Arabic meanings and wazan

The word bank is a separate, sourced spelling and prosody resource. It does **not** mark imported forms as reviewed definitions and does not overwrite dictionary drafts or published entries.

## Data coverage

- 154,781 Urdu forms and compounds from UrduHack, pinned at `c37cc6fcf903c4b6c954c9b19f91d3f20ef14de1` (MIT).
- 130,445 forms have exact-key candidate weights from Aruuz Nigar, pinned at `91fa27ac2002d9f36b93b27c6592c9622efd60d9` (GPL-3.0).
- The sources supply **zero Arabic definitions**. Arabic definitions require a separately licensed source or editorial entry/review. No automatic translation service is called.
- Forms are NFC normalized; underscores in compounds become spaces. No pronunciation inference or orthographic substitutions are used to join candidate weights.
- Source `=` → long `2`; `-` → short `1`; `x` → either `(1/2)`. Invalid candidate patterns are discarded. Upstream explicitly warns that word-level candidates over-generate. This is not a complete verse/bahr scanner.
- Original source files, notices, GPL license and adapted corpus are downloadable under `/dictionary/sources`. The data adapter is in `scripts/build-urdu-word-bank.py`. Combined derived data/adapter: GPL-3.0-only; MIT notice retained for the word list.

## Setup and import

1. Apply every migration in order, including `20261026075208_urdu_word_bank_wazan_arabic.sql`. Use the existing Supabase GitHub migration integration for the dedicated Sukhan project.
2. Sign in as a Sukhan administrator and open `/admin/dictionary/word-bank`.
3. Select **Import 154,781 Urdu word forms**. The browser verifies the pinned compressed SHA-256, streams UTF-8 JSONL, and sends sequential batches of at most 1,000 rows. Each batch is validated again on the server and in PostgreSQL.
4. Keep the page open. Pause/resume, reload and lost-response retries reuse durable database progress. Import progress and insertion are one transaction; a row lock serializes concurrent runs. Existing forms use `ON CONFLICT DO NOTHING`; committed batches are not repeated.
5. Search Urdu prefixes and page through 50 forms at a time. Choose **Create reviewed definition** to prefill Urdu spelling in the existing dictionary editor. Fill a stable word ID, definition(s), attribution, optional numeric wazan and context. Review before publishing.

Only administrators can import. Editors can browse forms and prepare dictionary drafts. Readers see sourced forms/candidates and reviewed published definitions; private drafts, import state and reviewer IDs remain private. Reviewed dictionary definitions take priority over candidate-only fallback in the poetry reader.

## Dictionary fields

`arabic` remains the **spelling**. Definitions are separate arrays: `arabic_meanings`, `urdu_meanings`, `english_meanings`. Drafts may have no definitions. Publication needs at least one definition in these languages, attribution and administrator confirmation.

`wazan` is an array of patterns containing only `1` and `2`, e.g. `["22", "121", "12"]`; `wazan_note` records pronunciation/context. Numeric patterns read left to right in every script. Arabic/Urdu definitions render RTL. Optional fields default to empty values, preserving existing one-word JSON imports.

## Verification

Unit/database tests import the entire pinned corpus and verify its count, coverage, RLS, atomic invalid-batch rejection, idempotent retry, prefix pagination and literal wildcard handling. Browser tests cover interrupted import/resume through server actions, editor prefilling, Arabic definitions and reviewed numeric weights in the poetry popup, plus public source fallback.

The source manifest describes the prepared file, not proof that a hosted project has imported it. Confirm hosted progress and actual table counts after release. See the release verification report for observed hosted status.
