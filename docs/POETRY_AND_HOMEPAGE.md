# Poetry, homepage editing and the navy Sukhan interface

This revision adds the owner's supplied Urdu/Persian corpus, a private homepage draft editor and reviewed passage translations. It does not generate missing translations or biographies.

## Homepage editor

Open `/admin/homepage`. Editors can prepare a private draft; administrators can also upload public banner images and publish. Sections can be added, hidden, reordered and removed. Supported sections are banners (up to five slides), featured poetry, collection cards, word of the day, artists, a poetry collection and plain text. Only published works/profiles appear in resource choices and public rendering.

Save a draft, open its private preview, then publish the saved version. Optimistic version checks prevent a stale browser window from replacing a newer draft or publication. Live settings and drafts have separate RLS-protected tables. Draft previews require staff authentication and are noindex. Images are restricted to the dedicated public `homepage-assets` bucket, 3 MB and supported raster signatures; existing storage buckets are not changed.

## Supplied poetry

Open `/admin/import-poetry` as an administrator. Check the source notices and start the import. Progress is transactional and resumes from the saved checkpoint. Keep the tab open; pause safely before closing it. Existing manuscripts and poet profiles are never overwritten. Conflicts are counted and left unchanged.

Prepared source counts:

| Corpus                 | Source rows | Unique prepared works |
| ---------------------- | ----------: | --------------------: |
| Urdu ghazals           |       1,314 |                 1,314 |
| Urdu couplets          |      17,609 |                17,439 |
| Persian literary texts |      54,524 |                54,430 |
| Total                  |      73,447 |                73,183 |

The canonical author map contains 102 authors. Ghazals retain Urdu, Roman Urdu and available Hindi text; nine lack Hindi. Roman Urdu is not an English translation. Persian prose from the explicitly identified prose authors retains paragraphs; uncertain literary forms remain generic. The two long Persian texts are retained in full under the 200,000-character limit.

The source list, checksums, adaptation notes and supplied Persian CC BY-SA 4.0 license are in `/poetry-sources` and `public/data/poetry`. The Urdu dataset README credits Rekhta; no independent license for the underlying poems is invented. No supplied scripts or SQL dumps are executed. The separate normalized/stopword-removed 1.2M-line corpus is excluded to avoid duplicating and damaging complete texts.

`python3 scripts/build-poetry-corpus.py SOURCE_ROOT OUTPUT_DIR` reproduces the import shards from the supplied folder structure. `node --import tsx scripts/verify-poetry-corpus.ts` runs the complete import against an isolated PostgreSQL/PGlite database and never contacts Supabase.

## Persian and Arabic translations

Open a saved poem and choose “Manage Persian / Arabic translations”. Select an original passage and translation language, add the translation and translator/source, then save a private draft. An administrator must review it before publishing. The public reader places reviewed translations beneath the original passage and does not turn individual Persian/Arabic words into dictionary buttons. Original text edits hide stale translations until re-reviewed. Up to 1,000 passage translations can be stored per work. Odd final lines and prose paragraphs are preserved.

Urdu, Roman Urdu, Hindi and English retain the shared dictionary and contextual word meanings. Source wazan remains clearly labelled as candidate data awaiting review. The import contains no new Arabic definitions or full-poem translations.

## Search, design and SEO

The new palette follows the supplied navy/lilac/white mobile design, with a compact script menu, bottom navigation, poet directory and dictionary sheet. Native media controls and real empty states remain; no placeholder recordings or portraits are invented.

The larger catalogue uses indexed, normalized literal substring search with `pg_trgm`; wildcard and SQL-like input remain literal. Catalogue and author-work pagination can reach the complete supplied collection. Per-script reading URLs expose canonical/hreflang metadata for available versions. Roman Urdu uses `ur-Latn`. The verified custom domain `https://sukhan.co.in` is the canonical address when the configured URL is the old Vercel alias; explicit local/test URLs stay unchanged.

`/sitemap-index.xml` lists bounded metadata-only sitemaps of 1,000 works/definitions each. `/sitemap.xml` is a small core sitemap. Robots references the index, excludes protected routes, and word-bank/search browse pages avoid thin-page indexing. Only reviewed dictionary detail pages are indexable. Search engines decide indexing and rankings.

Google Tag Manager `GTM-MWXQC8X9` was released separately and detected by Google's installation test. This revision preserves its exclusion from protected studio/account routes. GA4 tags and Search Console verification are separate configuration steps.

## Database and verification

Apply all migrations in order to the dedicated Sukhan project. This revision introduces homepage settings/assets, passage translations, the poetry import ledger and indexed catalogue/sitemap functions. Every exposed table has RLS; administrative RPCs keep invoker permissions, exact-source checks and version/checkpoint guards. No new service-role key is used.

Verification includes all supplied shard checksums/schema validation, authorization and transaction tests, conflict preservation, long-text preservation, translation review/stale-source behavior, literal search and sitemap privacy, plus desktop/mobile homepage and admin journeys. Prepared source counts and isolated test results must not be described as a completed hosted import; production completion requires checking hosted progress and public counts after release.
