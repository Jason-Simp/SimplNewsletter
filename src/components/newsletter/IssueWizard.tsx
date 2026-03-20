"use client";

import { useEffect, useRef, useState } from "react";

import { buildSteps, sampleNewsletter } from "@/lib/sample-data";
import type { Channel, PublishMode } from "@/types/newsletter";
import { AgentPanel } from "@/components/newsletter/AgentPanel";
import { DistributionPanel } from "@/components/newsletter/DistributionPanel";
import { DistributionSelector } from "@/components/newsletter/DistributionSelector";
import { MediaUploadPanel } from "@/components/newsletter/MediaUploadPanel";
import { NewsletterPreview } from "@/components/newsletter/NewsletterPreview";
import { OrganizationBrandingPanel } from "@/components/newsletter/OrganizationBrandingPanel";
import { SectionLibrary } from "@/components/newsletter/SectionLibrary";
import { WorkspaceSettingsPanel } from "@/components/newsletter/WorkspaceSettingsPanel";

const channels: Channel[] = ["web", "email", "pdf", "html", "blog"];

export function IssueWizard() {
  const [activeStep, setActiveStep] = useState<string>(buildSteps[0].id);
  const [activeChannel, setActiveChannel] = useState<Channel>("web");
  const [document, setDocument] = useState(sampleNewsletter);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("Local draft loaded.");
  const initialLoadComplete = useRef(false);

  const updateField = (field: "title" | "intro" | "subjectLine" | "previewText", value: string) => {
    setDocument((current) => ({
      ...current,
      [field]: value
    }));
  };

  const updateOrganizationField = (
    field: keyof typeof document.organization,
    value: string
  ) => {
    setDocument((current) => ({
      ...current,
      organization: {
        ...current.organization,
        [field]: value
      }
    }));
  };

  const updateOrganizationColor = (
    field: keyof typeof document.organization.colors,
    value: string
  ) => {
    setDocument((current) => ({
      ...current,
      organization: {
        ...current.organization,
        colors: {
          ...current.organization.colors,
          [field]: value
        }
      }
    }));
  };

  const toggleSection = (id: string) => {
    setDocument((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === id ? { ...section, enabled: !section.enabled } : section
      )
    }));
  };

  const toggleDistribution = (channel: Channel) => {
    setDocument((current) => ({
      ...current,
      distributionOptions: current.distributionOptions.map((option) =>
        option.channel === channel ? { ...option, selected: !option.selected } : option
      )
    }));
  };

  const updatePublishMode = (publishMode: PublishMode) => {
    setDocument((current) => ({
      ...current,
      workspace: {
        ...current.workspace,
        publishMode
      }
    }));
  };

  const updateVectorProvider = (vectorProvider: typeof document.workspace.vectorProvider) => {
    setDocument((current) => ({
      ...current,
      workspace: {
        ...current.workspace,
        vectorProvider
      }
    }));
  };

  const updateProjectCode = (encryptedProjectCode: string) => {
    setDocument((current) => ({
      ...current,
      workspace: {
        ...current.workspace,
        encryptedProjectCode
      }
    }));
  };

  useEffect(() => {
    let cancelled = false;

    async function loadDocument() {
      try {
        const response = await fetch("/api/newsletters");
        const payload = await response.json();
        const nextDocument = payload?.data?.[0];

        if (!cancelled && nextDocument) {
          setDocument(nextDocument);
          setSaveMessage("Draft loaded from workspace.");
        }
      } catch {
        if (!cancelled) {
          setSaveMessage("Using local starter draft.");
        }
      } finally {
        initialLoadComplete.current = true;
      }
    }

    void loadDocument();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!initialLoadComplete.current) {
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      setSaveState("saving");
      setSaveMessage("Saving draft...");

      try {
        const response = await fetch("/api/newsletters", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(document)
        });

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.message ?? "Unable to save draft.");
        }

        setSaveState("saved");
        setSaveMessage(
          payload.mode === "supabase"
            ? "Saved to Supabase."
            : "Saved locally. Add service keys to persist remotely."
        );
      } catch {
        setSaveState("error");
        setSaveMessage("Save failed. Check API configuration.");
      }
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [document]);

  return (
    <div className="grid gap-8">
      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-6">
          <section className="rounded-editorial border border-slate-200 bg-white p-6 shadow-editorial">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">Builder flow</p>
            <h1 className="mt-2 font-display text-4xl text-brand-navy">Newsletter creation workspace</h1>
            <p className="mt-3 text-sm leading-6 text-brand-muted">
              This first-pass builder demonstrates the product direction: guided structured intake on the
              left and renderer-specific output on the right.
            </p>

            <div className="mt-6 grid gap-3">
              {buildSteps.map((step, index) => {
                const selected = activeStep === step.id;

                return (
                  <button
                    key={step.id}
                    className={`rounded-[24px] border px-4 py-4 text-left transition ${
                      selected
                        ? "border-brand-primary bg-brand-background"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                    onClick={() => setActiveStep(step.id)}
                    type="button"
                  >
                    <div className="text-xs font-bold uppercase tracking-[0.25em] text-brand-secondary">
                      Step {index + 1}
                    </div>
                    <div className="mt-2 text-lg font-semibold text-brand-text">{step.title}</div>
                    <div className="mt-1 text-sm leading-6 text-brand-muted">{step.description}</div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-editorial border border-slate-200 bg-white p-6 shadow-editorial">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">
                  Guided intake
                </p>
                <h2 className="mt-2 font-display text-3xl text-brand-navy">Core issue fields</h2>
              </div>
              <span
                className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] ${
                  saveState === "error"
                    ? "bg-red-100 text-red-700"
                    : saveState === "saved"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-brand-background text-brand-primary"
                }`}
              >
                {saveMessage}
              </span>
            </div>

            <div className="mt-6 grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-brand-text">Newsletter title</span>
                <input
                  className="rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-brand-primary/20 focus:ring"
                  onChange={(event) => updateField("title", event.target.value)}
                  value={document.title}
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-brand-text">Intro paragraph</span>
                <textarea
                  className="min-h-28 rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-brand-primary/20 focus:ring"
                  onChange={(event) => updateField("intro", event.target.value)}
                  value={document.intro}
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-brand-text">Email subject line</span>
                  <input
                    className="rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-brand-primary/20 focus:ring"
                    onChange={(event) => updateField("subjectLine", event.target.value)}
                    value={document.subjectLine}
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-brand-text">Preview text</span>
                  <input
                    className="rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-brand-primary/20 focus:ring"
                    onChange={(event) => updateField("previewText", event.target.value)}
                    value={document.previewText}
                  />
                </label>
              </div>
            </div>
          </section>

          <WorkspaceSettingsPanel
            document={document}
            onProjectCodeChange={updateProjectCode}
            onPublishModeChange={updatePublishMode}
            onVectorProviderChange={updateVectorProvider}
          />

          <OrganizationBrandingPanel
            document={document}
            onOrganizationColorChange={updateOrganizationColor}
            onOrganizationFieldChange={updateOrganizationField}
          />

          <AgentPanel
            document={document}
            onApplyIntro={(value) => updateField("intro", value)}
            onApplyTitle={(value) => updateField("title", value)}
          />

          <SectionLibrary onToggle={toggleSection} sections={document.sections} />

          <DistributionSelector onToggle={toggleDistribution} options={document.distributionOptions} />

          <MediaUploadPanel document={document} />
        </div>

        <div className="grid gap-6">
          <section className="rounded-editorial border border-slate-200 bg-white p-6 shadow-editorial">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">
                  Channel previews
                </p>
                <h2 className="mt-2 font-display text-3xl text-brand-navy">Renderer switcher</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {channels.map((channel) => (
                  <button
                    key={channel}
                    className={`rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] ${
                      activeChannel === channel
                        ? "bg-brand-primary text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                    onClick={() => setActiveChannel(channel)}
                    type="button"
                  >
                    {channel}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <NewsletterPreview channel={activeChannel} document={document} />
        </div>
      </section>

      <DistributionPanel />
    </div>
  );
}
