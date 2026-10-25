import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MediaPlayer } from "../src/components/media-player";
import type { Media } from "../src/lib/types";
const media: Media = {
  id: "1",
  title: "A recitation",
  kind: "audio",
  url: "https://example.com/a.mp3",
  caption_url: "",
  transcript: "Words and light",
  language: "en",
  performer_id: null,
  status: "published",
  rights_note: "Permission granted",
};
test("audio has labelled native controls, no autoplay, and a transcript", () => {
  const html = renderToStaticMarkup(createElement(MediaPlayer, { media }));
  assert.match(html, /<audio[^>]*controls/);
  assert.match(html, /aria-label="A recitation"/);
  assert.doesNotMatch(html, /autoplay/i);
  assert.match(html, /Words and light/);
  assert.match(html, /preload="none"/);
});
test("video renders a language-labelled captions track and preserves transcript direction", () => {
  const html = renderToStaticMarkup(
    createElement(MediaPlayer, {
      media: {
        ...media,
        kind: "video",
        language: "ur",
        caption_url: "https://example.com/a.vtt",
      },
    }),
  );
  assert.match(html, /<video[^>]*controls/);
  assert.match(html, /kind="captions"/);
  assert.match(html, /srcLang="ur"/i);
  assert.match(html, /dir="rtl"/);
});

test("Arabic captions and transcripts use Arabic metadata and RTL", () => {
  const html = renderToStaticMarkup(
    createElement(MediaPlayer, {
      media: {
        ...media,
        kind: "video",
        language: "ar",
        caption_url: "https://example.com/ar.vtt",
        transcript: "نور الكلمات",
      },
    }),
  );
  assert.match(html, /srcLang="ar"/i);
  assert.match(html, /lang="ar" dir="rtl"/);
});
