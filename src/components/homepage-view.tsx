"use client";
import Link from "next/link";
import type { HomepageConfig, HomepageSection } from "@/lib/homepage";
import type { Kalam, Artist } from "@/lib/types";
import { HomeBanner } from "./home-banner";
import { FeaturedKalam } from "./featured-kalam";
import { KalamCard } from "./kalam-card";
import { Icon } from "./icon";
export function HomepageView({
  config,
  items,
  artists,
}: {
  config: HomepageConfig;
  items: Kalam[];
  artists: Artist[];
}) {
  function poetry(s: HomepageSection) {
    return (
      s.kalam_ids.length
        ? s.kalam_ids.flatMap((id) => items.find((k) => k.id === id) || [])
        : items.filter((k) => k.texts.some((t) => t.language === s.language))
    )
      .filter((k) => k.texts.length)
      .slice(0, s.limit);
  }
  return (
    <div className="homepage-sections">
      <h1 className="sr-only">{config.seo_title}</h1>
      {config.sections
        .filter((s) => s.enabled)
        .map((s) => {
          if (s.type === "banner")
            return <HomeBanner key={s.id} slides={s.slides} />;
          if (s.type === "daily")
            return (
              <FeaturedKalam
                key={s.id}
                items={poetry(s)}
                title={s.title}
                preferredLanguage={s.language}
              />
            );
          if (s.type === "collections")
            return (
              <section className="home-section home-discover" key={s.id}>
                <div className="content-width">
                  <h2 className="section-label">{s.title}</h2>
                  {s.description && <p>{s.description}</p>}
                  <div className="discovery-grid">
                    {s.cards.map((c, i) => (
                      <Link
                        href={c.href}
                        className={`discovery-card discovery-${["ghazal", "nazm", "voices"][i % 3]}`}
                        key={i}
                      >
                        <div>
                          <span lang="ur" dir="rtl">
                            {c.urdu}
                          </span>
                          <Icon
                            name={i % 3 === 2 ? "headphones" : "book"}
                            size={28}
                          />
                        </div>
                        <h3>{c.title}</h3>
                        <p>{c.description}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
            );
          if (s.type === "word")
            return (
              <section className="home-word" key={s.id}>
                <div className="content-width">
                  <h2 className="section-label">{s.title}</h2>
                  <p className="word-roman">{s.roman}</p>
                  <p className="word-scripts">
                    <span lang="ur" dir="rtl">
                      {s.urdu}
                    </span>
                    <span>{s.description}</span>
                  </p>
                  <p className="word-meaning">{s.body}</p>
                  {s.button_label && (
                    <Link className="pink-link" href={s.href}>
                      {s.button_label} <Icon name="right" size={14} />
                    </Link>
                  )}
                </div>
              </section>
            );
          if (s.type === "artists") {
            const selected = (
              s.artist_ids.length
                ? s.artist_ids.flatMap(
                    (id) => artists.find((a) => a.id === id) || [],
                  )
                : artists
            ).slice(0, s.limit);
            return (
              <section className="home-section" key={s.id}>
                <div className="content-width">
                  <h2 className="section-label">{s.title}</h2>
                  <div className="home-artists">
                    {selected.map((a) => (
                      <Link
                        className="home-artist"
                        key={a.id}
                        href={`/artists/${a.slug}`}
                      >
                        <span
                          className="artist-seal"
                          lang="ur"
                          dir="rtl"
                          aria-hidden="true"
                        >
                          {a.name_ur || a.name[0]}
                        </span>
                        <h3 dir="auto">{a.name}</h3>
                        <p>
                          {a.kind === "both"
                            ? "Poet & performing artist"
                            : a.kind}
                        </p>
                      </Link>
                    ))}
                  </div>
                  {!selected.length && (
                    <p>New poet profiles will appear here when published.</p>
                  )}
                  <p className="home-caption">{s.description}</p>
                  {s.button_label && (
                    <Link className="outline-link" href={s.href}>
                      {s.button_label}
                    </Link>
                  )}
                </div>
              </section>
            );
          }
          if (s.type === "library") {
            const works = poetry(s);
            return (
              <section className="home-section home-library" key={s.id}>
                <div className="content-width">
                  <h2 className="section-label">{s.title}</h2>
                  <div className="card-grid">
                    {works.map((k, i) => (
                      <KalamCard key={k.id} kalam={k} index={i} />
                    ))}
                  </div>
                  {!works.length && <p>Published poetry will appear here.</p>}
                  {s.button_label && (
                    <Link className="outline-link" href={s.href}>
                      {s.button_label}
                    </Link>
                  )}
                </div>
              </section>
            );
          }
          return (
            <section className="home-section" key={s.id}>
              <div className="content-width home-custom-text">
                <h2>{s.title}</h2>
                <p>{s.description}</p>
                <p className="preserve-lines" dir="auto">
                  {s.body}
                </p>
                {s.button_label && (
                  <Link className="outline-link" href={s.href}>
                    {s.button_label}
                  </Link>
                )}
              </div>
            </section>
          );
        })}
    </div>
  );
}
