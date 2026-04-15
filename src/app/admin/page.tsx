"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { useAuthSession } from "@/lib/auth-client";
import { isCompanyAdmin } from "@/lib/member-access";
import type { MemberRecord } from "@/types/member";
import type { SchoolProfile } from "@/types/school";

export default function AdminPage() {
  const { session } = useAuthSession();
  const [member, setMember] = useState<MemberRecord | null>(null);
  const [schools, setSchools] = useState<SchoolProfile[]>([]);
  const [members, setMembers] = useState<MemberRecord[]>([]);

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

  useEffect(() => {
    async function loadDashboardData() {
      const [schoolsResponse, membersResponse] = await Promise.all([
        fetch("/api/schools"),
        fetch("/api/members")
      ]);

      const schoolsPayload = schoolsResponse.ok ? await schoolsResponse.json() : { data: [] };
      const membersPayload = membersResponse.ok ? await membersResponse.json() : { data: [] };

      setSchools((schoolsPayload.data ?? []) as SchoolProfile[]);
      setMembers((membersPayload.data ?? []) as MemberRecord[]);
    }

    void loadDashboardData();
  }, []);

  const companyView = isCompanyAdmin(member);
  const currentSchool =
    companyView
      ? null
      : schools.find((school) => school.id === member?.schoolId) ?? schools[0] ?? null;
  const currentSchoolMembers = members.filter((item) => item.schoolId === currentSchool?.id);
  const currentSchoolAdmins = currentSchoolMembers.filter((item) => item.role === "school_admin");
  const logoReady = Boolean(currentSchool?.logoUrl);
  const agentReady = Boolean(currentSchool?.assistantReference && currentSchool?.integrationEndpoint);
  const websiteReady = Boolean(currentSchool?.id);
  const setupItems = [
    {
      label: "School logo",
      ready: logoReady,
      detail: logoReady ? "Ready to use in newsletters." : "Upload a logo so the system can brand each issue."
    },
    {
      label: "Writing agent",
      ready: agentReady,
      detail: agentReady ? "Agent ID and API are connected." : "Add the school's writing agent connection."
    },
    {
      label: "Website publishing",
      ready: websiteReady,
      detail: websiteReady ? "Archive and feed links are available." : "Save the school so the archive and feed can be created."
    },
    {
      label: "Team access",
      ready: currentSchoolMembers.length > 0,
      detail:
        currentSchoolMembers.length > 0
          ? `${currentSchoolMembers.length} member${currentSchoolMembers.length === 1 ? "" : "s"} can log in.`
          : "Add school users so other staff can log in."
    }
  ];

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
            <Stat label="Schools" value={String(schools.length)} />
            <Stat label="Members" value={String(members.length)} />
            <Stat label="Signup codes" value="Enabled" />
          </>
        ) : (
          <>
            <Stat label="School" value={member?.schoolName || "Linked"} />
            <Stat label="Role" value={member?.role.replace("_", " ") || "member"} />
            <Stat label="Team members" value={String(currentSchoolMembers.length)} />
            <Stat label="School admins" value={String(currentSchoolAdmins.length)} />
          </>
        )}
      </div>

      {!companyView ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-editorial border border-slate-200 bg-[#F7F9FC] p-6">
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">
              Main action
            </div>
            <h2 className="mt-2 font-display text-3xl text-brand-navy">Create a newsletter</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-brand-muted">
              Open one simple creation flow. Describe what the newsletter should say, add photos if you
              want them included, and let the system build the first draft for you.
            </p>
            <div className="mt-6">
              <Link
                className="block rounded-[28px] border border-slate-200 bg-white p-5 transition hover:border-brand-primary hover:bg-brand-background"
                href="/builder"
              >
                <div className="text-xs font-bold uppercase tracking-[0.25em] text-brand-secondary">
                  Guided builder
                </div>
                <div className="mt-2 text-xl font-semibold text-brand-text">Simple form, finished newsletter</div>
                <div className="mt-2 text-sm leading-6 text-brand-muted">
                  Write the main message, upload photos, review the draft, and choose where to share it.
                </div>
              </Link>
            </div>
          </article>

          <article className="rounded-editorial border border-slate-200 bg-white p-6">
            <div className="text-sm font-semibold text-brand-text">School setup progress</div>
            <div className="mt-4 grid gap-3">
              {setupItems.map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-200 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold text-brand-text">{item.label}</div>
                    <div
                      className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] ${
                        item.ready ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {item.ready ? "Ready" : "Needs attention"}
                    </div>
                  </div>
                  <div className="mt-2 text-sm leading-6 text-brand-muted">{item.detail}</div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-text"
                href="/admin/schools"
              >
                Open school profile
              </Link>
              <Link
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-text"
                href="/admin/members"
              >
                Open members
              </Link>
            </div>
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
                <li>School Profile is where you connect the agent, upload the logo, and manage website publishing</li>
                <li>Members is where you add staff, edit access, and resend password emails</li>
                <li>Builder is where you write, review, and publish newsletters</li>
                <li>The website archive and feed update only after you publish</li>
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
                <li>Check the school setup progress before you hand the system to a school team</li>
                <li>Use the school profile to confirm the agent connection and website archive links</li>
                <li>Use the member page to make sure the right people can log in</li>
                <li>Once those are ready, the builder should be the main working screen</li>
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
