"use client";
import Link from "@/components/animated-link";
import type { ReactNode } from "react";
export function MenuLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={(event) => {
        if (
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        const menu = event.currentTarget.closest("details");
        if (menu) menu.open = false;
      }}
    >
      {children}
    </Link>
  );
}
