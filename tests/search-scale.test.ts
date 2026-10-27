import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { readdir, readFile } from "node:fs/promises";

const db = new PGlite({ extensions: { pg_trgm } });
before(async () => {
  await db.exec(
    "create role anon nologin;create role authenticated nologin;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;",
  );
  for (const f of (await readdir("supabase/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(await readFile(`supabase/migrations/${f}`, "utf8"));
  await db.exec(`
    insert into artists(slug,name,kind,status,rights_note) values
      ('scale-poet','Scale Poet','poet','published','Original test fixtures.'),
      ('private-poet','Private Poet','poet','draft','Original test fixtures.');
    insert into kalam(slug,poet_id,form,status,rights_note)
      select 'scale-'||n,(select id from artists where slug='scale-poet'),'ghazal','published','Original test fixtures.'
      from generate_series(1,1000) n;
    insert into kalam_texts(kalam_id,language,title,body)
      select id,'ur','شاعری',repeat('سخن الفاظ معنی ',100) from kalam;
    insert into kalam(slug,poet_id,form,status,rights_note) values
      ('draft-search',(select id from artists where slug='scale-poet'),'ghazal','draft','Original test fixtures.'),
      ('hidden-author',(select id from artists where slug='private-poet'),'ghazal','published','Original test fixtures.');
    insert into kalam_texts(kalam_id,language,title,body)
      select id,'ur','Private needle','Private needle' from kalam where slug in ('draft-search','hidden-author');
    update kalam_texts set body='Unique needle 100% one_two' where kalam_id=(select id from kalam where slug='scale-1');
    analyze library_search_documents;analyze kalam;analyze kalam_texts;analyze artists;
  `);
});
after(() => db.close());

test("anonymous literal searches can use the trigram index without bypassing source RLS", async () => {
  await db.exec("set role anon;set enable_seqscan=off");
  try {
    const plan = await db.query(
      "explain(format json) select kalam_id from library_search_documents where search_text like '%needle%'",
    );
    assert.match(
      JSON.stringify(plan.rows),
      /library_search_documents_trgm_idx/,
    );
    const rows = await db.query<{ slug: string }>(
      "select slug from search_library('needle 100% one_two',null,null,null,'ur')",
    );
    assert.deepEqual(
      rows.rows.map((r) => r.slug),
      ["scale-1"],
    );
    assert.equal(
      (await db.query("select * from library_search_documents")).rows.length,
      1000,
    );
    await assert.rejects(
      db.exec("delete from library_search_documents"),
      /permission denied/i,
    );
    await assert.rejects(
      db.exec("select private.refresh_library_search_documents('{}')"),
      /permission denied/i,
    );
  } finally {
    await db.exec("reset enable_seqscan;reset role");
  }
});

test("text edits and work publication update the public search index atomically", async () => {
  await db.exec(
    "update kalam_texts set body='Replacement searchable text' where kalam_id=(select id from kalam where slug='scale-1')",
  );
  await db.exec("set role anon");
  assert.equal(
    (await db.query("select * from search_kalam('needle')")).rows.length,
    0,
  );
  assert.equal(
    (await db.query("select * from search_kalam('replacement')")).rows.length,
    1,
  );
  await db.exec(
    "reset role;update kalam set status='draft' where slug='scale-1';set role anon",
  );
  assert.equal(
    (await db.query("select * from search_kalam('replacement')")).rows.length,
    0,
  );
  assert.equal(
    (
      await db.query(
        "select * from library_search_documents where search_text like '%replacement%'",
      )
    ).rows.length,
    0,
  );
  await db.exec(
    "reset role;update kalam set status='published' where slug='scale-1';set role anon",
  );
  assert.equal(
    (await db.query("select * from search_kalam('replacement')")).rows.length,
    1,
  );
  await db.exec(
    "reset role;begin;update kalam set status='draft' where slug='scale-1';rollback;set role anon",
  );
  assert.equal(
    (await db.query("select * from search_kalam('replacement')")).rows.length,
    1,
  );
  await db.exec("reset role");
});

test("unpublished authors disappear from direct search documents and return only on publication", async () => {
  await db.exec(
    "update artists set status='draft' where slug='scale-poet';set role anon",
  );
  assert.equal(
    (await db.query("select * from library_search_documents")).rows.length,
    0,
  );
  assert.equal(
    (await db.query("select * from search_kalam('Scale Poet')")).rows.length,
    0,
  );
  await db.exec(
    "reset role;update artists set status='published' where slug='scale-poet';set role anon",
  );
  assert.equal(
    (await db.query("select * from library_search_documents")).rows.length,
    1000,
  );
  assert.equal(
    (await db.query("select * from search_kalam('Private needle')")).rows
      .length,
    0,
  );
  await db.exec(
    "reset role;delete from kalam_texts where kalam_id=(select id from kalam where slug='scale-1');set role anon",
  );
  assert.equal(
    (await db.query("select * from library_search_documents")).rows.length,
    999,
  );
  await db.exec("reset role");
});
