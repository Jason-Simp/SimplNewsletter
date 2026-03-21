"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { useAuthSession } from "@/lib/auth-client";
import { isCompanyAdmin } from "@/lib/member-access";
import type { MemberRecord } from "@/types/member";

export default function AdminPage() {
  const { session } = useAuthSession();
  const [member, setMember] = useState<MemberRecord | null>(null);

  useEffect(() => {
    async function loadMember() {
      if (!session?.user?.email) {
        return;
      }

      const response = await fetch(`/api/members/me?email=${encodeURIComponent(session.user.email)}`);
      const payload = response.ok ? await response.json() : null;
      setMember(payload?.data ?? null);
    }

    void loadMember();
  }, [session?.user?.email]);

  const companyView = isCompanyAdmin(member);

  return (
    <section className="grid gap-6">
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">
          {companyView ? "Company admin" : "School dashboard"}
        </div>
        <h1 className="mt-2 font-display text-5xl text-brand-navy">
          {companyView ? "Company administration" : member?.schoolName || "School dashboard"}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-brand-muted">
          {companyView
            ? "Manage schools, signup codes, member access, and company-wide newsletter operations."
            : "Manage your school profile, members, branding, and newsletter publishing from one workspace."}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {companyView ? (
          <>
            <Stat label="Admin mode" value="Company" />
            <Stat label="Access scope" value="All schools" />
            <Stat label="Member controls" value="Global" />
            <Stat label="Signup codes" value="Enabled" />
          </>
        ) : (
          <>
            <Stat label="School" value={member?.schoolName || "Linked"} />
            <Stat label="Role" value={member?.role.replace("_", " ") || "member"} />
            <Stat label="Publishing" value="School scoped" />
            <Stat label="Builder access" value="Enabled" />
          </>
        )}
      </div>

      {!companyView ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-editorial border border-slate-200 bg-[#F7F9FC] p-6">
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">
              Add new
            </div>
            <h2 className="mt-2 font-display text-3xl text-brand-navy">Choose how to build</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-brand-muted">
              Start with a fast guided release or open the full custom workspace. Both save into the same
              school newsletter system.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Link
                className="rounded-[28px] border border-slate-200 bg-white p-5 transition hover:border-brand-primary hover:bg-brand-background"
                href="/builder?mode=quick"
              >
                <div className="text-xs font-bold uppercase tracking-[0.25em] text-brand-secondary">
                  Quick release
                </div>
                <div className="mt-2 text-xl font-semibold text-brand-text">Simple form, instant draft</div>
                <div className="mt-2 text-sm leading-6 text-brand-muted">
                  Enter what you want to say, paste bullets or links, pick sections, and let the system
                  assemble the release.
                </div>
              </Link>

              <Link
                className="rounded-[28px] border border-slate-200 bg-white p-5 transition hover:border-brand-primary hover:bg-brand-background"
                href="/builder?mode=custom"
              >
                <div className="text-xs font-bold uppercase tracking-[0.25em] text-brand-secondary">
                  Custom build
                </div>
                <div className="mt-2 text-xl font-semibold text-brand-text">Full workspace control</div>
                <div className="mt-2 text-sm leading-6 text-brand-muted">
                  Use the complete builder, preview system, branding tools, uploads, and publishing setup.
                </div>
              </Link>
            </div>
          </article>

          <article className="rounded-editorial border border-slate-200 bg-white p-6">
            <div className="text-sm font-semibold text-brand-text">What the quick mode should do</div>
            <ul className="mt-4 grid gap-3 text-sm leading-6 text-brand-muted">
              <li>Let a superintendent or principal type rough notes quickly</li>
              <li>Accept bullets, pasted links, or short updates without forcing layout decisions</li>
              <li>Use the school&apos;s configured provider stack to rewrite and polish the draft</li>
              <li>Apply the template and branding automatically before preview and publish</li>
            </ul>
          </article>
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-editorial border border-slate-200 bg-[#F7F9FC] p-6">
          <div className="text-sm font-semibold text-brand-text">
            {companyView ? "Company controls" : "What you can manage here"}
          </div>
          <ul className="mt-4 grid gap-3 text-sm leading-6 text-brand-muted">
            {companyView ? (
              <>
                <li>Approve and create school workspaces</li>
                <li>Manage company-wide signup codes</li>
                <li>See all schools and all school admins</li>
                <li>Control system-wide integrations and defaults</li>
              </>
            ) : (
              <>
                <li>Edit your school profile and branding</li>
                <li>Manage staff access for your school</li>
                <li>Open the builder for your school newsletters</li>
                <li>Control school-specific publish settings</li>
              </>
            )}
          </ul>
        </article>

        <article className="rounded-editorial border border-slate-200 bg-white p-6">
          <div className="text-sm font-semibold text-brand-text">
            {companyView ? "System status" : "What happens next"}
          </div>
          <ul className="mt-4 grid gap-3 text-sm leading-6 text-brand-muted">
            {companyView ? (
              <>
                <li>Company admin view should be separate from school dashboards</li>
                <li>Only company admins should see codes and all schools</li>
                <li>School admins should stay scoped to one school</li>
                <li>Integrations should resolve through school-level configuration</li>
              </>
            ) : (
              <>
                <li>Open School Profile to update logo, colors, and settings</li>
                <li>Open Members to add or remove school users</li>
                <li>Open Builder to draft the next newsletter</li>
                <li>Exports and publishing stay tied to your school workspace</li>
              </>
            )}
          </ul>
        </article>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-editorial border border-slate-200 bg-white p-6">
      <div className="text-xs font-bold uppercase tracking-[0.25em] text-brand-secondary">{label}</div>
      <div className="mt-3 text-2xl font-bold text-brand-navy">{value}</div>
    </article>
  );
}
