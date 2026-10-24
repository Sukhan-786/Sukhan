import type { Metadata } from "next";
import Link from "next/link";
import { listMedia } from "@/lib/data";
import { MediaPlayer } from "@/components/media-player";
export const metadata: Metadata = {
  title: "Listen & watch",
  alternates: { canonical: "/media" },
};
export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const { kind } = await searchParams;
  const media = await listMedia(
    kind === "audio" || kind === "video" ? kind : undefined,
  );
  return (
    <div className="page-shell">
      <div className="page-heading">
        <p className="eyebrow">Words, brought to life</p>
        <h1>Listen & watch</h1>
        <p>Recitations, performances, and the stories behind them.</p>
      </div>
      <nav className="filter-links" aria-label="Media type">
        <Link href="/media">All recordings</Link>
        <Link href="/media?kind=audio">Audio</Link>
        <Link href="/media?kind=video">Video</Link>
      </nav>
      <div className="media-grid">
        {media.map((m) => (
          <MediaPlayer key={m.id} media={m} />
        ))}
      </div>
      {!media.length && (
        <div className="empty-state">
          <span className="empty-symbol" aria-hidden="true">
            ♫
          </span>
          <h2>A space for our voices</h2>
          <p>Permission-cleared recordings will appear here when published.</p>
          <Link className="text-link" href="/catalogue">
            Explore the written word ↗
          </Link>
        </div>
      )}
    </div>
  );
}
