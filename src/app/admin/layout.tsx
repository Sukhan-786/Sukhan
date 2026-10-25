import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { logout } from "@/app/login/actions";
import { AdminNav } from "@/components/admin-nav";
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
  const { role, user } = await requireStaff();
  return (
    <div className="admin-layout">
      <aside className="studio-sidebar">
        <Link className="studio-wordmark" href="/admin">
          Sukhan<span>EDITORIAL STUDIO</span>
        </Link>
        <AdminNav />
        <div className="studio-account">
          <span className="staff-badge">{role}</span>
          <p>{user.email}</p>
          <Link href="/" target="_blank" rel="noreferrer">
            View website ↗
          </Link>
          <form action={logout}>
            <button className="text-link">Sign out</button>
          </form>
        </div>
      </aside>
      <div className="studio-main">{children}</div>
    </div>
  );
}
