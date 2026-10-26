import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { PGlite } from "@electric-sql/pglite";
import {
  wordBankBatchSchema,
  wordBankHash,
  wordBankTotal,
  readWordBankLines,
  displayWazanCandidate,
} from "../src/lib/word-bank";
import { parseDictionaryImport } from "../src/lib/dictionary-validation";
const db = new PGlite(),
  admin = "c0000000-0000-4000-8000-000000000001",
  editor = "c0000000-0000-4000-8000-000000000002";
async function as(role: string, uid = "") {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid]);
  if (role !== "owner") await db.exec(`set role ${role}`);
}
async function batch(offset: number, rows: unknown[]) {
  return (
    await db.query<{ v: { processed: number; inserted: number } }>(
      "select public.import_urdu_word_batch($1,$2::jsonb) v",
      [offset, JSON.stringify(rows)],
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
  await db.query("insert into auth.users values($1),($2)", [admin, editor]);
  await db.query(
    "insert into public.staff_roles values($1,'admin'),($2,'editor')",
    [admin, editor],
  );
});
after(() => db.close());
test("Arabic-only definitions and numeric wazan validate without inventing English meanings", () => {
  const entry = parseDictionaryImport(
    JSON.stringify({
      word_id: "dekhaa-ar",
      urdu: "دیکھا",
      part_of_speech: "verb",
      arabic_meanings: ["رأى", "شاهد"],
      wazan: ["22"],
      wazan_note: "Pronunciation context",
    }),
  );
  assert.deepEqual(entry.english_meanings, []);
  assert.deepEqual(entry.arabic_meanings, ["رأى", "شاهد"]);
  for (const wazan of [["2x"], ["٣"], ["1".repeat(41)], [22]])
    assert.throws(() =>
      parseDictionaryImport(JSON.stringify({ ...entry, wazan })),
    );
  assert.equal(displayWazanCandidate("-x="), "1(1/2)2");
  assert.equal(
    wordBankBatchSchema.safeParse({
      offset: 0,
      rows: [{ headword: "لفظ", wazan_candidates: ["-x"] }],
    }).success,
    true,
  );
  assert.equal(
    wordBankBatchSchema.safeParse({
      offset: 0,
      rows: [{ headword: "<script>", wazan_candidates: [] }],
    }).success,
    false,
  );
});
test("streaming JSONL parser preserves split Urdu UTF-8 and rejects oversized/malformed rows", async () => {
  const data = new TextEncoder().encode(
    '{"headword":"دیکھا","wazan_candidates":["=="]}\n',
  );
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      for (const v of data) c.enqueue(new Uint8Array([v]));
      c.close();
    },
  });
  const rows = [];
  for await (const row of readWordBankLines(stream)) rows.push(row);
  assert.equal(rows[0].headword, "دیکھا");
  for (const raw of ['{"headword":2}\n', "x".repeat(16001)]) {
    const s = new Blob([raw]).stream();
    await assert.rejects(async () => {
      for await (const row of readWordBankLines(s)) void row;
    });
  }
});
test("bulk import denies anonymous, readers and editors; invalid batches roll back", async () => {
  const rows = [{ headword: "لفظ", wazan_candidates: ["="] }];
  await as("anon");
  await assert.rejects(batch(0, rows), /permission denied/i);
  await as("authenticated", editor);
  await assert.rejects(batch(0, rows), /administrator/i);
  await as("authenticated");
  await assert.rejects(batch(0, rows), /administrator/i);
  await as("authenticated", admin);
  await assert.rejects(batch(1, rows), /progress changed/i);
  await assert.rejects(
    batch(0, [...rows, { headword: "بد", wazan_candidates: ["unsafe"] }]),
    /invalid source/i,
  );
  assert.equal(
    (await db.query("select * from public.urdu_word_bank")).rows.length,
    0,
  );
});
test("the complete pinned corpus imports in bounded batches, resumes idempotently and remains public only as source data", async () => {
  const compressed = await readFile("public/data/urdu-word-bank.jsonl.gz");
  assert.equal(
    createHash("sha256").update(compressed).digest("hex"),
    wordBankHash,
  );
  const rows = gunzipSync(compressed)
    .toString("utf8")
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l));
  assert.equal(rows.length, wordBankTotal);
  await as("authenticated", admin);
  let progress = { processed: 0, inserted: 0 };
  for (let offset = 0; offset < rows.length; offset += 1000)
    progress = await batch(offset, rows.slice(offset, offset + 1000));
  assert.equal(progress.processed, 154781);
  assert.equal(progress.inserted, 154781);
  const retry = await batch(0, rows.slice(0, 1000));
  assert.deepEqual(retry, progress);
  const counts = (
    await db.query<{ n: number; weighted: number }>(
      "select count(*)::int n,count(*) filter(where cardinality(wazan_candidates)>0)::int weighted from public.urdu_word_bank",
    )
  ).rows[0];
  assert.deepEqual(counts, { n: 154781, weighted: 130445 });
  await as("anon");
  assert.ok(
    (await db.query("select * from public.lookup_urdu_word_bank($1)", ["چلو"]))
      .rows.length,
  );
  assert.equal(
    (
      await db.query("select * from public.search_urdu_word_bank($1,$2)", [
        "%",
        "",
      ])
    ).rows.length,
    0,
  );
  const first = (
    await db.query<{ headword: string }>(
      "select * from public.search_urdu_word_bank($1,$2)",
      ["", ""],
    )
  ).rows;
  const next = (
    await db.query<{ headword: string }>(
      "select * from public.search_urdu_word_bank($1,$2)",
      ["", first[49].headword],
    )
  ).rows;
  assert.equal(first.length, 51);
  assert.ok(
    !first
      .slice(0, 50)
      .some((a) => next.some((b) => a.headword === b.headword)),
  );
  await assert.rejects(
    db.query("select * from public.word_bank_import"),
    /permission denied/i,
  );
  assert.equal(
    (await db.query("select word_id from public.dictionary_entries")).rows
      .length,
    0,
  );
});
test("Arabic definitions and wazan persist through review, stay private as drafts and reject invalid database weights", async () => {
  await as("authenticated", admin);
  const entry = {
    ...parseDictionaryImport(
      JSON.stringify({
        word_id: "dekhaa-ar",
        urdu: "دیکھا",
        part_of_speech: "verb",
        arabic_meanings: ["رأى"],
        wazan: ["22"],
      }),
    ),
    source_note: "Original isolated test editorial definition",
    status: "draft",
    review_confirmed: false,
  };
  const id = (
    await db.query<{ id: string }>(
      "select public.save_dictionary_entry(null,$1::jsonb,null) id",
      [JSON.stringify(entry)],
    )
  ).rows[0].id;
  await as("anon");
  assert.deepEqual(
    (
      await db.query<{ v: unknown }>(
        "select public.lookup_dictionary($1,$2) v",
        ["ur", "دیکھا"],
      )
    ).rows[0].v,
    [],
  );
  await as("authenticated", admin);
  const version = (
    await db.query<{ v: string }>(
      "select updated_at::text v from public.dictionary_entries where id=$1",
      [id],
    )
  ).rows[0].v;
  await assert.rejects(
    db.query("select public.save_dictionary_entry($1,$2::jsonb,$3)", [
      id,
      JSON.stringify({ ...entry, wazan: ["2x"] }),
      version,
    ]),
    /wazan/i,
  );
  await db.query("select public.save_dictionary_entry($1,$2::jsonb,$3)", [
    id,
    JSON.stringify({ ...entry, status: "published", review_confirmed: true }),
    version,
  ]);
  await as("anon");
  const result = (
    await db.query<{
      v: {
        arabic_meanings: string[];
        wazan: string[];
        english_meanings: string[];
      }[];
    }>("select public.lookup_dictionary($1,$2) v", ["ur", "دیکھا"])
  ).rows[0].v[0];
  assert.deepEqual(result.arabic_meanings, ["رأى"]);
  assert.deepEqual(result.wazan, ["22"]);
  assert.deepEqual(result.english_meanings, []);
});
