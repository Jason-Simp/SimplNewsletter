"use client";

import { useEffect, useRef, useState } from "react";

import { useAuthSession } from "@/lib/auth-client";
import { buildSteps, sampleNewsletter } from "@/lib/sample-data";
import { getNewsletterPdfPath, getNewsletterWebPath, getSchoolArchivePath } from "@/lib/public-links";
import type { ContentGenerateResponse } from "@/types/integration";
import type { UploadedAsset } from "@/types/media";
import type { Channel, DistributionChannel, NewsletterDocument } from "@/types/newsletter";
import type { SchoolProfile } from "@/types/school";
import { ActionNotice } from "@/components/ui/ActionNotice";
import { DistributionPanel } from "@/components/newsletter/DistributionPanel";
import { DistributionSelector } from "@/components/newsletter/DistributionSelector";
import { MediaUploadPanel } from "@/components/newsletter/MediaUploadPanel";
import { NewsletterPreview } from "@/components/newsletter/NewsletterPreview";

export function IssueWizard() {
  const { session } = useAuthSession();
  const [activeStep, setActiveStep] = useState<string>(buildSteps[0].id);
  const [activeChannel, setActiveChannel] = useState<Channel>("web");
  const [document, setDocument] = useState(sampleNewsletter);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("Draft ready.");
  const [generationState, setGenerationState] = useState<"idle" | "generating" | "ready" | "error">("idle");
  const [generationMessage, setGenerationMessage] = useState(
    "Fill in the form, then continue and the system will write the first draft for you."
  );
  const [distributionState, setDistributionState] = useState<"idle" | "publishing" | "published" | "error">("idle");
  const [distributionMessage, setDistributionMessage] = useState(
    "Choose whether this newsletter should go to the school website feed, PDF export, or both."
  );
  const [distributionLinks, setDistributionLinks] = useState<{
    archivePath?: string;
    websitePath?: string;
    pdfPath?: string;
  } | null>(null);
  const [notice, setNotice] = useState<{ message: string; tone: "success" | "error" | "info" } | null>(null);
  const [quickNotes, setQuickNotes] = useState("");
  const [uploadedAssets, setUploadedAssets] = useState<UploadedAsset[]>([]);
  const initialLoadComplete = useRef(false);
  const stepList = buildSteps;
  const activeStepIndex = stepList.findIndex((step) => step.id === activeStep);
  const activeStepConfig = stepList[activeStepIndex] ?? stepList[0];

  const updateDocumentField = (field: keyof Pick<NewsletterDocument, "title" | "intro" | "issueDate">, value: string) => {
    setDocument((current) => ({
      ...current,
      [field]: value
    }));
  };

  const updateSectionContent = (
    sectionType: NewsletterDocument["sections"][number]["type"],
    updater: (content: Record<string, unknown>) => Record<string, unknown>
  ) => {
    setDocument((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.type === sectionType
          ? {
              ...section,
              content: updater(section.content as Record<string, unknown>)
            }
          : section
      )
    }));
  };

  const toggleDistribution = (channel: DistributionChannel) => {
    setDocument((current) => ({
      ...current,
      distributionOptions: current.distributionOptions.map((option) =>
        option.channel === channel ? { ...option, selected: !option.selected } : option
      )
    }));
  };

  const goToStep = (stepId: string) => {
    setActiveStep(stepId);
  };

  const showNotice = (message: string, tone: "success" | "error" | "info") => {
    setNotice({ message, tone });
  };

  const goToPreviousStep = () => {
    if (activeStepIndex > 0) {
      setActiveStep(stepList[activeStepIndex - 1].id);
    }
  };

  const createInstantNewsletter = async () => {
    const generated = await generateInstantDraft();

    if (generated) {
      setActiveStep("review");
    }
  };

  const applyGeneratedDraft = (generated: ContentGenerateResponse) => {
    const generatedSectionTypes = new Set(generated.sections?.map((item) => item.sectionType) ?? []);
    const fallbackTitle = getGeneratedTitle(generated, quickNotes);
    const fallbackIntro = getGeneratedIntro(generated, quickNotes);
    const firstUploadedImage = uploadedAssets.find(
      (asset) => asset.type.startsWith("image/") && asset.url
    )?.url;

    setDocument((current) => ({
      ...current,
      title: fallbackTitle,
      intro: fallbackIntro,
      sections: current.sections.map((section) => {
        const nextSection = generated.sections?.find((item) => item.sectionType === section.type);

        if (section.type === "hero") {
          return {
            ...section,
            enabled: true,
            content: {
              ...section.content,
              eyebrow: current.organization.name,
              headline: nextSection?.title || fallbackTitle,
              body:
                typeof nextSection?.content?.body === "string"
                  ? nextSection.content.body
                  : fallbackIntro,
              heroImage:
                typeof nextSection?.content?.heroImage === "string"
                  ? nextSection.content.heroImage
                  : firstUploadedImage || (section.content as { heroImage?: string }).heroImage,
              stats: Array.isArray(nextSection?.content?.stats) ? nextSection.content.stats : []
            }
          };
        }

        if (section.type === "top_story" && !nextSection) {
          return {
            ...section,
            enabled: true,
            content: {
              ...section.content,
              headline: fallbackTitle,
              summary:
                typeof generated.raw === "string" && generated.raw.trim()
                  ? generated.raw.trim()
                  : fallbackIntro,
              url: "#",
              image: firstUploadedImage || (section.content as { image?: string }).image
            }
          };
        }

        if (!nextSection) {
          return section;
        }

        return {
          ...section,
          title: nextSection.title || section.title,
          enabled: true,
          content: {
            ...section.content,
            ...nextSection.content,
            ...(section.type === "top_story" && firstUploadedImage
              ? { image: firstUploadedImage }
              : {})
          }
        };
      }).map((section) => {
        if (["hero", "footer"].includes(section.type)) {
          return section;
        }

        return {
          ...section,
          enabled: generatedSectionTypes.has(section.type)
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
          schoolId: document.workspace.schoolId,
          schoolName: document.organization.name,
          generationProvider: document.workspace.generationProvider,
          knowledgeProvider: document.workspace.knowledgeProvider,
          assistantReference: document.workspace.assistantReference,
          integrationEndpoint: document.workspace.integrationEndpoint,
          encryptedKnowledgeRef: document.workspace.encryptedKnowledgeRef,
          imageHints: uploadedAssets.map((asset) => asset.name),
          prompt: `Write a school newsletter from the provided request. Decide which newsletter sections are needed, write those sections, and return a clean finished draft in the school's tone.\n\nWhat the newsletter should be about:\n${quickNotes}`,
          notes: quickNotes
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
    if (activeStep === "setup") {
      const generated = await generateInstantDraft();

      if (!generated) {
        return;
      }
    }

    if (activeStepIndex < stepList.length - 1) {
      setActiveStep(stepList[activeStepIndex + 1].id);
    }
  };

  const publishDistribution = async () => {
    setDistributionState("publishing");
    setDistributionMessage("Publishing your newsletter...");

    try {
      const response = await fetch("/api/distribution", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          schoolId: document.workspace.schoolId,
          document,
          distributionOptions: document.distributionOptions
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message ?? "The newsletter could not be published.");
      }

      if (payload?.data) {
        setDocument(payload.data);
      }

      const nextDocument = (payload?.data as NewsletterDocument | undefined) ?? document;
      const selectedWebsite = nextDocument.distributionOptions.some(
        (option) => option.channel === "web" && option.selected
      );
      const selectedPdf = nextDocument.distributionOptions.some(
        (option) => option.channel === "pdf" && option.selected
      );
      const schoolId = nextDocument.workspace.schoolId;
      const newsletterId = nextDocument.id;

      setDistributionLinks(
        schoolId && newsletterId
          ? {
              archivePath: getSchoolArchivePath(schoolId),
              websitePath: selectedWebsite ? getNewsletterWebPath(schoolId, newsletterId) : undefined,
              pdfPath: selectedPdf ? getNewsletterPdfPath(schoolId, newsletterId, true) : undefined
            }
          : null
      );

      setDistributionState("published");
      setDistributionMessage(
        selectedWebsite && selectedPdf
          ? "Published to the school website. The PDF view is ready too."
          : selectedWebsite
            ? "Published to the school website feed and archive."
            : selectedPdf
              ? "PDF view is ready. Open it and save it as a PDF from your browser."
              : "Saved without a delivery target."
      );
      showNotice("Newsletter publishing updated.", "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "The newsletter could not be published.";
      setDistributionState("error");
      setDistributionMessage(message);
      showNotice(message, "error");
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

        if (
          payload?.data &&
          (payload.data.id !== document.id ||
            payload.data.workspace?.schoolId !== document.workspace.schoolId)
        ) {
          setDocument(payload.data);
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
    <>
      {notice ? <ActionNotice message={notice.message} onDismiss={() => setNotice(null)} tone={notice.tone} /> : null}
      <div className="grid gap-8">
      <section className="grid gap-6">
        <div className="grid gap-6">
          <section className="rounded-editorial border border-slate-200 bg-white p-6 shadow-editorial">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">
                  Newsletter workspace
                </p>
                <h1 className="mt-2 font-display text-4xl text-brand-navy">
                  {document.organization.name}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-brand-muted">
                  Describe what the newsletter should be about, let the system write and design the first draft,
                  then review it before you share it.
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

            {activeStep !== "setup" ? (
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
                  disabled={activeStepIndex === stepList.length - 1}
                  onClick={goToNextStep}
                  type="button"
                >
                  Next step
                </button>
              </div>
            ) : null}
          </section>

          {activeStep === "setup" ? (
            <section className="rounded-editorial border border-slate-200 bg-white p-6 shadow-editorial">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">
                Simple form
              </p>
              <h2 className="mt-2 font-display text-3xl text-brand-navy">Create your newsletter</h2>
              <p className="mt-3 text-sm leading-6 text-brand-muted">
                Tell the system what this newsletter should be about. It will choose the sections, write the
                draft, and build the design for you.
              </p>
              <div className="mt-6 grid gap-4">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-brand-text">
                    What would you like your newsletter to be about and say?
                  </span>
                  <textarea
                    className="min-h-40 rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-brand-primary/20 focus:ring"
                    onChange={(event) => setQuickNotes(event.target.value)}
                    placeholder="Example: Share our back-to-school updates, welcome families, mention key dates, highlight athletics, and remind everyone about open house."
                    value={quickNotes}
                  />
                </label>

                <MediaUploadPanel document={document} onAssetsChange={setUploadedAssets} />

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

                <div className="flex flex-wrap gap-3">
                  <button
                    className="rounded-full bg-brand-primary px-6 py-4 text-sm font-semibold uppercase tracking-[0.12em] text-white disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={generationState === "generating"}
                    onClick={() => void createInstantNewsletter()}
                    type="button"
                  >
                    {generationState === "generating" ? "Creating newsletter..." : "Create newsletter"}
                  </button>
                </div>
              </div>
            </section>
          ) : null}

          {activeStep === "review" ? (
            <>
              <section className="rounded-editorial border border-slate-200 bg-white p-6 shadow-editorial">
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">Step 2</p>
                <h2 className="mt-2 font-display text-3xl text-brand-navy">Review your newsletter</h2>
                <p className="mt-4 text-sm leading-7 text-brand-muted">
                  The first draft should now be on screen. Read through it, switch output formats if needed,
                  and make sure it looks right before sharing.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-text"
                    onClick={() => setActiveStep("setup")}
                    type="button"
                  >
                    Back to form
                  </button>
                  <button
                    className="rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white"
                    onClick={() => setActiveStep("distribution")}
                    type="button"
                  >
                    Continue
                  </button>
                </div>
              </section>
              <ReviewEditorPanel
                document={document}
                onIssueDateChange={(value) => updateDocumentField("issueDate", value)}
                onIntroChange={(value) => updateDocumentField("intro", value)}
                onPrincipalQuoteChange={(value) =>
                  updateSectionContent("principal_message", (content) => ({
                    ...content,
                    quote: value
                  }))
                }
                onTitleChange={(value) => updateDocumentField("title", value)}
                onTopStoryHeadlineChange={(value) =>
                  updateSectionContent("top_story", (content) => ({
                    ...content,
                    headline: value
                  }))
                }
                onTopStorySummaryChange={(value) =>
                  updateSectionContent("top_story", (content) => ({
                    ...content,
                    summary: value
                  }))
                }
                onHeroBodyChange={(value) =>
                  updateSectionContent("hero", (content) => ({
                    ...content,
                    body: value
                  }))
                }
                onHeroHeadlineChange={(value) =>
                  updateSectionContent("hero", (content) => ({
                    ...content,
                    headline: value
                  }))
                }
              />
              <NewsletterPreview
                channel={activeChannel}
                document={document}
                onChannelChange={setActiveChannel}
              />
            </>
          ) : null}

          {activeStep === "distribution" ? (
            <>
              <DistributionSelector onToggle={toggleDistribution} options={document.distributionOptions} />
              <section className="rounded-editorial border border-slate-200 bg-white p-6 shadow-editorial">
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">Step 3</p>
                <h2 className="mt-2 font-display text-3xl text-brand-navy">Publish and archive</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-brand-muted">
                  Publishing to the school website adds this issue to the hosted archive and RSS feed. PDF
                  stays as the optional export if someone needs a file version.
                </p>
                <div
                  className={`mt-5 rounded-[24px] p-4 text-sm leading-6 ${
                    distributionState === "error"
                      ? "bg-red-50 text-red-700"
                      : distributionState === "published"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-[#EAF2FB] text-brand-muted"
                  }`}
                >
                  {distributionMessage}
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    className="rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={distributionState === "publishing"}
                    onClick={() => void publishDistribution()}
                    type="button"
                  >
                    {distributionState === "publishing" ? "Publishing..." : "Publish newsletter"}
                  </button>
                  {distributionLinks?.websitePath ? (
                    <a
                      className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-text"
                      href={distributionLinks.websitePath}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Open website page
                    </a>
                  ) : null}
                  {distributionLinks?.archivePath ? (
                    <a
                      className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-text"
                      href={distributionLinks.archivePath}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Open archive
                    </a>
                  ) : null}
                  {distributionLinks?.pdfPath ? (
                    <a
                      className="rounded-full border border-brand-primary bg-brand-background px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-primary"
                      href={distributionLinks.pdfPath}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Open PDF view
                    </a>
                  ) : null}
                </div>
              </section>
              <NewsletterPreview
                channel={activeChannel}
                document={document}
                onChannelChange={setActiveChannel}
              />
              <div className="flex flex-wrap gap-3">
                <button
                  className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-text"
                  onClick={() => setActiveStep("review")}
                  type="button"
                >
                  Back to review
                </button>
              </div>
              <DistributionPanel />
            </>
          ) : null}
        </div>
      </section>
    </div>
    </>
  );
}

function getStepInstruction(stepId: string) {
  switch (stepId) {
    case "setup":
      return "Write the message in plain language and add photos if you want them included. This is the main handoff to the school agent.";
    case "review":
      return "Check the rendered result before sharing it. Use the channel buttons to confirm the newsletter still feels clear in each format.";
    case "distribution":
      return "Choose exactly where this issue should go. You do not have to send every format every time.";
    default:
      return "Complete this step, then move to the next one.";
  }
}

function getGeneratedTitle(generated: ContentGenerateResponse, quickNotes: string) {
  const title = generated.title?.trim();

  if (title && title.toLowerCase() !== "generated newsletter draft") {
    return title;
  }

  const firstSentence = quickNotes
    .split(/[.!?]/)
    .map((part) => part.trim())
    .find(Boolean);

  if (!firstSentence) {
    return "School newsletter";
  }

  return firstSentence.length > 90 ? `${firstSentence.slice(0, 87).trim()}...` : firstSentence;
}

function getGeneratedIntro(generated: ContentGenerateResponse, quickNotes: string) {
  const intro = generated.intro?.trim();

  if (intro && intro.toLowerCase() !== "generated newsletter draft") {
    return intro;
  }

  if (typeof generated.raw === "string" && generated.raw.trim()) {
    return generated.raw.trim();
  }

  return quickNotes.trim();
}

function ReviewEditorPanel({
  document,
  onIssueDateChange,
  onIntroChange,
  onPrincipalQuoteChange,
  onTitleChange,
  onTopStoryHeadlineChange,
  onTopStorySummaryChange,
  onHeroBodyChange,
  onHeroHeadlineChange
}: {
  document: NewsletterDocument;
  onIssueDateChange: (value: string) => void;
  onIntroChange: (value: string) => void;
  onPrincipalQuoteChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  onTopStoryHeadlineChange: (value: string) => void;
  onTopStorySummaryChange: (value: string) => void;
  onHeroBodyChange: (value: string) => void;
  onHeroHeadlineChange: (value: string) => void;
}) {
  const hero = getSectionContent(document, "hero");
  const principal = getSectionContent(document, "principal_message");
  const topStory = getSectionContent(document, "top_story");

  return (
    <section className="rounded-editorial border border-slate-200 bg-white p-6 shadow-editorial">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">Light edits</p>
          <h2 className="mt-2 font-display text-3xl text-brand-navy">Adjust the draft</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-brand-muted">
          Make the small changes you need here. This keeps the workflow simple without sending you back
          into a complicated builder.
        </p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-brand-text">Newsletter title</span>
          <input
            className="rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-brand-primary/20 focus:ring"
            onChange={(event) => onTitleChange(event.target.value)}
            value={document.title}
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-brand-text">Issue date</span>
          <input
            className="rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-brand-primary/20 focus:ring"
            onChange={(event) => onIssueDateChange(event.target.value)}
            value={document.issueDate}
          />
        </label>
      </div>

      <label className="mt-4 grid gap-2">
        <span className="text-sm font-semibold text-brand-text">Introduction</span>
        <textarea
          className="min-h-28 rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-brand-primary/20 focus:ring"
          onChange={(event) => onIntroChange(event.target.value)}
          value={document.intro}
        />
      </label>

      {hero ? (
        <div className="mt-6 rounded-[24px] border border-slate-200 bg-brand-background p-5">
          <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">Hero</div>
          <div className="mt-4 grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-brand-text">Hero headline</span>
              <input
                className="rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-brand-primary/20 focus:ring"
                onChange={(event) => onHeroHeadlineChange(event.target.value)}
                value={readString(hero, "headline")}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-brand-text">Hero summary</span>
              <textarea
                className="min-h-28 rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-brand-primary/20 focus:ring"
                onChange={(event) => onHeroBodyChange(event.target.value)}
                value={readString(hero, "body")}
              />
            </label>
          </div>
        </div>
      ) : null}

      {topStory ? (
        <div className="mt-6 rounded-[24px] border border-slate-200 bg-brand-background p-5">
          <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">Top story</div>
          <div className="mt-4 grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-brand-text">Top story headline</span>
              <input
                className="rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-brand-primary/20 focus:ring"
                onChange={(event) => onTopStoryHeadlineChange(event.target.value)}
                value={readString(topStory, "headline")}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-brand-text">Top story summary</span>
              <textarea
                className="min-h-28 rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-brand-primary/20 focus:ring"
                onChange={(event) => onTopStorySummaryChange(event.target.value)}
                value={readString(topStory, "summary")}
              />
            </label>
          </div>
        </div>
      ) : null}

      {principal ? (
        <div className="mt-6 rounded-[24px] border border-slate-200 bg-brand-background p-5">
          <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">Leadership note</div>
          <label className="mt-4 grid gap-2">
            <span className="text-sm font-semibold text-brand-text">Principal or leadership message</span>
            <textarea
              className="min-h-28 rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-brand-primary/20 focus:ring"
              onChange={(event) => onPrincipalQuoteChange(event.target.value)}
              value={readString(principal, "quote")}
            />
          </label>
        </div>
      ) : null}
    </section>
  );
}

function getSectionContent(
  document: NewsletterDocument,
  sectionType: NewsletterDocument["sections"][number]["type"]
) {
  return (document.sections.find((section) => section.type === sectionType && section.enabled)
    ?.content ?? {}) as Record<string, unknown>;
}

function readString(content: Record<string, unknown>, key: string) {
  return typeof content[key] === "string" ? (content[key] as string) : "";
}
