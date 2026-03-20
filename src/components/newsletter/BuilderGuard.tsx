"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuthSession } from "@/lib/auth-client";
import { schoolAmplifiedBrand } from "@/lib/brand";
import { canAccessBuilder } from "@/lib/member-access";
import type { MemberRecord } from "@/types/member";

export function BuilderGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session, loading, supabase } = useAuthSession();
  const [member, setMember] = useState<MemberRecord | null>(null);
  const [memberLoading, setMemberLoading] = useState(true);

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

      if (!response.ok) {
        if (!cancelled) {
          setMember(null);
          setMemberLoading(false);
        }
        return;
      }

      const payload = await response.json();
      if (!cancelled) {
        setMember(payload.data ?? null);
        setMemberLoading(false);
      }
    }

    void loadMember();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.email, supabase]);

  if (loading || memberLoading) {
    return <main className="min-h-screen bg-brand-navy px-6 py-10 text-white">Loading builder...</main>;
  }

  if (!session && supabase) {
    return null;
  }

  if (!canAccessBuilder(member)) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#123A69_0%,#0F2745_100%)] px-6 py-10 text-white">
        <div className="mx-auto max-w-3xl rounded-editorial border border-white/10 bg-[#102847] p-8 shadow-editorial">
          <div className="text-xs font-bold uppercase tracking-[0.3em] text-[#7db3f1]">
            {schoolAmplifiedBrand.name}
          </div>
          <h1 className="mt-3 font-display text-4xl">Builder access required</h1>
          <p className="mt-4 text-base leading-7 text-slate-200">
            You must be logged in and assigned to a school before you can open the builder.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              className="rounded-full bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-navy"
              href="/login"
            >
              Go to login
            </Link>
            <Link
              className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white"
              href="/admin/members"
            >
              Open members
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
