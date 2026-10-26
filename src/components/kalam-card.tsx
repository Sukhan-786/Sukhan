import Link from "next/link";
import { languageTags, languageDirection, type Language } from "@/lib/types";
import type { Kalam } from "@/lib/types";
export function KalamCard({
  kalam,
  index = 0,
  preferredLanguage,
}: {
  kalam: Kalam;
  index?: number;
  preferredLanguage?: Language;
}) {
  const english =
    kalam.texts.find((t) => t.language === preferredLanguage) ||
    kalam.texts.find((t) => t.language === "en") ||
    kalam.texts.find((t) => t.language === "ur") ||
    kalam.texts[0];
  const urdu = kalam.texts.find((t) => t.language === "ur");
  return (
    <article className="kalam-card">
      <div className="card-top">
        <span className="eyebrow">{kalam.form}</span>
        <span className="card-number">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>
      {urdu ? (
        <p className="card-urdu" lang="ur" dir="rtl">
          {urdu.title}
        </p>
      ) : (
        <p
          className="card-verse"
          lang={english ? languageTags[english.language] : undefined}
          dir={english ? languageDirection(english.language) : undefined}
        >
          {english?.body.split("\n")[0]}
        </p>
      )}
      <h3>
        <Link
          href={`/kalam/${kalam.slug}${preferredLanguage ? `?lang=${preferredLanguage}` : ""}`}
          lang={english ? languageTags[english.language] : undefined}
          dir={english ? languageDirection(english.language) : undefined}
        >
          {english?.title || kalam.slug}
        </Link>
      </h3>
      <p className="muted">{kalam.poet?.name || "Unknown poet"}</p>
      <div className="card-bottom">
        <span>
          {kalam.texts.length} scripts
          {kalam.media.length ? " · Media available" : ""}
        </span>
        <span aria-hidden="true">↗</span>
      </div>
    </article>
  );
}
