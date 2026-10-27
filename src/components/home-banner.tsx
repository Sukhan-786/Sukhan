"use client";
import { useState } from "react";
import Link from "next/link";
import { Icon } from "./icon";
import type { HomepageSection } from "@/lib/homepage";
const defaultSlides = [
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
export function HomeBanner({
  slides: configuredSlides,
}: { slides?: HomepageSection["slides"] } = {}) {
  const slides = configuredSlides?.length
    ? configuredSlides.map((s) => ({
        eyebrow: s.eyebrow,
        title: s.title.split("\n"),
        subtitle: s.subtitle,
        urdu: s.urdu,
        link: s.href,
        action: s.button_label,
        tone: "navy",
        image_url: s.image_url,
      }))
    : defaultSlides.map((s) => ({ ...s, image_url: "" }));
  const [active, setActive] = useState(0);
  const slide = slides[Math.min(active, slides.length - 1)];
  function next(direction: number) {
    setActive((n) => (n + direction + slides.length) % slides.length);
  }
  return (
    <section
      className={`home-banner banner-${slide.tone}`}
      aria-label="Featured Sukhan collections"
      aria-roledescription={slides.length > 1 ? "carousel" : undefined}
    >
      {slide.image_url && (
        // Uploaded and external banner images are decorative; the visible copy supplies the content.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="banner-image"
          src={slide.image_url}
          alt=""
          width={1920}
          height={1080}
          fetchPriority="high"
        />
      )}
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
          <h2>
            {slide.title.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </h2>
          <p className="banner-subtitle">{slide.subtitle}</p>
          <Link href={slide.link}>
            {slide.action} <Icon name="right" size={14} />
          </Link>
        </div>
      </div>
      {slides.length > 1 && (
        <>
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
                key={i}
                aria-label={`Collection ${i + 1}: ${s.eyebrow}`}
                aria-pressed={active === i}
                onClick={() => setActive(i)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
