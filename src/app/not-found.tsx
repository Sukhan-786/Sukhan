import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty-state">
      <p className="eyebrow">404 · An unwritten page</p>
      <h1>This page isn’t in the library.</h1>
      <Link className="button" href="/catalogue">
        Explore kalam ↗
      </Link>
    </div>
  );
}
