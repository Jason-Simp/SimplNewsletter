"use client";

import { useState } from "react";

import type { NewsletterDocument } from "@/types/newsletter";

type Props = {
  document: NewsletterDocument;
  onApplyIntro: (value: string) => void;
  onApplyTitle: (value: string) => void;
};

export function AgentPanel({ document, onApplyIntro, onApplyTitle }: Props) {
  const [prompt, setPrompt] = useState(
    "Write a polished school newsletter draft using the school voice and recent updates."
  );
  const [status, setStatus] = useState("Agent idle.");

  const generateDraft = async () => {
    try {
      setStatus("Generating with school agent...");
      const response = await fetch("/api/agent/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          schoolName: document.organization.name,
          agentId: document.workspace.agentId,
          encryptedProjectCode: document.workspace.encryptedProjectCode,
          prompt,
          sectionTypes: document.sections.filter((section) => section.enabled).map((section) => section.type)
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message ?? "Agent generation failed.");
      }

      if (payload.data?.title) {
        onApplyTitle(payload.data.title);
      }

      if (payload.data?.intro) {
        onApplyIntro(payload.data.intro);
      }

      setStatus("Agent draft received.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Agent generation failed.");
    }
  };

  const syncVector = async () => {
    try {
      setStatus("Syncing final newsletter to agent vector store...");
      const response = await fetch("/api/agent/vector-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          document
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message ?? "Vector sync failed.");
      }

      setStatus("Final newsletter synced to vector store.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Vector sync failed.");
    }
  };

  return (
    <section className="rounded-editorial border border-slate-200 bg-white p-6 shadow-editorial">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">
            School agent
          </p>
          <h2 className="mt-2 font-display text-3xl text-brand-navy">ElevenLabs generation and sync</h2>
        </div>
        <div className="rounded-full bg-brand-background px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-brand-primary">
          {status}
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-brand-text">Generation prompt</span>
          <textarea
            className="min-h-28 rounded-2xl border border-slate-200 px-4 py-3"
            onChange={(event) => setPrompt(event.target.value)}
            value={prompt}
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <button
            className="rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white"
            onClick={() => void generateDraft()}
            type="button"
          >
            Generate draft
          </button>
          <button
            className="rounded-full bg-brand-secondary px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white"
            onClick={() => void syncVector()}
            type="button"
          >
            Sync final to vector store
          </button>
        </div>

        <div className="rounded-[24px] bg-[#EAF2FB] p-4 text-sm leading-6 text-brand-muted">
          This assumes each school has a school-specific agent plus a vector project code already stored in
          workspace settings. The final published newsletter can be pushed back into that school context for
          later retrieval.
        </div>
      </div>
    </section>
  );
}
