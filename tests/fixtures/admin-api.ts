// Isolated contract fixture. It never contacts a hosted Supabase project.
import { createServer } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { meaningColumns } from "../../src/lib/word-meanings";
import { translationColumns } from "../../src/lib/couplet-translations";
import { dictionaryColumns } from "../../src/lib/dictionary";
async function main() {
  const db = new PGlite({ extensions: { pg_trgm } });
  const admin = "a0000000-0000-4000-8000-000000000001",
    editor = "a0000000-0000-4000-8000-000000000002",
    reader = "a0000000-0000-4000-8000-000000000003";
  const poet = "b0000000-0000-4000-8000-000000000001";
  await db.exec(
    `create role anon nologin;create role authenticated nologin;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`,
  );
  for (const file of (await readdir("supabase/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
  await db.query("insert into auth.users values($1),($2),($3)", [
    admin,
    editor,
    reader,
  ]);
  await db.query(
    "insert into public.staff_roles(user_id,role) values($1,'admin'),($2,'editor')",
    [admin, editor],
  );
  await db.query(
    "insert into public.artists(id,slug,name,name_ur,kind,status,rights_note) values($1,'studio-poet','Studio Poet','شاعر','both','published','Original test profile')",
    [poet],
  );
  await db.query(
    "insert into public.kalam(slug,poet_id,form,status,rights_note) select 'studio-poem-'||n,$1,'nazm',case when n%2=0 then 'draft' else 'published' end,'Original test poem' from generate_series(1,31) n",
    [poet],
  );
  await db.exec(
    "insert into public.kalam_texts select id,'en','Studio poem '||slug,'An original line for the studio.' from public.kalam; insert into public.kalam_texts select id,'ur','چراغ','لفظوں کا چراغ' from public.kalam;",
  );
  await db.exec(
    "insert into public.media(title,kind,url,transcript,status,rights_note) values ('Morning voice','audio','https://example.test/morning.mp3','Original transcript','published','Test recording'),('Evening voice','audio','https://example.test/evening.mp3','Original transcript','published','Test recording')",
  );
  function token(id: string) {
    return [
      Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
        "base64url",
      ),
      Buffer.from(
        JSON.stringify({
          sub: id,
          role: "authenticated",
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
      ).toString("base64url"),
      "fixture-signature",
    ].join(".");
  }
  function user(id: string) {
    return {
      id,
      aud: "authenticated",
      role: "authenticated",
      email:
        id === admin
          ? "admin@example.test"
          : id === editor
            ? "editor@example.test"
            : "reader@example.test",
      app_metadata: { provider: "email" },
      user_metadata: {},
      created_at: "2026-10-25T00:00:00Z",
    };
  }
  let queue = Promise.resolve();
  const server = createServer((req, res) => {
    queue = queue
      .then(async () => {
        const url = new URL(req.url || "/", "http://127.0.0.1:3199");
        res.setHeader("content-type", "application/json");
        res.setHeader("access-control-allow-origin", "*");
        res.setHeader("access-control-allow-headers", "*");
        if (req.method === "OPTIONS") {
          res.end("{}");
          return;
        }
        // A network chunk may split a multibyte Urdu/Persian character. Decode only after concatenation.
        const chunks: Buffer[] = [];
        for await (const c of req) chunks.push(Buffer.from(c));
        const raw = Buffer.concat(chunks).toString("utf8");
        const body = raw ? JSON.parse(raw) : {};
        const bearer = String(req.headers.authorization || "").replace(
          "Bearer ",
          "",
        );
        const uid =
          [admin, editor, reader].find((id) => token(id) === bearer) ||
          [admin, editor, reader].find((id) => {
            try {
              return (
                JSON.parse(
                  Buffer.from(bearer.split(".")[1], "base64url").toString(),
                ).sub === id
              );
            } catch {
              return false;
            }
          });
        if (url.pathname === "/health") {
          res.end("{}");
          return;
        }
        if (url.pathname === "/auth/v1/token") {
          const id =
            body.email === "admin@example.test"
              ? admin
              : body.email === "editor@example.test"
                ? editor
                : body.email === "reader@example.test"
                  ? reader
                  : null;
          if (!id || body.password !== "fixture-only-password") {
            res.statusCode = 400;
            res.end(
              JSON.stringify({
                error: "invalid_grant",
                error_description: "Invalid credentials",
              }),
            );
            return;
          }
          res.end(
            JSON.stringify({
              access_token: token(id),
              token_type: "bearer",
              expires_in: 3600,
              expires_at: Math.floor(Date.now() / 1000) + 3600,
              refresh_token: "fixture-refresh",
              user: user(id),
            }),
          );
          return;
        }
        if (url.pathname === "/auth/v1/user") {
          res.statusCode = uid ? 200 : 401;
          res.end(
            JSON.stringify(uid ? user(uid) : { msg: "Not authenticated" }),
          );
          return;
        }
        if (url.pathname === "/auth/v1/logout") {
          res.end("{}");
          return;
        }
        await db.exec("reset role");
        await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
          uid || "",
        ]);
        await db.exec(uid ? "set role authenticated" : "set role anon");
        const endpoint = url.pathname.replace("/rest/v1/", "");
        let result: unknown;
        if (endpoint === "rpc/editorial_overview")
          result = (
            await db.query<{ v: unknown }>(
              "select public.editorial_overview() v",
            )
          ).rows[0].v;
        else if (endpoint === "rpc/editorial_page")
          result = (
            await db.query<{ v: unknown }>(
              "select public.editorial_page($1,$2,$3,$4,$5,$6,$7) v",
              [
                body.record_type,
                body.search_query || "",
                body.filter_status || "",
                body.filter_type || "",
                body.cursor_time || null,
                body.cursor_id || null,
                body.previous_page || false,
              ],
            )
          ).rows[0].v;
        else if (endpoint === "rpc/sitemap_counts")
          result = (
            await db.query<{ v: unknown }>("select public.sitemap_counts() v")
          ).rows[0].v;
        else if (endpoint === "rpc/sitemap_poetry")
          result = (
            await db.query("select * from public.sitemap_poetry($1)", [
              body.page_number,
            ])
          ).rows;
        else if (endpoint === "rpc/save_homepage_draft")
          result = (
            await db.query<{ v: unknown }>(
              "select public.save_homepage_draft($1::jsonb,$2::timestamptz) v",
              [JSON.stringify(body.payload), body.expected_updated_at],
            )
          ).rows[0].v;
        else if (endpoint === "rpc/publish_homepage")
          result = (
            await db.query<{ v: unknown }>(
              "select public.publish_homepage($1::timestamptz,$2::timestamptz) v",
              [body.expected_draft_at, body.expected_public_at],
            )
          ).rows[0].v;
        else if (
          [
            "rpc/search_kalam",
            "rpc/search_library",
            "rpc/homepage_kalam",
          ].includes(endpoint)
        ) {
          const rows = (
            await db.query<Record<string, unknown>>(
              endpoint === "rpc/homepage_kalam"
                ? "select * from public.homepage_kalam($1,$2)"
                : endpoint === "rpc/search_library"
                  ? "select * from public.search_library($1,$2,$3,$4,$5)"
                  : "select * from public.search_kalam($1,$2,$3,$4)",
              endpoint === "rpc/homepage_kalam"
                ? [body.feed_language || null, body.requested_ids || []]
                : [
                    body.search_query || "",
                    body.filter_form || null,
                    body.filter_poet || null,
                    body.filter_kind || null,
                    ...(endpoint === "rpc/search_library"
                      ? [body.filter_language || null]
                      : []),
                  ],
            )
          ).rows;
          for (const row of rows) {
            row.texts = (
              await db.query(
                "select * from public.kalam_texts where kalam_id=$1",
                [row.id],
              )
            ).rows;
            row.poet =
              (
                await db.query("select * from public.artists where id=$1", [
                  row.poet_id,
                ])
              ).rows[0] || null;
            row.links = (
              await db.query(
                "select to_jsonb(m) media from public.kalam_media km join public.media m on m.id=km.media_id where km.kalam_id=$1",
                [row.id],
              )
            ).rows;
          }
          result = rows;
        } else if (endpoint === "rpc/save_kalam")
          result = (
            await db.query<{ v: unknown }>(
              "select public.save_kalam($1,$2::jsonb,$3::timestamptz) v",
              [
                body.record_id,
                JSON.stringify(body.payload),
                body.expected_updated_at,
              ],
            )
          ).rows[0].v;
        else if (endpoint === "rpc/lookup_dictionary")
          result = (
            await db.query<{ v: unknown }>(
              "select public.lookup_dictionary($1,$2) v",
              [body.lookup_language, body.lookup_word],
            )
          ).rows[0].v;
        else if (endpoint === "rpc/lookup_urdu_word_bank")
          result = (
            await db.query("select * from public.lookup_urdu_word_bank($1)", [
              body.lookup_word,
            ])
          ).rows;
        else if (endpoint === "rpc/search_urdu_word_bank")
          result = (
            await db.query(
              "select * from public.search_urdu_word_bank($1,$2)",
              [body.prefix, body.after_word],
            )
          ).rows;
        else if (endpoint === "rpc/import_urdu_word_batch")
          result = (
            await db.query<{ v: unknown }>(
              "select public.import_urdu_word_batch($1,$2::jsonb) v",
              [body.batch_offset, JSON.stringify(body.batch_rows)],
            )
          ).rows[0].v;
        else if (endpoint === "rpc/save_dictionary_entry")
          result = (
            await db.query<{ v: unknown }>(
              "select public.save_dictionary_entry($1,$2::jsonb,$3::timestamptz) v",
              [
                body.record_id,
                JSON.stringify(body.payload),
                body.expected_updated_at,
              ],
            )
          ).rows[0].v;
        else if (endpoint === "rpc/import_poetry_batch")
          result = (
            await db.query<{ v: unknown }>(
              "select public.import_poetry_batch($1,$2,$3::jsonb) v",
              [
                body.dataset_id,
                body.batch_offset,
                JSON.stringify(body.batch_rows),
              ],
            )
          ).rows[0].v;
        else if (endpoint === "rpc/save_couplet_translation")
          result = (
            await db.query<{ v: unknown }>(
              "select public.save_couplet_translation($1,$2::jsonb,$3::timestamptz) v",
              [
                body.record_id,
                JSON.stringify(body.payload),
                body.expected_updated_at,
              ],
            )
          ).rows[0].v;
        else if (endpoint === "rpc/save_word_meaning")
          result = (
            await db.query<{ v: unknown }>(
              "select public.save_word_meaning($1,$2::jsonb,$3::timestamptz) v",
              [
                body.record_id,
                JSON.stringify(body.payload),
                body.expected_updated_at,
              ],
            )
          ).rows[0].v;
        else if (
          [
            "staff_roles",
            "artists",
            "media",
            "kalam",
            "word_meanings",
            "dictionary_entries",
            "word_bank_import",
            "homepage_public",
            "homepage_draft",
            "couplet_translations",
            "poetry_imports",
            "poetry_import_records",
          ].includes(endpoint)
        ) {
          const table = endpoint;
          const filters: string[] = [];
          const args: unknown[] = [];
          for (const key of [
            "id",
            "source_id",
            "slug",
            "status",
            "user_id",
            "updated_at",
            "performer_id",
            "kalam_id",
            "language",
            "word_id",
          ]) {
            const v = url.searchParams.get(key);
            if (v?.startsWith("eq.")) {
              args.push(v.slice(3));
              filters.push(`${key}=$${args.length}`);
            }
          }
          const where = filters.length ? " where " + filters.join(" and ") : "";
          if (req.method === "POST" || req.method === "PATCH") {
            const columns = [
              "slug",
              "name",
              "name_ur",
              "kind",
              "bio",
              "status",
              "rights_note",
              "title",
              "url",
              "caption_url",
              "transcript",
              "language",
              "performer_id",
            ].filter((k) => Object.hasOwn(body, k));
            if (req.method === "POST")
              result = (
                await db.query(
                  `insert into public.${table}(${columns.join(",")}) values(${columns.map((_, i) => "$" + (i + 1)).join(",")}) returning *`,
                  columns.map((k) => body[k]),
                )
              ).rows;
            else {
              const offset = args.length;
              args.push(...columns.map((k) => body[k]));
              result = (
                await db.query(
                  `update public.${table} set ${columns.map((k, i) => `${k}=$${offset + i + 1}`).join(",")}${where} returning *`,
                  args,
                )
              ).rows;
            }
          } else if (req.method === "DELETE")
            result = (
              await db.query(
                `delete from public.${table}${where} returning id`,
                args,
              )
            ).rows;
          else {
            const order =
              table === "poetry_imports"
                ? " order by source_id"
                : table === "artists"
                  ? " order by name"
                  : ["staff_roles", "word_bank_import"].includes(table)
                    ? ""
                    : " order by updated_at desc,id desc";
            const rows = (
              await db.query<Record<string, unknown>>(
                `select ${table === "couplet_translations" ? translationColumns : table === "word_meanings" ? meaningColumns : table === "dictionary_entries" ? dictionaryColumns : "*"} from public.${table}${where}${order} limit 500`,
                args,
              )
            ).rows;
            if (table === "kalam")
              for (const row of rows) {
                row.texts = (
                  await db.query(
                    "select * from public.kalam_texts where kalam_id=$1",
                    [row.id],
                  )
                ).rows;
                row.poet =
                  (
                    await db.query("select * from public.artists where id=$1", [
                      row.poet_id,
                    ])
                  ).rows[0] || null;
                row.links = (
                  await db.query(
                    "select to_jsonb(m) media from public.kalam_media km join public.media m on m.id=km.media_id where km.kalam_id=$1",
                    [row.id],
                  )
                ).rows;
              }
            result = rows;
          }
        } else {
          res.statusCode = 404;
          result = { message: "Fixture endpoint not implemented" };
        }
        if (
          String(req.headers.accept || "").includes("vnd.pgrst.object+json") &&
          Array.isArray(result)
        )
          result = result[0] || null;
        res.end(JSON.stringify(result));
      })
      .catch((error: unknown) => {
        const err = error as { code?: string; message?: string };
        console.error("Isolated test API error:", err.code, err.message);
        res.statusCode = 400;
        res.end(
          JSON.stringify({
            code: err.code || "fixture_error",
            message: err.message || "Fixture request failed",
          }),
        );
      });
  });
  server.listen(3199, "127.0.0.1", () =>
    console.log("Isolated admin test API ready"),
  );
}
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
