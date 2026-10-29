"use client";
import Link from "@/components/animated-link";
import { usePathname } from "next/navigation";
import { Icon } from "./icon";
export function MobileNavigation() {
  const path = usePathname();
  if (
    /^\/(admin|login|auth|account|profile|reset-password|set-password)(?:\/|$)/.test(
      path,
    )
  )
    return null;
  const links = [
    { href: "/", label: "Home", icon: "home" },
    { href: "/catalogue", label: "Search", icon: "search" },
    { href: "/dictionary", label: "Dictionary", icon: "read" },
    { href: "/media?kind=video", label: "Videos", icon: "video" },
  ] as const;
  return (
    <nav className="mobile-bottom-nav" aria-label="Quick navigation">
      {links.map((l) => (
        <Link
          key={l.label}
          href={l.href}
          aria-label={l.label}
          aria-current={
            (
              l.href === "/"
                ? path === "/"
                : path.startsWith(l.href.split("?")[0])
            )
              ? "page"
              : undefined
          }
        >
          <Icon name={l.icon} />
          <span>{l.label}</span>
        </Link>
      ))}
    </nav>
  );
}
