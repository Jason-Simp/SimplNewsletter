import { NextResponse } from "next/server";

import { saveNewsletter } from "@/lib/newsletter-repository";
import {
  getNewsletterPdfPath,
  getNewsletterWebPath,
  getSchoolArchivePath,
  toAbsoluteUrl
} from "@/lib/public-links";
import { serverConfig } from "@/lib/server-config";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const document = payload?.document;
    const selectedChannels = Array.isArray(payload?.distributionOptions)
      ? payload.distributionOptions
          .filter((option: { selected?: boolean }) => option?.selected)
          .map((option: { channel?: string }) => option.channel)
          .filter(Boolean)
      : [];

    if (!document) {
      throw new Error("Newsletter document is missing.");
    }

    const saveResult = await saveNewsletter({
      ...document,
      distributionOptions: payload?.distributionOptions ?? document.distributionOptions
    });
    const savedDocument = saveResult.newsletter;
    const schoolId = savedDocument.workspace.schoolId;
    const newsletterId = savedDocument.id;
    const archivePath = schoolId ? getSchoolArchivePath(schoolId) : undefined;
    const websitePath =
      schoolId && newsletterId && selectedChannels.includes("web")
        ? getNewsletterWebPath(schoolId, newsletterId)
        : undefined;
    const pdfPath =
      schoolId && newsletterId && selectedChannels.includes("pdf")
        ? getNewsletterPdfPath(schoolId, newsletterId, true)
        : undefined;

    return NextResponse.json(
      {
        status: "ok",
        message: "Newsletter publishing settings saved.",
        data: savedDocument,
        publishedToWebsite: selectedChannels.includes("web"),
        pdfSelected: selectedChannels.includes("pdf"),
        archivePath,
        websitePath,
        pdfPath,
        archiveUrl: archivePath ? toAbsoluteUrl(archivePath, serverConfig.renderExternalUrl) : null,
        websiteUrl: websitePath ? toAbsoluteUrl(websitePath, serverConfig.renderExternalUrl) : null,
        pdfUrl: pdfPath ? toAbsoluteUrl(pdfPath, serverConfig.renderExternalUrl) : null
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Webhook delivery failed."
      },
      { status: 500 }
    );
  }
}
