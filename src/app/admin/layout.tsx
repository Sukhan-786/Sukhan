import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { logout } from "@/app/login/actions";
export const metadata: Metadata = {
  title: "Editorial studio",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role } = await requireStaff();
  return (
    <div className="admin-layout">
      <nav className="admin-nav" aria-label="Editorial navigation">
        <Link href="/admin">Overview</Link>
        <Link href="/admin/kalam">Kalam</Link>
        <Link href="/admin/artists">Poets & artists</Link>
        <Link href="/admin/media">Media</Link>
        <span className="staff-badge">{role}</span>
        <form action={logout}>
          <button>Sign out</button>
        </form>
      </nav>
      {children}
    </div>
  );
}
