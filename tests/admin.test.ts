import { test } from "node:test";
import assert from "node:assert/strict";
import { adminFilters, adminHref, type AdminRow } from "../src/lib/admin";
import { editorErrors } from "../src/lib/editor-validation";
test("admin filters validate cursor pairs and preserve literal multilingual searches", () => {
  const filters = adminFilters("kalam", {
    q: [" چراغ, %'; select ", "ignored"],
    status: "bad",
    type: "video",
    cursor: "bad~bad",
    direction: "prev",
  });
  assert.equal(filters.q, "چراغ, %'; select");
  assert.equal(filters.status, "");
  assert.equal(filters.type, "");
  assert.equal(filters.cursor, "");
  assert.equal(filters.previous, false);
  const row = {
    updated_at: "2026-10-25T01:00:00.123456+00:00",
    id: "a0000000-0000-4000-8000-000000000001",
  } as AdminRow;
  const valid = adminFilters("kalam", {
    q: "چراغ",
    status: "draft",
    type: "nazm",
    cursor: `${row.updated_at}~${row.id}`,
    direction: "prev",
  });
  assert.equal(valid.previous, true);
  assert.equal(valid.id, row.id);
  const next = new URL(
    adminHref("kalam", valid, row),
    "https://sukhan.example",
  );
  assert.equal(next.searchParams.get("q"), "چراغ");
  assert.equal(next.searchParams.get("status"), "draft");
  assert.equal(next.searchParams.has("direction"), false);
  assert.equal(
    new URL(
      adminHref("kalam", valid),
      "https://sukhan.example",
    ).searchParams.has("cursor"),
    false,
  );
});
test("validation points to the submitted script rather than the script array index", () => {
  const result = editorErrors(
    [
      { path: ["texts", 0, "body"], message: "Add text" },
      { path: ["rights_note"], message: "Credit the source" },
    ],
    [{ language: "fa" }],
  );
  assert.deepEqual(result.fields, {
    fa_body: "Add text",
    rights_note: "Credit the source",
  });
  assert.deepEqual(
    editorErrors([{ path: ["texts"], message: "Add one script" }]).fields,
    { ur_title: "Add one script" },
  );
});
