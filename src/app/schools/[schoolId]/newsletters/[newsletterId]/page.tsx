import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { NewsletterPreview } from "@/components/newsletter/NewsletterPreview";
import { getNewsletterPdfPath, getSchoolArchivePath } from "@/lib/public-links";
import { getNewsletterById } from "@/lib/newsletter-repository";

export default async function PublicNewsletterPage({
  params
}: {
  params: { schoolId: string; newsletterId: string };
}) {
  const document = await getNewsletterById(params.newsletterId, params.schoolId);

  if (!document) {
    notFound();
  }

  const websiteSelected = document.distributionOptions.some(
    (option) => option.channel === "web" && option.selected
  );
  const pdfSelected = document.distributionOptions.some(
    (option) => option.channel === "pdf" && option.selected
  );

  if ((document.status !== "published" && document.status !== "archived") || !websiteSelected) {
    notFound();
  }

  const publishedLabel = document.publishedAt
    ? new Date(document.publishedAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
      })
    : document.issueDate;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#F7F9FC_0%,#EAF2FB_100%)] px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-editorial">
          <div className="border-b border-slate-200 px-6 py-6 lg:px-8">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-28 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <Image
                    alt={`${document.organization.name} logo`}
                    className="h-full w-full object-contain"
                    height={64}
                    src={document.organization.logoUrl}
                    width={112}
                  />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">
                    Hosted newsletter
                  </div>
                  <h1 className="mt-2 font-display text-4xl text-brand-navy lg:text-5xl">{document.title}</h1>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-brand-muted">
                    Published by {document.organization.name}. This hosted version is the same issue used in the
                    school archive and website feed.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 rounded-[24px] bg-[#F7F9FC] p-4 text-sm text-brand-muted">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.22em] text-brand-secondary">Published</div>
                  <div className="mt-1 font-semibold text-brand-text">{publishedLabel}</div>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.22em] text-brand-secondary">Contact</div>
                  <div className="mt-1 font-semibold text-brand-text">{document.organization.contactEmail}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 bg-[#F7F9FC] px-6 py-5 md:grid-cols-[1.2fr_0.8fr] lg:px-8">
            <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-brand-secondary">Issue summary</div>
              <div className="mt-2 text-sm leading-6 text-brand-text">{document.intro}</div>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-brand-secondary">Next actions</div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-brand-text"
                  href={getSchoolArchivePath(params.schoolId)}
                >
                  Back to archive
                </Link>
                {document.organization.websiteUrl ? (
                  <a
                    className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-brand-text"
                    href={document.organization.websiteUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    School website
                  </a>
                ) : null}
                {pdfSelected ? (
                  <a
                    className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-brand-text"
                    href={getNewsletterPdfPath(params.schoolId, params.newsletterId, true)}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Open PDF view
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6">
          <NewsletterPreview
            channel="web"
            chrome="public"
            document={document}
            onChannelChange={() => {}}
          />
        </div>
      </div>
    </main>
  );
}
