"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuthSession } from "@/lib/auth-client";
import { schoolAmplifiedBrand } from "@/lib/brand";
import { canManageMembers, canManageSchools } from "@/lib/member-access";
import type { MemberRecord } from "@/types/member";

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/schools", label: "Schools" },
  { href: "/admin/members", label: "Members" },
  { href: "/admin/codes", label: "Codes" },
  { href: "/builder", label: "Builder" }
];

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
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
    const authUserId = session?.user?.id;

    if (!email || !authUserId || !supabase) {
      setMemberLoading(false);
      return;
    }

    let cancelled = false;
    const memberEmail = email;
    const memberAuthUserId = authUserId;

    async function loadMember() {
      await fetch("/api/members/link-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: memberEmail,
          authUserId: memberAuthUserId
        })
      });

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
  }, [session?.user?.email, session?.user?.id, supabase]);

  const signOut = async () => {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (loading || memberLoading) {
    return <main className="min-h-screen bg-brand-navy px-6 py-10 text-white">Loading dashboard...</main>;
  }

  if (!session && supabase) {
    return null;
  }

  if (session && supabase && !member) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#123A69_0%,#0F2745_100%)] px-6 py-10 text-white">
        <div className="mx-auto max-w-3xl rounded-editorial border border-white/10 bg-[#102847] p-8 shadow-editorial">
          <div className="text-xs font-bold uppercase tracking-[0.3em] text-[#7db3f1]">
            {schoolAmplifiedBrand.name}
          </div>
          <h1 className="mt-3 font-display text-4xl">Access not assigned</h1>
          <p className="mt-4 text-base leading-7 text-slate-200">
            Your login works, but this email is not assigned to a school member record yet. Add the member
            from the admin members screen or seed the `school_users` table for this account.
          </p>
          <button
            className="mt-6 rounded-full bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-navy"
            onClick={() => void signOut()}
            type="button"
          >
            Sign out
          </button>
        </div>
      </main>
    );
  }

  if (pathname === "/admin/schools" && !canManageSchools(member)) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#123A69_0%,#0F2745_100%)] px-6 py-10 text-white">
        <div className="mx-auto max-w-3xl rounded-editorial border border-white/10 bg-[#102847] p-8 shadow-editorial">
          <div className="text-xs font-bold uppercase tracking-[0.3em] text-[#7db3f1]">
            {schoolAmplifiedBrand.name}
          </div>
          <h1 className="mt-3 font-display text-4xl">Restricted area</h1>
          <p className="mt-4 text-base leading-7 text-slate-200">
            Only school admins can manage school profiles.
          </p>
          <Link
            className="mt-6 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-navy"
            href="/admin"
          >
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  if ((pathname === "/admin/members" || pathname === "/admin/codes") && !canManageMembers(member)) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#123A69_0%,#0F2745_100%)] px-6 py-10 text-white">
        <div className="mx-auto max-w-3xl rounded-editorial border border-white/10 bg-[#102847] p-8 shadow-editorial">
          <div className="text-xs font-bold uppercase tracking-[0.3em] text-[#7db3f1]">
            {schoolAmplifiedBrand.name}
          </div>
          <h1 className="mt-3 font-display text-4xl">Restricted area</h1>
          <p className="mt-4 text-base leading-7 text-slate-200">
            Only school admins can manage members.
          </p>
          <Link
            className="mt-6 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-navy"
            href="/admin"
          >
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#123A69_0%,#0F2745_100%)] px-6 py-8 lg:px-10">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-editorial border border-white/10 bg-[#102847] p-6 text-white shadow-editorial">
          <div className="text-xs font-bold uppercase tracking-[0.3em] text-[#7db3f1]">
            {schoolAmplifiedBrand.name}
          </div>
          <h1 className="mt-3 font-display text-4xl">Admin</h1>
          <div className="mt-2 text-sm leading-6 text-slate-300">
            {member?.fullName || session?.user?.email || "Demo mode"}
          </div>
          {member ? (
            <div className="mt-2 rounded-full bg-white/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-[#7db3f1]">
              {member.role} · {member.schoolName}
            </div>
          ) : null}

          <nav className="mt-8 grid gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
                  pathname === item.href ? "bg-brand-secondary text-white" : "bg-white/5 text-slate-200"
                }`}
                href={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <button
            className="mt-8 rounded-full bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-navy"
            onClick={() => void signOut()}
            type="button"
          >
            Sign out
          </button>
        </aside>

        <section className="rounded-editorial border border-white/10 bg-white p-6 shadow-editorial lg:p-8">
          {children}
        </section>
      </div>
    </main>
  );
}
