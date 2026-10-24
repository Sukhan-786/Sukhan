"use client";
import { useActionState } from "react";
import { login } from "@/app/login/actions";
export function LoginForm({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState(login, { error: "" });
  return (
    <form action={action} className="stack">
      <div className="field">
        <label htmlFor="email">Email address</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          maxLength={254}
          disabled={!configured}
        />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={128}
          disabled={!configured}
        />
      </div>
      {state.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}
      <button className="button" disabled={pending || !configured}>
        {pending ? "Signing in…" : "Sign in to the studio ↗"}
      </button>
      <p className="hint">
        Access is by staff invitation. A reader account does not grant editorial
        permissions.
      </p>
    </form>
  );
}
