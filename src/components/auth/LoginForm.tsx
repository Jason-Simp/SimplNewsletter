"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { authFetch } from "@/lib/api-client";
import { schoolAmplifiedBrand } from "@/lib/brand";
import { useAuthSession } from "@/lib/auth-client";

type AuthMode = "signin" | "signup" | "magic" | "reset";

export function LoginForm({
  initialMode = "signin",
  audience = "member"
}: {
  initialMode?: AuthMode;
  audience?: "member" | "admin";
}) {
  const router = useRouter();
  const { supabase, session } = useAuthSession();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [signupCode, setSignupCode] = useState("");
  const [status, setStatus] = useState("Choose how you want to access The Wire.");
  const [redirectTarget, setRedirectTarget] = useState<"/admin" | "/setup" | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }

    router.replace(redirectTarget ?? "/admin");
  }, [redirectTarget, router, session]);

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

    try {
      const response = await authFetch(supabase, "/api/members/me");
      const payload = response.ok ? await response.json() : null;
      const hasMember = Boolean(payload?.data);

      setStatus("Signed in.");
      setRedirectTarget(hasMember ? "/admin" : "/setup");
    } catch {
      setStatus("Signed in.");
      setRedirectTarget("/setup");
    }
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

  const requestPasswordReset = async () => {
    if (!supabase) {
      setStatus("Supabase auth is not configured.");
      return;
    }

    if (!email.trim()) {
      setStatus("Enter the email address tied to your account first.");
      return;
    }

    setStatus("Sending password reset email...");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    setStatus("Password reset email sent. Check your inbox and spam folder.");
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
    setRedirectTarget("/setup");
  };

  const heading =
    mode === "signin"
      ? audience === "admin"
        ? "Admin dashboards"
        : "Member login"
      : mode === "signup"
        ? "Create account"
        : mode === "magic"
          ? "Email magic link"
          : "Reset password";
  const description =
    mode === "signin"
      ? audience === "admin"
        ? "Sign in as an admin or implementer to manage multiple schools."
        : "Sign in with your existing member credentials."
      : mode === "signup"
        ? "Use your invite code to create a member account for your school."
        : mode === "magic"
          ? "Request a sign-in link by email if your account is already set up."
          : "Send yourself a password reset email and choose a new password.";
  const helperItems =
    audience === "admin"
      ? [
          "Use this if you manage school setup, users, or multiple school dashboards.",
          "After sign-in, you will land in the admin workspace."
        ]
      : mode === "signup"
        ? [
            "You need your email, a password, and the school signup code.",
            "After account creation, you will finish school setup before using the builder."
          ]
        : mode === "magic"
          ? [
              "Use this if your account already exists and you prefer a sign-in link by email.",
              "The link will bring you back into your school workspace."
            ]
          : mode === "reset"
            ? [
              "Use the email address tied to your school account.",
              "The reset email will send you to a secure page where you can choose a new password."
            ]
            : [
                "Use this if your school account is already set up.",
                "After sign-in, you will go to your school dashboard or setup if your workspace is still being connected."
              ];

  return (
    <section className="w-full max-w-md rounded-editorial border border-white/10 bg-white p-8 shadow-editorial">
      <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">
        {schoolAmplifiedBrand.name}
      </div>
      <h1 className="mt-3 font-display text-4xl text-brand-navy">{heading}</h1>
      <p className="mt-3 text-sm leading-6 text-brand-muted">
        {description}
      </p>

      <div className="mt-5 rounded-[24px] border border-slate-200 bg-[#F7F9FC] p-4">
        <div className="text-sm font-semibold text-brand-text">
          {audience === "admin"
            ? "Use this screen for"
            : mode === "signup"
              ? "Before you create the account"
              : mode === "magic"
                ? "Before you request the link"
                : "Before you sign in"}
        </div>
        <div className="mt-3 grid gap-2">
          {helperItems.map((item) => (
            <div key={item} className="text-sm leading-6 text-brand-muted">
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-4 gap-2 rounded-2xl bg-brand-background p-2">
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
        <button
          className={`rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${
            mode === "reset" ? "bg-brand-secondary text-white" : "text-brand-text"
          }`}
          onClick={() => setMode("reset")}
          type="button"
        >
          Reset
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

        {mode !== "magic" && mode !== "reset" ? (
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-brand-text">Password</span>
            <input
              className="rounded-2xl border border-slate-200 px-4 py-3"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </label>
        ) : null}

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
              <span className="text-xs leading-5 text-brand-muted">
                This is the school access code required before a new account can be created.
              </span>
            </label>
          </>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {mode === "signin" ? (
          <>
            <button
              className="rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white"
              onClick={() => void signIn()}
              type="button"
            >
              Sign in
            </button>
            <button
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-text"
              onClick={() => setMode("reset")}
              type="button"
            >
              Forgot password
            </button>
          </>
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
        {mode === "reset" ? (
          <button
            className="rounded-full bg-brand-secondary px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white"
            onClick={() => void requestPasswordReset()}
            type="button"
          >
            Send reset email
          </button>
        ) : null}
      </div>

      <div className="mt-4 rounded-2xl bg-brand-background px-4 py-3 text-sm text-brand-muted">
        {status}
      </div>
    </section>
  );
}
