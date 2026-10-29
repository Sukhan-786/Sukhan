"use client";

import { Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "@/components/animated-link";

const languages = [
  { code: "ENG", label: "Roman Urdu", value: "roman" },
  { code: "URD", label: "اردو", value: "ur" },
  { code: "HIN", label: "हिन्दी", value: "hi" },
];

function LanguageMenu() {
  const params = useSearchParams();
  const menu = useRef<HTMLDetailsElement>(null);

  const current =
    languages.find((item) => item.value === params.get("lang")) ??
    languages[1];

  return (
    <details
      ref={menu}
      className="premium-language"
      onKeyDown={(event) => {
        if (event.key === "Escape" && menu.current) {
          menu.current.open = false;
          menu.current.querySelector("summary")?.focus();
        }
      }}
    >
      <summary aria-label={`Reading language: ${current.code}`}>
        {current.code}
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="m3 4.5 3 3 3-3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </summary>

      <nav
        className="premium-language-options"
        aria-label="Reading language"
      >
        {languages.map((item) => (
          <Link
            key={item.code}
            href={`/catalogue?library=ur&lang=${item.value}`}
            aria-current={
              current.value === item.value ? "true" : undefined
            }
            onNavigate={() => {
              if (menu.current) menu.current.open = false;
            }}
          >
            <strong>{item.code}</strong>
            <span dir="auto">{item.label}</span>
          </Link>
        ))}
      </nav>
    </details>
  );
}

export default function LanguageDropdown() {
  return (
    <Suspense
      fallback={<span className="premium-language-placeholder">URD</span>}
    >
      <LanguageMenu />
    </Suspense>
  );
}
