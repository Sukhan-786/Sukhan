# Shared Sukhan Dictionary

## From poetry upload to word popup

Upload or paste the poem once in the existing Kalam editor. The reader makes each word clickable while preserving its exact spaces, punctuation and line breaks. A passage with an existing poem-specific reviewed meaning opens that note first. Other words query the shared dictionary when selected; there is no request for every word during page load.

A published dictionary entry automatically works for every matching occurrence in every poem. No per-poem word tagging is required for these general definitions. Unknown words show an explicit no-reviewed-entry message. Network errors have a separate retry state. Dictionary definitions are general meanings, not a claim that a particular nuance has been reviewed for the poem.

## Admin workflow

Open **Admin → Dictionary**. Enter the word fields, or expand **Import one word from JSON**. Paste JSON or select one UTF-8 `.json` file under 64,000 bytes. Import fills the form as a draft and never saves or publishes automatically. It accepts the supplied format:

```json
{
  "word_id": "dekhaa",
  "roman": "dekhaa",
  "urdu": "دیکھا",
  "hindi": "देखा",
  "part_of_speech": "verb",
  "english_meanings": ["saw", "seen", "observed"],
  "root_word": "dekhnaa",
  "audio_url": null
}
```

Optional `english`, `arabic` and `persian` spellings extend that format. They default to blank; no spelling or translation is invented. Unknown fields and arrays of entries are rejected. The first version imports one entry at a time, not a bulk dictionary dump.

Save the draft, add a source or editorial attribution, then have an administrator confirm review and publish. Editors can prepare drafts but cannot change published or archived entries. Editing substantive fields resets the review checkbox. Word IDs become stable public URLs and cannot be renamed after saving. Optimistic version checks prevent overwriting a concurrent edit. Archive withdraws the entry without permanently deleting it. The admin list shows 50 entries and supports exact word-ID search.

## Public dictionary and audio

**More → Dictionary** opens `/dictionary`. Readers choose the script and look up an exact spelling. A popup links to `/dictionary/[word_id]`, which exposes published entries only. Spellings have appropriate language tags and direction. The popup shows word type, English senses, root word and attribution. Several reviewed homonyms can be returned (maximum 10 per lookup).

Optional pronunciation accepts an HTTPS URL without embedded credentials. Native audio controls use `preload="none"` and never autoplay. The displayed word supplies the pronunciation text. When `audio_url` is null, no player or nonfunctional speaker button is displayed. The editor is responsible for using a recording they may publish; this release does not create or upload pronunciation audio. Reader favourites are not implemented.

## Matching and security

The additive migration creates `dictionary_entries` with RLS, explicit column privileges and invoker functions. Anonymous users can read published, reviewed entries and perform lookup, but cannot save. Reviewer account IDs are never granted to anonymous or signed-in client roles. Actual administrator identity and time are stamped by a validation trigger.

Generated keys use the existing `normalize_search` function and a GIN index. Matching is exact after case, compatibility, diacritic and Arabic letter-variant normalization. Script keys remain distinct: Roman Urdu is not English, and Urdu is not automatically Arabic. Hindi nuktas are preserved. There is no fuzzy matching, automatic stemming, translation or cross-script token alignment. Add a spelling explicitly to support it.

Public API requests are anonymous, bounded to 200 characters and 10 matches, and use `no-store` so a new lookup sees publication or withdrawal. Lookup does not send poem text, context or account details to external services. Dictionary text is rendered as plain escaped text. The player requests no preloading; playback contacts the configured audio host.

## Verification

Unit/database checks cover supplied JSON, malformed/oversized input, review, unsafe audio, whitespace and escaped text, draft privacy, role restrictions, script separation, actual reviewer privacy, optimistic concurrency and archive. Desktop/mobile browser tests cover import → draft → review → save poem once → repeated automatic lookups, Urdu/Hindi lookup, unknown words, Escape/focus restoration, accessible popup, full-entry navigation and withdrawal.

Automated browser tests use a production app build against isolated PGlite fixtures, not hosted manuscripts or real Auth identities. Release deployment, migration history and hosted role grants are verified separately. The supplied example is not automatically published by a migration.
