import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { dictionaryExample, type DictionaryEntry } from "../src/lib/dictionary";
import {
  dictionarySaveSchema,
  parseDictionaryImport,
} from "../src/lib/dictionary-validation";
import { DictionaryDefinition } from "../src/components/dictionary-definition";
import { Reader } from "../src/components/reader";
const db = new PGlite();
const admin = "a0000000-0000-4000-8000-000000000001",
  editor = "a0000000-0000-4000-8000-000000000002",
  reader = "a0000000-0000-4000-8000-000000000003";
async function as(role: string, uid = "") {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid]);
  if (role !== "owner") await db.exec(`set role ${role}`);
}
const payload = () => ({
  ...parseDictionaryImport(JSON.stringify(dictionaryExample)),
  source_note: "Sukhan test editorial definition",
  status: "draft",
  review_confirmed: false,
});
async function save(
  p = payload(),
  id: string | null = null,
  version: string | null = null,
) {
  return (
    await db.query<{ id: string }>(
      "select public.save_dictionary_entry($1,$2::jsonb,$3::timestamptz) id",
      [id, JSON.stringify(p), version],
    )
  ).rows[0].id;
}
async function lookup(lang = "roman", word = "dekhaa") {
  return (
    await db.query<{ v: DictionaryEntry[] }>(
      "select public.lookup_dictionary($1,$2) v",
      [lang, word],
    )
  ).rows[0].v;
}
before(async () => {
  await db.exec(
    "create role anon nologin;create role authenticated nologin;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;",
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
test("the supplied dictionary JSON loads without publishing or inventing spellings", () => {
  const entry = parseDictionaryImport(
    "\ufeff" + JSON.stringify(dictionaryExample),
  );
  assert.deepEqual(entry.english_meanings, ["saw", "seen", "observed"]);
  assert.equal(entry.audio_url, null);
  assert.equal(entry.arabic, "");
  assert.equal(entry.english, "");
  assert.throws(() =>
    parseDictionaryImport(
      JSON.stringify({ ...dictionaryExample, status: "published" }),
    ),
  );
  assert.throws(() =>
    parseDictionaryImport(JSON.stringify([dictionaryExample])),
  );
  assert.throws(() => parseDictionaryImport("x".repeat(64001)));
  assert.throws(() => parseDictionaryImport("{bad}"));
});
test("dictionary validation rejects unsafe audio, malformed definitions and unreviewed publishing", () => {
  for (const audio_url of [
    "javascript:alert(1)",
    "data:audio/mp3;base64,abc",
    "http://example.test/a.mp3",
    "https://user:pass@example.test/a.mp3",
  ])
    assert.throws(() =>
      parseDictionaryImport(
        JSON.stringify({ ...dictionaryExample, audio_url }),
      ),
    );
  assert.throws(() =>
    parseDictionaryImport(
      JSON.stringify({ ...dictionaryExample, english_meanings: [1] }),
    ),
  );
  assert.equal(
    dictionarySaveSchema.safeParse({
      entry: dictionaryExample,
      source_note: "",
      status: "published",
      review_confirmed: false,
    }).success,
    false,
  );
});
test("dictionary display escapes text, preserves script direction and omits absent audio", () => {
  const entry = {
    ...payload(),
    id: admin,
    status: "published",
    reviewed_at: "2026-10-25",
    updated_at: "2026-10-25",
    english_meanings: ["<script>alert(1)</script>"],
  } as DictionaryEntry;
  const html = renderToStaticMarkup(
    createElement(DictionaryDefinition, { entry }),
  );
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>|<audio/);
  assert.match(html, /lang="ur" dir="rtl"/);
  assert.match(html, /\/dictionary\/dekhaa/);
});
test("every unannotated poem word is independently clickable without changing whitespace", () => {
  const html = renderToStaticMarkup(
    createElement(Reader, {
      texts: [
        { language: "roman", title: "A line", body: "dekhaa,  dekhaa.\n🌙" },
      ],
    }),
  );
  assert.equal((html.match(/class="dictionary-word"/g) || []).length, 2);
  assert.match(html, /,  /);
  assert.match(html, /\.\n🌙/);
});
test("dictionary RLS hides drafts, prevents reader writes and keeps reviewer IDs private", async () => {
  await as("authenticated", editor);
  const id = await save();
  await as("anon");
  assert.deepEqual(await lookup(), []);
  await assert.rejects(save(), /permission denied/i);
  await assert.rejects(
    db.query("select reviewed_by from public.dictionary_entries"),
    /permission denied/i,
  );
  await as("authenticated", reader);
  await assert.rejects(save(), /staff access required/i);
  await assert.rejects(
    db.query("select reviewed_by from public.dictionary_entries"),
    /permission denied/i,
  );
  await as("authenticated", editor);
  const p = payload();
  p.status = "published";
  p.review_confirmed = true;
  const version = (
    await db.query<{ v: string }>(
      "select updated_at::text v from public.dictionary_entries where id=$1",
      [id],
    )
  ).rows[0].v;
  await assert.rejects(
    save(p, id, version),
    /administrator|row-level security/i,
  );
});
test("reviewed lookup matches scripts and variants exactly, without treating Roman Urdu as English", async () => {
  await as("authenticated", admin);
  const row = (
    await db.query<{ id: string; v: string }>(
      "select id,updated_at::text v from public.dictionary_entries where word_id=$1",
      ["dekhaa"],
    )
  ).rows[0];
  const p = payload();
  p.status = "published";
  await assert.rejects(save(p, row.id, row.v), /confirm.*review/i);
  p.review_confirmed = true;
  await save(p, row.id, row.v);
  await as("anon");
  assert.equal((await lookup("roman", "DEKHAA"))[0].word_id, "dekhaa");
  assert.equal((await lookup("ur", "دیکھا"))[0].word_id, "dekhaa");
  assert.equal((await lookup("hi", "देखा"))[0].word_id, "dekhaa");
  for (const [l, w] of [
    ["en", "dekhaa"],
    ["ar", "دیکھا"],
    ["roman", "dekhnaa"],
    ["roman", "dekhaa%"],
    ["invalid", "dekhaa"],
    ["roman", ""],
  ])
    assert.deepEqual(await lookup(l, w), []);
  assert.equal(Object.hasOwn((await lookup())[0], "reviewed_by"), false);
});
test("published dictionary edits need admin review, reject stale versions and can be archived", async () => {
  await as("authenticated", admin);
  const row = (
    await db.query<{ id: string; v: string }>(
      "select id,updated_at::text v from public.dictionary_entries where word_id=$1",
      ["dekhaa"],
    )
  ).rows[0];
  const p = payload();
  p.status = "published";
  p.review_confirmed = true;
  await save(
    { ...p, english_meanings: ["saw in the distance"] },
    row.id,
    row.v,
  );
  await assert.rejects(save(p, row.id, row.v), /changed/i);
  const latest = (
    await db.query<{ v: string }>(
      "select updated_at::text v from public.dictionary_entries where id=$1",
      [row.id],
    )
  ).rows[0].v;
  await assert.rejects(
    save({ ...p, word_id: "renamed" }, row.id, latest),
    /word ID cannot change/i,
  );
  await save({ ...p, status: "archived" }, row.id, latest);
  await as("anon");
  assert.deepEqual(await lookup(), []);
  assert.equal(
    (
      await db.query(
        "select id from public.dictionary_entries where word_id='dekhaa'",
      )
    ).rows.length,
    0,
  );
  await as("authenticated", editor);
  await assert.rejects(
    save({ ...p, status: "draft" }, row.id, latest),
    /row-level security|unavailable/i,
  );
});
