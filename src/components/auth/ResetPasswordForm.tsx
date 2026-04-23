"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { schoolAmplifiedBrand } from "@/lib/brand";
import { useAuthSession } from "@/lib/auth-client";

export function ResetPasswordForm() {
  const router = useRouter();
  const { supabase, session } = useAuthSession();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("Open the recovery link from your email, then choose a new password.");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setStatus("Supabase auth is not configured.");
      return;
    }

    let active = true;

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) {
        return;
      }

      if (event === "PASSWORD_RECOVERY" || nextSession) {
        setReady(true);
        setStatus("Recovery confirmed. Choose your new password below.");
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!active) {
        return;
      }

      if (data.session) {
        setReady(true);
        setStatus("Choose your new password below.");
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const updatePassword = async () => {
    if (!supabase) {
      setStatus("Supabase auth is not configured.");
      return;
    }

    if (!ready && !session) {
      setStatus("Open the password reset link from your email first.");
      return;
    }

    if (!password || password.length < 8) {
      setStatus("Use a password with at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setStatus("Passwords do not match.");
      return;
    }

    setStatus("Updating password...");
    const { error } = await supabase.auth.updateUser({
      password
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    setStatus("Password updated. Redirecting to your dashboard...");
    router.replace("/admin");
  };

  return (
    <section className="w-full max-w-md rounded-editorial border border-white/10 bg-white p-8 shadow-editorial">
      <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">
        {schoolAmplifiedBrand.name}
      </div>
      <h1 className="mt-3 font-display text-4xl text-brand-navy">Set a new password</h1>
      <p className="mt-3 text-sm leading-6 text-brand-muted">
        Use the secure link from your email to create a new password for your school account.
      </p>

      <div className="mt-5 rounded-[24px] border border-slate-200 bg-[#F7F9FC] p-4">
        <div className="text-sm font-semibold text-brand-text">What to do here</div>
        <div className="mt-3 grid gap-2 text-sm leading-6 text-brand-muted">
          <div>1. Open the reset link from your email.</div>
          <div>2. Enter a new password below.</div>
          <div>3. Sign back in or continue to your dashboard.</div>
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-brand-text">New password</span>
          <input
            className="rounded-2xl border border-slate-200 px-4 py-3"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-brand-text">Confirm password</span>
          <input
            className="rounded-2xl border border-slate-200 px-4 py-3"
            onChange={(event) => setConfirmPassword(event.target.value)}
            type="password"
            value={confirmPassword}
          />
        </label>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          className="rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white"
          onClick={() => void updatePassword()}
          type="button"
        >
          Save new password
        </button>
        <Link
          className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-text"
          href="/login"
        >
          Back to login
        </Link>
      </div>

      <div className="mt-4 rounded-2xl bg-brand-background px-4 py-3 text-sm text-brand-muted">{status}</div>
    </section>
  );
}
