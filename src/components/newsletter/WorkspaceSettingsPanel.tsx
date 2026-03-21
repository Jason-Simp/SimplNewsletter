import { publishModeOptions } from "@/lib/product-config";
import type { NewsletterDocument, PublishMode } from "@/types/newsletter";

type Props = {
  document: NewsletterDocument;
  onPublishModeChange: (mode: PublishMode) => void;
  onVectorProviderChange: (provider: NewsletterDocument["workspace"]["vectorProvider"]) => void;
  onProjectCodeChange: (value: string) => void;
  onAgentIdChange: (value: string) => void;
};

export function WorkspaceSettingsPanel({
  document,
  onAgentIdChange,
  onPublishModeChange,
  onVectorProviderChange,
  onProjectCodeChange
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
            <span className="text-sm font-semibold text-brand-text">Vector provider</span>
            <select
              className="rounded-2xl border border-slate-200 px-4 py-3"
              onChange={(event) =>
                onVectorProviderChange(
                  event.target.value as NewsletterDocument["workspace"]["vectorProvider"]
                )
              }
              value={document.workspace.vectorProvider}
            >
              <option value="supabase">Supabase vector store</option>
              <option value="openai">OpenAI vector store</option>
              <option value="elevenlabs">ElevenLabs knowledge base</option>
              <option value="none">None yet</option>
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-brand-text">11labs agent ID</span>
            <input
              className="rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-brand-primary/20 focus:ring"
              onChange={(event) => onAgentIdChange(event.target.value)}
              placeholder="agent_..."
              value={document.workspace.agentId ?? ""}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-brand-text">Encrypted project code</span>
            <input
              className="rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-brand-primary/20 focus:ring"
              onChange={(event) => onProjectCodeChange(event.target.value)}
              placeholder="enc_proj_..."
              value={document.workspace.encryptedProjectCode}
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
