"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="studio-links" aria-label="Editorial navigation">
      {[
        ["/admin", "Overview", "01"],
        ["/admin/kalam", "Kalam", "02"],
        ["/admin/artists", "Poets & artists", "03"],
        ["/admin/media", "Media library", "04"],
        ["/admin/dictionary", "Dictionary", "05"],
        ["/admin/homepage", "Homepage", "06"],
        ["/admin/import-poetry", "Import poetry", "07"],
      ].map(([href, label, number]) => {
        const active =
          href === "/admin"
            ? path === href
            : path.startsWith(href + "/") || path === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
          >
            <span aria-hidden="true">{number}</span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
