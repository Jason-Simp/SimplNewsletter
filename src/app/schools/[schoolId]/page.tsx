import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getNewsletterPdfPath } from "@/lib/public-links";
import { listNewsletters } from "@/lib/newsletter-repository";

export default async function SchoolArchivePage({
  params
}: {
  params: { schoolId: string };
}) {
  const newsletters = await listNewsletters(params.schoolId);
  const publishedNewsletters = newsletters.filter((newsletter) =>
    newsletter.status === "published" &&
    newsletter.distributionOptions.some((option) => option.channel === "web" && option.selected)
  );
  const school = newsletters[0]?.organization;
  const schoolName = school?.name;

  if (!schoolName) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#F7F9FC_0%,#EAF2FB_100%)] px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-editorial">
          <div className="text-xs font-bold uppercase tracking-[0.24em] text-brand-secondary">
            Public school archive
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-brand-text"
              href="/"
            >
              Home
            </Link>
            <Link
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-brand-text"
              href="/login"
            >
              Member login
            </Link>
            {school?.websiteUrl ? (
              <a
                className="rounded-full bg-brand-primary px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white"
                href={school.websiteUrl}
                rel="noreferrer"
                target="_blank"
              >
                School website
              </a>
            ) : null}
          </div>
        </div>

        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-editorial">
          <div className="flex flex-wrap items-center justify-between gap-6 border-b border-slate-200 px-6 py-6 lg:px-8">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-28 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <Image
                  alt={`${schoolName} logo`}
                  className="h-full w-full object-contain"
                  height={64}
                  src={school?.logoUrl || "/brand/the-wire-logo.svg"}
                  width={112}
                />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">
                  School archive
                </div>
                <h1 className="mt-2 font-display text-4xl text-brand-navy lg:text-5xl">{schoolName}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-muted">
                  Published newsletters from {schoolName}. Families and staff can use this page to read past
                  issues, and website teams can pull the RSS feed from the same archive.
                </p>
              </div>
            </div>
            <div className="grid gap-3 rounded-[24px] bg-[#F7F9FC] p-4 text-sm text-brand-muted">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-brand-secondary">Website</div>
                <a className="mt-1 block font-semibold text-brand-text" href={school?.websiteUrl || "#"}>
                  {school?.websiteUrl || "School website"}
                </a>
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-brand-secondary">Contact</div>
                <div className="mt-1 font-semibold text-brand-text">{school?.contactEmail || "No contact email"}</div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 bg-[#F7F9FC] px-6 py-5 text-sm text-brand-muted md:grid-cols-3 lg:px-8">
            <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-brand-secondary">Published issues</div>
              <div className="mt-2 text-3xl font-bold text-brand-navy">{publishedNewsletters.length}</div>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-brand-secondary">Audience</div>
              <div className="mt-2 text-sm leading-6 text-brand-text">
                Families, staff, and community members can browse published updates here.
              </div>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-brand-secondary">Archive use</div>
              <div className="mt-2 text-sm leading-6 text-brand-text">
                Use this page as the public history of school newsletters and website posts.
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4">
          {publishedNewsletters.map((newsletter) => (
            <article
              key={newsletter.id}
              className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-editorial"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">
                    {newsletter.issueDate}
                  </div>
                  <h2 className="mt-3 font-display text-3xl text-brand-navy">{newsletter.title}</h2>
                </div>
                <div className="rounded-full bg-brand-background px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-primary">
                  Published
                </div>
              </div>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-brand-muted">{newsletter.intro}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  className="inline-flex rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white"
                  href={`/schools/${params.schoolId}/newsletters/${newsletter.id}`}
                >
                  Read newsletter
                </Link>
                {newsletter.distributionOptions.some(
                  (option) => option.channel === "pdf" && option.selected
                ) ? (
                  <Link
                    className="inline-flex rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-text"
                    href={getNewsletterPdfPath(params.schoolId, newsletter.id, true)}
                    target="_blank"
                  >
                    PDF view
                  </Link>
                ) : null}
              </div>
            </article>
          ))}

          {publishedNewsletters.length === 0 ? (
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-editorial">
              <h2 className="text-xl font-semibold text-brand-text">No website newsletters yet</h2>
              <p className="mt-2 text-sm leading-6 text-brand-muted">
                Once a newsletter is published to the school website, it will appear here and in the RSS
                feed.
              </p>
            </section>
          ) : null}
        </section>
      </div>
    </main>
  );
}
