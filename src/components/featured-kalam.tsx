"use client";
import { useState } from "react";
import Link from "next/link";
import type { Kalam, Language } from "@/lib/types";
import { languageTags, languageDirection, languageLabels } from "@/lib/types";
import { Icon } from "./icon";
export function FeaturedKalam({
  items,
  title = "TODAY’S SUKHAN SELECTION",
  preferredLanguage = "roman",
}: {
  items: Kalam[];
  title?: string;
  preferredLanguage?: Language;
}) {
  const [index, setIndex] = useState(0),
    [language, setLanguage] = useState<Language>(preferredLanguage),
    [translated, setTranslated] = useState(false),
    [message, setMessage] = useState("");
  if (!items.length)
    return (
      <section className="featured-poetry content-width">
        <h2 className="section-label">THE SUKHAN SELECTION</h2>
        <p>New poetry will appear here after editorial review.</p>
        <Link href="/catalogue">Explore the library</Link>
      </section>
    );
  const k = items[Math.min(index, items.length - 1)];
  const text =
    k.texts.find((t) => t.language === language) ||
    k.texts.find((t) => t.language === "en") ||
    k.texts[0];
  const english = k.texts.find((t) => t.language === "en");
  function next(direction: number) {
    setIndex((i) => (i + direction + items.length) % items.length);
    setMessage("");
  }
  async function share() {
    const url = new URL(`/kalam/${k.slug}`, window.location.origin).href;
    try {
      if (navigator.share) await navigator.share({ title: text.title, url });
      else {
        await navigator.clipboard.writeText(url);
        setMessage("Link copied.");
      }
    } catch {
      setMessage("Open the poem to copy its page link.");
    }
  }
  function download() {
    const blob = new Blob(
      [
        `${text.title}\n${k.poet?.name || ""}\n\n${text.body}\n\n${k.rights_note}`,
      ],
      { type: "text/plain;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${k.slug}-${text.language}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("Text download started.");
  }
  return (
    <section
      className="featured-poetry content-width"
      aria-label="Featured poetry"
    >
      <h2 className="section-label">{title}</h2>
      <div className="featured-stage">
        <blockquote
          className="featured-verse"
          lang={languageTags[text.language]}
          dir={languageDirection(text.language)}
        >
          {text.body
            .split("\n")
            .filter(Boolean)
            .slice(0, 2)
            .map((line, i) => (
              <p key={i}>{line}</p>
            ))}
        </blockquote>
        {translated && english && (
          <p className="featured-translation">
            {english.body.split("\n").filter(Boolean).slice(0, 2).join("\n")}
          </p>
        )}
        <p className="featured-author">
          {k.poet ? (
            <Link href={`/artists/${k.poet.slug}`}>{k.poet.name}</Link>
          ) : (
            "Sukhan archive"
          )}
        </p>
        {items.length > 1 && (
          <>
            <button
              className="poetry-arrow poetry-prev"
              aria-label="Previous poem"
              onClick={() => next(-1)}
            >
              <Icon name="left" size={24} />
            </button>
            <button
              className="poetry-arrow poetry-next"
              aria-label="Next poem"
              onClick={() => next(1)}
            >
              <Icon name="right" size={24} />
            </button>
          </>
        )}
      </div>
      <div className="poetry-toolbar">
        <button onClick={share} aria-label="Share this poem">
          <Icon name="share" size={17} />
          <span>Share this</span>
        </button>
        <button
          aria-label="Translation"
          onClick={() => setTranslated(!translated)}
          aria-pressed={translated}
          disabled={!english}
        >
          <Icon name="language" size={19} />
          <span>Translation</span>
        </button>
        <Link href={`/kalam/${k.slug}`} aria-label="Read Kalam">
          <Icon name="read" size={20} />
          <span>Read Kalam</span>
        </Link>
        <button onClick={download} aria-label="Download">
          <Icon name="download" size={18} />
          <span>Download</span>
        </button>
        <div
          className="featured-scripts"
          role="group"
          aria-label="Featured poetry script"
        >
          {k.texts.map((t) => (
            <button
              key={t.language}
              aria-pressed={text.language === t.language}
              onClick={() => setLanguage(t.language)}
            >
              {languageLabels[t.language]}
            </button>
          ))}
        </div>
      </div>
      <span role="status" className="feature-status">
        {message}
      </span>
    </section>
  );
}
