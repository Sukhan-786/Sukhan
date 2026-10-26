import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
const db = new PGlite({ extensions: { pg_trgm } });
const admin = "a0000000-0000-4000-8000-000000000001",
  editor = "a0000000-0000-4000-8000-000000000002",
  reader = "a0000000-0000-4000-8000-000000000003";
const poet = "b0000000-0000-4000-8000-000000000001";
async function as(role: "anon" | "authenticated" | "owner", uid = "") {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid]);
  if (role !== "owner") await db.exec(`set role ${role}`);
}
function payload(slug: string, status = "draft") {
  return {
    slug,
    poet_id: poet,
    form: "nazm",
    summary: "A test work",
    status,
    rights_note: "Original test content",
    texts: [
      { language: "ur", title: "چراغ", body: "لفظوں کا چراغ" },
      { language: "roman", title: "Charagh", body: "Lafzon ka charagh" },
      { language: "fa", title: "چراغ واژه‌ها", body: "واژه‌ها" },
      { language: "en", title: "A lamp", body: "Words and light" },
    ],
    media_ids: [] as string[],
  };
}
async function save(
  input: ReturnType<typeof payload>,
  id: string | null = null,
  version: string | null = null,
) {
  const r = await db.query<{ id: string }>(
    "select public.save_kalam($1,$2::jsonb,$3::timestamptz) id",
    [id, JSON.stringify(input), version],
  );
  return r.rows[0].id;
}
before(async () => {
  await db.exec(
    `create role anon nologin;create role authenticated nologin;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`,
  );
  const files = (await readdir("supabase/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files)
    await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
  await db.query("insert into auth.users(id) values ($1),($2),($3)", [
    admin,
    editor,
    reader,
  ]);
  await db.query(
    "insert into public.staff_roles(user_id,role) values($1,'admin'),($2,'editor')",
    [admin, editor],
  );
  await db.query(
    "insert into public.artists(id,slug,name,name_ur,kind,status,rights_note) values($1,'test-poet','Test Poet','شاعر','both','published','Test permission')",
    [poet],
  );
  await as("authenticated", admin);
  await save(payload("published-work", "published"));
  await save(payload("private-work"));
});
after(async () => {
  await db.close();
});
test("editorial listings and counts deny anonymous and ordinary reader access", async () => {
  await as("anon");
  await assert.rejects(
    db.query("select public.editorial_page('kalam')"),
    /permission denied/i,
  );
  await as("authenticated", reader);
  await assert.rejects(
    db.query("select public.editorial_page('kalam')"),
    /staff access required/i,
  );
  await assert.rejects(
    db.query("select public.editorial_overview()"),
    /staff access required/i,
  );
});
test("staff search finds draft translations and treats search text literally", async () => {
  await as("authenticated", editor);
  const page = await db.query<{
    page: { total: number; items: { status: string; scripts: string[] }[] };
  }>("select public.editorial_page('kalam','چراغ','draft') page");
  assert.equal(page.rows[0].page.total, 1);
  assert.equal(page.rows[0].page.items[0].status, "draft");
  assert.equal(page.rows[0].page.items[0].scripts.length, 4);
  const injection = await db.query<{ page: { total: number } }>(
    "select public.editorial_page('kalam',$1) page",
    ["'; drop table kalam; --"],
  );
  assert.equal(injection.rows[0].page.total, 0);
  const overview = await db.query<{
    counts: { kalam: { total: number; draft: number; published: number } };
  }>("select public.editorial_overview() counts");
  assert.deepEqual(overview.rows[0].counts.kalam, {
    total: 2,
    draft: 1,
    published: 1,
  });
});
test("editorial cursor navigation reaches every record and returns to newer results without duplicates", async () => {
  await as("owner");
  await db.exec(
    "insert into public.artists(slug,name,kind) select 'paging-'||n,'Paging '||n,'artist' from generate_series(1,60) n",
  );
  await as("authenticated", admin);
  type Page = {
    items: { id: string; updated_at: string }[];
    total: number;
    has_more: boolean;
  };
  const fetch = async (
    cursor: Page["items"][number] | null = null,
    previous = false,
  ) => {
    const result = await db.query<{ page: Page }>(
      "select public.editorial_page('artists','Paging','','artist',$1,$2,$3) page",
      [cursor?.updated_at || null, cursor?.id || null, previous],
    );
    return result.rows[0].page;
  };
  const first = await fetch(),
    second = await fetch(first.items.at(-1)),
    third = await fetch(second.items.at(-1));
  assert.equal(first.total, 60);
  assert.equal(first.items.length, 25);
  assert.equal(third.items.length, 10);
  assert.equal(third.has_more, false);
  assert.equal(
    new Set([...first.items, ...second.items, ...third.items].map((r) => r.id))
      .size,
    60,
  );
  const back = await fetch(second.items[0], true);
  assert.deepEqual(back.items, first.items);
  assert.equal(back.has_more, false);
  await as("owner");
  await db.exec("delete from public.artists where slug like 'paging-%'");
});
test("every exposed table has RLS enabled", async () => {
  await as("owner");
  const r = await db.query<{ relname: string; relrowsecurity: boolean }>(
    "select relname,relrowsecurity from pg_class join pg_namespace n on n.oid=relnamespace where n.nspname='public' and relkind='r'",
  );
  assert.deepEqual(
    r.rows.map((t) => t.relname).sort(),
    [
      "staff_roles",
      "artists",
      "kalam",
      "kalam_texts",
      "media",
      "kalam_media",
      "word_meanings",
      "dictionary_entries",
      "homepage_public",
      "homepage_draft",
      "couplet_translations",
      "poetry_imports",
      "poetry_import_records",
      "urdu_word_bank",
      "word_bank_import",
    ].sort(),
  );
  assert.ok(r.rows.every((t) => t.relrowsecurity));
});
test("anonymous readers see only published works and their translations", async () => {
  await as("anon");
  assert.equal((await db.query("select * from public.kalam")).rows.length, 1);
  assert.equal(
    (await db.query("select * from public.kalam_texts")).rows.length,
    4,
  );
  await assert.rejects(
    db.query("select * from public.staff_roles"),
    /permission denied/i,
  );
  await assert.rejects(
    db.query("insert into public.artists(slug,name) values('attack','Attack')"),
    /permission denied/i,
  );
});
test("ordinary authenticated users cannot write or self-promote", async () => {
  await as("authenticated", reader);
  await assert.rejects(save(payload("reader-attack")), /row-level security/i);
  await assert.rejects(
    db.query(
      "insert into public.staff_roles(user_id,role) values($1,'admin')",
      [reader],
    ),
    /permission denied/i,
  );
  await assert.rejects(
    db.query("update public.staff_roles set role='admin'"),
    /permission denied/i,
  );
  assert.equal(
    (await db.query("select * from public.staff_roles")).rows.length,
    0,
  );
});
test("editor can create, update, and delete a draft with all scripts", async () => {
  await as("authenticated", editor);
  const id = await save(payload("editor-work"));
  const original = await db.query<{ updated_at: Date }>(
    "select updated_at from public.kalam where id=$1",
    [id],
  );
  const changed = payload("editor-work-updated");
  await save(changed, id, original.rows[0].updated_at.toISOString());
  assert.equal(
    (await db.query("select * from public.kalam_texts where kalam_id=$1", [id]))
      .rows.length,
    4,
  );
  await db.query("delete from public.kalam where id=$1", [id]);
  assert.equal(
    (await db.query("select * from public.kalam_texts where kalam_id=$1", [id]))
      .rows.length,
    0,
  );
});
test("editor cannot publish, change published text, or delete published works", async () => {
  await as("authenticated", editor);
  await assert.rejects(
    save(payload("editor-publish", "published")),
    /row-level security/i,
  );
  const r = await db.query<{ id: string }>(
    "select id from public.kalam where slug='published-work'",
  );
  const id = r.rows[0].id;
  assert.equal(
    (
      await db.query(
        "update public.kalam_texts set body='attack' where kalam_id=$1 returning *",
        [id],
      )
    ).rows.length,
    0,
  );
  assert.equal(
    (await db.query("delete from public.kalam where id=$1 returning *", [id]))
      .rows.length,
    0,
  );
});
test("invalid language rolls back the entire save", async () => {
  await as("authenticated", admin);
  const input = payload("atomic-failure");
  input.texts[1].language = "invalid";
  await assert.rejects(save(input), /check constraint/i);
  assert.equal(
    (await db.query("select * from public.kalam where slug='atomic-failure'"))
      .rows.length,
    0,
  );
});
test("concurrent edit detection preserves the saved work", async () => {
  await as("authenticated", admin);
  const id = await save(payload("stale-check"));
  await assert.rejects(
    save(payload("overwritten"), id, "2000-01-01T00:00:00Z"),
    /Work changed/,
  );
  assert.equal(
    (
      await db.query<{ slug: string }>(
        "select slug from public.kalam where id=$1",
        [id],
      )
    ).rows[0].slug,
    "stale-check",
  );
});
test("admin can publish and anonymous search matches scripts without leaking drafts", async () => {
  await as("anon");
  for (const q of ["چراغ", "charagh", "lamp", "واژه", "test poet", "لَفْظوں"]) {
    const r = await db.query("select * from public.search_kalam($1)", [q]);
    assert.equal(r.rows.length, 1, q);
  }
  assert.equal(
    (await db.query("select * from public.search_kalam('private-work')")).rows
      .length,
    0,
  );
  assert.equal(
    (await db.query("select * from public.search_kalam('missing')")).rows
      .length,
    0,
  );
  assert.equal(
    (await db.query("select * from public.search_kalam('', 'ghazal')")).rows
      .length,
    0,
  );
});
test("media relationships expose only published recordings", async () => {
  await as("authenticated", admin);
  const r = await db.query<{ id: string }>(
    "insert into public.media(title,kind,url,status,rights_note,transcript) values('Published recording','audio','https://example.com/a.mp3','published','Permission','Transcript'),('Draft recording','audio','https://example.com/d.mp3','draft','','') returning id",
  );
  const p = payload("with-media", "published");
  p.media_ids = r.rows.map((m) => m.id);
  await save(p);
  await as("anon");
  assert.equal((await db.query("select * from public.media")).rows.length, 1);
  assert.equal(
    (await db.query("select * from public.kalam_media")).rows.length,
    1,
  );
  assert.equal(
    (await db.query("select * from public.search_kalam('',null,null,'audio')"))
      .rows.length,
    1,
  );
});
test("published video requires captions, transcript and rights at database level", async () => {
  await as("authenticated", admin);
  await assert.rejects(
    db.exec(
      "insert into public.media(title,kind,url,status,rights_note,transcript) values('No captions','video','https://example.com/v.mp4','published','Permission','Transcript')",
    ),
    /check constraint/,
  );
});
test("draft author hides dependent work from anonymous readers", async () => {
  await as("authenticated", admin);
  await db.query("update public.artists set status='draft' where id=$1", [
    poet,
  ]);
  await as("anon");
  assert.equal((await db.query("select * from public.kalam")).rows.length, 0);
  assert.equal(
    (await db.query("select * from public.kalam_texts")).rows.length,
    0,
  );
  assert.equal(
    (await db.query("select * from public.kalam_media")).rows.length,
    0,
  );
  await as("owner");
  await db.query("update public.artists set status='published' where id=$1", [
    poet,
  ]);
});
test("table grants deny truncate and reference role data only for self", async () => {
  await as("authenticated", editor);
  await assert.rejects(
    db.exec("truncate public.kalam cascade"),
    /permission denied/i,
  );
  assert.deepEqual(
    (await db.query<{ role: string }>("select role from public.staff_roles"))
      .rows,
    [{ role: "editor" }],
  );
});

test("failed updates roll back work, text and relationship changes together", async () => {
  await as("authenticated", admin);
  const id = await save(payload("rollback-source"));
  const before = await db.query<{ updated_at: string }>(
    "select updated_at::text from public.kalam where id=$1",
    [id],
  );
  const invalid = payload("rollback-overwrite");
  invalid.texts[1] = { ...invalid.texts[0] };
  await assert.rejects(
    save(invalid, id, before.rows[0].updated_at),
    /One to four|duplicate key/,
  );
  assert.equal(
    (
      await db.query<{ slug: string }>(
        "select slug from public.kalam where id=$1",
        [id],
      )
    ).rows[0].slug,
    "rollback-source",
  );
  assert.equal(
    (await db.query("select * from public.kalam_texts where kalam_id=$1", [id]))
      .rows.length,
    4,
  );
  const badRelationship = payload("rollback-link");
  badRelationship.media_ids = ["f0000000-0000-4000-8000-000000000000"];
  await assert.rejects(
    save(badRelationship, id, before.rows[0].updated_at),
    /foreign key/,
  );
  assert.equal(
    (
      await db.query<{ slug: string }>(
        "select slug from public.kalam where id=$1",
        [id],
      )
    ).rows[0].slug,
    "rollback-source",
  );
});
test("editor manages draft profiles and media but cannot publish them", async () => {
  await as("authenticated", editor);
  const artists = await db.query<{ id: string }>(
    "insert into public.artists(slug,name) values('editor-profile','Editor Profile') returning id",
  );
  const id = artists.rows[0].id;
  await db.query(
    "update public.artists set bio='Draft biography' where id=$1",
    [id],
  );
  await assert.rejects(
    db.query(
      "update public.artists set status='published',rights_note='Permission' where id=$1",
      [id],
    ),
    /row-level security/,
  );
  const recordings = await db.query<{ id: string }>(
    "insert into public.media(title,kind,url) values('Editor recording','audio','https://example.com/draft.mp3') returning id",
  );
  const mediaId = recordings.rows[0].id;
  await db.query(
    "update public.media set transcript='Accessible text' where id=$1",
    [mediaId],
  );
  await assert.rejects(
    db.query(
      "update public.media set status='published',rights_note='Permission' where id=$1",
      [mediaId],
    ),
    /row-level security/,
  );
  await db.query("delete from public.media where id=$1", [mediaId]);
  await db.query("delete from public.artists where id=$1", [id]);
});
test("metadata claims cannot grant editorial access, and roles can be revoked immediately", async () => {
  await as("authenticated", reader);
  await db.query("select set_config('request.jwt.claims',$1,false)", [
    JSON.stringify({
      user_metadata: { role: "admin" },
      app_metadata: { role: "admin" },
    }),
  ]);
  await assert.rejects(save(payload("metadata-attack")), /row-level security/);
  await as("owner");
  await db.query("delete from public.staff_roles where user_id=$1", [editor]);
  await as("authenticated", editor);
  await assert.rejects(save(payload("revoked-editor")), /row-level security/);
  await as("owner");
  await db.query(
    "insert into public.staff_roles(user_id,role) values($1,'editor')",
    [editor],
  );
});
test("search treats SQL and HTML input as literal text", async () => {
  await as("anon");
  assert.equal(
    (
      await db.query("select * from public.search_kalam($1)", [
        "' OR 1=1 -- <script>",
      ])
    ).rows.length,
    0,
  );
});

test("six-script saves preserve legacy translations, enforce RLS and search Hindi/Arabic", async () => {
  await as("authenticated", admin);
  const input = payload("six-script-work", "published");
  input.texts.push(
    { language: "hi", title: "शब्दों का दीपक", body: "शब्दों की रोशनी" },
    { language: "ar", title: "مصباح الكلمات", body: "نور الكلمات" },
  );
  const id = await save(input);
  const stored = await db.query<{ language: string; body: string }>(
    "select language,body from public.kalam_texts where kalam_id=$1",
    [id],
  );
  assert.equal(stored.rows.length, 6);
  assert.equal(
    stored.rows.find((t) => t.language === "hi")?.body,
    "शब्दों की रोशनी",
  );
  await as("anon");
  for (const query of ["रोशनी", "نور"]) {
    const matches = await db.query<{ id: string }>(
      "select id from public.search_kalam($1)",
      [query],
    );
    assert.equal(matches.rows[0]?.id, id);
  }
  await as("authenticated", reader);
  await assert.rejects(
    save({ ...input, slug: "reader-six-script" }),
    /row.level security/i,
  );
  await as("authenticated", admin);
  const recording = await db.query<{ language: string }>(
    "insert into public.media(title,kind,url,language,transcript) values('Arabic voice','audio','https://example.com/ar.mp3','ar','نور الكلمات'),('Hindi voice','audio','https://example.com/hi.mp3','hi','शब्दों की रोशनी') returning language",
  );
  assert.deepEqual(recording.rows.map((t) => t.language).sort(), ["ar", "hi"]);
  await assert.rejects(
    save({
      ...input,
      slug: "too-many-scripts",
      texts: [...input.texts, input.texts[0]],
    }),
    /One to six/,
  );
});

test("contextual meanings require administrator review, preserve RLS and disappear after poem edits", async () => {
  const { createHash } = await import("node:crypto");
  const hash = (body: string) =>
    createHash("sha256").update(body, "utf8").digest("hex");
  await as("authenticated", admin);
  const input = payload("word-meaning-work", "published");
  input.texts[0].body = "🌙 جہاں دل جہاں";
  const id = await save(input);
  const meaning = {
    kalam_id: id,
    language: "ur",
    start_offset: 2,
    end_offset: 6,
    surface: "جہاں",
    text_hash: hash(input.texts[0].body),
    meaning_ur: "دنیا",
    meaning_en: "world",
    meaning_hi: "दुनिया",
    meaning_ar: "عالم",
    context_note: "A world in this context",
    source_note: "Original editorial definition",
    status: "draft",
    review_confirmed: false,
  };
  async function saveMeaning(
    value: typeof meaning,
    record: string | null = null,
    version: string | null = null,
  ) {
    return (
      await db.query<{ id: string }>(
        "select public.save_word_meaning($1,$2::jsonb,$3::timestamptz) id",
        [record, JSON.stringify(value), version],
      )
    ).rows[0].id;
  }
  async function version(record: string) {
    return (
      await db.query<{ v: string }>(
        "select updated_at::text v from public.word_meanings where id=$1",
        [record],
      )
    ).rows[0].v;
  }
  const entry = await saveMeaning(meaning);
  await as("anon");
  assert.equal(
    (
      await db.query("select id from public.word_meanings where kalam_id=$1", [
        id,
      ])
    ).rows.length,
    0,
  );
  await assert.rejects(saveMeaning(meaning), /permission denied/i);
  await as("authenticated", reader);
  await assert.rejects(saveMeaning(meaning), /Staff access required/);
  await as("authenticated", editor);
  await assert.rejects(
    saveMeaning({ ...meaning, status: "published", review_confirmed: true }),
    /row.level security|Administrator review/i,
  );
  await saveMeaning(
    { ...meaning, meaning_en: "realm" },
    entry,
    await version(entry),
  );
  await as("authenticated", admin);
  await assert.rejects(
    saveMeaning(
      { ...meaning, status: "published" },
      entry,
      await version(entry),
    ),
    /Confirm.*review/,
  );
  const oldVersion = await version(entry);
  await saveMeaning(
    { ...meaning, status: "published", review_confirmed: true },
    entry,
    oldVersion,
  );
  await assert.rejects(
    saveMeaning(
      { ...meaning, status: "published", review_confirmed: true },
      entry,
      oldVersion,
    ),
    /meaning changed/i,
  );
  await assert.rejects(
    saveMeaning({ ...meaning, status: "published", review_confirmed: true }),
    /already has a published meaning/,
  );
  await assert.rejects(
    saveMeaning({ ...meaning, start_offset: 0, end_offset: 4 }),
    /selected word does not match/i,
  );
  await as("authenticated", editor);
  await assert.rejects(
    saveMeaning(meaning, entry, await version(entry)),
    /unavailable|row.level security/i,
  );
  await as("anon");
  assert.equal(
    (
      await db.query(
        "select id,meaning_en from public.word_meanings where id=$1",
        [entry],
      )
    ).rows.length,
    1,
  );
  await assert.rejects(
    db.query("select reviewed_by from public.word_meanings"),
    /permission denied/i,
  );
  await as("authenticated", admin);
  const kalamVersion = (
    await db.query<{ v: string }>(
      "select updated_at::text v from public.kalam where id=$1",
      [id],
    )
  ).rows[0].v;
  input.texts[0].body += "\nنئی سطر";
  await save(input, id, kalamVersion);
  await as("anon");
  assert.equal(
    (await db.query("select id from public.word_meanings where id=$1", [entry]))
      .rows.length,
    0,
  );
  await as("authenticated", admin);
  await assert.rejects(
    saveMeaning(
      { ...meaning, status: "published", review_confirmed: true },
      entry,
      await version(entry),
    ),
    /Poem text changed/i,
  );
  await saveMeaning(
    {
      ...meaning,
      text_hash: hash(input.texts[0].body),
      status: "published",
      review_confirmed: true,
    },
    entry,
    await version(entry),
  );
  await as("anon");
  assert.equal(
    (await db.query("select id from public.word_meanings where id=$1", [entry]))
      .rows.length,
    1,
  );
  await as("authenticated", admin);
  await saveMeaning(
    { ...meaning, status: "archived" },
    entry,
    await version(entry),
  );
  await as("anon");
  assert.equal(
    (await db.query("select id from public.word_meanings where id=$1", [entry]))
      .rows.length,
    0,
  );
});

test("meanings on private works stay private and the per-work limit is enforced", async () => {
  const { createHash } = await import("node:crypto");
  await as("authenticated", admin);
  const input = payload("private-meanings");
  input.texts[0].body = "دل";
  const id = await save(input);
  const hash = createHash("sha256").update("دل").digest("hex");
  const insert =
    "insert into public.word_meanings(kalam_id,language,start_offset,end_offset,surface,text_hash,meaning_en,source_note,status) values($1,'ur',0,2,'دل',$2,'heart','Original editorial definition','published') returning id";
  const entry = (await db.query<{ id: string }>(insert, [id, hash])).rows[0].id;
  await as("anon");
  assert.equal(
    (await db.query("select id from public.word_meanings where id=$1", [entry]))
      .rows.length,
    0,
  );
  await as("authenticated", admin);
  await db.query(
    "insert into public.word_meanings(kalam_id,language,start_offset,end_offset,surface,text_hash,meaning_en) select $1,'ur',0,2,'دل',$2,'heart' from generate_series(1,499)",
    [id, hash],
  );
  await assert.rejects(
    db.query(
      "insert into public.word_meanings(kalam_id,language,start_offset,end_offset,surface,text_hash,meaning_en) values($1,'ur',0,2,'دل',$2,'heart')",
      [id, hash],
    ),
    /500 meanings/,
  );
});
