import type { NewsletterDocument } from "@/types/newsletter";

export function renderNewsletterHtml(document: NewsletterDocument) {
  const enabledSections = document.sections
    .filter((section) => section.enabled)
    .map(
      (section) => `
        <section data-type="${section.type}" style="margin-bottom:24px;padding:24px;border:1px solid #e5e7eb;border-radius:24px;background:#ffffff;">
          <h2 style="margin:0 0 12px;font-size:28px;">${escapeHtml(section.title)}</h2>
          <pre style="white-space:pre-wrap;font-family:Arial,sans-serif;color:#475569;">${escapeHtml(
            JSON.stringify(section.content, null, 2)
          )}</pre>
        </section>
      `
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(document.title)}</title>
      </head>
      <body style="margin:0;background:${document.organization.colors.background};color:${document.organization.colors.text};font-family:Arial,sans-serif;">
        <main style="max-width:1100px;margin:0 auto;padding:32px 20px;">
          <header style="margin-bottom:28px;padding:24px;border-radius:28px;background:#fff;">
            <h1 style="margin:0 0 12px;font-size:48px;">${escapeHtml(document.title)}</h1>
            <p style="margin:0;font-size:18px;line-height:1.7;">${escapeHtml(document.intro)}</p>
          </header>
          ${enabledSections}
        </main>
      </body>
    </html>
  `;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
