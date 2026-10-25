import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeTextImport, maxImportBytes } from "../src/lib/text-import";
import { kalamSchema, mediaSchema, searchKalam } from "../src/lib/validation";
import { languages, languageDirection } from "../src/lib/types";
import { editorFieldLabel } from "../src/lib/editor-validation";
const encode = (s: string) => new TextEncoder().encode(s);
test("UTF-8 imports preserve Urdu, Hindi, Arabic and English and normalize line breaks", () => {
  const text = "اردو\r\nहिन्दी\rالعربية\nEnglish";
  assert.equal(
    decodeTextImport(encode("\uFEFF" + text)),
    "اردو\nहिन्दी\nالعربية\nEnglish",
  );
  assert.equal(
    decodeTextImport(encode("<script>text only</script>")),
    "<script>text only</script>",
  );
});
test("invalid, empty, binary and oversized text imports fail without guessing an encoding", () => {
  for (const input of [
    new Uint8Array([0xff]),
    encode(" \n"),
    encode("a\0b"),
    new Uint8Array(maxImportBytes + 1),
    encode("a".repeat(100001)),
  ])
    assert.throws(() => decodeTextImport(input));
});
test("all six scripts validate and Hindi and Arabic are searchable", () => {
  const texts = languages.map((language) => ({
    language,
    title: `Title ${language}`,
    body:
      language === "hi"
        ? "शब्दों की रोशनी"
        : language === "ar"
          ? "نور الكلمات"
          : "A new line",
  }));
  const poem = {
    slug: "six-scripts",
    form: "nazm",
    poet_id: "10000000-0000-4000-8000-000000000001",
    summary: "",
    status: "draft",
    rights_note: "",
    media_ids: [],
    texts,
  };
  assert.equal(kalamSchema.safeParse(poem).success, true);
  assert.equal(
    kalamSchema.safeParse({ ...poem, texts: [...texts, texts[0]] }).success,
    false,
  );
  for (const query of ["रोशनी", "نور"])
    assert.equal(searchKalam([{ ...poem, poet: null }], query).length, 1);
  for (const language of ["hi", "ar"])
    assert.equal(
      mediaSchema.safeParse({
        title: "Voice",
        kind: "audio",
        url: "https://example.com/a.mp3",
        caption_url: "",
        transcript: "Words",
        language,
        performer_id: null,
        status: "draft",
        rights_note: "",
      }).success,
      true,
    );
  assert.equal(languageDirection("ar"), "rtl");
  assert.equal(languageDirection("hi"), "ltr");
  assert.equal(editorFieldLabel("hi_body"), "Hindi text");
  assert.equal(editorFieldLabel("ar_title"), "Arabic title");
});
