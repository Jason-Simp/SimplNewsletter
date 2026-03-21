import type { NewsletterDocument } from "@/types/newsletter";

type Props = {
  document: NewsletterDocument;
};

export function AssistantEmbedPanel({ document }: Props) {
  const embedUrl = document.workspace.integrationEndpoint?.trim() ?? "";
  const hasEmbed = /^https?:\/\//i.test(embedUrl);

  return (
    <section className="rounded-editorial border border-slate-200 bg-white p-6 shadow-editorial">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">
            Assistant chat
          </p>
          <h2 className="mt-2 font-display text-3xl text-brand-navy">Talk to the school assistant</h2>
        </div>
        <div className="rounded-full bg-brand-background px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-brand-primary">
          {document.workspace.generationProvider}
        </div>
      </div>

      <p className="mt-4 text-sm leading-7 text-brand-muted">
        Use the school&apos;s configured assistant while you work. This chat is for guidance and drafting
        help alongside the builder. It does not automatically read the current page state.
      </p>

      {hasEmbed ? (
        <>
          <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200 bg-brand-background">
            <iframe
              allow="microphone; clipboard-write"
              className="h-[560px] w-full border-0 bg-white"
              referrerPolicy="strict-origin-when-cross-origin"
              src={embedUrl}
              title="School assistant embed"
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              className="rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white"
              href={embedUrl}
              rel="noreferrer"
              target="_blank"
            >
              Open assistant in new tab
            </a>
          </div>
        </>
      ) : (
        <div className="mt-6 rounded-[24px] bg-[#EAF2FB] p-5 text-sm leading-6 text-brand-muted">
          Add an integration or embed URL in school settings to load the assistant here. This can be an
          ElevenLabs embed, an OpenAI-hosted assistant surface, an n8n chat endpoint, or another provider
          embed page.
        </div>
      )}
    </section>
  );
}
