# Sukhan Foundation

A separate Next.js App Router application for literature, audio, video, and artist discovery. Live foundation: [public site](https://sukhan-blush.vercel.app/) and [admin studio](https://sukhan-blush.vercel.app/admin). The unrelated school website and the older Express/SQLite Sukhan prototype were not changed.

## Run

Use Node.js 24 (verified with 24.20.0) and npm.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000. With no Supabase variables, public pages use two clearly marked original sample works. This mode is read-only, the CMS is locked, and search engines receive `noindex`. An invalid or unavailable configured database produces an error; it never silently falls back to samples.

```sh
npm run check       # lint, TypeScript, 49 automated tests, production build
npm run test:e2e    # 16 desktop/mobile browser tests; requires Chrome and a completed build
npm start          # serve the production build
```

Development and build scripts explicitly use the supported webpack engine. The default Turbopack build hit a process/port permission restriction in the authoring environment. The webpack production build passed.

## Implemented

- Next.js 16.4.3, React 19.3, strict TypeScript, Tailwind 4, exact dependencies and lockfile.
- Responsive literary homepage, catalogue with form filters and pagination, work pages, poet/artist directory and profiles, and audio/video library.
- Urdu, English, Hindi, Arabic, Roman Urdu and Persian text. Script selection, correct language tags and RTL direction, preserved line breaks, adjustable reader size, and explicit unavailable scripts.
- Cookie-based Supabase password sign-in, server-verified user identity, request-time staff roles, protected dashboard and mutations. Public reading uses a separate anonymous database client.
- Kalam create/read/update/delete, six-script editor with preview, profile CRUD, media CRUD, performer credits, and many-to-many work/media relationships.
- Editors manage drafts; administrators publish and manage all content. Private drafts stay private through database RLS. Staff roles can only be assigned by a trusted database owner.
- Atomic work/text/relationship saves, validation, duplicate slug handling, confirmation for deletion, optimistic concurrency checks, source/rights notes and publication gates.
- Native labelled audio/video controls, no autoplay, transcripts, caption tracks, and a database requirement for captions on published video.
- Normalized multilingual search across titles, text, introductions and poet names; consistent Arabic/Persian character handling. No query-string SQL interpolation.
- Canonical URLs, per-work metadata, Open Graph image, JSON-LD, sitemap, robots and protected-page noindex.
- SQL migrations, local Supabase config, optional sample seed, security/validation/component tests, browser accessibility checks, and a GitHub Actions workflow.

## Connect a real Supabase project

See [SETUP.md](docs/SETUP.md). You need a dedicated project URL, publishable key, and a trusted owner to apply the migration and create the first administrator. No service-role key is required by the app. Keep private credentials out of the repository.

Hosted sign-in, administrator access and migrations have been verified for the dedicated project. Automated CMS journeys use isolated PostgreSQL/PGlite test identities and do not submit manuscripts to the hosted archive.

## Project map

- `src/app/`: public pages, protected editorial pages, Server Actions, metadata.
- `src/components/`: six-script reader/editor, media player and shared navigation.
- `src/lib/`: validation, domain types, data access and Supabase clients.
- `supabase/migrations/`: authoritative database schema, grants, RLS and transactional functions.
- `supabase/seed.sql`: optional original demonstration text; never run over production content.
- `tests/`: PostgreSQL authorization/transaction tests, validation tests, component tests and browser journeys.
- `docs/ARCHITECTURE.md`: entities, permissions, constraints and roadmap.
- `docs/VERIFICATION.md`: exact checks, environment findings and remaining blockers.

## Pending

Add permission-cleared literature and recordings and verify their publication in the hosted archive. Media upload, transcoding, streaming pipelines, YouTube/Vimeo embeds, reader accounts, bookmarks, collections, events, payment, analytics/marketing, password recovery, staff-invitation email flows, audit/version history and PWA/offline reading are future milestones.

This foundation uses plain text rather than a rich HTML editor. Profile names have English/default and Urdu fields; the six-script authoring model applies to kalam. Search currently uses normalized substring matching suitable for a small archive; ranked indexed search is a later scaling step. Directory/media/editor lists have explicit initial limits documented in the architecture guide.

## Visual revision

Sukhan now follows the measured Rekhta typography and layout, with locally embedded LatoX, Merriweather and Mehr Nastaliq, a compact header, full-width banner, pink controls and centred poetry. See [DESIGN_COMPARISON.md](docs/DESIGN_COMPARISON.md) for measurements, font sources and remaining visual differences.

## Editorial studio update

See [ADMIN_STUDIO.md](docs/ADMIN_STUDIO.md) for searchable admin libraries, cursor navigation, draft counts, multilingual editing improvements and the separate admin browser suite. Run `npm run test:admin` after installing Chrome. Apply all SQL migrations in order, or let the configured Supabase GitHub integration apply the new one after verifying its migration history. Hosted staff account setup still requires the project owner.

## Reviewed word meanings

Saved works have a **Manage reviewed word meanings** link. Editors prepare contextual meanings; administrators review and publish them. Readers can open meanings for underlined words in an accessible popup. Poem edits hide stale meanings until re-review. See [WORD_MEANINGS.md](docs/WORD_MEANINGS.md).

## Shared dictionary

Every poem word can open a reviewed shared dictionary entry, with poem-specific meanings taking priority. The protected **Dictionary** admin page supports the supplied JSON format, draft entry, administrator review and publication. See [DICTIONARY.md](docs/DICTIONARY.md). Unknown words are explicit; no translations are generated automatically.
