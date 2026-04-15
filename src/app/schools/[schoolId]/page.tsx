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
    newsletter.distributionOptions.some((option) => option.channel === "web" && option.selected)
  );
  const schoolName = newsletters[0]?.organization.name;

  if (!schoolName) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#F7F9FC_0%,#EAF2FB_100%)] px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-editorial">
          <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">
            School archive
          </div>
          <h1 className="mt-2 font-display text-5xl text-brand-navy">{schoolName}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-brand-muted">
            This archive shows the newsletters that have been published to the school website feed.
          </p>
        </section>

        <section className="mt-6 grid gap-4">
          {publishedNewsletters.map((newsletter) => (
            <article
              key={newsletter.id}
              className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-editorial"
            >
              <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">
                {newsletter.issueDate}
              </div>
              <h2 className="mt-3 font-display text-3xl text-brand-navy">{newsletter.title}</h2>
              <p className="mt-3 text-sm leading-7 text-brand-muted">{newsletter.intro}</p>
              <Link
                className="mt-5 inline-flex rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white"
                href={`/schools/${params.schoolId}/newsletters/${newsletter.id}`}
              >
                Open newsletter
              </Link>
              {newsletter.distributionOptions.some(
                (option) => option.channel === "pdf" && option.selected
              ) ? (
                <Link
                  className="mt-5 ml-3 inline-flex rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-text"
                  href={getNewsletterPdfPath(params.schoolId, newsletter.id, true)}
                  target="_blank"
                >
                  PDF view
                </Link>
              ) : null}
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
