import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Reader } from "../src/components/reader";
import {
  meaningSegments,
  phraseOccurrences,
  wordTokens,
  type WordMeaning,
} from "../src/lib/word-meanings";
import { meaningSchema } from "../src/lib/meaning-validation";
const entry: WordMeaning = {
  id: "e0000000-0000-4000-8000-000000000001",
  kalam_id: "20000000-0000-4000-8000-000000000001",
  language: "ur",
  start_offset: 2,
  end_offset: 6,
  surface: "جہاں",
  text_hash: "a".repeat(64),
  meaning_en: "world",
  meaning_ur: "دنیا",
  meaning_hi: "दुनिया",
  meaning_ar: "عالم",
  context_note: "The world, in this context.",
  source_note: "Original editorial definition",
  status: "published",
  reviewed_at: "2026-10-25T00:00:00Z",
  updated_at: "2026-10-25T00:00:00Z",
};
test("word offsets count Unicode code points and preserve izafat, nuktas and punctuation", () => {
  const body = "🌙 جہاں، दिल zer-e-khak دل‌نشیں";
  const tokens = wordTokens(body);
  assert.equal(tokens[0].start, 2);
  assert.deepEqual(
    tokens.map((t) => t.surface),
    ["جہاں", "दिल", "zer-e-khak", "دل‌نشیں"],
  );
  for (const token of tokens)
    assert.equal(
      Array.from(body).slice(token.start, token.end).join(""),
      token.surface,
    );
});
test("repeated words and multiword phrases retain their distinct occurrences", () => {
  assert.deepEqual(
    phraseOccurrences("🌙 جہاں دل جہاں", "جہاں").map((t) => t.start),
    [2, 10],
  );
  assert.deepEqual(
    phraseOccurrences("دل کی آگ، دل کی آگ", "دل کی آگ").map((t) => t.start),
    [0, 10],
  );
  assert.deepEqual(phraseOccurrences("anything", ""), []);
});
test("reader segments preserve exact whitespace and exclude draft, mismatched and overlapping meanings", () => {
  const body = "🌙 جہاں دل جہاں\n";
  const parts = meaningSegments(body, [
    entry,
    { ...entry, id: "overlap", start_offset: 3, end_offset: 6, surface: "ہاں" },
    {
      ...entry,
      id: "draft",
      status: "draft",
      start_offset: 10,
      end_offset: 14,
    },
  ]);
  assert.equal(parts.map((p) => p.text).join(""), body);
  assert.equal(parts.filter((p) => p.meaning).length, 1);
  const html = renderToStaticMarkup(
    createElement(Reader, {
      texts: [{ language: "ur", title: "Poem", body }],
      meanings: [entry],
    }),
  );
  assert.match(html, /aria-haspopup="dialog"/);
  assert.match(html, /Meaning of جہاں/);
  assert.match(html, /dir="rtl"/);
  assert.equal(
    meaningSegments("changed text", [entry]).filter((p) => p.meaning).length,
    0,
  );
});
test("publication requires a reviewed meaning and provenance; HTML stays plain text", () => {
  const base = { ...entry, review_confirmed: false };
  assert.equal(meaningSchema.safeParse(base).success, false);
  assert.equal(
    meaningSchema.safeParse({ ...base, review_confirmed: true }).success,
    true,
  );
  assert.equal(
    meaningSchema.safeParse({
      ...base,
      status: "draft",
      meaning_en: "",
      meaning_ur: "",
      meaning_hi: "",
      meaning_ar: "",
    }).success,
    false,
  );
  assert.equal(
    meaningSchema.safeParse({
      ...base,
      review_confirmed: true,
      source_note: "",
    }).success,
    false,
  );
  const text = "<script>alert(1)</script>";
  const html = renderToStaticMarkup(
    createElement(Reader, {
      texts: [{ language: "en", title: "Safe text", body: text }],
    }),
  );
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html.replace(/<[^>]+>/g, ""), /&lt;script&gt;/);
});
