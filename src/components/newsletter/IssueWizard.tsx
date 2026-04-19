"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { authFetch } from "@/lib/api-client";
import { useAuthSession } from "@/lib/auth-client";
import { applyGeneratedDraftToDocument, selectImageAssignments } from "@/lib/generated-newsletter-draft";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeStep, setActiveStep] = useState<string>(buildSteps[0].id);
  const [activeChannel, setActiveChannel] = useState<Channel>("web");
  const [document, setDocument] = useState(sampleNewsletter);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("Draft ready.");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [generationState, setGenerationState] = useState<"idle" | "generating" | "ready" | "error">("idle");
  const [generationPhase, setGenerationPhase] = useState<
    "idle" | "preparing" | "queued" | "running" | "reconnecting" | "ready" | "error"
  >("idle");
  const [generationMessage, setGenerationMessage] = useState(
    "Fill in the form, then continue and the system will write the first draft for you."
  );
  const [generationJobId, setGenerationJobId] = useState<string | null>(null);
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
  const cloneFromId = searchParams.get("from");
  const draftId = searchParams.get("draft");
  const freshIssue = searchParams.get("fresh") === "1";
  const canRestoreBuilderState = Boolean(draftId?.trim());
  const browserDraftKey = useMemo(
    () =>
      [
        "the-wire-builder-draft",
        draftId?.trim() || cloneFromId?.trim() || document.workspace.schoolId || session?.user?.id || "default"
      ].join(":"),
    [cloneFromId, document.workspace.schoolId, draftId, session?.user?.id]
  );

  useEffect(() => {
    if (!draftId?.trim() && !cloneFromId?.trim() && !freshIssue) {
      router.replace("/builder?fresh=1");
    }
  }, [cloneFromId, draftId, freshIssue, router]);

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

  const updateQuickNotes = (value: string) => {
    setQuickNotes(value);
    setGenerationState("idle");
    setGenerationPhase("idle");
    setGenerationMessage("Fill in the form, then continue and the system will write the first draft for you.");
    setLastGeneratedAt(null);
  };

  const showNotice = useCallback((message: string, tone: "success" | "error" | "info") => {
    setNotice({ message, tone });
  }, []);

  const goToPreviousStep = () => {
    if (activeStepIndex > 0) {
      setActiveStep(stepList[activeStepIndex - 1].id);
    }
  };

  const createInstantNewsletter = async () => {
    await generateInstantDraft();
  };

  const applyGeneratedDraft = useCallback((generated: ContentGenerateResponse) => {
    setDocument((current) =>
      applyGeneratedDraftToDocument(current, generated, quickNotes, uploadedAssets)
    );
  }, [quickNotes, uploadedAssets]);

  const rewriteSection = async (sectionType: "hero" | "top_story" | "principal_message") => {
    if (!hasSchoolWorkspace || !hasWritingAgentConnection || !quickNotes.trim()) {
      return;
    }

    setRewritingSection(sectionType);
    setGenerationState("generating");
    setGenerationPhase("running");
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

      const imageAssignments = selectImageAssignments(
        payload.data,
        uploadedAssets,
        buildSectionRewriteNotes({
          sectionType,
          quickNotes,
          document
        })
      );

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
      setGenerationPhase("ready");
      setGenerationMessage(`${getSectionLabel(sectionType)} updated. Review it and keep going.`);
      setLastGeneratedAt(new Date().toISOString());
      showNotice(`${getSectionLabel(sectionType)} rewritten.`, "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "The section could not be rewritten right now.";
      setGenerationState("error");
      setGenerationPhase("error");
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
    setGenerationPhase("preparing");
    setGenerationMessage("Saving your request and starting the writing job...");
    setGenerationJobId(null);
    setLastGeneratedAt(null);

    try {
      const persistedDraft = await persistDraft("manual");
      const draftDocument = persistedDraft.document ?? document;

      const response = await authFetch(supabase, "/api/agent/generate/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          draftDocument,
          quickNotes,
          uploadedAssets,
          payload: {
            schoolId: draftDocument.workspace.schoolId,
            schoolName: draftDocument.organization.name,
            generationProvider: draftDocument.workspace.generationProvider,
            knowledgeProvider: draftDocument.workspace.knowledgeProvider,
            assistantReference: draftDocument.workspace.assistantReference,
            integrationEndpoint: draftDocument.workspace.integrationEndpoint,
            encryptedKnowledgeRef: draftDocument.workspace.encryptedKnowledgeRef,
            imageHints: uploadedAssets.map((asset) => asset.name),
            uploadedAssets,
            prompt: `Write a school newsletter from the provided request. Decide which newsletter sections are needed, write those sections, and return a clean finished draft in the school's tone.\n\nWhat the newsletter should be about:\n${quickNotes}`,
            notes: quickNotes
          }
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message ?? "The assistant could not start the draft.");
      }

      const nextJobId =
        typeof payload?.data?.jobId === "string" && payload.data.jobId.trim()
          ? payload.data.jobId.trim()
          : "";

      if (!nextJobId) {
        throw new Error("The newsletter writing job did not start correctly.");
      }

      setGenerationJobId(nextJobId);
      setGenerationPhase("queued");
      setGenerationMessage("Your newsletter request is queued. The writing agent will start shortly.");
      return true;
    } catch (error) {
      setGenerationState("error");
      setGenerationPhase("error");
      setGenerationMessage(
        error instanceof Error ? error.message : "The draft could not be created. Please try again."
      );
      setGenerationJobId(null);
      setLastGeneratedAt(null);
      return false;
    }
  };

  const retryDraftGeneration = async () => {
    await generateInstantDraft();
  };

  const goToNextStep = async () => {
    if (activeStep === "setup") {
      await generateInstantDraft();
      return;
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
            : createFreshDraft(nextSchool);

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
                  supportModules: nextSchool.supportModules,
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

          const restoredState = canRestoreBuilderState ? readBuilderDraft(browserDraftKey) : null;
          const restoredDocument =
            restoredState?.document &&
            restoredState.document.id === mergedDocument.id &&
            restoredState.document.workspace?.schoolId === mergedDocument.workspace.schoolId
              ? restoredState.document
              : null;
          const restoredJobId = restoredState?.generationJobId ?? null;
          const restoredGenerationState =
            restoredState?.generationState === "generating" && !restoredJobId
              ? "idle"
              : restoredState?.generationState ?? "idle";
          const defaultGenerationMessage = selectedDraft
            ? "This draft is already in progress. Review it, update it, or ask the system for another pass."
            : selectedSource
              ? "This draft started from a previous issue. Keep what works, update the message, and rewrite when you're ready."
              : "Fill in the form, then continue and the system will write the first draft for you.";
          const restoredGenerationMessage =
            restoredJobId
              ? "Checking on your saved draft..."
              : restoredGenerationState === "idle"
                ? defaultGenerationMessage
                : restoredState?.generationMessage ?? defaultGenerationMessage;
          const restoredGenerationPhase = restoredJobId
            ? "reconnecting"
            : restoredGenerationState === "ready"
              ? "ready"
              : restoredGenerationState === "error"
                ? "error"
                : "idle";
          const nextActiveStep =
            restoredState?.activeStep &&
            restoredState.activeStep !== "setup" &&
            !hasReviewableDraftContent(restoredDocument ?? mergedDocument)
              ? "setup"
              : restoredState?.activeStep ?? "setup";

          setDocument(restoredDocument ?? mergedDocument);
          setSourceIssueLabel(
            draftId?.trim() ? restoredState?.sourceIssueLabel ?? null : selectedSource ? selectedSource.title : null
          );
          setQuickNotes(
            (draftId?.trim() ? restoredState?.quickNotes : null) ??
              (selectedDraft
                ? buildQuickNotesFromDocument(selectedDraft)
                : selectedSource
                  ? buildQuickNotesFromDocument(selectedSource)
                  : "")
          );
          setUploadedAssets((draftId?.trim() ? restoredState?.uploadedAssets : null) ?? []);
          setActiveStep(draftId?.trim() ? nextActiveStep : "setup");
          setGenerationJobId(draftId?.trim() ? restoredJobId : null);
          setGenerationState(draftId?.trim() ? restoredGenerationState : "idle");
          setGenerationPhase(draftId?.trim() ? restoredGenerationPhase : "idle");
          setGenerationMessage(draftId?.trim() ? restoredGenerationMessage : defaultGenerationMessage);
          setLastGeneratedAt((draftId?.trim() ? restoredState?.lastGeneratedAt : null) ?? null);
          setSaveMessage("Draft loaded.");
          setLastSavedAt(null);
        }
      } catch {
        if (!cancelled) {
          setSaveMessage("Starting with a new draft.");
          setLastSavedAt(null);
        }
      } finally {
        initialLoadComplete.current = true;
      }
    }

    void loadDocument();

    return () => {
      cancelled = true;
    };
  }, [browserDraftKey, canRestoreBuilderState, cloneFromId, draftId, freshIssue, session?.user?.email, supabase]);

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
      generationPhase,
      generationMessage,
      generationJobId,
      lastGeneratedAt,
      sourceIssueLabel
    });
  }, [
    activeStep,
    browserDraftKey,
    document,
    generationJobId,
    generationMessage,
    generationPhase,
    generationState,
    lastGeneratedAt,
    quickNotes,
    sourceIssueLabel,
    uploadedAssets
  ]);

  useEffect(() => {
    if (!generationJobId) {
      return;
    }

    let cancelled = false;
    let timeoutId: number | null = null;

    const pollJob = async () => {
      try {
        const response = await authFetch(
          supabase,
          `/api/agent/generate/status/${encodeURIComponent(generationJobId)}`
        );
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.message ?? "Unable to check the newsletter writing progress.");
        }

        if (cancelled) {
          return;
        }

        const job = payload?.data as
          | {
              status?: "queued" | "running" | "completed" | "failed";
              result?: ContentGenerateResponse;
              persistedDocument?: NewsletterDocument | null;
              error?: string | null;
              completedAt?: string | null;
            }
          | undefined;

        if (job?.status === "completed" && (job.persistedDocument || job.result)) {
          if (job.persistedDocument) {
            setDocument(job.persistedDocument);
          } else if (job.result) {
            applyGeneratedDraft(job.result);
          }
          setGenerationState("ready");
          setGenerationPhase("ready");
          setGenerationMessage("Your first draft is ready. Review it and keep going.");
          setGenerationJobId(null);
          setLastGeneratedAt(job.completedAt ?? new Date().toISOString());
          showNotice("Your first draft is ready.", "success");

          if (activeStep === "setup") {
            setActiveStep("review");
          }

          return;
        }

        if (job?.status === "failed") {
          const message = job.error || "The draft could not be created. Please try again.";
          setGenerationState("error");
          setGenerationPhase("error");
          setGenerationMessage(message);
          setGenerationJobId(null);
          setLastGeneratedAt(null);
          showNotice(message, "error");
          return;
        }

        setGenerationState("generating");
        setGenerationPhase(job?.status === "queued" ? "queued" : "running");
        setGenerationMessage(
          job?.status === "queued"
            ? "Your request is in line. The writing agent has not started writing yet."
            : "The writing agent is building your draft now. You can leave this screen and come back."
        );

        timeoutId = window.setTimeout(() => {
          void pollJob();
        }, 2500);
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message =
          error instanceof Error ? error.message : "Unable to check the newsletter writing progress.";
        setGenerationState("error");
        setGenerationPhase("error");
        setGenerationMessage(message);
        setGenerationJobId(null);
        showNotice(message, "error");
      }
    };

    void pollJob();

    return () => {
      cancelled = true;

      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [activeStep, applyGeneratedDraft, generationJobId, showNotice, supabase]);

  const persistDraft = useCallback(
    async (mode: "auto" | "manual" = "auto") => {
      if (!shouldAutosaveDraft(document, quickNotes, uploadedAssets, lastGeneratedAt)) {
        setSaveState("idle");
        setSaveMessage(mode === "manual" ? "Nothing to save yet." : "Draft ready.");
        return { saved: false, document: null as NewsletterDocument | null };
      }

      setSaveState("saving");
      setSaveMessage(mode === "manual" ? "Saving now..." : "Saving draft...");

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

        if (payload?.data?.id && payload.data.id !== draftId && !cloneFromId) {
          router.replace(`/builder?draft=${encodeURIComponent(payload.data.id)}`);
        }

        setSaveState("saved");
        setSaveMessage(
          payload.mode === "supabase"
            ? mode === "manual"
              ? "Draft saved."
              : "All changes saved."
            : "Changes saved on this device."
        );
        setLastSavedAt(new Date().toISOString());

        return {
          saved: true,
          document: (payload?.data as NewsletterDocument | null) ?? null
        };
      } catch {
        setSaveState("error");
        setSaveMessage("We could not save your changes.");
        return { saved: false, document: null as NewsletterDocument | null };
      }
    },
    [cloneFromId, document, draftId, lastGeneratedAt, quickNotes, router, supabase, uploadedAssets]
  );

  useEffect(() => {
    if (!initialLoadComplete.current) {
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      await persistDraft("auto");
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [persistDraft]);

  useEffect(() => {
    if (!initialLoadComplete.current) {
      return;
    }

    const browserDocument = window.document;

    const flushDraft = () => {
      if (browserDocument.visibilityState === "hidden") {
        void persistDraft("auto");
      }
    };

    window.addEventListener("pagehide", flushDraft);
    browserDocument.addEventListener("visibilitychange", flushDraft);

    return () => {
      window.removeEventListener("pagehide", flushDraft);
      browserDocument.removeEventListener("visibilitychange", flushDraft);
    };
  }, [persistDraft]);

  const selectedWebsite = document.distributionOptions.some(
    (option) => option.channel === "web" && option.selected
  );
  const selectedPdf = document.distributionOptions.some(
    (option) => option.channel === "pdf" && option.selected
  );
  const enabledSectionsCount = document.sections.filter((section) => section.enabled).length;
  const hasReviewableDraft = hasReviewableDraftContent(document);
  const draftReady = hasReviewableDraft || document.status === "published";
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
                    disabled={step.id !== "setup" && !draftReady}
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
            {!draftReady ? (
              <div className="mt-4 rounded-[24px] bg-[#F7F9FC] p-4 text-sm leading-6 text-brand-muted">
                Review and Share will unlock after the system writes a real first draft.
              </div>
            ) : null}
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
              <div className="flex flex-wrap items-center gap-3">
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
                {lastSavedAt ? (
                  <span className="text-xs font-medium uppercase tracking-[0.12em] text-brand-muted">
                    Saved {formatStatusTime(lastSavedAt)}
                  </span>
                ) : (
                  <span className="text-xs font-medium uppercase tracking-[0.12em] text-brand-muted">
                    Autosaves in the background
                  </span>
                )}
                <button
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-brand-text disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={saveState === "saving"}
                  onClick={() => void persistDraft("manual")}
                  type="button"
                >
                  {saveState === "saving" ? "Saving..." : "Save now"}
                </button>
              </div>
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

                <MediaUploadPanel assets={uploadedAssets} document={document} onAssetsChange={setUploadedAssets} />

                {generationPhase === "idle" && generationState === "idle" ? (
                  <div className="rounded-[24px] bg-[#EAF2FB] p-4 text-sm leading-6 text-brand-muted">
                    {generationMessage}
                  </div>
                ) : (
                  <GenerationProgressPanel generationMessage={generationMessage} generationPhase={generationPhase} />
                )}

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
                      onClick={() => {
                        setGenerationJobId(null);
                        setGenerationState("idle");
                        setGenerationPhase("idle");
                        setGenerationMessage(
                          "Fill in the form, then continue and the system will write the first draft for you."
                        );
                      }}
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
                  disabled={!hasReviewableDraft}
                  onClick={() => setActiveStep("distribution")}
                  type="button"
                >
                  Keep this draft
                </button>
              </div>
            </section>
              {hasReviewableDraft ? (
                <>
                  <ReviewEditorPanel
                    document={document}
                    uploadedAssets={uploadedAssets}
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
                    onHeroImageChange={(value) =>
                      setDocument((current) =>
                        reconcileImageAssignments({
                          ...current,
                          sections: current.sections.map((section) =>
                            section.type === "hero"
                              ? {
                                  ...section,
                                  content: {
                                    ...section.content,
                                    heroImage: value
                                  }
                                }
                              : section
                          )
                        })
                      )
                    }
                    onTopStoryImageChange={(value) =>
                      setDocument((current) =>
                        reconcileImageAssignments({
                          ...current,
                          sections: current.sections.map((section) =>
                            section.type === "top_story"
                              ? {
                                  ...section,
                                  content: {
                                    ...section.content,
                                    image: value
                                  }
                                }
                              : section
                          )
                        })
                      )
                    }
                    onSpotlightImageChange={(value) =>
                      setDocument((current) =>
                        reconcileImageAssignments({
                          ...current,
                          sections: current.sections.map((section) =>
                            section.type === "student_spotlight"
                              ? {
                                  ...section,
                                  content: {
                                    ...section.content,
                                    image: value
                                  }
                                }
                              : section
                          )
                        })
                      )
                    }
                    onNewsImageChange={(itemId, value) =>
                      setDocument((current) =>
                        reconcileImageAssignments({
                          ...current,
                          sections: current.sections.map((section) =>
                            section.type === "news_grid"
                              ? {
                                  ...section,
                                  content: {
                                    ...section.content,
                                    items: Array.isArray((section.content as { items?: Array<Record<string, unknown>> }).items)
                                      ? ((section.content as { items: Array<Record<string, unknown>> }).items).map((item) =>
                                          item.id === itemId ? { ...item, image: value } : item
                                        )
                                      : []
                                  }
                                }
                              : section
                          )
                        })
                      )
                    }
                    onEventImageChange={(itemId, value) =>
                      setDocument((current) =>
                        reconcileImageAssignments({
                          ...current,
                          sections: current.sections.map((section) =>
                            section.type === "arts_events"
                              ? {
                                  ...section,
                                  content: {
                                    ...section.content,
                                    items: Array.isArray((section.content as { items?: Array<Record<string, unknown>> }).items)
                                      ? ((section.content as { items: Array<Record<string, unknown>> }).items).map((item) =>
                                          item.id === itemId ? { ...item, image: value } : item
                                        )
                                      : []
                                  }
                                }
                              : section
                          )
                        })
                      )
                    }
                  />
                  <NewsletterPreview
                    channel={activeChannel}
                    document={document}
                    onChannelChange={setActiveChannel}
                  />
                </>
              ) : (
                <EmptyReviewState
                  generationMessage={generationMessage}
                  generationState={generationState}
                  onReturnToCreate={() => setActiveStep("setup")}
                  onTryAgain={() => void retryDraftGeneration()}
                />
              )}
            </>
          ) : null}

          {activeStep === "distribution" ? (
            hasReviewableDraft ? (
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
            ) : (
              <EmptyReviewState
                generationMessage="There is not a complete newsletter draft to share yet."
                generationState={generationState}
                onReturnToCreate={() => setActiveStep("setup")}
                onTryAgain={() => void retryDraftGeneration()}
              />
            )
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
  generationPhase?: "idle" | "preparing" | "queued" | "running" | "reconnecting" | "ready" | "error";
  generationMessage: string;
  generationJobId: string | null;
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

function GenerationProgressPanel({
  generationPhase,
  generationMessage
}: {
  generationPhase: "idle" | "preparing" | "queued" | "running" | "reconnecting" | "ready" | "error";
  generationMessage: string;
}) {
  const steps = [
    { id: "preparing", label: "Prepare" },
    { id: "queued", label: "Queue" },
    { id: "running", label: "Write" },
    { id: "ready", label: "Ready" }
  ] as const;

  const currentIndex =
    generationPhase === "error"
      ? 2
      : generationPhase === "ready"
        ? 3
        : generationPhase === "running"
          ? 2
          : generationPhase === "queued"
            ? 1
            : 0;

  const progressWidth =
    generationPhase === "ready"
      ? "100%"
      : generationPhase === "running"
        ? "74%"
        : generationPhase === "queued"
          ? "42%"
          : "18%";

  return (
    <div
      className={`rounded-[24px] border p-4 ${
        generationPhase === "error"
          ? "border-red-200 bg-red-50"
          : generationPhase === "ready"
            ? "border-emerald-200 bg-emerald-50"
            : "border-slate-200 bg-[#F7F9FC]"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-semibold text-brand-text">
          {generationPhase === "reconnecting"
            ? "Reconnecting to saved draft"
            : generationPhase === "ready"
              ? "Draft complete"
              : generationPhase === "error"
                ? "Draft issue"
                : "Draft progress"}
        </div>
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-brand-muted">
          {generationPhase === "preparing"
            ? "Preparing"
            : generationPhase === "queued"
              ? "Queued"
              : generationPhase === "running"
                ? "Writing"
                : generationPhase === "reconnecting"
                  ? "Checking"
                  : generationPhase === "ready"
                    ? "Ready"
                    : "Needs attention"}
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-brand-muted">{generationMessage}</p>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
        <div
          className={`h-full rounded-full ${
            generationPhase === "error"
              ? "bg-red-400"
              : generationPhase === "ready"
                ? "bg-emerald-500"
                : "bg-brand-primary"
          }`}
          style={{ width: progressWidth }}
        />
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        {steps.map((step, index) => {
          const active = index <= currentIndex && generationPhase !== "error";
          return (
            <div
              key={step.id}
              className={`rounded-2xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] ${
                active ? "bg-white text-brand-primary" : "bg-white/60 text-brand-muted"
              }`}
            >
              {step.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmptyReviewState({
  generationState,
  generationMessage,
  onReturnToCreate,
  onTryAgain
}: {
  generationState: "idle" | "generating" | "ready" | "error";
  generationMessage: string;
  onReturnToCreate: () => void;
  onTryAgain: () => void;
}) {
  return (
    <section className="rounded-editorial border border-slate-200 bg-white p-6 shadow-editorial">
      <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">Draft status</div>
      <h2 className="mt-2 font-display text-3xl text-brand-navy">There is not a real draft to review yet</h2>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-brand-muted">
        This screen should only open after the system has written actual newsletter content. Right now,
        the safest next move is to go back to Create and let the system finish or start a fresh pass.
      </p>
      <div
        className={`mt-5 rounded-[24px] p-4 text-sm leading-6 ${
          generationState === "error"
            ? "bg-red-50 text-red-700"
            : generationState === "generating"
              ? "bg-amber-50 text-amber-700"
              : "bg-[#EAF2FB] text-brand-muted"
        }`}
      >
        {generationMessage}
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-text"
          onClick={onReturnToCreate}
          type="button"
        >
          Back to create
        </button>
        <button
          className="rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white disabled:cursor-not-allowed disabled:opacity-40"
          disabled={generationState === "generating"}
          onClick={onTryAgain}
          type="button"
        >
          {generationState === "generating" ? "Still writing..." : "Try again"}
        </button>
      </div>
    </section>
  );
}

function ReviewEditorPanel({
  document,
  uploadedAssets,
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
  onHeroHeadlineChange,
  onHeroImageChange,
  onTopStoryImageChange,
  onSpotlightImageChange,
  onNewsImageChange,
  onEventImageChange
}: {
  document: NewsletterDocument;
  uploadedAssets: UploadedAsset[];
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
  onHeroImageChange: (value: string) => void;
  onTopStoryImageChange: (value: string) => void;
  onSpotlightImageChange: (value: string) => void;
  onNewsImageChange: (itemId: string, value: string) => void;
  onEventImageChange: (itemId: string, value: string) => void;
}) {
  const hero = getSectionContent(document, "hero");
  const principal = getSectionContent(document, "principal_message");
  const topStory = getSectionContent(document, "top_story");
  const spotlight = getSectionContent(document, "student_spotlight");
  const newsItems = readItemList(getSectionContent(document, "news_grid"), "items");
  const eventItems = readItemList(getSectionContent(document, "arts_events"), "items");
  const [showImageTools, setShowImageTools] = useState(false);
  const [principalQuoteDraft, setPrincipalQuoteDraft] = useState(readString(principal, "quote"));
  const imageOptions = uploadedAssets
    .filter((asset) => asset.type.startsWith("image/") && asset.url)
    .map((asset) => ({
      label: asset.name,
      value: asset.url ?? "",
      previewUrl: asset.url ?? ""
    }));

  useEffect(() => {
    setPrincipalQuoteDraft(readString(principal, "quote"));
  }, [principal]);

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

      {(hero || topStory || spotlight || newsItems.length > 0 || eventItems.length > 0) && imageOptions.length > 0 ? (
        <div className="mt-6 rounded-[24px] border border-slate-200 bg-brand-background p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">Image matching</div>
              <div className="mt-2 max-w-2xl text-sm leading-6 text-brand-muted">
                These controls are optional. Open them only if the system attached a photo to the wrong story.
              </div>
            </div>
            <button
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-brand-text"
              onClick={() => setShowImageTools((current) => !current)}
              type="button"
            >
              {showImageTools ? "Hide image tools" : "Fix image matches"}
            </button>
          </div>
          {showImageTools ? (
            <div className="mt-5 grid gap-4">
              {hero ? (
                <ImageAssignmentField
                  currentValue={readString(hero, "heroImage")}
                  label="Lead image"
                  options={imageOptions}
                  onChange={onHeroImageChange}
                />
              ) : null}
              {topStory ? (
                <ImageAssignmentField
                  currentValue={readString(topStory, "image")}
                  label="Top story image"
                  options={imageOptions}
                  onChange={onTopStoryImageChange}
                />
              ) : null}
              {spotlight && (readString(spotlight, "name") || readString(spotlight, "summary")) ? (
                <ImageAssignmentField
                  currentValue={readString(spotlight, "image")}
                  label="Student spotlight image"
                  options={imageOptions}
                  onChange={onSpotlightImageChange}
                />
              ) : null}
              {newsItems.map((item) => (
                <ImageAssignmentField
                  key={item.id}
                  currentValue={item.image}
                  label={item.headline || "Story image"}
                  options={imageOptions}
                  onChange={(value) => onNewsImageChange(item.id, value)}
                />
              ))}
              {eventItems.map((item) => (
                <ImageAssignmentField
                  key={item.id}
                  currentValue={item.image}
                  label={item.title || "Event image"}
                  options={imageOptions}
                  onChange={(value) => onEventImageChange(item.id, value)}
                />
              ))}
            </div>
          ) : null}
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
              onChange={(event) => {
                setPrincipalQuoteDraft(event.target.value);
                onPrincipalQuoteChange(event.target.value);
              }}
              value={principalQuoteDraft}
            />
          </label>
        </div>
      ) : null}
    </section>
  );
}

function ImageAssignmentField({
  label,
  currentValue,
  options,
  onChange
}: {
  label: string;
  currentValue: string;
  options: Array<{ label: string; value: string; previewUrl: string }>;
  onChange: (value: string) => void;
}) {
  if (!options.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-semibold text-brand-text">{label}</span>
        <button
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${
            currentValue
              ? "border border-slate-200 bg-white text-brand-text"
              : "bg-brand-background text-brand-muted"
          }`}
          onClick={() => onChange("")}
          type="button"
        >
          No image
        </button>
      </div>
      <div className="mt-3 grid gap-4 md:grid-cols-[112px_minmax(0,1fr)] md:items-center">
        <div className="overflow-hidden rounded-[16px] border border-slate-200 bg-[#F7F9FC]">
          <div className="aspect-[4/3]">
            {currentValue ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={label} className="h-full w-full object-cover" src={currentValue} />
            ) : (
              <div className="flex h-full items-center justify-center text-xs font-semibold uppercase tracking-[0.14em] text-brand-muted">
                No image
              </div>
            )}
          </div>
        </div>
        <label className="grid gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-brand-muted">Choose image</span>
          <select
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none ring-brand-primary/20 focus:ring"
            onChange={(event) => onChange(event.target.value)}
            value={currentValue}
          >
            <option value="">No image</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

function getSectionContent(
  document: NewsletterDocument,
  sectionType: NewsletterDocument["sections"][number]["type"]
) {
  return (document.sections.find((section) => section.type === sectionType && section.enabled)
    ?.content ?? {}) as Record<string, unknown>;
}

function readItemList(
  content: Record<string, unknown>,
  key: string
): Array<{ id: string; headline?: string; title?: string; image: string }> {
  const value = content[key];

  if (!Array.isArray(value)) {
    return [];
  }

  type ImageAssignableItem = { id: string; headline?: string; title?: string; image: string };

  const mappedItems: Array<ImageAssignableItem | null> = value.map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const id = typeof record.id === "string" ? record.id : "";

      if (!id) {
        return null;
      }

      return {
        id,
        headline: typeof record.headline === "string" ? record.headline : undefined,
        title: typeof record.title === "string" ? record.title : undefined,
        image: typeof record.image === "string" ? record.image : ""
      };
    });

  return mappedItems.filter((item): item is ImageAssignableItem => item !== null);
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

function createFreshDraft(school: SchoolProfile | null): NewsletterDocument {
  const base = structuredClone(sampleNewsletter) as NewsletterDocument;
  const schoolName = school?.name?.trim() || "School newsletter";
  const issueDate = new Date().toISOString().slice(0, 10);

  return {
    ...base,
    id: `draft-${Date.now()}`,
    status: "draft",
    title: school ? `${school.name} newsletter` : "",
    issueDate,
    audience: school?.name ? `${school.name} families and staff` : "",
    intro: "",
    subjectLine: "",
    previewText: "",
    publishedAt: null,
    organization: school
      ? {
          ...base.organization,
          name: school.name,
          tagline: school.tagline,
          websiteUrl: school.websiteUrl,
          contactEmail: school.contactEmail,
          phone: school.phone,
          address: school.address,
          logoUrl: school.logoUrl,
          supportModules: school.supportModules,
          colors: {
            ...base.organization.colors,
            primary: school.primaryColor,
            secondary: school.secondaryColor,
            accent: school.accentColor,
            background: school.backgroundColor,
            text: school.textColor
          }
        }
      : base.organization,
    workspace: school
      ? {
          ...base.workspace,
          schoolId: school.id,
          publishMode: school.publishMode,
          generationProvider: school.generationProvider,
          knowledgeProvider: school.knowledgeProvider,
          syncProvider: school.syncProvider,
          assistantReference: school.assistantReference,
          integrationEndpoint: school.integrationEndpoint,
          encryptedKnowledgeRef: school.encryptedKnowledgeRef
        }
      : base.workspace,
    distributionOptions: base.distributionOptions.map((option) => ({
      ...option,
      selected: option.channel === "web"
    })),
    sections: base.sections.map((section) => {
      if (section.type === "hero") {
        return {
          ...section,
          title: "Lead story",
          enabled: true,
          content: {
            ...section.content,
            eyebrow: schoolName,
            headline: "",
            body: "",
            stats: [],
            heroImage: "",
            galleryImages: []
          }
        };
      }

      if (section.type === "footer") {
        return section;
      }

      return {
        ...section,
        enabled: false
      };
    })
  };
}

function shouldAutosaveDraft(
  document: NewsletterDocument,
  quickNotes: string,
  uploadedAssets: UploadedAsset[],
  lastGeneratedAt: string | null
) {
  if (isPersistedDraftId(document.id)) {
    return true;
  }

  if (quickNotes.trim()) {
    return true;
  }

  if (uploadedAssets.length > 0) {
    return true;
  }

  if (lastGeneratedAt) {
    return true;
  }

  if (document.intro.trim() || document.subjectLine.trim() || document.previewText.trim()) {
    return true;
  }

  return document.sections.some((section) => {
    if (section.type === "footer") {
      return false;
    }

    if (!section.enabled) {
      return false;
    }

    if (section.type === "hero") {
      const content = section.content as {
        headline?: string;
        body?: string;
        heroImage?: string;
        galleryImages?: string[];
      };

      return Boolean(
        content.headline?.trim() ||
          content.body?.trim() ||
          content.heroImage?.trim() ||
          (Array.isArray(content.galleryImages) && content.galleryImages.length > 0)
      );
    }

    return true;
  });
}

function hasReviewableDraftContent(document: NewsletterDocument) {
  if (document.status === "published") {
    return true;
  }

  if (document.title.trim() && document.intro.trim()) {
    return true;
  }

  return document.sections.some((section) => {
    if (!section.enabled || section.type === "footer") {
      return false;
    }

    const content = section.content as Record<string, unknown>;

    switch (section.type) {
      case "hero":
        return Boolean(readString(content, "headline").trim() || readString(content, "body").trim());
      case "top_story":
        return Boolean(readString(content, "headline").trim() || readString(content, "summary").trim());
      case "principal_message":
        return Boolean(readString(content, "quote").trim());
      case "student_spotlight":
        return Boolean(
          readString(content, "name").trim() ||
            readString(content, "summary").trim() ||
            readString(content, "achievement").trim()
        );
      case "calendar_snapshot":
      case "quick_links":
      case "news_grid":
      case "arts_events":
      case "academics":
      case "athletics":
      case "clubs_and_organizations":
        return Array.isArray(content.items) && content.items.length > 0;
      case "quote_or_mission":
        return Boolean(readString(content, "quote").trim() || readString(content, "mission").trim());
      case "cta_band":
        return Boolean(readString(content, "headline").trim() || readString(content, "ctaLabel").trim());
      case "stats_band":
        return Array.isArray(content.stats) && content.stats.length > 0;
      default:
        return Object.values(content).some((value) => {
          if (typeof value === "string") {
            return Boolean(value.trim());
          }

          return Array.isArray(value) && value.length > 0;
        });
    }
  });
}

function formatStatusTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "recently";
  }

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });
}

