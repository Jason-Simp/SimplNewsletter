import { randomUUID } from "crypto";

import { applyGeneratedDraftToDocument } from "@/lib/generated-newsletter-draft";
import { generateNewsletterPackage } from "@/lib/newsletter-generation-service";
import { saveNewsletter } from "@/lib/newsletter-repository";
import type { ContentGenerateRequest, ContentGenerateResponse } from "@/types/integration";
import type { UploadedAsset } from "@/types/media";
import type { NewsletterDocument } from "@/types/newsletter";
import type { SchoolProfile } from "@/types/school";

type NewsletterGenerationJobStatus = "queued" | "running" | "completed" | "failed";

export type NewsletterGenerationJob = {
  id: string;
  schoolId: string;
  draftId: string | null;
  status: NewsletterGenerationJobStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  result: ContentGenerateResponse | null;
  persistedDocument: NewsletterDocument | null;
  error: string | null;
};

const jobs = new Map<string, NewsletterGenerationJob>();
const JOB_TTL_MS = 1000 * 60 * 30;

export function createNewsletterGenerationJob(
  payload: ContentGenerateRequest,
  context: {
    draftDocument: NewsletterDocument;
    quickNotes: string;
    uploadedAssets: UploadedAsset[];
  },
  options?: { schoolProfile?: SchoolProfile | null }
) {
  const schoolId = payload.schoolId?.trim() || options?.schoolProfile?.id || "";
  const now = new Date().toISOString();
  const jobId = randomUUID();
  const job: NewsletterGenerationJob = {
    id: jobId,
    schoolId,
    draftId: context.draftDocument.id || null,
    status: "queued",
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    result: null,
    persistedDocument: null,
    error: null
  };

  jobs.set(jobId, job);
  pruneExpiredJobs();
  logJobEvent("queued", job, {
    draftId: context.draftDocument.id,
    title: context.draftDocument.title
  });

  queueMicrotask(() => {
    void runNewsletterGenerationJob(jobId, payload, context, options);
  });

  return job;
}

export function getNewsletterGenerationJob(jobId: string) {
  const job = jobs.get(jobId);

  if (!job) {
    return null;
  }

  if (isExpired(job)) {
    jobs.delete(jobId);
    return null;
  }

  return job;
}

async function runNewsletterGenerationJob(
  jobId: string,
  payload: ContentGenerateRequest,
  context: {
    draftDocument: NewsletterDocument;
    quickNotes: string;
    uploadedAssets: UploadedAsset[];
  },
  options?: { schoolProfile?: SchoolProfile | null }
) {
  updateJob(jobId, {
    status: "running",
    error: null
  });
  const runningJob = getNewsletterGenerationJob(jobId);
  if (runningJob) {
    logJobEvent("running", runningJob);
  }

  try {
    const result = await generateNewsletterPackage(payload, options);
    const nextDocument = applyGeneratedDraftToDocument(
      context.draftDocument,
      result,
      context.quickNotes,
      context.uploadedAssets
    );
    const persisted = await saveNewsletter(nextDocument);

    updateJob(jobId, {
      status: "completed",
      result,
      persistedDocument: persisted.newsletter,
      completedAt: new Date().toISOString(),
      error: null
    });
    const completedJob = getNewsletterGenerationJob(jobId);
    if (completedJob) {
      logJobEvent("completed", completedJob, {
        newsletterId: persisted.newsletter.id,
        title: persisted.newsletter.title
      });
    }
  } catch (error) {
    updateJob(jobId, {
      status: "failed",
      error: error instanceof Error ? error.message : "The newsletter could not be written right now.",
      completedAt: new Date().toISOString()
    });
    const failedJob = getNewsletterGenerationJob(jobId);
    if (failedJob) {
      logJobEvent("failed", failedJob, {
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
}

function updateJob(jobId: string, updates: Partial<NewsletterGenerationJob>) {
  const current = jobs.get(jobId);

  if (!current) {
    return;
  }

  jobs.set(jobId, {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString()
  });
}

function pruneExpiredJobs() {
  for (const [jobId, job] of jobs.entries()) {
    if (isExpired(job)) {
      logJobEvent("expired", job);
      jobs.delete(jobId);
    }
  }
}

function isExpired(job: NewsletterGenerationJob) {
  const lastTouched = Date.parse(job.completedAt ?? job.updatedAt);

  if (Number.isNaN(lastTouched)) {
    return false;
  }

  return Date.now() - lastTouched > JOB_TTL_MS;
}

function logJobEvent(
  event: "queued" | "running" | "completed" | "failed" | "expired",
  job: NewsletterGenerationJob,
  details?: Record<string, unknown>
) {
  console.info(
    JSON.stringify({
      level: event === "failed" ? "error" : "info",
      scope: "newsletter-generation-job",
      event,
      jobId: job.id,
      schoolId: job.schoolId,
      draftId: job.draftId,
      status: job.status,
      details
    })
  );
}
