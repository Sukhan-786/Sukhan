// Offline full-import verification. This script never contacts a hosted database.
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { readFile, readdir } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import {
  poetryManifest,
  poetryRowSchema,
  type PoetryRow,
} from "../src/lib/poetry-import";
async function main() {
  const db = new PGlite({ extensions: { pg_trgm } }),
    admin = "e0000000-0000-4000-8000-000000000001";
  try {
    await db.exec(
      "create role anon nologin;create role authenticated nologin;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;",
    );
    for (const f of (await readdir("supabase/migrations"))
      .filter((f) => f.endsWith(".sql"))
      .sort())
      await db.exec(await readFile(`supabase/migrations/${f}`, "utf8"));
    await db.query("insert into auth.users values($1)", [admin]);
    await db.query("insert into staff_roles(user_id,role) values($1,'admin')", [
      admin,
    ]);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      admin,
    ]);
    await db.exec("set role authenticated");
    for (const dataset of poetryManifest.datasets) {
      let processed = 0,
        batch: PoetryRow[] = [],
        size = 2;
      async function commit() {
        if (!batch.length) return;
        const { rows } = await db.query<{
          v: { processed: number; inserted: number; skipped: number };
        }>("select public.import_poetry_batch($1,$2,$3::jsonb) v", [
          dataset.id,
          processed,
          JSON.stringify(batch),
        ]);
        if (rows[0].v.skipped)
          throw Error("Unexpected import conflict in isolated database");
        processed = rows[0].v.processed;
        batch = [];
        size = 2;
      }
      for (const shard of dataset.shards) {
        for (const line of gunzipSync(
          await readFile(`public/data/poetry/${shard.file}`),
        )
          .toString("utf8")
          .trim()
          .split("\n")) {
          const row = poetryRowSchema.parse(JSON.parse(line)),
            n = Buffer.byteLength(JSON.stringify(row)) + 1;
          if (batch.length && (batch.length >= 200 || size + n > 750000))
            await commit();
          batch.push(row);
          size += n;
        }
        await commit();
        console.log(dataset.id, processed, "/", dataset.rows);
      }
      if (processed !== dataset.rows) throw Error("Incomplete isolated import");
    }
    await db.exec("reset role;set role anon");
    const counts = await db.query(
      "select (select count(*) from public.kalam) works,(select count(*) from public.artists) authors,(select count(*) from public.kalam_texts where language='fa') persian,(select count(*) from public.kalam_texts where language='roman') roman_urdu,(select count(*) from public.kalam_texts where language='hi') hindi,(select max(length(body)) from public.kalam_texts) longest_text",
    );
    console.log(
      "Full isolated import verified:",
      JSON.stringify(counts.rows[0]),
    );
    const size = await db.query(
      "select pg_size_pretty(pg_database_size(current_database())) database_size",
    );
    console.log(JSON.stringify(size.rows[0]));
  } finally {
    await db.close();
  }
}
main().catch((e) => {
  console.error("Isolated corpus verification failed:", e.message);
  process.exitCode = 1;
});
