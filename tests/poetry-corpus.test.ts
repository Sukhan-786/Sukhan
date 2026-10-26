import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import {
  poetryManifest,
  poetryRowSchema,
  readPoetryLines,
  type PoetryRow,
} from "../src/lib/poetry-import";
import { readingPassages } from "../src/lib/reading-passages";
import {
  translationSchema,
  translationColumns,
} from "../src/lib/couplet-translations";
import { xmlEscape, sitemapPaths } from "../src/lib/seo";
const db = new PGlite({ extensions: { pg_trgm } }),
  admin = "e0000000-0000-4000-8000-000000000001",
  editor = "e0000000-0000-4000-8000-000000000002",
  reader = "e0000000-0000-4000-8000-000000000003";
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
let first: PoetryRow, second: PoetryRow, long: PoetryRow;
async function as(role: string, uid = "") {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid]);
  if (role !== "owner") await db.exec(`set role ${role}`);
}
async function batch(source: string, offset: number, rows: PoetryRow[]) {
  return (
    await db.query<{
      v: { processed: number; inserted: number; skipped: number };
    }>("select public.import_poetry_batch($1,$2,$3::jsonb) v", [
      source,
      offset,
      JSON.stringify(rows),
    ])
  ).rows[0].v;
}
before(async () => {
  await db.exec(
    "create role anon nologin;create role authenticated nologin;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;",
  );
  for (const f of (await readdir("supabase/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(await readFile(`supabase/migrations/${f}`, "utf8"));
  await db.query("insert into auth.users values($1),($2),($3)", [
    admin,
    editor,
    reader,
  ]);
  await db.query(
    "insert into public.staff_roles(user_id,role) values($1,'admin'),($2,'editor')",
    [admin, editor],
  );
});
after(() => db.close());
test("all 73,183 supplied source rows match their pinned checksums, identities and bounded schemas", async () => {
  let total = 0,
    longCount = 0;
  const seen = new Set<string>(),
    authors = new Set<string>();
  for (const dataset of poetryManifest.datasets) {
    let count = 0;
    for (const shard of dataset.shards) {
      const bytes = await readFile(`public/data/poetry/${shard.file}`);
      assert.equal(bytes.length, shard.bytes);
      assert.equal(
        createHash("sha256").update(bytes).digest("hex"),
        shard.sha256,
      );
      const raw = gunzipSync(bytes);
      assert.equal(raw.length, shard.raw_bytes);
      let rows = 0;
      for await (const value of readPoetryLines(new Blob([raw]).stream())) {
        const row = poetryRowSchema.parse(value);
        assert(!seen.has(row.source_key));
        seen.add(row.source_key);
        authors.add(row.poet_slug);
        const t = row.texts[0];
        assert.equal(
          row.source_key,
          hash(`${row.poet_slug}\n${t.language}\n${t.body}`),
        );
        if (dataset.id === "urdu-ghazals-v1") {
          assert(row.texts.some((t) => t.language === "roman"));
          assert(!row.texts.some((t) => t.language === "en"));
          if (!first) first = row;
          else if (!second) second = row;
        }
        if (t.body.length > 100000) {
          long = row;
          longCount++;
        }
        rows++;
      }
      assert.equal(rows, shard.rows);
      count += rows;
    }
    assert.equal(count, dataset.rows);
    total += count;
  }
  assert.equal(total, 73183);
  assert.equal(authors.size, 102);
  assert.equal(longCount, 2);
  assert.equal(long.texts[0].body.length, 158153);
  assert(
    (
      await readFile("public/data/poetry/PERSIAN-CC-BY-SA-4.0.txt", "utf8")
    ).includes("Attribution-ShareAlike 4.0"),
  );
});
test("poetry import denies readers/editors and preserves an atomic, resumable checkpoint", async () => {
  await as("anon");
  await assert.rejects(
    batch("urdu-ghazals-v1", 0, [first]),
    /permission denied/i,
  );
  for (const id of [reader, editor]) {
    await as("authenticated", id);
    assert.equal(
      (await db.query("select * from public.poetry_imports")).rows.length,
      0,
    );
    await assert.rejects(
      batch("urdu-ghazals-v1", 0, [first]),
      /administrator/i,
    );
  }
  await as("authenticated", admin);
  await assert.rejects(
    batch("urdu-ghazals-v1", 0, [{ ...first, source_key: "0".repeat(64) }]),
    /identity/i,
  );
  assert.equal(
    (
      await db.query<{ n: number }>(
        "select processed n from public.poetry_imports where source_id='urdu-ghazals-v1'",
      )
    ).rows[0].n,
    0,
  );
  const saved = await batch("urdu-ghazals-v1", 0, [first]);
  assert.equal(saved.processed, 1);
  assert.equal(saved.inserted, 1);
  const retry = await batch("urdu-ghazals-v1", 0, [first]);
  assert.equal(retry.processed, 1);
  assert.equal(retry.inserted, 1);
  await assert.rejects(
    batch("urdu-ghazals-v1", 5, [second]),
    /progress changed/i,
  );
});
test("poetry collisions preserve existing manuscripts, invalid texts roll back, and long Persian texts stay whole", async () => {
  await as("authenticated", admin);
  const poet = (
    await db.query<{ id: string }>(
      "select id from public.artists where slug=$1",
      [first.poet_slug],
    )
  ).rows[0].id;
  await db.query(
    "insert into public.kalam(id,slug,poet_id,form,status,rights_note) values($1,$2,$3,'nazm','draft','Private original')",
    [second.id, second.slug, poet],
  );
  const skipped = await batch("urdu-ghazals-v1", 1, [second]);
  assert.equal(skipped.skipped, 1);
  assert.equal(
    (
      await db.query<{ rights_note: string }>(
        "select rights_note from public.kalam where id=$1",
        [second.id],
      )
    ).rows[0].rights_note,
    "Private original",
  );
  const invalid = structuredClone(long);
  invalid.texts[0].language = "en";
  invalid.texts[0].body = "";
  invalid.source_key = hash(`${invalid.poet_slug}\nen\n`);
  await assert.rejects(batch("persian-texts-v1", 0, [invalid]), /constraint/i);
  assert.equal(
    (
      await db.query<{ n: number }>(
        "select processed n from public.poetry_imports where source_id='persian-texts-v1'",
      )
    ).rows[0].n,
    0,
  );
  await batch("persian-texts-v1", 0, [long]);
  assert.equal(
    (
      await db.query<{ body: string }>(
        "select body from public.kalam_texts where kalam_id=$1",
        [long.id],
      )
    ).rows[0].body,
    long.texts[0].body,
  );
  await as("anon");
  assert.equal(
    (await db.query("select * from public.kalam where id=$1", [second.id])).rows
      .length,
    0,
  );
  await assert.rejects(
    db.query("select * from public.poetry_import_records"),
    /permission denied/i,
  );
});
test("passage boundaries keep Unicode offsets, odd lines and prose paragraphs without discarding text", () => {
  const body = "آواز 😀\nدوسری سطر\nتیسری سطر";
  const parts = readingPassages(body);
  assert.equal(parts.length, 2);
  for (const p of parts)
    assert.equal(Array.from(body).slice(p.start, p.end).join(""), p.surface);
  assert.equal(parts[1].surface, "تیسری سطر");
  assert.deepEqual(
    readingPassages("ایک پیرا\nدو سطریں\n\nدوسرا پیرا", true).map(
      (p) => p.surface,
    ),
    ["ایک پیرا\nدو سطریں", "دوسرا پیرا"],
  );
  assert.equal(translationSchema.safeParse({}).success, false);
  assert.equal(xmlEscape("<>&\"'"), "&lt;&gt;&amp;&quot;&apos;");
  assert.equal(sitemapPaths({ poetry: 73183, dictionary: 1200 }).length, 77);
  assert(
    sitemapPaths({ poetry: 73183, dictionary: 0 }).includes(
      "/sitemaps/poetry-73.xml",
    ),
  );
});
test("reviewed Persian translations stay private as drafts, enforce exact passages and hide after source edits", async () => {
  await as("authenticated", admin);
  const text = long.texts[0],
    passage = readingPassages(text.body)[0];
  const input = {
    kalam_id: long.id,
    language: "fa",
    target_language: "ur",
    start_offset: passage.start,
    end_offset: passage.end,
    surface: passage.surface,
    text_hash: hash(text.body),
    translation: "یہ صرف الگ ٹیسٹ کا ترجمہ ہے۔",
    source_note: "Original isolated test translation.",
    status: "draft",
    review_confirmed: false,
  };
  const save = async (
    id: string | null,
    payload = input,
    version: string | null = null,
  ) =>
    (
      await db.query<{ v: string }>(
        "select public.save_couplet_translation($1,$2::jsonb,$3::timestamptz) v",
        [id, JSON.stringify(payload), version],
      )
    ).rows[0].v;
  await as("authenticated", editor);
  await assert.rejects(
    save(null, { ...input, status: "published", review_confirmed: true }),
    /security|administrator/i,
  );
  const id = await save(null);
  await as("anon");
  assert.equal(
    (
      await db.query(
        `select ${translationColumns} from public.couplet_translations`,
      )
    ).rows.length,
    0,
  );
  await assert.rejects(save(null), /permission denied/i);
  await as("authenticated", admin);
  const version = (
    await db.query<{ v: string }>(
      "select updated_at::text v from public.couplet_translations where id=$1",
      [id],
    )
  ).rows[0].v;
  await assert.rejects(
    save(id, { ...input, status: "published" }, version),
    /confirm/i,
  );
  await save(
    id,
    { ...input, status: "published", review_confirmed: true },
    version,
  );
  await assert.rejects(save(id, input, version), /changed/i);
  await as("anon");
  assert.equal(
    (
      await db.query(
        `select ${translationColumns} from public.couplet_translations`,
      )
    ).rows.length,
    1,
  );
  await assert.rejects(
    db.query("select reviewed_by from public.couplet_translations"),
    /permission denied/i,
  );
  await as("authenticated", admin);
  await db.query(
    "update public.kalam_texts set body=body||E'\nنئی سطر' where kalam_id=$1 and language='fa'",
    [long.id],
  );
  await as("anon");
  assert.equal(
    (
      await db.query(
        `select ${translationColumns} from public.couplet_translations`,
      )
    ).rows.length,
    0,
  );
});
test("indexed literal search and metadata-only sitemaps keep private and unpublished-author works hidden", async () => {
  await as("anon");
  for (const q of ["%", "_", "\\", "';drop table kalam;--"]) {
    assert.equal(
      (await db.query("select * from public.search_library($1)", [q])).rows
        .length,
      0,
    );
  }
  assert.equal(
    (
      await db.query(
        "select * from public.search_library('',null,null,null,'roman')",
      )
    ).rows.length,
    1,
  );
  const counts = (
    await db.query<{ v: { poetry: number } }>(
      "select public.sitemap_counts() v",
    )
  ).rows[0].v;
  assert.equal(counts.poetry, 2);
  const rows = (
    await db.query<Record<string, unknown>>(
      "select * from public.sitemap_poetry(0)",
    )
  ).rows;
  assert.equal(rows.length, 2);
  assert(!Object.hasOwn(rows[0], "body"));
  assert.equal(
    (await db.query("select * from public.sitemap_poetry(10000)")).rows.length,
    0,
  );
  await as("authenticated", admin);
  await db.query(
    "update public.artists set status='draft' where id=(select poet_id from public.kalam where id=$1)",
    [long.id],
  );
  await as("anon");
  assert.equal(
    (
      await db.query<Record<string, unknown>>(
        "select * from public.sitemap_poetry(0)",
      )
    ).rows.length,
    1,
  );
});
