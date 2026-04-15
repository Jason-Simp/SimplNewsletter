"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { authFetch } from "@/lib/api-client";
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
  const { session, supabase } = useAuthSession();
  const searchParams = useSearchParams();
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
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null);
  const [rewritingSection, setRewritingSection] = useState<string | null>(null);
  const [sourceIssueLabel, setSourceIssueLabel] = useState<string | null>(null);
  const initialLoadComplete = useRef(false);
  const stepList = buildSteps;
  const activeStepIndex = stepList.findIndex((step) => step.id === activeStep);
  const activeStepConfig = stepList[activeStepIndex] ?? stepList[0];
  const hasSchoolWorkspace = Boolean(document.workspace.schoolId);
  const hasWritingAgentConnection = Boolean(
    document.workspace.assistantReference?.trim() && document.workspace.integrationEndpoint?.trim()
  );
  const photoUploads = uploadedAssets.filter((asset) => asset.type.startsWith("image/")).length;
  const otherUploads = uploadedAssets.filter((asset) => !asset.type.startsWith("image/")).length;
  const starterPrompts = [
    {
      label: "Weekly school update",
      value:
        "Write this week's school newsletter. Include the most important campus updates, key dates families need to know, and any reminders that need attention this week."
    },
    {
      label: "Celebration and highlights",
      value:
        "Write a warm school newsletter focused on celebrations and highlights. Include student wins, staff recognition, upcoming events, and the most important dates families should remember."
    },
    {
      label: "Operations and reminders",
      value:
        "Write a clear school newsletter focused on reminders and operational updates. Include schedule changes, deadlines, upcoming dates, action items for families, and any important campus notices."
    }
  ];
  const cloneFromId = searchParams.get("from");
  const draftId = searchParams.get("draft");
  const browserDraftKey = useMemo(
    () =>
      [
        "the-wire-builder-draft",
        draftId?.trim() || cloneFromId?.trim() || document.workspace.schoolId || session?.user?.id || "default"
      ].join(":"),
    [cloneFromId, document.workspace.schoolId, draftId, session?.user?.id]
  );

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

  const applyStarterPrompt = (value: string) => {
    setQuickNotes(value);
    setGenerationState("idle");
    setGenerationMessage("Fill in the form, then continue and the system will write the first draft for you.");
    setLastGeneratedAt(null);
  };

  const updateQuickNotes = (value: string) => {
    setQuickNotes(value);
    setGenerationState("idle");
    setGenerationMessage("Fill in the form, then continue and the system will write the first draft for you.");
    setLastGeneratedAt(null);
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
    const imageAssignments = selectImageAssignments(generated, uploadedAssets);

    setDocument((current) => ({
      ...current,
      title: fallbackTitle,
      intro: fallbackIntro,
      sections: current.sections.map((section) => {
        const nextSection = generated.sections?.find((item) => item.sectionType === section.type);

        if (section.type === "hero") {
          const heroContent = (nextSection?.content ?? {}) as Record<string, unknown>;
          const nextHeroHeadline =
            typeof heroContent.headline === "string" && heroContent.headline.trim()
              ? heroContent.headline.trim()
              : nextSection?.title && nextSection.title.trim().toLowerCase() !== "hero"
                ? nextSection.title.trim()
                : fallbackTitle;
          const nextHeroBody =
            typeof heroContent.body === "string" && heroContent.body.trim()
              ? heroContent.body
              : typeof heroContent.summary === "string" && heroContent.summary.trim()
                ? heroContent.summary
                : fallbackIntro;

          return {
            ...section,
            enabled: true,
            content: {
              ...section.content,
              eyebrow:
                typeof heroContent.eyebrow === "string" && heroContent.eyebrow.trim()
                  ? heroContent.eyebrow
                  : current.organization.name,
              headline: nextHeroHeadline,
              body: nextHeroBody,
              heroImage:
                typeof heroContent.heroImage === "string"
                  ? heroContent.heroImage
                  : imageAssignments.heroImage || (section.content as { heroImage?: string }).heroImage,
              galleryImages:
                imageAssignments.galleryImages.length > 0
                  ? imageAssignments.galleryImages
                  : Array.isArray((section.content as { galleryImages?: string[] }).galleryImages)
                    ? (section.content as { galleryImages: string[] }).galleryImages
                    : [],
              stats: Array.isArray(heroContent.stats) ? heroContent.stats : []
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
              image: imageAssignments.topStoryImage || (section.content as { image?: string }).image
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
            ...(section.type === "top_story" && imageAssignments.topStoryImage
              ? { image: imageAssignments.topStoryImage }
              : {}),
            ...(section.type === "news_grid" && Array.isArray((nextSection.content as { items?: Array<Record<string, unknown>> }).items)
              ? {
                  items: ((nextSection.content as { items?: Array<Record<string, unknown>> }).items ?? []).map(
                    (item, index) => ({
                      ...item,
                      image:
                        typeof item.image === "string" && item.image
                          ? item.image
                          : imageAssignments.newsItemImages[index] || ""
                    })
                  )
                }
              : {}),
            ...(section.type === "arts_events" && Array.isArray((nextSection.content as { items?: Array<Record<string, unknown>> }).items)
              ? {
                  items: ((nextSection.content as { items?: Array<Record<string, unknown>> }).items ?? []).map(
                    (item, index) => ({
                      ...item,
                      image:
                        typeof item.image === "string" && item.image
                          ? item.image
                          : imageAssignments.eventItemImages[index] || ""
                    })
                  )
                }
              : {}),
            ...(section.type === "student_spotlight" && imageAssignments.spotlightImage
              ? { image: imageAssignments.spotlightImage }
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

  const rewriteSection = async (sectionType: "hero" | "top_story" | "principal_message") => {
    if (!hasSchoolWorkspace || !hasWritingAgentConnection || !quickNotes.trim()) {
      return;
    }

    setRewritingSection(sectionType);
    setGenerationState("generating");
    setGenerationMessage(`Rewriting the ${getSectionLabel(sectionType).toLowerCase()}...`);

    try {
      const response = await authFetch(supabase, "/api/agent/generate", {
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
          sectionTypes: [sectionType],
          prompt: `Rewrite only the ${getSectionLabel(sectionType)} for this school newsletter. Keep the rest of the issue intact.`,
          notes: buildSectionRewriteNotes({
            sectionType,
            quickNotes,
            document
          })
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message ?? "The section could not be rewritten.");
      }

      const rewrittenSection = payload?.data?.sections?.find(
        (section: { sectionType?: string }) => section.sectionType === sectionType
      );

      if (!rewrittenSection) {
        throw new Error("The writing agent did not return the updated section.");
      }

      const imageAssignments = selectImageAssignments(payload.data, uploadedAssets);

      setDocument((current) => ({
        ...current,
        sections: current.sections.map((section) => {
          if (section.type !== sectionType) {
            return section;
          }

          return {
            ...section,
            title: rewrittenSection.title || section.title,
            enabled: true,
            content: {
              ...section.content,
              ...rewrittenSection.content,
              ...(sectionType === "hero" && imageAssignments.heroImage
                ? {
                    heroImage: imageAssignments.heroImage,
                    galleryImages:
                      imageAssignments.galleryImages.length > 0
                        ? imageAssignments.galleryImages
                        : Array.isArray((section.content as { galleryImages?: string[] }).galleryImages)
                          ? (section.content as { galleryImages: string[] }).galleryImages
                          : []
                  }
                : {}),
              ...(sectionType === "top_story" && imageAssignments.topStoryImage
                ? { image: imageAssignments.topStoryImage }
                : {})
            }
          };
        })
      }));

      setGenerationState("ready");
      setGenerationMessage(`${getSectionLabel(sectionType)} updated. Review it and keep going.`);
      setLastGeneratedAt(new Date().toISOString());
      showNotice(`${getSectionLabel(sectionType)} rewritten.`, "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "The section could not be rewritten right now.";
      setGenerationState("error");
      setGenerationMessage(message);
      showNotice(message, "error");
    } finally {
      setRewritingSection(null);
    }
  };

  const generateInstantDraft = async () => {
    if (!hasSchoolWorkspace) {
      setGenerationState("error");
      setGenerationMessage("Finish the school setup first so this newsletter knows which school workspace to use.");
      showNotice("Open school settings and finish the school workspace first.", "error");
      return false;
    }

    if (!hasWritingAgentConnection) {
      setGenerationState("error");
      setGenerationMessage("The school writing agent is not connected yet. Add the Agent ID and Agent API in the school profile, then come back here.");
      showNotice("The school writing agent is not connected yet.", "error");
      return false;
    }

    if (!quickNotes.trim()) {
      setGenerationState("error");
      setGenerationMessage("Add the main message first so the system has something to build from.");
      return false;
    }

    setGenerationState("generating");
    setGenerationMessage("Writing your first draft...");

    try {
      const response = await authFetch(supabase, "/api/agent/generate", {
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
          uploadedAssets,
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
      setLastGeneratedAt(new Date().toISOString());
      return true;
    } catch (error) {
      setGenerationState("error");
      setGenerationMessage(
        error instanceof Error ? error.message : "The draft could not be created. Please try again."
      );
      setLastGeneratedAt(null);
      return false;
    }
  };

  const retryDraftGeneration = async () => {
    const generated = await generateInstantDraft();

    if (generated && activeStep !== "review") {
      setActiveStep("review");
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
      const response = await authFetch(supabase, "/api/distribution", {
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
          const memberResponse = await authFetch(supabase, "/api/members/me");

          if (memberResponse.ok) {
            const memberPayload = await memberResponse.json();
            nextMember = memberPayload?.data ?? null;
          }
        }

        if (nextMember?.schoolId) {
          const schoolsResponse = await authFetch(supabase, "/api/schools");
          const schoolsPayload = await schoolsResponse.json();
          nextSchool =
            ((schoolsPayload?.data ?? []) as SchoolProfile[]).find(
              (school) => school.id === nextMember?.schoolId
            ) ?? null;
        }

        const query = nextMember?.schoolId ? `?schoolId=${encodeURIComponent(nextMember.schoolId)}` : "";
        const response = await authFetch(supabase, `/api/newsletters${query}`);
        const payload = await response.json();
        const loadedDocuments = (payload?.data ?? []) as NewsletterDocument[];
        const selectedDraft =
          draftId?.trim()
            ? loadedDocuments.find((newsletter) => newsletter.id === draftId.trim()) ?? null
            : null;
        const selectedSource =
          !selectedDraft && cloneFromId?.trim()
            ? loadedDocuments.find((newsletter) => newsletter.id === cloneFromId.trim()) ?? null
            : null;
        const nextDocument = selectedDraft
          ? selectedDraft
          : selectedSource
            ? createDraftFromExistingNewsletter(selectedSource)
            : loadedDocuments[0];

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

          const restoredState = readBuilderDraft(browserDraftKey);
          const restoredDocument =
            restoredState?.document &&
            restoredState.document.workspace?.schoolId === mergedDocument.workspace.schoolId
              ? restoredState.document
              : null;

          setDocument(restoredDocument ?? mergedDocument);
          setSourceIssueLabel(restoredState?.sourceIssueLabel ?? (selectedSource ? selectedSource.title : null));
          setQuickNotes(
            restoredState?.quickNotes ??
              (selectedDraft
                ? buildQuickNotesFromDocument(selectedDraft)
                : selectedSource
                  ? buildQuickNotesFromDocument(selectedSource)
                  : "")
          );
          setUploadedAssets(restoredState?.uploadedAssets ?? []);
          setActiveStep(restoredState?.activeStep ?? "setup");
          setGenerationState(restoredState?.generationState ?? "idle");
          setGenerationMessage(
            restoredState?.generationMessage ??
              (selectedDraft
                ? "This draft is already in progress. Review it, update it, or ask the system for another pass."
                : selectedSource
                  ? "This draft started from a previous issue. Keep what works, update the message, and rewrite when you're ready."
                  : "Fill in the form, then continue and the system will write the first draft for you.")
          );
          setLastGeneratedAt(restoredState?.lastGeneratedAt ?? null);
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
  }, [browserDraftKey, cloneFromId, draftId, session?.user?.email, supabase]);

  useEffect(() => {
    if (!initialLoadComplete.current || typeof window === "undefined") {
      return;
    }

    writeBuilderDraft(browserDraftKey, {
      document,
      quickNotes,
      uploadedAssets,
      activeStep,
      generationState,
      generationMessage,
      lastGeneratedAt,
      sourceIssueLabel
    });
  }, [
    activeStep,
    browserDraftKey,
    document,
    generationMessage,
    generationState,
    lastGeneratedAt,
    quickNotes,
    sourceIssueLabel,
    uploadedAssets
  ]);

  useEffect(() => {
    if (!initialLoadComplete.current) {
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      setSaveState("saving");
      setSaveMessage("Saving draft...");

      try {
        const response = await authFetch(supabase, "/api/newsletters", {
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
  }, [document, supabase]);

  const selectedWebsite = document.distributionOptions.some(
    (option) => option.channel === "web" && option.selected
  );
  const selectedPdf = document.distributionOptions.some(
    (option) => option.channel === "pdf" && option.selected
  );
  const enabledSectionsCount = document.sections.filter((section) => section.enabled).length;
  const draftReady =
    generationState === "ready" || document.status === "published" || Boolean(lastGeneratedAt);
  const publishReadinessChecks = [
    {
      label: "Main message added",
      ready: Boolean(quickNotes.trim() || document.intro.trim()),
      detail: "There is a clear topic for the newsletter."
    },
    {
      label: "Draft generated",
      ready: draftReady,
      detail: "The system has written the first draft."
    },
    {
      label: "Newsletter reviewed",
      ready: activeStep !== "setup",
      detail: "You have moved into the review step and can make light edits."
    },
    {
      label: "Delivery selected",
      ready: selectedWebsite || selectedPdf,
      detail: selectedWebsite || selectedPdf ? "At least one publish option is selected." : "Choose website, PDF, or both."
    }
  ];

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
            {sourceIssueLabel ? (
              <div className="mt-5 rounded-[24px] bg-[#EAF2FB] p-4 text-sm leading-6 text-brand-muted">
                This draft started from a previous issue: <span className="font-semibold text-brand-text">{sourceIssueLabel}</span>.
                Reuse what still fits, then refresh the copy for this new issue.
              </div>
            ) : null}
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
                <SetupReadinessPanel
                  hasSchoolWorkspace={hasSchoolWorkspace}
                  hasWritingAgentConnection={hasWritingAgentConnection}
                  otherUploads={otherUploads}
                  photoUploads={photoUploads}
                />

                <div className="rounded-[24px] bg-[#EAF2FB] p-4 text-sm leading-6 text-brand-muted">
                  Write this however you want. Plain sentences, rough notes, or bullet points are all fine.
                  The stronger the input, the better the first draft.
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  {starterPrompts.map((starter) => (
                    <button
                      key={starter.label}
                      className="rounded-[24px] border border-slate-200 bg-white p-4 text-left transition hover:bg-slate-50"
                      onClick={() => applyStarterPrompt(starter.value)}
                      type="button"
                    >
                      <div className="text-sm font-semibold text-brand-text">{starter.label}</div>
                      <div className="mt-2 text-sm leading-6 text-brand-muted">
                        Use this as a starting point, then adjust it if needed.
                      </div>
                    </button>
                  ))}
                </div>

                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-brand-text">
                    What would you like your newsletter to be about and say?
                  </span>
                  <textarea
                    className="min-h-40 rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-brand-primary/20 focus:ring"
                    onChange={(event) => updateQuickNotes(event.target.value)}
                    placeholder="Example: Share the events for the week of April 18, congratulate the superintendent on the statewide award, mention that girls volleyball is on track for another state title, and remind families about our no-smoking and no-vaping expectations."
                    value={quickNotes}
                  />
                </label>

                <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                  <div className="text-sm font-semibold text-brand-text">Best results usually include</div>
                  <div className="mt-2 text-sm leading-6 text-brand-muted">
                    Main topic, dates and deadlines, celebrations or recognition, reminders for families,
                    and anything that needs to stand out as urgent or important.
                  </div>
                </div>

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

                {generationState === "error" ? (
                  <div className="flex flex-wrap gap-3">
                    {hasSchoolWorkspace && hasWritingAgentConnection && quickNotes.trim() ? (
                      <button
                        className="rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white"
                        onClick={() => void retryDraftGeneration()}
                        type="button"
                      >
                        Try again
                      </button>
                    ) : null}
                    {!hasWritingAgentConnection ? (
                      <a
                        className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-text"
                        href="/admin/schools"
                      >
                        Open school settings
                      </a>
                    ) : null}
                    <button
                      className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-text"
                      onClick={() => setGenerationState("idle")}
                      type="button"
                    >
                      Clear message
                    </button>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <button
                    className="rounded-full bg-brand-primary px-6 py-4 text-sm font-semibold uppercase tracking-[0.12em] text-white disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={
                      generationState === "generating" ||
                      !quickNotes.trim() ||
                      !hasSchoolWorkspace ||
                      !hasWritingAgentConnection
                    }
                    onClick={() => void createInstantNewsletter()}
                    type="button"
                  >
                    {generationState === "generating" ? "Writing newsletter..." : "Write newsletter"}
                  </button>
                </div>
              </div>
            </section>
          ) : null}

          {activeStep === "review" ? (
            <>
              <section className="rounded-editorial border border-slate-200 bg-white p-6 shadow-editorial">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">Step 2</p>
                    <h2 className="mt-2 font-display text-3xl text-brand-navy">Review your newsletter</h2>
                  </div>
                  <div
                    className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] ${
                      document.status === "published"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-brand-background text-brand-primary"
                    }`}
                  >
                    {document.status === "published" ? "Published" : "Draft"}
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-brand-muted">
                  The first draft should now be on screen. Read through it, switch output formats if needed,
                  and make sure it looks right before sharing.
                </p>
                <div className="mt-4 rounded-[24px] bg-[#EAF2FB] p-4 text-sm leading-6 text-brand-muted">
                  If this draft is close but not quite there, you can make light edits below or ask the
                  system to write another pass from the same notes.
                </div>
                <ReviewReadinessPanel
                  enabledSectionsCount={enabledSectionsCount}
                  issueDate={document.issueDate}
                  photoUploads={photoUploads}
                  title={document.title}
                />
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-text"
                    onClick={() => setActiveStep("setup")}
                    type="button"
                  >
                    Back to form
                  </button>
                  <button
                    className="rounded-full border border-brand-primary bg-brand-background px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-primary disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={generationState === "generating" || !quickNotes.trim() || !hasWritingAgentConnection}
                    onClick={() => void retryDraftGeneration()}
                    type="button"
                  >
                    {generationState === "generating" ? "Writing another draft..." : "Try another draft"}
                  </button>
                  <button
                    className="rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white"
                    onClick={() => setActiveStep("distribution")}
                    type="button"
                  >
                    Keep this draft
                  </button>
                </div>
              </section>
              <ReviewEditorPanel
                document={document}
                onRewritePrincipal={() => void rewriteSection("principal_message")}
                onRewriteTopStory={() => void rewriteSection("top_story")}
                onRewriteHero={() => void rewriteSection("hero")}
                rewritingSection={rewritingSection}
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
                <PublishSummaryPanel
                  checks={publishReadinessChecks}
                  selectedPdf={selectedPdf}
                  selectedWebsite={selectedWebsite}
                />
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

type BuilderDraftSnapshot = {
  document: NewsletterDocument;
  quickNotes: string;
  uploadedAssets: UploadedAsset[];
  activeStep: string;
  generationState: "idle" | "generating" | "ready" | "error";
  generationMessage: string;
  lastGeneratedAt: string | null;
  sourceIssueLabel: string | null;
};

function readBuilderDraft(key: string): BuilderDraftSnapshot | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as BuilderDraftSnapshot;
  } catch {
    return null;
  }
}

function writeBuilderDraft(key: string, snapshot: BuilderDraftSnapshot) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(snapshot));
  } catch {
    // Ignore local persistence failures and rely on server draft saves.
  }
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

function SetupReadinessPanel({
  hasSchoolWorkspace,
  hasWritingAgentConnection,
  photoUploads,
  otherUploads
}: {
  hasSchoolWorkspace: boolean;
  hasWritingAgentConnection: boolean;
  photoUploads: number;
  otherUploads: number;
}) {
  const checks = [
    {
      label: "School workspace",
      ready: hasSchoolWorkspace,
      detail: hasSchoolWorkspace
        ? "This newsletter is tied to the current school."
        : "Finish school setup before writing."
    },
    {
      label: "Writing agent",
      ready: hasWritingAgentConnection,
      detail: hasWritingAgentConnection
        ? "Agent ID and Agent API are connected."
        : "Add the school writing agent in school settings."
    },
    {
      label: "Photos and files",
      ready: photoUploads > 0 || otherUploads > 0,
      detail:
        photoUploads > 0 || otherUploads > 0
          ? `${photoUploads} photo${photoUploads === 1 ? "" : "s"} and ${otherUploads} other file${otherUploads === 1 ? "" : "s"} added.`
          : "Optional. Add photos if you want the newsletter to use them."
    }
  ];

  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-brand-text">Before the system writes</div>
          <div className="mt-1 text-sm leading-6 text-brand-muted">
            These are the only things that need to be in place before the draft can be created.
          </div>
        </div>
        {hasSchoolWorkspace && hasWritingAgentConnection ? (
          <div className="rounded-full bg-emerald-100 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
            Ready to write
          </div>
        ) : (
          <div className="rounded-full bg-amber-100 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-700">
            Needs setup
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {checks.map((check) => (
          <div key={check.label} className="rounded-2xl border border-slate-200 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="font-semibold text-brand-text">{check.label}</div>
              <div
                className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${
                  check.ready ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {check.ready ? "Ready" : "Needed"}
              </div>
            </div>
            <div className="mt-2 text-sm leading-6 text-brand-muted">{check.detail}</div>
          </div>
        ))}
      </div>

      {!hasWritingAgentConnection ? (
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-text"
            href="/admin/schools"
          >
            Open school settings
          </a>
        </div>
      ) : null}
    </section>
  );
}

function ReviewReadinessPanel({
  title,
  issueDate,
  enabledSectionsCount,
  photoUploads
}: {
  title: string;
  issueDate: string;
  enabledSectionsCount: number;
  photoUploads: number;
}) {
  const items = [
    {
      label: "Title",
      value: title || "Needs attention",
      tone: title ? "ready" : "pending"
    },
    {
      label: "Issue date",
      value: issueDate || "Needs attention",
      tone: issueDate ? "ready" : "pending"
    },
    {
      label: "Sections",
      value: `${enabledSectionsCount} enabled`,
      tone: enabledSectionsCount > 0 ? "ready" : "pending"
    },
    {
      label: "Photos",
      value: photoUploads > 0 ? `${photoUploads} added` : "Optional",
      tone: photoUploads > 0 ? "ready" : "neutral"
    }
  ] as const;

  return (
    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-slate-200 px-4 py-4">
          <div className="text-xs font-bold uppercase tracking-[0.22em] text-brand-secondary">{item.label}</div>
          <div className="mt-2 text-sm font-semibold text-brand-text">{item.value}</div>
          <div
            className={`mt-3 inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${
              item.tone === "ready"
                ? "bg-emerald-100 text-emerald-700"
                : item.tone === "pending"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-brand-background text-brand-muted"
            }`}
          >
            {item.tone === "ready" ? "Looks good" : item.tone === "pending" ? "Check this" : "Optional"}
          </div>
        </div>
      ))}
    </div>
  );
}

function PublishSummaryPanel({
  checks,
  selectedWebsite,
  selectedPdf
}: {
  checks: { label: string; ready: boolean; detail: string }[];
  selectedWebsite: boolean;
  selectedPdf: boolean;
}) {
  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-[24px] border border-slate-200 bg-[#F7F9FC] p-5">
        <div className="text-sm font-semibold text-brand-text">Before you publish</div>
        <div className="mt-4 grid gap-3">
          {checks.map((check) => (
            <div key={check.label} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold text-brand-text">{check.label}</div>
                <div
                  className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${
                    check.ready ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {check.ready ? "Ready" : "Needed"}
                </div>
              </div>
              <div className="mt-2 text-sm leading-6 text-brand-muted">{check.detail}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[24px] border border-slate-200 bg-white p-5">
        <div className="text-sm font-semibold text-brand-text">What will happen when you publish</div>
        <div className="mt-4 grid gap-3">
          <div className="rounded-2xl border border-slate-200 px-4 py-4">
            <div className="font-semibold text-brand-text">School website feed</div>
            <div className="mt-2 text-sm leading-6 text-brand-muted">
              {selectedWebsite
                ? "This issue will appear in the hosted school archive and the RSS feed."
                : "This issue will stay out of the public website archive and feed."}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 px-4 py-4">
            <div className="font-semibold text-brand-text">PDF view</div>
            <div className="mt-2 text-sm leading-6 text-brand-muted">
              {selectedPdf
                ? "A print-friendly PDF view will be available after publishing."
                : "No PDF view will be prepared for this issue."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewEditorPanel({
  document,
  onRewritePrincipal,
  onRewriteTopStory,
  onRewriteHero,
  rewritingSection,
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
  onRewritePrincipal: () => void;
  onRewriteTopStory: () => void;
  onRewriteHero: () => void;
  rewritingSection: string | null;
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
        <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">Lead story</div>
          <div className="mt-4">
            <button
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-brand-text disabled:cursor-not-allowed disabled:opacity-40"
              disabled={rewritingSection !== null}
              onClick={onRewriteHero}
              type="button"
            >
              {rewritingSection === "hero" ? "Rewriting hero..." : "Rewrite hero"}
            </button>
          </div>
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
          <div className="mt-4">
            <button
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-brand-text disabled:cursor-not-allowed disabled:opacity-40"
              disabled={rewritingSection !== null}
              onClick={onRewriteTopStory}
              type="button"
            >
              {rewritingSection === "top_story" ? "Rewriting top story..." : "Rewrite top story"}
            </button>
          </div>
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
          <div className="mt-4">
            <button
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-brand-text disabled:cursor-not-allowed disabled:opacity-40"
              disabled={rewritingSection !== null}
              onClick={onRewritePrincipal}
              type="button"
            >
              {rewritingSection === "principal_message"
                ? "Rewriting leadership note..."
                : "Rewrite leadership note"}
            </button>
          </div>
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

function createDraftFromExistingNewsletter(document: NewsletterDocument): NewsletterDocument {
  const nextTitle = document.title.toLowerCase().includes("copy")
    ? document.title
    : `${document.title} copy`;

  return {
    ...document,
    id: `draft-${Date.now()}`,
    status: "draft",
    title: nextTitle,
    publishedAt: null,
    issueDate: new Date().toISOString().slice(0, 10),
    distributionOptions: document.distributionOptions.map((option) => ({
      ...option,
      selected: option.channel === "web"
    })),
    sections: document.sections.map((section) => ({
      ...section,
      content: { ...section.content }
    }))
  };
}

function buildQuickNotesFromDocument(document: NewsletterDocument) {
  const enabledSections = document.sections
    .filter((section) => section.enabled && !["hero", "footer"].includes(section.type))
    .map((section) => section.title)
    .slice(0, 4);

  const details = [
    `Update this school newsletter for ${document.organization.name}.`,
    document.intro ? `Main focus: ${document.intro}` : "",
    enabledSections.length ? `Reuse and refresh these sections if they still fit: ${enabledSections.join(", ")}.` : ""
  ].filter(Boolean);

  return details.join(" ");
}

function getSectionLabel(sectionType: "hero" | "top_story" | "principal_message") {
  switch (sectionType) {
    case "hero":
      return "Lead story";
    case "top_story":
      return "Top story";
    case "principal_message":
      return "Leadership note";
  }
}

function buildSectionRewriteNotes({
  sectionType,
  quickNotes,
  document
}: {
  sectionType: "hero" | "top_story" | "principal_message";
  quickNotes: string;
  document: NewsletterDocument;
}) {
  const currentSection = getSectionContent(document, sectionType);

  return [
    `Original newsletter request: ${quickNotes}`,
    `Rewrite only this section: ${getSectionLabel(sectionType)}`,
    `Current section content: ${JSON.stringify(currentSection)}`,
    "Keep the tone clear, credible, and useful. Improve specificity and readability without inventing facts."
  ].join("\n\n");
}

function selectImageAssignments(generated: ContentGenerateResponse, assets: UploadedAsset[]) {
  const imageAssets = assets.filter((asset) => asset.type.startsWith("image/") && asset.url);
  const usedNames = new Set<string>();

  const hero = generated.sections?.find((section) => section.sectionType === "hero");
  const topStory = generated.sections?.find((section) => section.sectionType === "top_story");
  const newsGrid = generated.sections?.find((section) => section.sectionType === "news_grid");
  const spotlight = generated.sections?.find((section) => section.sectionType === "student_spotlight");
  const events = generated.sections?.find((section) => section.sectionType === "arts_events");

  const heroImage = chooseImageForText(
    [
      generated.title,
      hero?.title,
      typeof hero?.content?.headline === "string" ? hero.content.headline : "",
      typeof hero?.content?.body === "string" ? hero.content.body : ""
    ],
    imageAssets,
    usedNames
  );

  const topStoryImage = chooseImageForText(
    [
      topStory?.title,
      typeof topStory?.content?.headline === "string" ? topStory.content.headline : "",
      typeof topStory?.content?.summary === "string" ? topStory.content.summary : ""
    ],
    imageAssets,
    usedNames
  );

  const spotlightImage = chooseImageForText(
    [
      spotlight?.title,
      typeof spotlight?.content?.name === "string" ? spotlight.content.name : "",
      typeof spotlight?.content?.summary === "string" ? spotlight.content.summary : ""
    ],
    imageAssets,
    usedNames
  );

  const newsItemImages = Array.isArray(newsGrid?.content?.items)
    ? newsGrid.content.items.map((item) =>
        chooseImageForText(
          [
            typeof item?.headline === "string" ? item.headline : "",
            typeof item?.summary === "string" ? item.summary : "",
            typeof item?.tag === "string" ? item.tag : ""
          ],
          imageAssets,
          usedNames
        )
      )
    : [];

  const eventItemImages = Array.isArray(events?.content?.items)
    ? events.content.items.map((item) =>
        chooseImageForText(
          [
            typeof item?.title === "string" ? item.title : "",
            typeof item?.summary === "string" ? item.summary : "",
            typeof item?.date === "string" ? item.date : ""
          ],
          imageAssets,
          usedNames
        )
      )
    : [];

  const galleryImages = imageAssets
    .filter((asset) => !usedNames.has(asset.name) && asset.url)
    .map((asset) => asset.url as string);

  return {
    heroImage,
    topStoryImage,
    spotlightImage,
    newsItemImages,
    eventItemImages,
    galleryImages
  };
}

function chooseImageForText(
  textParts: Array<string | undefined>,
  assets: UploadedAsset[],
  usedNames: Set<string>
) {
  const availableAssets = assets.filter((asset) => !usedNames.has(asset.name) && asset.url);

  if (!availableAssets.length) {
    return "";
  }

  const combinedText = textParts.filter(Boolean).join(" ");
  const tokens = tokenizeForMatching(combinedText);
  const scoredAssets = availableAssets
    .map((asset) => ({
      asset,
      score: scoreAssetAgainstTokens(asset, tokens, combinedText)
    }))
    .sort((left, right) => right.score - left.score);

  const bestMatch = scoredAssets[0]?.asset ?? availableAssets[0];
  usedNames.add(bestMatch.name);
  return bestMatch.url ?? "";
}

function scoreAssetAgainstTokens(asset: UploadedAsset, tokens: string[], sourceText: string) {
  const normalizedName = normalizeForMatching(asset.name);
  const assetTokens = tokenizeForMatching(asset.name);
  let score = 0;

  if (!tokens.length) {
    return assetTokens.length ? 0.5 : 0;
  }

  for (const token of tokens) {
    if (!token) {
      continue;
    }

    if (normalizedName.includes(token)) {
      score += 4;
      continue;
    }

    if (assetTokens.some((assetToken) => assetToken.startsWith(token) || token.startsWith(assetToken))) {
      score += 2;
      continue;
    }

    if (findTokenVariant(token, assetTokens)) {
      score += 1.5;
    }
  }

  if (assetTokens.length) {
    const combinedAssetPhrase = assetTokens.join(" ");
    const normalizedSource = normalizeForMatching(sourceText);
    if (normalizedSource.includes(combinedAssetPhrase)) {
      score += 6;
    }
  }

  if (/\b(photo|image|picture)\b/.test(normalizeForMatching(sourceText))) {
    score += 0.5;
  }

  return score;
}

function tokenizeForMatching(value: string) {
  return normalizeForMatching(value)
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((token) => simplifyToken(token))
    .filter((token) => token.length > 2)
    .filter((token) => !COMMON_MATCH_WORDS.has(token));
}

function normalizeForMatching(value: string) {
  return value
    .toLowerCase()
    .replace(/[_–—]+/g, "-")
    .replace(/\.(png|jpe?g|gif|webp|svg)$/g, "");
}

function simplifyToken(token: string) {
  if (token.endsWith("ies") && token.length > 4) {
    return `${token.slice(0, -3)}y`;
  }

  if (token.endsWith("es") && token.length > 4) {
    return token.slice(0, -2);
  }

  if (token.endsWith("s") && token.length > 3) {
    return token.slice(0, -1);
  }

  return token;
}

function findTokenVariant(token: string, assetTokens: string[]) {
  const variants = new Set([
    token,
    simplifyToken(token),
    token.replace(/-/g, ""),
    token.replace(/fruit/g, "cafeteria"),
    token.replace(/cafeteria/g, "fruit"),
    token.replace(/lunch/g, "cafeteria"),
    token.replace(/food/g, "fruit")
  ]);

  return assetTokens.some((assetToken) =>
    [...variants].some(
      (variant) =>
        variant &&
        (assetToken.includes(variant) || variant.includes(assetToken))
    )
  );
}

const COMMON_MATCH_WORDS = new Set([
  "school",
  "newsletter",
  "about",
  "with",
  "from",
  "that",
  "this",
  "have",
  "will",
  "your",
  "their",
  "they",
  "into",
  "next",
  "week"
]);
