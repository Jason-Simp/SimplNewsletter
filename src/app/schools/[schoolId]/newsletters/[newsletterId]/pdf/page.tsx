import { notFound } from "next/navigation";

import { NewsletterPreview } from "@/components/newsletter/NewsletterPreview";
import { PdfPrintBar } from "@/components/newsletter/PdfPrintBar";
import { getNewsletterById } from "@/lib/newsletter-repository";

export default async function PublicNewsletterPdfPage({
  params,
  searchParams
}: {
  params: Promise<{ schoolId: string; newsletterId: string }>;
  searchParams?: Promise<{ print?: string }>;
}) {
  const { schoolId, newsletterId } = await params;
  const query = searchParams ? await searchParams : undefined;
  const document = await getNewsletterById(newsletterId, schoolId);

  if (!document) {
    notFound();
  }

  const pdfSelected = document.distributionOptions.some(
    (option) => option.channel === "pdf" && option.selected
  );

  if (document.status !== "published" || !pdfSelected) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#F7F9FC_0%,#EAF2FB_100%)] px-4 py-8 print:bg-white print:px-0 print:py-0 lg:px-8">
      <div className="mx-auto max-w-6xl print:max-w-none">
        <PdfPrintBar autoPrint={query?.print === "1"} />
        <NewsletterPreview
          channel="pdf"
          chrome="public"
          document={document}
          onChannelChange={() => {}}
        />
      </div>
    </main>
  );
}
