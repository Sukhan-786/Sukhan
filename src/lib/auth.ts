import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { StaffRole } from "./types";
export const requireStaff = cache(async function requireStaff() {
  const db = await createClient();
  if (!db) redirect("/login?reason=setup");
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user) redirect("/login");
  const { data, error: roleError } = await db
    .from("staff_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (roleError) throw new Error("Unable to verify staff access.");
  if (!data || !["admin", "editor"].includes(data.role))
    redirect("/login?reason=access");
  return { db, user, role: data.role as StaffRole };
});
