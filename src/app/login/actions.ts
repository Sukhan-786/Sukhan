"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
export async function login(_previous: { error: string }, form: FormData) {
  const db = await createClient();
  if (!db)
    return {
      error: "Connect Supabase before signing in. See the setup guide.",
    };
  const input = z
    .object({ email: z.email().max(254), password: z.string().min(1).max(128) })
    .safeParse(Object.fromEntries(form));
  if (!input.success) return { error: "Enter a valid email and password." };
  const { error } = await db.auth.signInWithPassword(input.data);
  if (error)
    return { error: "Sign-in failed. Check your details and try again." };
  redirect("/admin");
}
export async function logout() {
  const db = await createClient();
  if (db) {
    const { error } = await db.auth.signOut();
    if (error) throw new Error("Unable to sign out. Please try again.");
  }
  redirect("/login");
}
