import { NextResponse } from "next/server";

import { jsonApiError } from "@/lib/api-route";
import { saveNewsletter } from "@/lib/newsletter-repository";
import {
  getNewsletterPdfPath,
  getNewsletterWebPath,
  getSchoolArchivePath,
  toAbsoluteUrl
} from "@/lib/public-links";
import {
  assertSchoolScope,
  requireBuilderAccess,
  requireNewsletterPublishAccess,
  requireSignedInMember
} from "@/lib/server-auth";
import { serverConfig } from "@/lib/server-config";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { member } = await requireSignedInMember(request);
    requireBuilderAccess(member);
    requireNewsletterPublishAccess(member);
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

    assertSchoolScope(member, String(document?.workspace?.schoolId ?? ""));

    const saveResult = await saveNewsletter(
      {
        ...document,
        distributionOptions: payload?.distributionOptions ?? document.distributionOptions
      },
      { publish: true }
    );
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
    return jsonApiError("api.distribution.post", error, "The newsletter could not be published.");
  }
}
