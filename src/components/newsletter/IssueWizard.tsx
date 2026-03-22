"use client";

import { useEffect, useRef, useState } from "react";

import { useAuthSession } from "@/lib/auth-client";
import { buildSteps, sampleNewsletter } from "@/lib/sample-data";
import type { ContentGenerateResponse } from "@/types/integration";
import type { Channel } from "@/types/newsletter";
import type { SchoolProfile } from "@/types/school";
import { AssistantEmbedPanel } from "@/components/newsletter/AssistantEmbedPanel";
import { DistributionPanel } from "@/components/newsletter/DistributionPanel";
import { DistributionSelector } from "@/components/newsletter/DistributionSelector";
import { MediaUploadPanel } from "@/components/newsletter/MediaUploadPanel";
import { NewsletterPreview } from "@/components/newsletter/NewsletterPreview";
import { SectionLibrary } from "@/components/newsletter/SectionLibrary";

const channels: Channel[] = ["web", "email", "pdf", "html", "blog"];

type BuildMode = "quick" | "custom";

export function IssueWizard({ initialMode = "custom" }: { initialMode?: BuildMode }) {
  const { session } = useAuthSession();
  const isQuickMode = initialMode === "quick";
  const [activeStep, setActiveStep] = useState<string>(buildSteps[0].id);
  const [activeChannel, setActiveChannel] = useState<Channel>("web");
  const [document, setDocument] = useState(sampleNewsletter);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("Draft ready.");
  const [generationState, setGenerationState] = useState<"idle" | "generating" | "ready" | "error">("idle");
  const [generationMessage, setGenerationMessage] = useState(
    "Fill in the form, then continue and the system will write the first draft for you."
  );
  const [quickNotes, setQuickNotes] = useState("");
  const [quickLinks, setQuickLinks] = useState("");
  const [quickSections, setQuickSections] = useState<string[]>(["top_story", "news_grid", "arts_events"]);
  const initialLoadComplete = useRef(false);
  const stepList = isQuickMode
    ? buildSteps.filter((step) => ["setup", "content", "media", "review", "distribution"].includes(step.id))
    : buildSteps;
  const activeStepIndex = stepList.findIndex((step) => step.id === activeStep);
  const activeStepConfig = stepList[activeStepIndex] ?? stepList[0];

  const updateField = (field: "title" | "intro" | "subjectLine" | "previewText", value: string) => {
    setDocument((current) => ({
      ...current,
      [field]: value
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

  const toggleQuickSection = (sectionType: string) => {
    setQuickSections((current) =>
      current.includes(sectionType)
        ? current.filter((item) => item !== sectionType)
        : [...current, sectionType]
    );
  };

  const goToStep = (stepId: string) => {
    setActiveStep(stepId);
  };

  const goToPreviousStep = () => {
    if (activeStepIndex > 0) {
      setActiveStep(stepList[activeStepIndex - 1].id);
    }
  };

  const applyGeneratedDraft = (generated: ContentGenerateResponse) => {
    setDocument((current) => ({
      ...current,
      title: generated.title || current.title,
      intro: generated.intro || current.intro,
      sections: current.sections.map((section) => {
        const nextSection = generated.sections?.find((item) => item.sectionType === section.type);

        if (!nextSection) {
          return section;
        }

        return {
          ...section,
          title: nextSection.title || section.title,
          enabled: true,
          content: {
            ...section.content,
            ...nextSection.content
          }
        };
      })
    }));
  };

  const generateInstantDraft = async () => {
    if (!quickNotes.trim()) {
      setGenerationState("error");
      setGenerationMessage("Add the main message first so the system has something to build from.");
      return false;
    }

    setGenerationState("generating");
    setGenerationMessage("Writing your first draft...");

    try {
      const response = await fetch("/api/agent/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          schoolName: document.organization.name,
          generationProvider: document.workspace.generationProvider,
          knowledgeProvider: document.workspace.knowledgeProvider,
          assistantReference: document.workspace.assistantReference,
          integrationEndpoint: document.workspace.integrationEndpoint,
          encryptedKnowledgeRef: document.workspace.encryptedKnowledgeRef,
          prompt: `Write a school newsletter from the provided top-level notes. Use the school's tone and return clean newsletter-ready content for the selected sections.\n\nTitle: ${document.title}\n\nNotes:\n${quickNotes}`,
          links: quickLinks
            .split("\n")
            .map((item) => item.trim())
            .filter(Boolean),
          notes: quickNotes,
          sectionTypes: quickSections
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message ?? "The assistant could not generate the draft.");
      }

      if (payload?.data) {
        applyGeneratedDraft(payload.data);
      }

      setGenerationState("ready");
      setGenerationMessage("Your first draft is ready. Review it and keep going.");
      return true;
    } catch (error) {
      setGenerationState("error");
      setGenerationMessage(
        error instanceof Error ? error.message : "The draft could not be created. Please try again."
      );
      return false;
    }
  };

  const goToNextStep = async () => {
    if (isQuickMode && activeStep === "setup") {
      const generated = await generateInstantDraft();

      if (!generated) {
        return;
      }
    }

    if (activeStepIndex < stepList.length - 1) {
      setActiveStep(stepList[activeStepIndex + 1].id);
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
                  generationProvider: nextSchool.generationProvider,
                  knowledgeProvider: nextSchool.knowledgeProvider,
                  syncProvider: nextSchool.syncProvider,
                  assistantReference: nextSchool.assistantReference,
                  integrationEndpoint: nextSchool.integrationEndpoint,
                  encryptedKnowledgeRef: nextSchool.encryptedKnowledgeRef
                }
              }
            : nextDocument;

          setDocument(mergedDocument);
          setSaveMessage("Draft loaded.");
        }
      } catch {
        if (!cancelled) {
          setSaveMessage("Starting with a new draft.");
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
    if (!initialLoadComplete.current || !isQuickMode) {
      return;
    }

    const nextIntro = quickLinks.trim()
      ? `${quickNotes.trim()}\n\nSources:\n${quickLinks.trim()}`
      : quickNotes.trim();

    setDocument((current) => ({
      ...current,
      intro: nextIntro || current.intro,
      sections: current.sections.map((section) => {
        if (["hero", "quote_or_mission", "footer"].includes(section.type)) {
          return section;
        }

        return {
          ...section,
          enabled: quickSections.includes(section.type)
        };
      })
    }));
  }, [isQuickMode, quickLinks, quickNotes, quickSections]);

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
            ? "All changes saved."
            : "Changes saved on this device."
        );
      } catch {
        setSaveState("error");
        setSaveMessage("We could not save your changes.");
      }
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [document]);

  return (
    <div className="grid gap-8">
      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-6">
          <section className="rounded-editorial border border-slate-200 bg-white p-6 shadow-editorial">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">
                  {isQuickMode ? "Instant newsletter" : "Advanced customization"}
                </p>
                <h1 className="mt-2 font-display text-4xl text-brand-navy">
                  {document.organization.name}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-brand-muted">
                  {isQuickMode
                    ? "Use the simplest path possible: add the main message, a few links, and a couple of images, then review the finished issue."
                    : "Use the guided workflow to shape the issue, review the structure, and control how it will be published."}
                </p>
              </div>
              <a
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-text"
                href="/admin/schools"
              >
                Branding and school settings
              </a>
            </div>

                <div className="mt-6 flex flex-wrap gap-3">
              {stepList.map((step, index) => {
                const selected = activeStep === step.id;

                return (
                  <button
                    key={step.id}
                    className={`rounded-full border px-5 py-3 text-left transition ${
                      selected
                        ? "border-brand-primary bg-brand-background"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                    onClick={() => goToStep(step.id)}
                    type="button"
                  >
                    <span className="text-xs font-bold uppercase tracking-[0.25em] text-brand-secondary">
                      Step {index + 1}
                    </span>
                    <span className="ml-2 text-sm font-semibold text-brand-text">{step.title}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-editorial border border-slate-200 bg-white p-6 shadow-editorial">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">Current step</p>
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
                disabled={
                  activeStepIndex === stepList.length - 1 ||
                  (isQuickMode && activeStep === "setup" && generationState === "generating")
                }
                onClick={goToNextStep}
                type="button"
              >
                {isQuickMode && activeStep === "setup" && generationState === "generating"
                  ? "Writing draft..."
                  : "Next step"}
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
                    <span className="text-sm font-semibold text-brand-text">
                      {isQuickMode ? "What do you want to say?" : "Intro paragraph"}
                    </span>
                    <textarea
                      className="min-h-28 rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-brand-primary/20 focus:ring"
                      onChange={(event) =>
                        isQuickMode ? setQuickNotes(event.target.value) : updateField("intro", event.target.value)
                      }
                      placeholder={
                        isQuickMode
                          ? "Type the message, bullets, or rough thoughts. The system should turn this into the release."
                          : undefined
                      }
                      value={isQuickMode ? quickNotes : document.intro}
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

              {isQuickMode ? (
                <section className="rounded-editorial border border-slate-200 bg-white p-6 shadow-editorial">
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">
                    Quick release
                  </p>
                  <h2 className="mt-2 font-display text-3xl text-brand-navy">Dead simple input</h2>
                  <p className="mt-3 text-sm leading-6 text-brand-muted">
                    Give the high-level points, paste any links, choose the blocks you want, and let the
                    system write and build the issue for you.
                  </p>
                  <div className="mt-6 grid gap-4">
                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-brand-text">Links or sources</span>
                      <textarea
                        className="min-h-24 rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-brand-primary/20 focus:ring"
                        onChange={(event) => setQuickLinks(event.target.value)}
                        placeholder="Paste links, one per line."
                        value={quickLinks}
                      />
                    </label>

                    <div className="grid gap-3">
                      <span className="text-sm font-semibold text-brand-text">Sections to include</span>
                      <div className="grid gap-3 md:grid-cols-2">
                        {[
                          ["top_story", "Top story"],
                          ["news_grid", "Campus news"],
                          ["arts_events", "Events"],
                          ["calendar_snapshot", "Calendar"],
                          ["quick_links", "Quick links"],
                          ["clubs_and_organizations", "Clubs"]
                        ].map(([sectionType, label]) => {
                          const selected = quickSections.includes(sectionType);

                          return (
                            <button
                              key={sectionType}
                              className={`rounded-[24px] border px-4 py-4 text-left ${
                                selected
                                  ? "border-brand-primary bg-brand-background"
                                  : "border-slate-200 bg-white"
                              }`}
                              onClick={() => toggleQuickSection(sectionType)}
                              type="button"
                            >
                              <div className="text-sm font-semibold text-brand-text">{label}</div>
                              <div className="mt-1 text-sm leading-6 text-brand-muted">
                                {selected ? "Included in this release." : "Not included."}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div
                      className={`rounded-[24px] p-4 text-sm leading-6 ${
                        generationState === "error"
                          ? "bg-red-50 text-red-700"
                          : generationState === "ready"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-[#EAF2FB] text-brand-muted"
                      }`}
                    >
                      {generationMessage}
                    </div>
                  </div>
                </section>
              ) : (
                <section className="rounded-editorial border border-slate-200 bg-white p-6 shadow-editorial">
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">
                    School settings
                  </p>
                  <h2 className="mt-2 font-display text-3xl text-brand-navy">Keep branding separate</h2>
                  <p className="mt-3 text-sm leading-7 text-brand-muted">
                    Logos, colors, assistant settings, and school-level defaults should be managed from the
                    school dashboard so this workspace stays focused on the issue itself.
                  </p>
                  <a
                    className="mt-5 inline-flex rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-text"
                    href="/admin/schools"
                  >
                    Open school settings
                  </a>
                </section>
              )}
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
                  {isQuickMode
                    ? "This is your first draft. The system should already have taken the main message, links, and selected sections and turned them into the issue below."
                    : "This step is for rough notes, bullets, and links. The school-specific agent layer should work behind the scenes, so editors should not have to manage agent actions manually here."}
                </p>
              </section>
              <AssistantEmbedPanel document={document} />
              {!isQuickMode ? <SectionLibrary onToggle={toggleSection} sections={document.sections} /> : null}
            </>
          ) : null}

          {activeStep === "events" ? (
            <>
              <SectionLibrary onToggle={toggleSection} sections={document.sections} />
              {isQuickMode ? null : (
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
              )}
            </>
          ) : null}

          {activeStep === "media" ? (
            <>
              <MediaUploadPanel document={document} />
            </>
          ) : null}

          {activeStep === "review" ? (
            <>
              {!isQuickMode ? <SectionLibrary onToggle={toggleSection} sections={document.sections} /> : null}
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
      return "Set the title, the core message, and any email text first. In the instant path, this is the main handoff to the school agent.";
    case "content":
      return "This is where the system should take the high-level notes, links, and chosen sections and turn them into the actual newsletter draft.";
    case "events":
      return "Review the calendar, clubs, quick links, and other event-driven modules. This is where the newsletter becomes useful for families.";
    case "media":
      return "Add the images or media that belong in this issue. Branding stays in school settings, but issue-specific media belongs here.";
    case "review":
      return "Check the rendered result before publishing. Use the preview column to switch channels and confirm the output looks right.";
    case "distribution":
      return "Choose exactly which outputs this issue needs. You do not have to generate every channel every time.";
    default:
      return "Complete this step, then move to the next one.";
  }
}
