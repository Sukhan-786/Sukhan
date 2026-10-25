# Milestone verification — 24 October 2026

This report describes the local foundation delivered in this folder. No remote deployment or hosted database change was made.

| Check                             | Result                                                                                                   |
| --------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `npm run lint`                    | Passed, no warnings/errors                                                                               |
| `npm run typecheck`               | Passed, including tests                                                                                  |
| `npm test`                        | 26 passed, 0 failed, 0 skipped                                                                           |
| `npm run build`                   | Passed; optimized Next.js 16.4.3 production build with webpack                                           |
| `npm run test:e2e`                | 16 passed in installed Google Chrome: 8 desktop and 8 mobile-emulated journeys                           |
| Automated accessibility           | No axe WCAG 2 A/AA or 2.1 AA violations on tested homepage, multilingual reader and locked sign-in pages |
| `npm audit --json`                | 0 known vulnerabilities across the installed dependency tree                                             |
| Visual review                     | Desktop homepage, mobile homepage and Urdu reader screenshots inspected                                  |
| Hosted Auth/PostgREST integration | Blocked: no connected project/credentials                                                                |
| Supabase local service/advisors   | Not run: Docker/Postgres service unavailable; migration-list connection refused at local port 54322      |
| GitHub Actions workflow           | Added, not executed on GitHub                                                                            |
| Live deployment                   | Not attempted or verified                                                                                |

## Database test scope

The authoritative migration ran on PostgreSQL through PGlite 0.5.11. Tests create a minimal test Auth schema and switch to `anon`/`authenticated` database roles with test UUIDs. They execute the actual migration, policies, grants and functions. Covered behavior:

- RLS on all six exposed application tables.
- Published-only anonymous access and hidden draft translations/media links.
- Denied anonymous writes, normal-reader writes, role escalation and truncate.
- Editor draft CRUD, including profiles/media; administrator publication; denied editor mutation/deletion of published records.
- Atomic four-script saves, rollback after invalid languages, duplicate script rows or missing media relationships.
- Stale version rejection, preventing lost updates.
- Immediate role revocation and ignored metadata-based role claims.
- Multilingual SQL search, normalization, form/media filters and literal handling of malicious-looking query strings.
- Video publication requirements and work/author visibility dependencies.

PGlite is a PostgreSQL execution harness, not the Supabase hosted Auth/Data API/Storage stack. Passing these tests does not verify cookie exchange, email delivery, PostgREST relationship embedding or hosted Security Advisors. Those checks remain required when Supabase is connected.

## Browser test scope

The browser suite uses the production server in unconfigured preview mode. It covers navigation, multilingual/form search, empty results, all four reader scripts, RTL/LTR and language attributes, text sizing, unavailable scripts, related author works, anonymous admin protection, explicit setup state, metadata, structured data, sitemap, robots, 404 responses and honest empty-media state. Mobile checks use Chromium device emulation, not a physical iPhone or Safari.

CMS forms and authenticated mutations are implemented but have not been driven through a signed-in browser against real Supabase. Audio/video markup is component-tested; real licensed media playback and caption accuracy remain pending because no recording URLs were provided. Automated accessibility tests are useful coverage, not a full manual assistive-technology audit.

## Environment inspection and preservation

- Node.js 24.20.0, npm 11.19.0, Git and Google Chrome were available. Docker, psql, gh and a preinstalled Supabase CLI were absent; a pinned project-local Supabase CLI was added.
- The referenced ChatGPT conversation timed out on two reads. The user's explicit first-milestone scope and the cached conversation preview guided implementation; the inaccessible blueprint was not claimed as fully retrieved.
- Both authenticated GitHub repository-list tools returned unavailable. A read-only public API check returned no public repositories for `sanjar72` and `thenajaf786`. Private repositories could not be inspected.
- The Supabase project-list tool returned unavailable. No Supabase/GitHub/Vercel/database credential environment-variable names were present. No tokens or private keys were read or printed.
- The existing local `sukhan-live` folder was inspected read-only. It is an Express/SQLite prototype, not a Next.js/Supabase repository. It remains unchanged. A separate local Git repository was initialized for this foundation; no remote was added.
- The `thenajaf.vercel.app` school project was not edited, linked, overwritten or deployed to.
- The first default Turbopack build encountered a local process/port restriction. The supported webpack engine passed and is explicitly selected in the project scripts. A test-runner IPC restriction was avoided by using Node's `--import tsx` loader; all tests then ran without skipping.

## Pending before a connected launch

Provide a dedicated Supabase project and staff accounts, apply the migration, set the production site origin, run hosted Auth/PostgREST and authenticated CMS tests, run Security Advisors, add permission-cleared content and working captioned recordings, and select a separate GitHub/hosting destination. Media upload/transcoding and the additional product roadmap are described in `ARCHITECTURE.md`.

## Visual revision

The Rekhta-style revision was measured and compared at matched desktop/mobile viewports. All 16 updated browser checks pass, including accessibility, carousel navigation, script switching, translation and text download. The 26 application tests remain passing. Build, lint and TypeScript pass. Font licenses and visual differences are documented in DESIGN_COMPARISON.md.

## Admin optimization — 25 October 2026

The admin update adds 5 application/database tests (31 total) and an isolated admin browser suite of 10 desktop/mobile journeys. See ADMIN_STUDIO.md for exact coverage and limitations. The original public suite still contains 16 journeys. Read-only requests to the selected hosted Sukhan project returned HTTP 200 for artists, kalam and media, with no published rows in each one-row sample. Its tables were visible in the dashboard. The app’s local configuration now points to that project using its publishable key, kept in an ignored .env.local file. This is evidence of Data API connectivity, not proof of a hosted staff sign-in or successful live CMS save.

The admin upgrade was merged through PR #1 after all GitHub checks passed. Production sync then reported an existing foundation migration version absent from the repository. A read-only comparison matched 38 schema fingerprints between hosted PostgreSQL and the foundation. The foundation filename was aligned with hosted version `20261024204452`, preserving all SQL and existing tables. The Health Advisor page reported unavailable for this project; this does not mean an advisory scan passed.

After alignment, the hosted `editorial_overview` endpoint returned HTTP 401 / PostgreSQL 42501 for an anonymous request (function present, execution denied). The refreshed Supabase Security Advisor reported 0 errors, 0 warnings and 0 informational suggestions. Hosted administrator sign-in and CMS saves remain pending the real app account setup.
