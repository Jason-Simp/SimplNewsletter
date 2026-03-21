import { publishModeOptions } from "@/lib/product-config";
import type { NewsletterDocument, PublishMode } from "@/types/newsletter";

type Props = {
  document: NewsletterDocument;
  onPublishModeChange: (mode: PublishMode) => void;
  onGenerationProviderChange: (provider: NewsletterDocument["workspace"]["generationProvider"]) => void;
  onKnowledgeProviderChange: (provider: NewsletterDocument["workspace"]["knowledgeProvider"]) => void;
  onSyncProviderChange: (provider: NewsletterDocument["workspace"]["syncProvider"]) => void;
  onKnowledgeRefChange: (value: string) => void;
  onAssistantReferenceChange: (value: string) => void;
  onIntegrationEndpointChange: (value: string) => void;
};

export function WorkspaceSettingsPanel({
  document,
  onAssistantReferenceChange,
  onGenerationProviderChange,
  onIntegrationEndpointChange,
  onKnowledgeProviderChange,
  onKnowledgeRefChange,
  onPublishModeChange,
  onSyncProviderChange
}: Props) {
  return (
    <section className="rounded-editorial border border-slate-200 bg-white p-6 shadow-editorial">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">
            Workspace settings
          </p>
          <h2 className="mt-2 font-display text-3xl text-brand-navy">School-level controls</h2>
        </div>
        <div className="rounded-full bg-brand-background px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-brand-primary">
          Standalone app
        </div>
      </div>

      <div className="mt-6 grid gap-6">
        <div className="grid gap-3">
          <div className="text-sm font-semibold text-brand-text">Publishing behavior</div>
          <div className="grid gap-3 md:grid-cols-2">
            {publishModeOptions.map((option) => {
              const selected = document.workspace.publishMode === option.value;

              return (
                <button
                  key={option.value}
                  className={`rounded-[24px] border p-4 text-left ${
                    selected ? "border-brand-primary bg-brand-background" : "border-slate-200"
                  }`}
                  onClick={() => onPublishModeChange(option.value)}
                  type="button"
                >
                  <div className="text-sm font-semibold text-brand-text">{option.label}</div>
                  <div className="mt-1 text-sm leading-6 text-brand-muted">{option.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-brand-text">Rewrite provider</span>
            <select
              className="rounded-2xl border border-slate-200 px-4 py-3"
              onChange={(event) =>
                onGenerationProviderChange(
                  event.target.value as NewsletterDocument["workspace"]["generationProvider"]
                )
              }
              value={document.workspace.generationProvider}
            >
              <option value="elevenlabs">ElevenLabs</option>
              <option value="openai">OpenAI</option>
              <option value="n8n">n8n</option>
              <option value="custom">Custom bridge</option>
              <option value="none">Manual only</option>
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-brand-text">Knowledge provider</span>
            <select
              className="rounded-2xl border border-slate-200 px-4 py-3"
              onChange={(event) =>
                onKnowledgeProviderChange(
                  event.target.value as NewsletterDocument["workspace"]["knowledgeProvider"]
                )
              }
              value={document.workspace.knowledgeProvider}
            >
              <option value="supabase">Supabase vector store</option>
              <option value="openai">OpenAI vector store</option>
              <option value="elevenlabs">ElevenLabs knowledge base</option>
              <option value="n8n">n8n workflow</option>
              <option value="custom">Custom bridge</option>
              <option value="none">None yet</option>
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-brand-text">Sync provider</span>
            <select
              className="rounded-2xl border border-slate-200 px-4 py-3"
              onChange={(event) =>
                onSyncProviderChange(
                  event.target.value as NewsletterDocument["workspace"]["syncProvider"]
                )
              }
              value={document.workspace.syncProvider}
            >
              <option value="elevenlabs">ElevenLabs</option>
              <option value="openai">OpenAI</option>
              <option value="supabase">Supabase</option>
              <option value="n8n">n8n</option>
              <option value="custom">Custom bridge</option>
              <option value="none">No sync</option>
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-brand-text">Assistant reference</span>
            <input
              className="rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-brand-primary/20 focus:ring"
              onChange={(event) => onAssistantReferenceChange(event.target.value)}
              placeholder="Agent ID, assistant key, or workflow reference"
              value={document.workspace.assistantReference ?? ""}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-brand-text">Integration endpoint</span>
            <input
              className="rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-brand-primary/20 focus:ring"
              onChange={(event) => onIntegrationEndpointChange(event.target.value)}
              placeholder="Optional bridge or workflow endpoint"
              value={document.workspace.integrationEndpoint ?? ""}
            />
          </label>

          <label className="grid gap-2 md:col-span-2">
            <span className="text-sm font-semibold text-brand-text">Encrypted knowledge reference</span>
            <input
              className="rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-brand-primary/20 focus:ring"
              onChange={(event) => onKnowledgeRefChange(event.target.value)}
              placeholder="Encrypted vector, knowledge base, or workflow reference"
              value={document.workspace.encryptedKnowledgeRef}
            />
          </label>
        </div>

        <div className="rounded-[24px] bg-[#EAF2FB] p-5">
          <div className="text-sm font-semibold text-brand-text">Retention and user model</div>
          <div className="mt-2 text-sm leading-6 text-brand-muted">
            Archive uploaded content and newsletter artifacts for {document.workspace.archiveDays} days,
            then delete them automatically. Schools manage their own users inside the workspace, and the
            same login policy can support either instant publish or optional approval routing.
          </div>
        </div>

        <div className="grid gap-3">
          <div className="text-sm font-semibold text-brand-text">Media policy</div>
          <div className="grid gap-3">
            {document.workspace.mediaConstraints.map((constraint) => (
              <div key={constraint.type} className="rounded-2xl border border-slate-200 px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm font-semibold capitalize text-brand-text">{constraint.type}</div>
                  <div className="text-xs font-bold uppercase tracking-[0.2em] text-brand-secondary">
                    Max {constraint.maxSizeMb} MB
                  </div>
                </div>
                <div className="mt-2 text-sm leading-6 text-brand-muted">
                  {constraint.extensions.join(", ")}
                </div>
                {constraint.notes ? (
                  <div className="mt-2 text-sm leading-6 text-brand-muted">{constraint.notes}</div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
