import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import {
  defaultHomepageConfig,
  parseHomepageConfig,
} from "../src/lib/homepage";
const db = new PGlite({ extensions: { pg_trgm } }),
  admin = "d0000000-0000-4000-8000-000000000001",
  editor = "d0000000-0000-4000-8000-000000000002",
  reader = "d0000000-0000-4000-8000-000000000003";
async function as(role: string, uid = "") {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid]);
  if (role !== "owner") await db.exec(`set role ${role}`);
}
async function version(table: "homepage_draft" | "homepage_public") {
  return (
    await db.query<{ v: string }>(
      `select updated_at::text v from public.${table}`,
    )
  ).rows[0].v;
}
before(async () => {
  await db.exec(
    "create role anon nologin;create role authenticated nologin;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to anon,authenticated;grant select,insert,update on storage.objects to authenticated;",
  );
  for (const f of (await readdir("supabase/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(await readFile("supabase/migrations/" + f, "utf8"));
  await db.query("insert into auth.users values($1),($2),($3)", [
    admin,
    editor,
    reader,
  ]);
  await db.query(
    "insert into public.staff_roles values($1,'admin'),($2,'editor')",
    [admin, editor],
  );
});
after(() => db.close());
test("homepage sections validate bounded structure and reject private links, executable URLs and duplicate IDs", () => {
  const clone = () => structuredClone(defaultHomepageConfig);
  assert.deepEqual(
    parseHomepageConfig(JSON.stringify(clone())),
    defaultHomepageConfig,
  );
  for (const href of [
    "javascript:alert(1)",
    "//example.test",
    "/admin",
    "/login",
    "https://example.test",
  ]) {
    const c = clone();
    c.sections[0].href = href;
    assert.throws(() => parseHomepageConfig(JSON.stringify(c)));
  }
  for (const image_url of [
    "data:image/svg+xml,<svg/>",
    "javascript:alert(1)",
    "https://user:pass@example.test/a.png",
  ]) {
    const c = clone();
    c.sections[0].slides[0].image_url = image_url;
    assert.throws(() => parseHomepageConfig(JSON.stringify(c)));
  }
  const c = clone();
  c.sections.push(c.sections[0]);
  assert.throws(() => parseHomepageConfig(JSON.stringify(c)));
  assert.throws(() => parseHomepageConfig("{bad}"));
  assert.throws(() => parseHomepageConfig("x".repeat(200001)));
});
test("homepage drafts stay private and readers cannot save or publish", async () => {
  await as("anon");
  assert.equal(
    (await db.query("select * from public.homepage_public")).rows.length,
    1,
  );
  await assert.rejects(
    db.query("select * from public.homepage_draft"),
    /permission denied/i,
  );
  await as("authenticated", reader);
  assert.equal(
    (await db.query("select * from public.homepage_draft")).rows.length,
    0,
  );
  await assert.rejects(
    db.query("select public.save_homepage_draft($1,null)", [
      JSON.stringify(defaultHomepageConfig),
    ]),
    /staff access/i,
  );
  await assert.rejects(
    db.query("select public.publish_homepage(null,null)"),
    /administrator/i,
  );
});
test("editors save a private working draft; stale saves and publication are rejected", async () => {
  await as("authenticated", editor);
  const old = await version("homepage_draft");
  const c = structuredClone(defaultHomepageConfig);
  c.sections[0].slides[0].title = "An edited homepage banner";
  await db.query("select public.save_homepage_draft($1,$2)", [
    JSON.stringify(c),
    old,
  ]);
  await assert.rejects(
    db.query("select public.save_homepage_draft($1,$2)", [
      JSON.stringify(defaultHomepageConfig),
      old,
    ]),
    /changed/i,
  );
  await assert.rejects(
    db.query("select public.publish_homepage($1,$2)", [
      await version("homepage_draft"),
      await version("homepage_public"),
    ]),
    /administrator/i,
  );
  await as("anon");
  const live = (
    await db.query<{ config: typeof c }>(
      "select config from public.homepage_public",
    )
  ).rows[0].config;
  assert.equal(
    live.sections[0].slides[0].title,
    defaultHomepageConfig.sections[0].slides[0].title,
  );
});
test("administrator publishes the exact preview and concurrent public changes require a refreshed preview", async () => {
  await as("authenticated", admin);
  const draft = await version("homepage_draft"),
    live = await version("homepage_public");
  await db.query("select public.publish_homepage($1,$2)", [draft, live]);
  await assert.rejects(
    db.query("select public.publish_homepage($1,$2)", [draft, live]),
    /changed/i,
  );
  await as("anon");
  const c = (
    await db.query<{ config: typeof defaultHomepageConfig }>(
      "select config from public.homepage_public",
    )
  ).rows[0].config;
  assert.equal(c.sections[0].slides[0].title, "An edited homepage banner");
});
test("homepage storage policies permit only administrators within the dedicated public image bucket", async () => {
  await as("owner");
  const bucket = (
    await db.query<{ public: boolean; file_size_limit: number }>(
      "select public,file_size_limit from storage.buckets where id=$1",
      ["homepage-assets"],
    )
  ).rows[0];
  assert.equal(bucket.public, true);
  assert.equal(Number(bucket.file_size_limit), 3145728);
  for (const uid of [reader, editor]) {
    await as("authenticated", uid);
    await assert.rejects(
      db.query(
        "insert into storage.objects(bucket_id,name) values('homepage-assets','bad.png')",
      ),
      /row-level security/i,
    );
  }
  await as("authenticated", admin);
  await db.exec(
    "insert into storage.objects(bucket_id,name) values('homepage-assets','banner.png')",
  );
  await assert.rejects(
    db.query(
      "insert into storage.objects(bucket_id,name) values('another-business','bad.png')",
    ),
    /row-level security/i,
  );
});
