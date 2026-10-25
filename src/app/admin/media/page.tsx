import { AdminLibrary } from "@/components/admin-library";
import type { AdminParams } from "@/lib/admin";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<AdminParams>;
}) {
  return <AdminLibrary kind="media" params={await searchParams} />;
}
