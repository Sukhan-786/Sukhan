import type { Media } from "@/lib/types";
import { languageTags, languageDirection } from "@/lib/types";
export function MediaPlayer({ media }: { media: Media }) {
  return (
    <article className="media-card">
      <p className="eyebrow">
        {media.kind} · {media.performer?.name || "Sukhan archive"}
      </p>
      <h3>{media.title}</h3>
      {media.kind === "audio" ? (
        <audio controls preload="none" aria-label={media.title} src={media.url}>
          Your browser cannot play this audio.{" "}
          <a href={media.url}>Open audio file</a>
        </audio>
      ) : (
        <video
          controls
          playsInline
          preload="none"
          aria-label={media.title}
          crossOrigin="anonymous"
        >
          <source src={media.url} />
          {media.caption_url && (
            <track
              default
              kind="captions"
              src={media.caption_url}
              srcLang={languageTags[media.language]}
              label="Captions"
            />
          )}
          Your browser cannot play this video.{" "}
          <a href={media.url}>Open video file</a>
        </video>
      )}
      <details>
        <summary>Read transcript</summary>
        <p
          className="transcript"
          lang={languageTags[media.language]}
          dir={languageDirection(media.language)}
        >
          {media.transcript || "Transcript pending editorial review."}
        </p>
      </details>
      <p className="source-note">{media.rights_note}</p>
    </article>
  );
}
