"use client";
import Link from "next/link";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="studio-empty" role="alert">
      <h1>The studio couldn’t load this page.</h1>
      <p>
        Check your connection and try again. If this is a new project, all
        Sukhan database migrations must be installed first.
      </p>
      <button className="button" onClick={reset}>
        Try again
      </button>
      <Link href="/admin">Back to overview</Link>
    </div>
  );
}
