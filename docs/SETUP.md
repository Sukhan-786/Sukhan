# Set up the connected editorial studio

## 1. Use a separate project

Create or choose a dedicated Sukhan Supabase project. Confirm it is not the school project. The project must be separate from the school website. Existing GitHub, Supabase and Vercel connections do not by themselves prove that every migration or account is ready. Inspect the hosted migration history before applying changes.

## 2. Apply the migration

The foundation filename uses the installed hosted version `20261024204452`. Its schema was checked against the repository using 38 catalog fingerprints covering columns, constraints, policies, grants, functions, indexes and triggers. Keep this version aligned with the existing migration history; changing it back would make production sync try to recreate existing tables.

Review both migrations in `supabase/migrations/` in filename order. The foundation migration creates the tables; the editorial migration adds staff-only search, overview counts and cursor navigation. If the foundation is already installed, apply only the new migration through the existing migration process. For a new empty hosted project, run it once in the Supabase SQL Editor as the database owner. It uses a transaction and explicitly grants the intended API privileges alongside RLS. Do not apply it blindly to an existing populated schema.

Alternatively, authenticate the pinned Supabase CLI, consult `npx supabase link --help` and `npx supabase db push --help`, link the dedicated project, inspect migration history and push through your normal migration process. If GitHub production synchronization is enabled in Supabase, confirm its migration run succeeds after merging changes. Do not run an already tracked migration manually.

For full local Supabase, install Docker first, then consult `npx supabase start --help`. The included `supabase/config.toml` disables public signup. PostgreSQL policy tests run without Docker using PGlite, via `npm test`.

`supabase/seed.sql` is optional and contains only the original demonstration works. It is separate from migrations. Do not load sample content into your live archive without an editorial decision.

## 3. Add configuration

Copy `.env.example` to `.env.local` and set:

- `NEXT_PUBLIC_SUPABASE_URL`: your dedicated project API URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: its publishable API key.
- `NEXT_PUBLIC_SITE_URL`: the exact website origin, initially `http://localhost:3000` for development.

Use a publishable key. Never put service-role keys, database passwords, access tokens, or private media credentials into `NEXT_PUBLIC_` variables or this repository. The browser needs no elevated key. The application uses authenticated user tokens and database RLS for writes.

Configure the Auth site URL for your intended origin. Keep self-signup disabled for this staff-only milestone. Restart development or rebuild/restart production after changing environment variables. `NEXT_PUBLIC_` settings are build-time configuration.

## 4. Create the first administrator

As a trusted Supabase project owner, use Auth's **Create user** workflow to create a confirmed email/password account. Choose a private password. This milestone supports password sign-in; invitation acceptance and password recovery callback pages are not implemented yet.

Copy the new user's UUID and run the following in the SQL Editor, replacing the placeholder:

```sql
insert into public.staff_roles (user_id, role)
values ('<AUTH_USER_UUID>'::uuid, 'admin');
```

To give another existing Auth user draft editing access, use `editor`. Only a trusted database owner can change this table. Neither public users nor dashboard administrators can grant themselves a role through the app.

Then visit `/login`. An account without a staff role is denied dashboard access. Role checks read the database on each request; they do not trust editable metadata or wait for role claims in an old JWT.

## 5. First content workflow

1. Create a poet/artist profile and add its biography and source notes.
2. Publish the profile as an administrator.
3. Add a kalam draft. Supply title and body for every available script; leave both blank for missing scripts.
4. Add source and rights notes. Preview the scripts, then publish as an administrator.
5. Create media records using direct HTTPS audio/video URLs. Add credited performers, transcripts and rights notes; video also needs a WebVTT caption URL.
6. Publish the media record, attach it in the kalam editor and save the work.
7. Check the work and media anonymously in a separate browser session. Confirm text direction, credits, transcript and captions.

The native player expects browser-compatible files, not a YouTube page URL. The host must allow playback, byte-range requests as appropriate, and cross-origin caption access. A database publication gate ensures required fields are present; it cannot prove the URL works or that captions are accurate.

## 6. Verify the connected milestone

Before publishing, test admin and editor accounts against the hosted project: create/edit/delete drafts, publish as admin, deny publication as editor, ensure no draft is visible anonymously, exercise all language fields, test stale saves, attach and remove media, and try direct API writes as a reader. Run Supabase Security Advisors and review the exposed schema. The app's `private` schema must remain outside Data API exposed schemas.

Run `npm run check`, `npm run test:e2e` and `npm run test:admin`. Build the public preview tests with the Supabase variables empty. The admin suite uses an isolated loopback Auth/REST contract fixture backed by the real migrations in PGlite; it covers the browser publishing journey without contacting a hosted project. It does not replace hosted Auth/PostgREST verification with your real staff account. No production authentication bypass or sample administrator is built into the app.

## 7. Repository and hosting

The dedicated repository is https://github.com/Sukhan-786/Sukhan. Keep its deployment and database integration separate from the school site. Do not commit `.env.local` or credentials. See `ADMIN_STUDIO.md` for the updated admin workflow and test scope.

For hosting, configure this folder as a new Next.js project with Node.js 24, install using `npm ci`, build using `npm run build`, and set the three environment variables. Set the real site URL before the production build so metadata and sitemap links use the right domain. Rebuild after connecting the database. Verify the resulting deployment URL, hosted CRUD, anonymous draft denial, media playback and SSL before calling it live.
