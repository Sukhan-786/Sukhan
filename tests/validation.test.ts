import { test } from "node:test";
import assert from "node:assert/strict";
import {
  artistSchema,
  kalamSchema,
  mediaSchema,
  normalizeSearch,
  searchKalam,
  mayWrite,
  safeUrl,
} from "../src/lib/validation";
import { sampleKalam } from "../src/lib/sample";
test("search matches all four scripts and poet names", () => {
  for (const q of ["چراغ", "charagh", "lamp", "واژه", "studio"]) {
    assert.equal(searchKalam(sampleKalam, q)[0]?.slug, "a-lamp-of-words");
  }
  assert.equal(searchKalam(sampleKalam, "not-present").length, 0);
});
test("search normalizes Arabic variants, diacritics, and tatweel", () => {
  assert.equal(normalizeSearch("كَـي"), "کی");
  assert.equal(searchKalam(sampleKalam, "لَفْظوں").length, 1);
});
test("all query terms must match, and empty search returns all", () => {
  assert.equal(searchKalam(sampleKalam, "lamp words").length, 1);
  assert.equal(searchKalam(sampleKalam, "lamp missing").length, 0);
  assert.equal(searchKalam(sampleKalam, "").length, 2);
});
test("media rejects unsafe protocols and URL credentials", () => {
  for (const url of [
    "javascript:alert(1)",
    "http://example.com/a.mp3",
    "https://user:password@example.com/a.mp3",
  ]) {
    assert.equal(safeUrl.safeParse(url).success, false);
  }
  assert.equal(safeUrl.safeParse("https://example.com/a.mp3").success, true);
});
test("published video requires transcript, captions and provenance", () => {
  const base = {
    title: "A recording",
    kind: "video",
    url: "https://example.com/video.mp4",
    caption_url: "",
    transcript: "",
    language: "ur",
    performer_id: null,
    status: "published",
    rights_note: "",
  };
  assert.equal(mediaSchema.safeParse(base).success, false);
  assert.equal(
    mediaSchema.safeParse({
      ...base,
      transcript: "An accessible transcript",
      caption_url: "https://example.com/captions.vtt",
      rights_note: "Permission granted",
    }).success,
    true,
  );
});
test("a script requires both title and body, unique languages, and valid relationships", () => {
  const base = {
    slug: "new-work",
    form: "nazm",
    poet_id: "10000000-0000-4000-8000-000000000001",
    summary: "",
    status: "draft",
    rights_note: "",
    media_ids: [],
    texts: [{ language: "ur", title: "نام", body: "متن" }],
  };
  assert.equal(kalamSchema.safeParse(base).success, true);
  assert.equal(
    kalamSchema.safeParse({
      ...base,
      texts: [{ language: "en", title: "", body: "Body" }],
    }).success,
    false,
  );
  assert.equal(
    kalamSchema.safeParse({ ...base, texts: [...base.texts, ...base.texts] })
      .success,
    false,
  );
  assert.equal(
    kalamSchema.safeParse({ ...base, poet_id: "invalid" }).success,
    false,
  );
});
test("published profiles require provenance and editors cannot publish", () => {
  assert.equal(
    artistSchema.safeParse({
      slug: "a-poet",
      name: "A Poet",
      name_ur: "",
      kind: "poet",
      bio: "",
      status: "published",
      rights_note: "",
    }).success,
    false,
  );
  assert.equal(mayWrite("editor", "published"), false);
  assert.equal(mayWrite("editor", "draft"), true);
  assert.equal(mayWrite("admin", "published"), true);
  assert.equal(mayWrite("reader", "draft"), false);
});
