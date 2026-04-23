import { listNewsletters } from "@/lib/newsletter-repository";
import { serverConfig } from "@/lib/server-config";

export async function GET(
  request: Request,
  { params }: { params: { schoolId: string } }
) {
  const newsletters = await listNewsletters(params.schoolId);
  const publishedNewsletters = newsletters.filter((newsletter) =>
    newsletter.status === "published" &&
    newsletter.distributionOptions.some((option) => option.channel === "web" && option.selected)
  );
  const schoolName = newsletters[0]?.organization.name ?? "School";
  const siteUrl = (serverConfig.renderExternalUrl || new URL(request.url).origin).replace(
    /\/$/,
    ""
  );
  const feedUrl = `${siteUrl}/schools/${params.schoolId}/feed`;

  const items = publishedNewsletters
    .map((newsletter) => {
      const link = `${siteUrl}/schools/${params.schoolId}/newsletters/${newsletter.id}`;
      const description = escapeXml(newsletter.intro || newsletter.previewText || newsletter.title);
      const pubDate = newsletter.publishedAt
        ? new Date(newsletter.publishedAt).toUTCString()
        : new Date().toUTCString();

      return `
        <item>
          <title>${escapeXml(newsletter.title)}</title>
          <link>${escapeXml(link)}</link>
          <guid>${escapeXml(link)}</guid>
          <description>${description}</description>
          <pubDate>${pubDate}</pubDate>
        </item>
      `.trim();
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(`${schoolName} newsletters`)}</title>
    <link>${escapeXml(feedUrl)}</link>
    <description>${escapeXml(`Hosted newsletter feed for ${schoolName}`)}</description>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "s-maxage=300, stale-while-revalidate=3600"
    }
  });
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
