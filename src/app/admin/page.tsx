"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { ActionNotice } from "@/components/ui/ActionNotice";
import { authFetch } from "@/lib/api-client";
import { useAuthSession } from "@/lib/auth-client";
import { isCompanyAdmin } from "@/lib/member-access";
import { getNewsletterPdfPath, getNewsletterWebPath, getSchoolArchivePath } from "@/lib/public-links";
import type { MemberRecord } from "@/types/member";
import type { NewsletterDocument } from "@/types/newsletter";
import type { SchoolProfile } from "@/types/school";

export default function AdminPage() {
  const { session, supabase } = useAuthSession();
  const [member, setMember] = useState<MemberRecord | null>(null);
  const [schools, setSchools] = useState<SchoolProfile[]>([]);
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [newsletters, setNewsletters] = useState<NewsletterDocument[]>([]);
  const [notice, setNotice] = useState<{ message: string; tone: "success" | "error" | "info" } | null>(null);
  const [busyNewsletterId, setBusyNewsletterId] = useState<string | null>(null);

  useEffect(() => {
    async function loadMember() {
      if (!session?.user?.email) {
        return;
      }

      const response = await authFetch(supabase, "/api/members/me");
      const payload = response.ok ? await response.json() : null;
      setMember(payload?.data ?? null);
    }

    void loadMember();
  }, [session?.user?.email, supabase]);

  useEffect(() => {
    async function loadDashboardData() {
      const [schoolsResponse, membersResponse, newslettersResponse] = await Promise.all([
        authFetch(supabase, "/api/schools"),
        authFetch(supabase, "/api/members"),
        authFetch(supabase, "/api/newsletters")
      ]);

      const schoolsPayload = schoolsResponse.ok ? await schoolsResponse.json() : { data: [] };
      const membersPayload = membersResponse.ok ? await membersResponse.json() : { data: [] };
      const newslettersPayload = newslettersResponse.ok ? await newslettersResponse.json() : { data: [] };

      setSchools((schoolsPayload.data ?? []) as SchoolProfile[]);
      setMembers((membersPayload.data ?? []) as MemberRecord[]);
      setNewsletters((newslettersPayload.data ?? []) as NewsletterDocument[]);
    }

    void loadDashboardData();
  }, [supabase]);

  const companyView = isCompanyAdmin(member);
  const currentSchool =
    companyView
      ? null
      : schools.find((school) => school.id === member?.schoolId) ?? schools[0] ?? null;
  const currentSchoolMembers = members.filter((item) => item.schoolId === currentSchool?.id);
  const currentSchoolAdmins = currentSchoolMembers.filter((item) => item.role === "school_admin");
  const recentDraftIssues = newsletters
    .filter((newsletter) => {
      if (newsletter.status !== "draft") {
        return false;
      }

      if (companyView) {
        return true;
      }

      return newsletter.workspace.schoolId === currentSchool?.id;
    })
    .sort((left, right) => {
      const leftDate = left.issueDate || "";
      const rightDate = right.issueDate || "";
      return rightDate.localeCompare(leftDate);
    })
    .slice(0, 3);
  const recentPublishedIssues = newsletters
    .filter((newsletter) => {
      if (newsletter.status !== "published") {
        return false;
      }

      if (companyView) {
        return true;
      }

      return newsletter.workspace.schoolId === currentSchool?.id;
    })
    .sort((left, right) => {
      const leftDate = left.publishedAt || left.issueDate || "";
      const rightDate = right.publishedAt || right.issueDate || "";
      return rightDate.localeCompare(leftDate);
    })
    .slice(0, 3);
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

  const showNotice = (message: string, tone: "success" | "error" | "info") => {
    setNotice({ message, tone });
  };

  const removeNewsletter = async (newsletter: NewsletterDocument) => {
    const confirmed = window.confirm(
      newsletter.status === "published"
        ? "Delete this published issue? It will be removed from the school archive and website."
        : "Delete this draft?"
    );

    if (!confirmed) {
      return;
    }

    const schoolId = newsletter.workspace.schoolId;

    if (!schoolId) {
      showNotice("This newsletter is missing its school link and could not be deleted.", "error");
      return;
    }

    setBusyNewsletterId(newsletter.id);

    try {
      const response = await authFetch(
        supabase,
        `/api/newsletters?newsletterId=${encodeURIComponent(newsletter.id)}&schoolId=${encodeURIComponent(schoolId)}`,
        {
          method: "DELETE"
        }
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message ?? "The newsletter could not be deleted.");
      }

      setNewsletters((current) => current.filter((item) => item.id !== newsletter.id));
      showNotice(
        newsletter.status === "published"
          ? "Published issue removed from the archive."
          : "Draft deleted.",
        "success"
      );
    } catch (error) {
      showNotice(
        error instanceof Error ? error.message : "The newsletter could not be deleted.",
        "error"
      );
    } finally {
      setBusyNewsletterId(null);
    }
  };

  return (
    <section className="grid gap-6">
      {notice ? <ActionNotice message={notice.message} onDismiss={() => setNotice(null)} tone={notice.tone} /> : null}
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
                href="/builder?fresh=1"
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

      {!companyView ? (
        <section className="rounded-editorial border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-brand-text">Recent drafts</div>
              <div className="mt-2 text-sm leading-6 text-brand-muted">
                Jump back into unfinished work without hunting through the builder. This is the fastest way to keep moving on an issue you already started.
              </div>
            </div>
            <Link
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-text"
              href="/builder?fresh=1"
            >
              Start a fresh issue
            </Link>
          </div>

          {recentDraftIssues.length ? (
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {recentDraftIssues.map((newsletter) => {
                const sectionCount = newsletter.sections.filter((section) => section.enabled).length;
                const photoSelected = newsletter.sections.some((section) => {
                  if (section.type === "hero" && typeof (section.content as { heroImage?: unknown }).heroImage === "string") {
                    return Boolean((section.content as { heroImage: string }).heroImage);
                  }

                  if (
                    section.type === "top_story" &&
                    typeof (section.content as { image?: unknown }).image === "string"
                  ) {
                    return Boolean((section.content as { image: string }).image);
                  }

                  return false;
                });

                return (
                  <article key={newsletter.id} className="rounded-[24px] border border-slate-200 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs font-bold uppercase tracking-[0.25em] text-brand-secondary">
                        Draft
                      </div>
                      <div className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-700">
                        In progress
                      </div>
                    </div>
                    <div className="mt-3 text-lg font-semibold text-brand-text">{newsletter.title}</div>
                    <div className="mt-2 text-sm leading-6 text-brand-muted">
                      {newsletter.intro || "Still being prepared."}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-brand-muted">
                      <span className="rounded-full bg-[#F7F9FC] px-3 py-1">{sectionCount} sections</span>
                      <span className="rounded-full bg-[#F7F9FC] px-3 py-1">{photoSelected ? "Images added" : "No images yet"}</span>
                      <span className="rounded-full bg-[#F7F9FC] px-3 py-1">{formatDisplayDate(newsletter.issueDate)}</span>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <Link
                        className="rounded-full bg-brand-primary px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white"
                        href={`/builder?draft=${newsletter.id}`}
                      >
                        Continue draft
                      </Link>
                      <Link
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-brand-text"
                        href={`/builder?from=${newsletter.id}`}
                      >
                        Copy as new draft
                      </Link>
                      <button
                        className="rounded-full border border-red-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-red-700"
                        disabled={busyNewsletterId === newsletter.id}
                        onClick={() => void removeNewsletter(newsletter)}
                        type="button"
                      >
                        {busyNewsletterId === newsletter.id ? "Deleting..." : "Delete draft"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-6 rounded-[24px] bg-[#F7F9FC] p-5 text-sm leading-6 text-brand-muted">
              No saved drafts yet. Once someone starts a newsletter and it autosaves, it will appear here so the team can jump back into it.
            </div>
          )}
        </section>
      ) : null}

      {!companyView ? (
        <section className="rounded-editorial border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-brand-text">Recently published</div>
              <div className="mt-2 text-sm leading-6 text-brand-muted">
                This gives school admins a quick way to confirm what is already live on the website and in the archive.
              </div>
            </div>
            {currentSchool ? (
              <Link
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-text"
                href={getSchoolArchivePath(currentSchool.id)}
              >
                Open archive
              </Link>
            ) : null}
          </div>

          {recentPublishedIssues.length ? (
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {recentPublishedIssues.map((newsletter) => {
                const schoolId = newsletter.workspace.schoolId || currentSchool?.id;
                const pdfSelected = newsletter.distributionOptions.some(
                  (option) => option.channel === "pdf" && option.selected
                );

                return (
                  <article key={newsletter.id} className="rounded-[24px] border border-slate-200 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs font-bold uppercase tracking-[0.25em] text-brand-secondary">
                        Published
                      </div>
                      <div className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">
                        Live
                      </div>
                    </div>
                    <div className="mt-3 text-lg font-semibold text-brand-text">{newsletter.title}</div>
                    <div className="mt-2 text-sm leading-6 text-brand-muted">
                      {formatDisplayDate(newsletter.publishedAt || newsletter.issueDate)}
                    </div>
                    <div className="mt-4 text-sm leading-6 text-brand-muted">
                      {newsletter.intro || "Published to the school archive."}
                    </div>
                    {schoolId ? (
                      <div className="mt-5 flex flex-wrap gap-2">
                        <Link
                          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-brand-text"
                          href={getNewsletterWebPath(schoolId, newsletter.id)}
                        >
                          Open issue
                        </Link>
                        <Link
                          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-brand-text"
                          href={`/builder?from=${newsletter.id}`}
                        >
                          Reuse issue
                        </Link>
                        {pdfSelected ? (
                          <Link
                            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-brand-text"
                            href={getNewsletterPdfPath(schoolId, newsletter.id)}
                          >
                            PDF view
                          </Link>
                        ) : null}
                        <button
                          className="rounded-full border border-red-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-red-700"
                          disabled={busyNewsletterId === newsletter.id}
                          onClick={() => void removeNewsletter(newsletter)}
                          type="button"
                        >
                          {busyNewsletterId === newsletter.id ? "Removing..." : "Delete issue"}
                        </button>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-6 rounded-[24px] bg-[#F7F9FC] p-5 text-sm leading-6 text-brand-muted">
              No published issues yet. Once a newsletter is published, this dashboard will show the latest live issues here.
            </div>
          )}
        </section>
      ) : null}
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

function formatDisplayDate(value?: string | null) {
  if (!value) {
    return "Recently published";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}
