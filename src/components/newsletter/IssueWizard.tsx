"use client";

import { useEffect, useRef, useState } from "react";

import { useAuthSession } from "@/lib/auth-client";
import { buildSteps, sampleNewsletter } from "@/lib/sample-data";
import type { Channel, PublishMode } from "@/types/newsletter";
import type { SchoolProfile } from "@/types/school";
import { DistributionPanel } from "@/components/newsletter/DistributionPanel";
import { DistributionSelector } from "@/components/newsletter/DistributionSelector";
import { MediaUploadPanel } from "@/components/newsletter/MediaUploadPanel";
import { NewsletterPreview } from "@/components/newsletter/NewsletterPreview";
import { OrganizationBrandingPanel } from "@/components/newsletter/OrganizationBrandingPanel";
import { SectionLibrary } from "@/components/newsletter/SectionLibrary";
import { WorkspaceSettingsPanel } from "@/components/newsletter/WorkspaceSettingsPanel";

const channels: Channel[] = ["web", "email", "pdf", "html", "blog"];

export function IssueWizard() {
  const { session } = useAuthSession();
  const [activeStep, setActiveStep] = useState<string>(buildSteps[0].id);
  const [activeChannel, setActiveChannel] = useState<Channel>("web");
  const [document, setDocument] = useState(sampleNewsletter);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("Local draft loaded.");
  const initialLoadComplete = useRef(false);
  const activeStepIndex = buildSteps.findIndex((step) => step.id === activeStep);
  const activeStepConfig = buildSteps[activeStepIndex] ?? buildSteps[0];

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

  const updateAgentId = (agentId: string) => {
    setDocument((current) => ({
      ...current,
      workspace: {
        ...current.workspace,
        agentId
      }
    }));
  };

  const goToStep = (stepId: string) => {
    setActiveStep(stepId);
  };

  const goToPreviousStep = () => {
    if (activeStepIndex > 0) {
      setActiveStep(buildSteps[activeStepIndex - 1].id);
    }
  };

  const goToNextStep = () => {
    if (activeStepIndex < buildSteps.length - 1) {
      setActiveStep(buildSteps[activeStepIndex + 1].id);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function loadDocument() {
      try {
        let nextMember: { schoolId: string } | null = null;
        let nextSchool: SchoolProfile | null = null;

        if (session?.user?.email) {
          const memberResponse = await fetch(
            `/api/members/me?email=${encodeURIComponent(session.user.email)}`
          );

          if (memberResponse.ok) {
            const memberPayload = await memberResponse.json();
            nextMember = memberPayload?.data ?? null;
          }
        }

        if (nextMember?.schoolId) {
          const schoolsResponse = await fetch("/api/schools");
          const schoolsPayload = await schoolsResponse.json();
          nextSchool =
            ((schoolsPayload?.data ?? []) as SchoolProfile[]).find(
              (school) => school.id === nextMember?.schoolId
            ) ?? null;
        }

        const query = nextMember?.schoolId ? `?schoolId=${encodeURIComponent(nextMember.schoolId)}` : "";
        const response = await fetch(`/api/newsletters${query}`);
        const payload = await response.json();
        const nextDocument = payload?.data?.[0];

        if (!cancelled && nextDocument) {
          const mergedDocument = nextSchool
            ? {
                ...nextDocument,
                organization: {
                  ...nextDocument.organization,
                  name: nextSchool.name,
                  tagline: nextSchool.tagline,
                  websiteUrl: nextSchool.websiteUrl,
                  contactEmail: nextSchool.contactEmail,
                  phone: nextSchool.phone,
                  address: nextSchool.address,
                  logoUrl: nextSchool.logoUrl,
                  colors: {
                    ...nextDocument.organization.colors,
                    primary: nextSchool.primaryColor,
                    secondary: nextSchool.secondaryColor,
                    accent: nextSchool.accentColor,
                    background: nextSchool.backgroundColor,
                    text: nextSchool.textColor
                  }
                },
                workspace: {
                  ...nextDocument.workspace,
                  schoolId: nextSchool.id,
                  publishMode: nextSchool.publishMode,
                  agentId: nextSchool.agentId,
                  vectorProvider: nextSchool.vectorProvider,
                  encryptedProjectCode: nextSchool.encryptedProjectCode
                }
              }
            : nextDocument;

          setDocument(mergedDocument);
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
  }, [session?.user?.email]);

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
              Pick a step and the workspace below changes to the exact task for that stage.
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
                    onClick={() => goToStep(step.id)}
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
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">
                  Current step
                </p>
                <h2 className="mt-2 font-display text-3xl text-brand-navy">{activeStepConfig.title}</h2>
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

            <div className="mt-4 rounded-[24px] bg-[#EAF2FB] p-4 text-sm leading-6 text-brand-muted">
              {getStepInstruction(activeStep)}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-text disabled:cursor-not-allowed disabled:opacity-40"
                disabled={activeStepIndex === 0}
                onClick={goToPreviousStep}
                type="button"
              >
                Previous step
              </button>
              <button
                className="rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white disabled:cursor-not-allowed disabled:opacity-40"
                disabled={activeStepIndex === buildSteps.length - 1}
                onClick={goToNextStep}
                type="button"
              >
                Next step
              </button>
            </div>
          </section>

          {activeStep === "setup" ? (
            <>
              <section className="rounded-editorial border border-slate-200 bg-white p-6 shadow-editorial">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">
                      Step 1
                    </p>
                    <h2 className="mt-2 font-display text-3xl text-brand-navy">Issue setup</h2>
                  </div>
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
                onAgentIdChange={updateAgentId}
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
            </>
          ) : null}

          {activeStep === "content" ? (
            <>
              <section className="rounded-editorial border border-slate-200 bg-white p-6 shadow-editorial">
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">
                  Content handling
                </p>
                <h2 className="mt-2 font-display text-3xl text-brand-navy">Write rough, publish clean</h2>
                <p className="mt-4 text-sm leading-7 text-brand-muted">
                  This step is for rough notes, bullets, and links. The school-specific agent layer should
                  work behind the scenes, so editors should not have to manage agent actions manually here.
                </p>
              </section>
              <SectionLibrary onToggle={toggleSection} sections={document.sections} />
            </>
          ) : null}

          {activeStep === "events" ? (
            <>
              <SectionLibrary onToggle={toggleSection} sections={document.sections} />
              <section className="rounded-editorial border border-slate-200 bg-white p-6 shadow-editorial">
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">
                  Step 3 guidance
                </p>
                <h2 className="mt-2 font-display text-3xl text-brand-navy">Focus on dates, links, and utility blocks</h2>
                <p className="mt-4 text-sm leading-7 text-brand-muted">
                  In this prototype, use the section library to turn on or off the calendar, clubs, events,
                  quick links, and CTA modules. The final version should break those into direct fields.
                </p>
              </section>
            </>
          ) : null}

          {activeStep === "media" ? (
            <>
              <OrganizationBrandingPanel
                document={document}
                onOrganizationColorChange={updateOrganizationColor}
                onOrganizationFieldChange={updateOrganizationField}
              />
              <MediaUploadPanel document={document} />
            </>
          ) : null}

          {activeStep === "review" ? (
            <>
              <SectionLibrary onToggle={toggleSection} sections={document.sections} />
              <section className="rounded-editorial border border-slate-200 bg-white p-6 shadow-editorial">
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">Step 5</p>
                <h2 className="mt-2 font-display text-3xl text-brand-navy">Review the preview on the right</h2>
                <p className="mt-4 text-sm leading-7 text-brand-muted">
                  Use the channel buttons in the preview column to check web, email, PDF, HTML, and blog
                  modes before you publish.
                </p>
              </section>
            </>
          ) : null}

          {activeStep === "distribution" ? (
            <>
              <DistributionSelector onToggle={toggleDistribution} options={document.distributionOptions} />
              <DistributionPanel />
            </>
          ) : null}
        </div>

        <div className="grid gap-6 xl:sticky xl:top-8 xl:self-start">
          <NewsletterPreview
            channel={activeChannel}
            document={document}
            onChannelChange={setActiveChannel}
          />
        </div>
      </section>
    </div>
  );
}

function getStepInstruction(stepId: string) {
  switch (stepId) {
    case "setup":
      return "Set the issue title, intro, email text, school settings, and branding first. This step establishes the school identity that will carry through the entire newsletter.";
    case "content":
      return "Build the main story structure. Turn sections on or off and use the school agent if you want help drafting copy.";
    case "events":
      return "Review the calendar, clubs, quick links, and other event-driven modules. This is where the newsletter becomes useful for families.";
    case "media":
      return "Upload logos, images, audio, or video and confirm the right school colors. Media is compressed automatically where possible.";
    case "review":
      return "Check the rendered result before publishing. Use the preview column to switch channels and confirm the output looks right.";
    case "distribution":
      return "Choose exactly which outputs this issue needs. You do not have to generate every channel every time.";
    default:
      return "Complete this step, then move to the next one.";
  }
}
