import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";
import { supabaseConfig } from "@/lib/config";
export const metadata: Metadata = {
  title: "Editorial sign in",
  robots: { index: false, follow: false },
};
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const configured = !!supabaseConfig();
  return (
    <div className="auth-shell">
      <p className="eyebrow">Sukhan editorial studio</p>
      <h1>A home for our editors.</h1>
      {!configured && (
        <p className="notice">
          The studio is locked until Supabase is connected. Configure the
          environment, apply the migration, and invite the first administrator
          using the setup guide.
        </p>
      )}
      {reason === "access" && (
        <p role="alert" className="form-error">
          Your account does not have a staff role. Ask your administrator to
          invite you.
        </p>
      )}
      <LoginForm configured={configured} />
    </div>
  );
}
