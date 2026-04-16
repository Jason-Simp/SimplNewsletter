import { randomUUID } from "crypto";

import { generateNewsletterPackage } from "@/lib/newsletter-generation-service";
import type { ContentGenerateRequest, ContentGenerateResponse } from "@/types/integration";
import type { SchoolProfile } from "@/types/school";

type NewsletterGenerationJobStatus = "queued" | "running" | "completed" | "failed";

export type NewsletterGenerationJob = {
  id: string;
  schoolId: string;
  status: NewsletterGenerationJobStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  result: ContentGenerateResponse | null;
  error: string | null;
};

const jobs = new Map<string, NewsletterGenerationJob>();
const JOB_TTL_MS = 1000 * 60 * 30;

export function createNewsletterGenerationJob(
  payload: ContentGenerateRequest,
  options?: { schoolProfile?: SchoolProfile | null }
) {
  const schoolId = payload.schoolId?.trim() || options?.schoolProfile?.id || "";
  const now = new Date().toISOString();
  const jobId = randomUUID();
  const job: NewsletterGenerationJob = {
    id: jobId,
    schoolId,
    status: "queued",
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    result: null,
    error: null
  };

  jobs.set(jobId, job);
  pruneExpiredJobs();

  queueMicrotask(() => {
    void runNewsletterGenerationJob(jobId, payload, options);
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
  options?: { schoolProfile?: SchoolProfile | null }
) {
  updateJob(jobId, {
    status: "running",
    error: null
  });

  try {
    const result = await generateNewsletterPackage(payload, options);

    updateJob(jobId, {
      status: "completed",
      result,
      completedAt: new Date().toISOString(),
      error: null
    });
  } catch (error) {
    updateJob(jobId, {
      status: "failed",
      error: error instanceof Error ? error.message : "The newsletter could not be written right now.",
      completedAt: new Date().toISOString()
    });
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
