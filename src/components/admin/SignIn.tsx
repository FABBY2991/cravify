"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { messageOf } from "@/lib/errors";
import { Button, inputClass } from "./ui";

/** Email → 6-digit code. Only allowlisted admin emails are ever sent one. */
export function SignIn() {
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e: FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Enter your admin email address.");
    setBusy(true);
    setError(null);
    try {
      await signIn("email-code", { email: email.trim() });
      setSent(true);
    } catch (err) {
      setError(messageOf(err).startsWith("Something went wrong") ? "Couldn't send a code. Try again in a minute." : messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) return setError("The code is 6 digits.");
    setBusy(true);
    setError(null);
    try {
      await signIn("email-code", { email: email.trim(), code: code.trim() });
    } catch {
      setError("That code didn't work. Check it, or send a new one.");
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-svh place-items-center bg-cream px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden /> Back to the site
        </Link>
        <div className="rounded-3xl bg-white p-8 shadow-xl shadow-black/5 ring-1 ring-line">
          <p className="font-logo text-4xl">
            Cravify<span className="text-brand">!</span>
          </p>
          <h1 className="mt-1 text-lg font-bold">Admin sign-in</h1>
          {!sent ? (
            <form onSubmit={sendCode} className="mt-6 space-y-3" noValidate>
              <label htmlFor="admin-email" className="text-sm font-semibold">
                Admin email
              </label>
              <input
                id="admin-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="you@example.com"
              />
              <Button type="submit" busy={busy} className="w-full !py-3">
                Email me a code
              </Button>
            </form>
          ) : (
            <form onSubmit={verify} className="mt-6 space-y-3" noValidate>
              <p className="text-sm text-muted">
                We sent a 6-digit code to <strong className="text-ink">{email.trim()}</strong>. It expires in 15 minutes.
              </p>
              <label htmlFor="admin-code" className="text-sm font-semibold">
                Code
              </label>
              <input
                id="admin-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className={`${inputClass} text-center text-2xl tracking-[0.5em]`}
              />
              <Button type="submit" busy={busy} className="w-full !py-3">
                Sign in
              </Button>
              <button
                type="button"
                onClick={() => {
                  setSent(false);
                  setCode("");
                  setError(null);
                }}
                className="w-full text-center text-sm font-semibold text-muted hover:text-ink"
              >
                Use a different email or resend
              </button>
            </form>
          )}
          {error && (
            <p role="alert" className="mt-3 rounded-xl bg-brand/10 px-3 py-2 text-sm font-semibold text-brand-dark">
              {error}
            </p>
          )}
        </div>
        <p className="mt-4 text-center text-xs text-muted">Only Cravify admins can sign in.</p>
      </div>
    </main>
  );
}
