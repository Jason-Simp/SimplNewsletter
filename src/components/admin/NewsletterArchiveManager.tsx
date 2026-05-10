"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ActionNotice } from "@/components/ui/ActionNotice";
import { useAuthSession } from "@/lib/auth-client";
import { authFetch } from "@/lib/api-client";
import { canDeleteNewsletters } from "@/lib/member-access";
import { getNewsletterPdfPath, getNewsletterWebPath, getSchoolArchivePath } from "@/lib/public-links";
import type { MemberRecord } from "@/types/member";
import type { NewsletterDocument } from "@/types/newsletter";
import type { SchoolProfile } from "@/types/school";

export function NewsletterArchiveManager() {
  const { session, supabase } = useAuthSession();
  const [member, setMember] = useState<MemberRecord | null>(null);
  const [school, setSchool] = useState<SchoolProfile | null>(null);
  const [newsletters, setNewsletters] = useState<NewsletterDocument[]>([]);
  const [status, setStatus] = useState("Loading archive...");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "archived">("all");
  const [busyNewsletterId, setBusyNewsletterId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ message: string; tone: "success" | "error" | "info" } | null>(null);

  useEffect(() => {
    async function loadArchive() {
      if (!session?.user?.email) {
        return;
      }

      setStatus("Loading archive...");

      const memberResponse = await authFetch(supabase, "/api/members/me");
      const memberPayload = memberResponse.ok ? await memberResponse.json() : null;
      const nextMember = (memberPayload?.data ?? null) as MemberRecord | null;
      setMember(nextMember);

      if (!nextMember?.schoolId) {
        setSchool(null);
        setNewsletters([]);
        setStatus("No active school selected.");
        return;
      }

      const [schoolResponse, newslettersResponse] = await Promise.all([
        authFetch(supabase, "/api/schools"),
        authFetch(supabase, `/api/newsletters?schoolId=${encodeURIComponent(nextMember.schoolId)}&limit=250`)
      ]);

      const schoolsPayload = schoolResponse.ok ? await schoolResponse.json() : { data: [] };
      const newslettersPayload = newslettersResponse.ok ? await newslettersResponse.json() : { data: [] };
      const schools = (schoolsPayload.data ?? []) as SchoolProfile[];
      setSchool(schools.find((item) => item.id === nextMember.schoolId) ?? null);
      setNewsletters((newslettersPayload.data ?? []) as NewsletterDocument[]);
      setStatus("Archive loaded.");
    }

    void loadArchive();
  }, [session?.user?.email, supabase]);

  const canDelete = canDeleteNewsletters(member);
  const archiveIssues = useMemo(
    () =>
      newsletters
        .filter((newsletter) => newsletter.status === "published" || newsletter.status === "archived")
        .filter((newsletter) =>
          statusFilter === "all" ? true : newsletter.status === statusFilter
        )
        .filter((newsletter) => {
          const haystack = `${newsletter.title} ${newsletter.intro} ${newsletter.issueDate}`.toLowerCase();
          return haystack.includes(search.trim().toLowerCase());
        })
        .sort((left, right) => {
          const leftDate = left.publishedAt || left.issueDate || "";
          const rightDate = right.publishedAt || right.issueDate || "";
          return rightDate.localeCompare(leftDate);
        }),
    [newsletters, search, statusFilter]
  );

  const removeNewsletter = async (newsletter: NewsletterDocument) => {
    const confirmed = window.confirm(
      newsletter.status === "published"
        ? "Delete this published issue? It will be removed from the school archive and website."
        : "Delete this archived issue?"
    );

    if (!confirmed) {
      return;
    }

    const schoolId = newsletter.workspace.schoolId;

    if (!schoolId?.trim()) {
      setNotice({ message: "This newsletter is missing its school link and could not be deleted.", tone: "error" });
      return;
    }

    setBusyNewsletterId(newsletter.id);

    try {
      const response = await authFetch(
        supabase,
        `/api/newsletters?newsletterId=${encodeURIComponent(newsletter.id)}&schoolId=${encodeURIComponent(schoolId)}`,
        { method: "DELETE" }
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message ?? "The newsletter could not be deleted.");
      }

      setNewsletters((current) => current.filter((item) => item.id !== newsletter.id));
      setNotice({ message: "Newsletter removed from archive history.", tone: "success" });
    } catch (error) {
      setNotice({
        message: error instanceof Error ? error.message : "The newsletter could not be deleted.",
        tone: "error"
      });
    } finally {
      setBusyNewsletterId(null);
    }
  };

  return (
    <section className="grid gap-6">
      {notice ? <ActionNotice message={notice.message} onDismiss={() => setNotice(null)} tone={notice.tone} /> : null}
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">Archive</div>
        <h1 className="mt-2 font-display text-4xl text-brand-navy">Newsletter history</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-brand-muted">
          Find older issues, open public links, reuse good editions, and clean up archive history without
          hunting through the main dashboard.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[1.5fr_1fr_auto]">
        <label className="grid gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-brand-secondary">Search issues</span>
          <input
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-brand-text"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by title, intro, or date"
            value={search}
          />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-brand-secondary">Status</span>
          <select
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-brand-text"
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            value={statusFilter}
          >
            <option value="all">All archive issues</option>
            <option value="published">Published only</option>
            <option value="archived">Archived only</option>
          </select>
        </label>
        {school ? (
          <div className="grid content-end">
            <Link
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-text"
              href={getSchoolArchivePath(school.id)}
            >
              Open public archive
            </Link>
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl bg-[#F7F9FC] px-5 py-4 text-sm leading-6 text-brand-muted">
        {school ? `Showing archive history for ${school.name}.` : status}
      </div>

      {archiveIssues.length ? (
        <div className="grid gap-4">
          {archiveIssues.map((newsletter) => {
            const schoolId = newsletter.workspace.schoolId;
            const pdfSelected = newsletter.distributionOptions.some(
              (option) => option.channel === "pdf" && option.selected
            );
            const webSelected = newsletter.distributionOptions.some(
              (option) => option.channel === "web" && option.selected
            );

            return (
              <article key={newsletter.id} className="rounded-[24px] border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-[0.25em] text-brand-secondary">
                      {newsletter.issueDate || "No issue date"}
                    </div>
                    <div className="mt-3 text-2xl font-semibold text-brand-text">{newsletter.title}</div>
                    <div className="mt-2 text-sm leading-6 text-brand-muted">
                      {newsletter.intro || "No intro saved for this issue."}
                    </div>
                  </div>
                  <div
                    className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] ${
                      newsletter.status === "archived"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {newsletter.status}
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {webSelected && schoolId ? (
                    <Link
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-brand-text"
                      href={getNewsletterWebPath(schoolId, newsletter.id)}
                    >
                      Open issue
                    </Link>
                  ) : null}
                  <Link
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-brand-text"
                    href={`/builder?from=${newsletter.id}`}
                  >
                    Reuse issue
                  </Link>
                  {pdfSelected && schoolId ? (
                    <Link
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-brand-text"
                      href={getNewsletterPdfPath(schoolId, newsletter.id)}
                    >
                      PDF view
                    </Link>
                  ) : null}
                  {canDelete ? (
                    <button
                      className="rounded-full border border-red-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-red-700"
                      disabled={busyNewsletterId === newsletter.id}
                      onClick={() => void removeNewsletter(newsletter)}
                      type="button"
                    >
                      {busyNewsletterId === newsletter.id ? "Removing..." : "Delete"}
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[24px] bg-[#F7F9FC] p-5 text-sm leading-6 text-brand-muted">
          No archived or published issues matched this filter yet.
        </div>
      )}
    </section>
  );
}
