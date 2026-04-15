import { notFound } from "next/navigation";

import { NewsletterPreview } from "@/components/newsletter/NewsletterPreview";
import { getNewsletterPdfPath } from "@/lib/public-links";
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

  if (!websiteSelected) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#F7F9FC_0%,#EAF2FB_100%)] px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 rounded-[28px] border border-slate-200 bg-white px-6 py-5 shadow-editorial">
          <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">
            Hosted newsletter
          </div>
          <h1 className="mt-2 font-display text-4xl text-brand-navy">{document.title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-brand-muted">
            {document.organization.name} newsletter hosted by The Wire by SchoolAmplified.
          </p>
          {pdfSelected ? (
            <div className="mt-5">
              <a
                className="inline-flex rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-text"
                href={getNewsletterPdfPath(params.schoolId, params.newsletterId, true)}
                rel="noreferrer"
                target="_blank"
              >
                Open PDF view
              </a>
            </div>
          ) : null}
        </div>

        <NewsletterPreview
          channel="web"
          chrome="public"
          document={document}
          onChannelChange={() => {}}
        />
      </div>
    </main>
  );
}
