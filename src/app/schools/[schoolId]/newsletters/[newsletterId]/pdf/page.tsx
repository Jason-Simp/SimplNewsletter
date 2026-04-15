import { notFound } from "next/navigation";

import { NewsletterPreview } from "@/components/newsletter/NewsletterPreview";
import { PdfPrintBar } from "@/components/newsletter/PdfPrintBar";
import { getNewsletterById } from "@/lib/newsletter-repository";

export default async function PublicNewsletterPdfPage({
  params,
  searchParams
}: {
  params: { schoolId: string; newsletterId: string };
  searchParams?: { print?: string };
}) {
  const document = await getNewsletterById(params.newsletterId, params.schoolId);

  if (!document) {
    notFound();
  }

  const pdfSelected = document.distributionOptions.some(
    (option) => option.channel === "pdf" && option.selected
  );

  if (!pdfSelected) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#F7F9FC_0%,#EAF2FB_100%)] px-4 py-8 print:bg-white print:px-0 print:py-0 lg:px-8">
      <div className="mx-auto max-w-6xl print:max-w-none">
        <PdfPrintBar autoPrint={searchParams?.print === "1"} />
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
