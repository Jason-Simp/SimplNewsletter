import { NextResponse } from "next/server";

import { syncContentToProvider } from "@/lib/integration-client";
import { saveNewsletter } from "@/lib/newsletter-repository";
import { renderNewsletterHtml } from "@/lib/render-html";
import type { NewsletterDocument } from "@/types/newsletter";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { document: NewsletterDocument };
    const document = payload.document;

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
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Vector sync failed."
      },
      { status: 500 }
    );
  }
}
