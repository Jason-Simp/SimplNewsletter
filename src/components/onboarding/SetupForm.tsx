"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuthSession } from "@/lib/auth-client";

export function SetupForm() {
  const router = useRouter();
  const { session, loading, supabase } = useAuthSession();
  const [fullName, setFullName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [status, setStatus] = useState("Finish setup to create your school workspace.");
  const [memberLoading, setMemberLoading] = useState(true);
  const [hasWorkspace, setHasWorkspace] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !session && supabase) {
      router.replace("/login");
    }
  }, [loading, router, session, supabase]);

  useEffect(() => {
    const email = session?.user?.email;

    if (!email || !supabase) {
      setMemberLoading(false);
      return;
    }

    let cancelled = false;
    const memberEmail = email;

    async function loadMember() {
      const response = await fetch(`/api/members/me?email=${encodeURIComponent(memberEmail)}`);
      const payload = response.ok ? await response.json() : null;

      if (!cancelled) {
        setMemberLoading(false);
        if (payload?.data) {
          setHasWorkspace(true);
          setStatus("Your workspace is already connected to this account.");
        }
      }
    }

    void loadMember();

    return () => {
      cancelled = true;
    };
  }, [router, session?.user?.email, supabase]);

  const finishSetup = async () => {
    const email = session?.user?.email;
    const authUserId = session?.user?.id;

    if (!email || !authUserId) {
      setStatus("You need to be logged in before setup can finish.");
      return;
    }

    if (!fullName.trim() || !schoolName.trim()) {
      setStatus("Enter your name and school name to continue.");
      return;
    }

    setSubmitting(true);
    setStatus("Creating your school workspace...");

    const response = await fetch("/api/onboarding/bootstrap", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        authUserId,
        email,
        fullName,
        schoolName
      })
    });

    const payload = await response.json();

    if (!response.ok) {
      setSubmitting(false);
      setStatus(payload?.message ?? "Unable to finish setup.");
      return;
    }

    setStatus("Workspace created. Redirecting...");
    setHasWorkspace(true);
    router.replace("/admin");
    router.refresh();
  };

  if (loading || memberLoading) {
    return <div className="text-white">Loading setup...</div>;
  }

  if (!session && supabase) {
    return null;
  }

  if (hasWorkspace) {
    return (
      <section className="w-full max-w-lg rounded-editorial border border-white/10 bg-white p-8 shadow-editorial">
        <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">
          Workspace ready
        </div>
        <h1 className="mt-3 font-display text-4xl text-brand-navy">Your school workspace exists</h1>
        <p className="mt-3 text-sm leading-6 text-brand-muted">
          This account is already linked to a school workspace. Continue into admin to manage branding,
          members, and newsletter publishing.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className="rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white"
            onClick={() => router.push("/admin")}
            type="button"
          >
            Open admin
          </button>
          <button
            className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-text"
            onClick={() => router.push("/builder")}
            type="button"
          >
            Open builder
          </button>
        </div>
        <div className="mt-4 rounded-2xl bg-brand-background px-4 py-3 text-sm text-brand-muted">
          {status}
        </div>
      </section>
    );
  }

  return (
    <section className="w-full max-w-lg rounded-editorial border border-white/10 bg-white p-8 shadow-editorial">
      <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">
        First-time setup
      </div>
      <h1 className="mt-3 font-display text-4xl text-brand-navy">Create your school workspace</h1>
      <p className="mt-3 text-sm leading-6 text-brand-muted">
        This creates the first school profile and makes you the school admin for that workspace.
      </p>

      <div className="mt-6 grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-brand-text">Your name</span>
          <input
            className="rounded-2xl border border-slate-200 px-4 py-3"
            onChange={(event) => setFullName(event.target.value)}
            value={fullName}
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-brand-text">School name</span>
          <input
            className="rounded-2xl border border-slate-200 px-4 py-3"
            onChange={(event) => setSchoolName(event.target.value)}
            value={schoolName}
          />
        </label>
      </div>

      <button
        className="mt-6 rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white disabled:cursor-not-allowed disabled:opacity-60"
        disabled={submitting}
        onClick={() => void finishSetup()}
        type="button"
      >
        {submitting ? "Creating workspace..." : "Create workspace"}
      </button>

      <div className="mt-4 rounded-2xl bg-brand-background px-4 py-3 text-sm text-brand-muted">
        {status}
      </div>
    </section>
  );
}
