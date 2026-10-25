# Reviewed word meanings

## Editorial workflow

Save a Kalam first, then open **Manage reviewed word meanings** from its editor. Choose the poem script and click a word, or enter an exact phrase and select its occurrence. Repeated words have separate positions, so a meaning belongs to its specific context rather than every use of the same spelling.

Add one or more definitions in Urdu, English, Hindi or Arabic, an optional context note, and a source or editorial attribution. Editors save drafts. Administrators check the review confirmation and publish; they can also withdraw to draft or archive an entry. Archived entries remain editable and can be reused. Successful saves remount the form with its new version, clearing the unsaved-change state. Navigation and tab closing warn about unsaved changes.

The public reader underlines only words with a reviewed, published meaning. Click, tap or use the keyboard to open the native modal dialog. Escape and Close dismiss it and restore focus to the word. All text is escaped, whitespace is preserved, and Urdu/Arabic definitions read right to left. Roman Urdu display remains separate from English meanings. No automatic dictionary or translation output is generated.

## Anchors, revisions and access

`word_meanings` belongs to a Kalam and a display language. Its range uses Unicode code-point offsets, matching PostgreSQL substring, and records the exact surface text and SHA-256 of the source body. Matching helpers preserve nuktas, Arabic/Urdu marks, izafat and original display text. Emoji before a word do not shift its database anchor incorrectly.

Public RLS requires a published work, a published author, a reviewed meaning and an exact current text hash. Editing or removing a script's body immediately hides that script's old meanings. Identical text in other scripts remains valid. Staff can see stale entries, select the new occurrence and review again. Title-only edits do not invalidate body anchors.

RLS and a SECURITY INVOKER save function enforce draft/publish permissions and optimistic concurrency. A private trigger validates anchors, stamps the actual reviewer and time, and prevents published overlap. The reviewer UUID is not granted through the client API. Per-work advisory locking serializes overlap and quota checks. A work supports up to 500 stored entries including drafts and archives; archived entries can be edited and reused. Public queries and admin lists are bounded by the same database-enforced limit. The source note is editorial attribution, not proof that any external data was licensed.

No delete privilege or permanent-delete UI is exposed for meanings. The parent Kalam relationship cascades when the work itself is deleted through its existing protected workflow.

## Verification

Application/database tests cover Unicode offsets, compounds, repeated occurrences, exact whitespace, escaping, required review and provenance, RLS, private parents, reviewer privacy, editor restrictions, stale versions, text invalidation, re-review, archive and the 500-entry bound. Desktop/mobile browser journeys cover draft creation, administrator review, the public popup, keyboard focus, Hindi/Arabic anchors, language-specific invalidation, re-review, archive and Axe accessibility checks.

The browser fixture uses the real migrations in PGlite with isolated test Auth/REST transport. Hosted UI and migrations are checked separately at release. No Rekhta scraping, external model, dictionary license or provider credentials are required for this feature. Automatic transliteration, translation and shared cross-script dictionary alignment remain future work.
