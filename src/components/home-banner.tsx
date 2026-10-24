"use client";
import { useState } from "react";
import Link from "next/link";
import { Icon } from "./icon";
const slides = [
  {
    eyebrow: "THE SUKHAN COLLECTION",
    title: ["WORDS", "THAT STAY"],
    subtitle: "A world of poetry. A home for you.",
    urdu: "سخن",
    link: "/catalogue",
    action: "explore poetry",
    tone: "plum",
  },
  {
    eyebrow: "ONE VERSE. MANY WAYS TO FEEL.",
    title: ["EVERY LINE,", "A WORLD"],
    subtitle: "Read in Urdu, Roman Urdu, Persian & English.",
    urdu: "الفاظ",
    link: "/catalogue",
    action: "enter the library",
    tone: "gold",
  },
  {
    eyebrow: "LITERATURE, BROUGHT TO LIFE",
    title: ["LISTEN.", "FEEL. BELONG."],
    subtitle: "Discover the voices behind the words.",
    urdu: "آواز",
    link: "/media",
    action: "listen & watch",
    tone: "teal",
  },
];
export function HomeBanner() {
  const [active, setActive] = useState(0);
  const slide = slides[active];
  function next(direction: number) {
    setActive((n) => (n + direction + slides.length) % slides.length);
  }
  return (
    <section
      className={`home-banner banner-${slide.tone}`}
      aria-label="Featured Sukhan collections"
      aria-roledescription="carousel"
    >
      <div className="banner-grain" aria-hidden="true" />
      <div className="banner-content">
        <div className="banner-art" aria-hidden="true">
          <div className="banner-orbit" />
          <span lang="ur" dir="rtl">
            {slide.urdu}
          </span>
          <small>سخن سے دل تک</small>
        </div>
        <div className="banner-copy">
          <p>{slide.eyebrow}</p>
          <h1>
            {slide.title.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </h1>
          <p className="banner-subtitle">{slide.subtitle}</p>
          <Link href={slide.link}>
            {slide.action} <Icon name="right" size={14} />
          </Link>
        </div>
      </div>
      <button
        className="banner-arrow banner-prev"
        aria-label="Previous collection"
        onClick={() => next(-1)}
      >
        <Icon name="left" size={26} />
      </button>
      <button
        className="banner-arrow banner-next"
        aria-label="Next collection"
        onClick={() => next(1)}
      >
        <Icon name="right" size={26} />
      </button>
      <div
        className="banner-dots"
        role="group"
        aria-label="Featured collection"
      >
        {slides.map((s, i) => (
          <button
            key={s.tone}
            aria-label={`Collection ${i + 1}: ${s.eyebrow}`}
            aria-pressed={active === i}
            onClick={() => setActive(i)}
          />
        ))}
      </div>
    </section>
  );
}
