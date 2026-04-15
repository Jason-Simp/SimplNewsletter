import { NextResponse } from "next/server";

import { jsonApiError } from "@/lib/api-route";
import { syncContentToProvider } from "@/lib/integration-client";
import { saveNewsletter } from "@/lib/newsletter-repository";
import { renderNewsletterHtml } from "@/lib/render-html";
import { assertSchoolScope, requireBuilderAccess, requireSignedInMember } from "@/lib/server-auth";
import type { NewsletterDocument } from "@/types/newsletter";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { member } = await requireSignedInMember(request);
    requireBuilderAccess(member);
    const payload = (await request.json()) as { document: NewsletterDocument };
    const document = payload.document;
    assertSchoolScope(member, String(document?.workspace?.schoolId ?? ""));

    await saveNewsletter(document);

    const html = renderNewsletterHtml(document);
    const result = await syncContentToProvider({
      schoolName: document.organization.name,
      syncProvider: document.workspace.syncProvider,
      knowledgeProvider: document.workspace.knowledgeProvider,
      assistantReference: document.workspace.assistantReference,
      integrationEndpoint: document.workspace.integrationEndpoint,
      encryptedKnowledgeRef: document.workspace.encryptedKnowledgeRef,
      newsletterId: document.id,
      title: document.title,
      html,
      summary: document.intro,
      metadata: {
        distributionOptions: document.distributionOptions,
        issueDate: document.issueDate
      }
    });

    return NextResponse.json({
      status: "ok",
      data: result
    });
  } catch (error) {
    return jsonApiError("api.agent.vector-sync.post", error, "The newsletter archive sync could not finish.");
  }
}