function reconcileImageAssignments(document: NewsletterDocument) {
  const usedImages = new Set<string>();

  for (const section of document.sections) {
    if (!section.enabled || !section.content || typeof section.content !== "object") {
      continue;
    }

    const content = section.content as Record<string, unknown>;

    if (typeof content.heroImage === "string" && content.heroImage.trim()) {
      usedImages.add(content.heroImage.trim());
    }

    if (typeof content.image === "string" && content.image.trim()) {
      usedImages.add(content.image.trim());
    }

    if (Array.isArray(content.items)) {
      for (const item of content.items) {
        if (!item || typeof item !== "object") {
          continue;
        }

        const image = (item as Record<string, unknown>).image;

        if (typeof image === "string" && image.trim()) {
          usedImages.add(image.trim());
        }
      }
    }
  }

  return {
    ...document,
    sections: document.sections.map((section) => {
      if (section.type !== "hero") {
        return section;
      }

      const content = section.content as {
        galleryImages?: string[];
        heroImage?: string;
      };
      const heroImage = typeof content.heroImage === "string" ? content.heroImage.trim() : "";
      const filteredGallery = Array.isArray(content.galleryImages)
        ? content.galleryImages.filter((image, index, collection) => {
            const normalizedImage = typeof image === "string" ? image.trim() : "";

            if (!normalizedImage) {
              return false;
            }

            if (normalizedImage === heroImage) {
              return false;
            }

            return collection.indexOf(image) === index && !usedImages.has(normalizedImage);
          })
        : [];

      return {
        ...section,
        content: {
          ...content,
          heroImage,
          galleryImages: filteredGallery
        }
      };
    })
  };
}

function isPersistedDraftId(id: string) {
  return Boolean(id?.trim()) && !id.startsWith("draft-") && !id.startsWith("demo-") && id !== sampleNewsletter.id;
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
