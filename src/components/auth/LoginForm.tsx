"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { schoolAmplifiedBrand } from "@/lib/brand";
import { useAuthSession } from "@/lib/auth-client";

export function LoginForm() {
  const router = useRouter();
  const { supabase, session } = useAuthSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("Member login");

  if (session) {
    router.replace("/admin");
  }

  const signIn = async () => {
    if (!supabase) {
      setStatus("Supabase auth is not configured.");
      return;
    }

    setStatus("Signing in...");
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setStatus(error.message);
      return;
    }

    setStatus("Signed in.");
    router.push("/admin");
    router.refresh();
  };

  const sendMagicLink = async () => {
    if (!supabase) {
      setStatus("Supabase auth is not configured.");
      return;
    }

    setStatus("Sending magic link...");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/admin` : undefined
      }
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    setStatus("Magic link sent.");
  };

  return (
    <section className="w-full max-w-md rounded-editorial border border-white/10 bg-white p-8 shadow-editorial">
      <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">
        {schoolAmplifiedBrand.name}
      </div>
      <h1 className="mt-3 font-display text-4xl text-brand-navy">Member Login</h1>
      <p className="mt-3 text-sm leading-6 text-brand-muted">
        Sign in to manage schools, members, and newsletter publishing inside The Wire.
      </p>

      <div className="mt-6 grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-brand-text">Email</span>
          <input
            className="rounded-2xl border border-slate-200 px-4 py-3"
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            value={email}
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-brand-text">Password</span>
          <input
            className="rounded-2xl border border-slate-200 px-4 py-3"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        </label>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          className="rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white"
          onClick={() => void signIn()}
          type="button"
        >
          Sign in
        </button>
        <button
          className="rounded-full bg-brand-secondary px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white"
          onClick={() => void sendMagicLink()}
          type="button"
        >
          Email magic link
        </button>
      </div>

      <div className="mt-4 rounded-2xl bg-brand-background px-4 py-3 text-sm text-brand-muted">
        {status}
      </div>
    </section>
  );
}
