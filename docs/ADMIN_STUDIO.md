# Editorial studio — admin optimization

## Daily workflow

Sign in at `/login` using a real Auth account with an owner-assigned staff role. The overview shows totals, draft/published counts and recently edited kalam. Create a poet profile first, then add the work and its available scripts. Preview Urdu/Persian/Arabic in RTL and English/Roman Urdu/Hindi in LTR. Add source notes, attach published recordings, choose a publication status and save. Drafts remain private to staff.

## Changes

- Active navigation, account identity, responsive sidebar, loading/error states and clear empty states.
- Staff-only search across all stored titles, author names and slugs. Status/type filters persist across cursor links. Results load 25 records at a time, using timestamp/UUID cursors in both directions, without the former 200-record list cutoff.
- Draft/published overview counts and a recent-work queue.
- Multilingual completion indicators, character/line counts and title/body preview.
- Friendly field errors with links to the correct script. Corrected fields clear their stale errors while entered values stay intact.
- Unsaved-change warnings for link navigation and tab unload. Browser-history navigation within the app is not a guaranteed draft-recovery mechanism; save before navigating. There is no browser-storage autosave of private manuscripts.
- Explicit draft/publish feedback and a separate deletion disclosure with the existing required confirmation checkbox. Database relationship, publication and stale-version checks remain enforced.
- Recording search keeps selected attachments even when a checkbox is filtered out. Choice queries load only the fields needed and keep existing relationships outside the initial choice window. Author and recording pickers still show the initial 500 choices plus currently selected records; a remote search picker is a later scaling improvement.
- Staff checks are deduplicated within a request using React cache. Roles are still read afresh on each request and in each server mutation.

## Security and database

Apply the new editorial migration after the foundation migration. New RPC functions are SECURITY INVOKER with fixed search paths, explicit grants and a live staff-role guard. Anonymous roles cannot execute them; ordinary signed-in readers are rejected. They do not bypass RLS or expose staff membership. No service-role key or production auth bypass is needed. Search terms are SQL parameters and treated literally. Three ordering indexes support cursor retrieval. Search counts normalize and scan the matching title/name metadata; this is suitable for the initial archive, not a claim of indexed full-text search at arbitrary scale.

Admin roles must be assigned by the trusted project owner to an existing Auth UUID. A Supabase dashboard login is separate from an app Auth user. The app never promotes accounts based on email text, user metadata or public signup.

## Verification

`npm run check` runs lint, TypeScript, 42 application/database/component tests and the production build. `npm run test:e2e` covers 16 public desktop/mobile journeys. `npm run test:admin` covers 12 desktop/mobile journeys using an isolated loopback fixture backed by actual PostgreSQL migrations in PGlite: sign-in contract, dashboard/filter/cursor behavior, poet publication, validation preservation, multilingual publication with an attachment, public reading, unsaved navigation, editor restrictions and reader denial. Axe checks cover the archive and editor; this is not a complete manual accessibility audit.

The fixture uses synthetic example.test accounts. It implements the Auth/REST calls needed by these journeys; it is not the hosted Supabase stack. Hosted login, real account setup, advisors and CMS saves must still be checked on the selected project. Real media playback and caption accuracy require approved media assets.

## Multilingual text import

Kalam supports Urdu, English, Hindi, Arabic, Roman Urdu and Persian in the same record. Select a language tab, enter its title, then paste the text or choose a UTF-8 `.txt` file. Import changes that language's text only; review and save the form to persist it. Maximum import is 400,000 bytes and 100,000 characters. UTF-8 decoding is strict, Windows line endings are normalized, and binary/empty/oversized files leave existing text unchanged. Files are read locally and their content is submitted as plain text on Save. PDF, Word and automatic translation are not supported by this import.

Arabic, Urdu and Persian read right to left; Hindi, English and Roman Urdu read left to right. The public reader offers the same language tabs, and media records accept Hindi and Arabic for transcript/caption metadata. The additive `multilingual_hindi_arabic` migration expands the two language constraints and atomic save limit to six, preserving existing data, RLS, publication checks and grants.

## Reviewed word meanings

After saving a Kalam, use **Manage reviewed word meanings** to select occurrences, write contextual definitions, save drafts and publish reviewed entries. See [WORD_MEANINGS.md](WORD_MEANINGS.md) for the review workflow, stale-text protection and supported limits.
