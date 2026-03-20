"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { schoolAmplifiedBrand } from "@/lib/brand";
import { useAuthSession } from "@/lib/auth-client";

type AuthMode = "signin" | "signup" | "magic";

export function LoginForm() {
  const router = useRouter();
  const { supabase, session } = useAuthSession();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [signupCode, setSignupCode] = useState("");
  const [status, setStatus] = useState("Choose how you want to access The Wire.");

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

  const createAccount = async () => {
    if (!password || password.length < 8) {
      setStatus("Use a password with at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setStatus("Passwords do not match.");
      return;
    }

    setStatus("Creating account...");
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        password,
        signupCode
      })
    });

    const payload = await response.json();

    if (!response.ok) {
      setStatus(payload?.message ?? "Unable to create account.");
      return;
    }

    if (supabase) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        setStatus("Account created. Sign in with your new credentials.");
        return;
      }
    }

    setStatus("Account created.");
    router.push("/admin");
    router.refresh();
  };

  const heading =
    mode === "signin" ? "Member login" : mode === "signup" ? "Create account" : "Email magic link";
  const description =
    mode === "signin"
      ? "Sign in with your existing member credentials."
      : mode === "signup"
        ? "Use your invite code to create a member account for your school."
        : "Request a sign-in link by email if your account is already set up.";

  return (
    <section className="w-full max-w-md rounded-editorial border border-white/10 bg-white p-8 shadow-editorial">
      <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">
        {schoolAmplifiedBrand.name}
      </div>
      <h1 className="mt-3 font-display text-4xl text-brand-navy">{heading}</h1>
      <p className="mt-3 text-sm leading-6 text-brand-muted">
        {description}
      </p>

      <div className="mt-6 grid grid-cols-3 gap-2 rounded-2xl bg-brand-background p-2">
        <button
          className={`rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${
            mode === "signin" ? "bg-brand-primary text-white" : "text-brand-text"
          }`}
          onClick={() => setMode("signin")}
          type="button"
        >
          Sign in
        </button>
        <button
          className={`rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${
            mode === "signup" ? "bg-brand-secondary text-white" : "text-brand-text"
          }`}
          onClick={() => setMode("signup")}
          type="button"
        >
          Create account
        </button>
        <button
          className={`rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${
            mode === "magic" ? "bg-brand-navy text-white" : "text-brand-text"
          }`}
          onClick={() => setMode("magic")}
          type="button"
        >
          Magic link
        </button>
      </div>

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

        {mode === "signup" ? (
          <>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-brand-text">Confirm password</span>
              <input
                className="rounded-2xl border border-slate-200 px-4 py-3"
                onChange={(event) => setConfirmPassword(event.target.value)}
                type="password"
                value={confirmPassword}
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-brand-text">Signup code</span>
              <input
                className="rounded-2xl border border-slate-200 px-4 py-3"
                onChange={(event) => setSignupCode(event.target.value)}
                value={signupCode}
              />
            </label>
          </>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {mode === "signin" ? (
          <button
            className="rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white"
            onClick={() => void signIn()}
            type="button"
          >
            Sign in
          </button>
        ) : null}
        {mode === "signup" ? (
          <button
            className="rounded-full bg-brand-secondary px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white"
            onClick={() => void createAccount()}
            type="button"
          >
            Create account
          </button>
        ) : null}
        {mode === "magic" ? (
          <button
            className="rounded-full bg-brand-navy px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white"
            onClick={() => void sendMagicLink()}
            type="button"
          >
            Send magic link
          </button>
        ) : null}
      </div>

      <div className="mt-4 rounded-2xl bg-brand-background px-4 py-3 text-sm text-brand-muted">
        {status}
      </div>
    </section>
  );
}
