import type { CSSProperties } from "react";
type Name =
  | "home"
  | "video"
  | "search"
  | "menu"
  | "grid"
  | "chevron"
  | "left"
  | "right"
  | "share"
  | "read"
  | "language"
  | "download"
  | "play"
  | "book"
  | "headphones";
const paths: Record<Name, React.ReactNode> = {
  home: <path d="m3 11 9-8 9 8v10h-6v-7H9v7H3Z" />,
  video: (
    <>
      <rect x="3" y="5" width="18" height="15" rx="3" />
      <path d="m8 2 4 3 4-3M10 10l5 3-5 3Z" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </>
  ),
  menu: <path d="M3 5h18M3 12h18M3 19h18" />,
  grid: (
    <>
      <path d="M3 3h4v4H3zM10 3h4v4h-4zM17 3h4v4h-4zM3 10h4v4H3zM10 10h4v4h-4zM17 10h4v4h-4zM3 17h4v4H3zM10 17h4v4h-4zM17 17h4v4h-4z" />
    </>
  ),
  chevron: <path d="m7 10 5 5 5-5" />,
  left: <path d="m15 5-7 7 7 7" />,
  right: <path d="m9 5 7 7-7 7" />,
  share: (
    <>
      <circle cx="18" cy="5" r="3" />
      <circle cx="5" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8 10 7-4M8 14l7 4" />
    </>
  ),
  read: (
    <>
      <path d="M12 5C8 2 3 3 3 3v16s5-1 9 2c4-3 9-2 9-2V3s-5-1-9 2Z" />
      <path d="M12 5v16" />
    </>
  ),
  language: (
    <>
      <path d="M3 4h12M9 2v2M5 4c0 7 8 11 8 11M13 4c0 5-4 9-9 12M13 21l4-11 4 11M15 17h4" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4" />
    </>
  ),
  play: <path d="m9 5 11 7-11 7Z" />,
  book: (
    <>
      <path d="M4 3h16v18H4zM8 3v18M11 7h6M11 11h6" />
    </>
  ),
  headphones: (
    <>
      <path d="M4 14v-3a8 8 0 0 1 16 0v3M4 12h4v8H4zM16 12h4v8h-4z" />
    </>
  ),
};
export function Icon({
  name,
  size = 20,
  style,
}: {
  name: Name;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={style}
    >
      {paths[name]}
    </svg>
  );
}
