import { randomUUID } from "crypto";

import { AgentConversationTimeoutError, AgentResponseFormatError } from "@/lib/elevenlabs-generate";
import { applyGeneratedDraftToDocument } from "@/lib/generated-newsletter-draft";
import { generateNewsletterPackage } from "@/lib/newsletter-generation-service";
import { saveNewsletter } from "@/lib/newsletter-repository";
import { getServiceSupabase } from "@/lib/supabase/server";
import type { ContentGenerateRequest, ContentGenerateResponse } from "@/types/integration";
import type { UploadedAsset } from "@/types/media";
import type { NewsletterDocument } from "@/types/newsletter";
import type { SchoolProfile } from "@/types/school";

type NewsletterGenerationJobStatus = "queued" | "running" | "completed" | "failed";

export type NewsletterGenerationJob = {
  id: string;
  schoolId: string;
  draftId: string | null;
  externalThreadId: string | null;
  callbackUrl: string | null;
  status: NewsletterGenerationJobStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  result: ContentGenerateResponse | null;
  persistedDocument: NewsletterDocument | null;
  error: string | null;
};

type NewsletterGenerationJobContext = {
  draftDocument: NewsletterDocument;
  quickNotes: string;
  uploadedAssets: UploadedAsset[];
  callbackUrl?: string;
  externalThreadId?: string;
};

type NewsletterGenerationJobOptions = {
  schoolProfile?: SchoolProfile | null;
};

type NewsletterGenerationJobRow = {
  id: string;
  school_id: string;
  draft_id: string | null;
  external_thread_id: string | null;
  callback_url: string | null;
  status: NewsletterGenerationJobStatus;
  request_payload: ContentGenerateRequest;
  draft_document: NewsletterDocument;
  quick_notes: string | null;
  uploaded_assets: UploadedAsset[] | null;
  result: ContentGenerateResponse | null;
  persisted_document: NewsletterDocument | null;
  error: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  started_at: string | null;
  attempt_count: number | null;
};

const activeJobs = new Set<string>();
const localJobs = new Map<string, NewsletterGenerationJob>();
const localJobRecords = new Map<string, NewsletterGenerationJobRow>();
const LOCAL_JOB_TTL_MS = 1000 * 60 * 30;

export async function createNewsletterGenerationJob(
  payload: ContentGenerateRequest,
  context: NewsletterGenerationJobContext,
  options?: NewsletterGenerationJobOptions
) {
  const schoolId = payload.schoolId?.trim() || options?.schoolProfile?.id || "";
  const now = new Date().toISOString();
  const jobId = randomUUID();
  const supabase = getServiceSupabase();

  if (!supabase) {
    return queueLocalJob(jobId, schoolId, payload, context, now, options);
  }

  const row = {
    id: jobId,
    school_id: schoolId,
    draft_id: context.draftDocument.id || null,
    external_thread_id: context.externalThreadId?.trim() || null,
    callback_url: context.callbackUrl?.trim() || null,
    status: "queued" as NewsletterGenerationJobStatus,
    request_payload: payload,
    draft_document: context.draftDocument,
    quick_notes: context.quickNotes,
    uploaded_assets: context.uploadedAssets,
    result: null,
    persisted_document: null,
    error: null,
    completed_at: null,
    started_at: null,
    attempt_count: 0,
    created_at: now,
    updated_at: now
  };

  const { data, error } = await supabase
    .from("newsletter_generation_jobs")
    .insert(row)
    .select("*")
    .single();

  if (isMissingJobsTableError(error)) {
    return queueLocalJob(jobId, schoolId, payload, context, now, options);
  }

  if (error || !data) {
    throw new Error("The newsletter writing job could not be queued.");
  }

  const job = mapRowToJob(data as NewsletterGenerationJobRow);
  logJobEvent("queued", job, {
    draftId: context.draftDocument.id,
    title: context.draftDocument.title,
    transport: "supabase"
  });
  scheduleNewsletterGenerationJob(job.id, options);
  return job;
}

export async function getNewsletterGenerationJob(
  jobId: string,
  options?: NewsletterGenerationJobOptions & { resumeIfPending?: boolean }
) {
  const supabase = getServiceSupabase();

  if (!supabase) {
    const localJob = localJobs.get(jobId);

    if (!localJob) {
      return null;
    }

    if (isExpiredLocalJob(localJob)) {
      localJobs.delete(jobId);
      localJobRecords.delete(jobId);
      return null;
    }

    if (options?.resumeIfPending && ["queued", "running"].includes(localJob.status)) {
      scheduleNewsletterGenerationJob(jobId, options);
    }

    return localJob;
  }

  const { data, error } = await supabase
    .from("newsletter_generation_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (isMissingJobsTableError(error)) {
    const localJob = localJobs.get(jobId);

    if (!localJob) {
      return null;
    }

    if (options?.resumeIfPending && ["queued", "running"].includes(localJob.status)) {
      scheduleNewsletterGenerationJob(jobId, options);
    }

    return localJob;
  }

  if (error || !data) {
    return null;
  }

  const job = mapRowToJob(data as NewsletterGenerationJobRow);

  if (options?.resumeIfPending && ["queued", "running"].includes(job.status)) {
    scheduleNewsletterGenerationJob(jobId, options);
  }

  return job;
}

function scheduleNewsletterGenerationJob(jobId: string, options?: NewsletterGenerationJobOptions) {
  if (activeJobs.has(jobId)) {
    return;
  }

  activeJobs.add(jobId);

  queueMicrotask(() => {
    void runNewsletterGenerationJob(jobId, options).finally(() => {
      activeJobs.delete(jobId);
    });
  });
}

async function runNewsletterGenerationJob(jobId: string, options?: NewsletterGenerationJobOptions) {
  const initialRecord = await loadDurableJobRecord(jobId);

  if (!initialRecord) {
    return;
  }

  if (initialRecord.status === "completed" || initialRecord.status === "failed") {
    return;
  }

  const now = new Date().toISOString();

  await persistJobState(jobId, {
    status: "running",
    error: null,
    started_at: initialRecord.started_at ?? now,
    attempt_count: (initialRecord.attempt_count ?? 0) + 1
  });

  const runningJob = await getNewsletterGenerationJob(jobId);
  if (runningJob) {
    logJobEvent("running", runningJob, {
      attemptCount: (initialRecord.attempt_count ?? 0) + 1
    });
  }

  try {
    const result = await generateNewsletterPackage(initialRecord.request_payload, options);
    const nextDocument = applyGeneratedDraftToDocument(
      initialRecord.draft_document,
      result,
      initialRecord.quick_notes ?? "",
      initialRecord.uploaded_assets ?? []
    );
    const persisted = await saveNewsletter(nextDocument);

    await persistJobState(jobId, {
      status: "completed",
      result,
      persisted_document: persisted.newsletter,
      completed_at: new Date().toISOString(),
      error: null
    });

    const completedJob = await getNewsletterGenerationJob(jobId);
    if (completedJob) {
      await sendJobCallback(completedJob);
      logJobEvent("completed", completedJob, {
        newsletterId: persisted.newsletter.id,
        title: persisted.newsletter.title
      });
    }
  } catch (error) {
    await persistJobState(jobId, {
      status: "failed",
      error: error instanceof Error ? error.message : "The newsletter could not be written right now.",
      completed_at: new Date().toISOString()
    });

    const failedJob = await getNewsletterGenerationJob(jobId);
    if (failedJob) {
      await sendJobCallback(failedJob);
      logJobEvent("failed", failedJob, {
        error: error instanceof Error ? error.message : "Unknown error",
        diagnostics:
          error instanceof AgentResponseFormatError || error instanceof AgentConversationTimeoutError
            ? error.diagnosticsSummary
            : undefined
      });
    }
  }
}

async function loadDurableJobRecord(jobId: string) {
  const supabase = getServiceSupabase();

  if (!supabase) {
    const localJob = localJobs.get(jobId);
    const localRecord = localJobRecords.get(jobId);

    if (!localJob || !localRecord || isExpiredLocalJob(localJob)) {
      if (localJob) {
        localJobs.delete(jobId);
      }
      if (localRecord) {
        localJobRecords.delete(jobId);
      }
      return null;
    }

    return localRecord;
  }

  const { data, error } = await supabase
    .from("newsletter_generation_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (isMissingJobsTableError(error)) {
    const localRecord = localJobRecords.get(jobId);
    return localRecord ?? null;
  }

  if (error || !data) {
    return null;
  }

  return data as NewsletterGenerationJobRow;
}

async function persistJobState(
  jobId: string,
  updates: Partial<NewsletterGenerationJobRow>
) {
  const supabase = getServiceSupabase();

  if (!supabase) {
    const current = localJobs.get(jobId);

    if (!current) {
      return;
    }

    localJobs.set(jobId, {
      ...current,
      status: (updates.status as NewsletterGenerationJobStatus | undefined) ?? current.status,
      result: (updates.result as ContentGenerateResponse | null | undefined) ?? current.result,
      persistedDocument:
        (updates.persisted_document as NewsletterDocument | null | undefined) ?? current.persistedDocument,
      completedAt:
        typeof updates.completed_at === "string" || updates.completed_at === null
          ? updates.completed_at
          : current.completedAt,
      error: typeof updates.error === "string" || updates.error === null ? updates.error : current.error,
      updatedAt: new Date().toISOString()
    });
    const currentRecord = localJobRecords.get(jobId);
    if (currentRecord) {
      localJobRecords.set(jobId, {
        ...currentRecord,
        ...updates,
        updated_at: new Date().toISOString()
      });
    }
    return;
  }

  const patch: Record<string, unknown> = {
    ...updates,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from("newsletter_generation_jobs")
    .update(patch)
    .eq("id", jobId);

  if (isMissingJobsTableError(error)) {
    const current = localJobs.get(jobId);
    const currentRecord = localJobRecords.get(jobId);

    if (current) {
      localJobs.set(jobId, {
        ...current,
        status: (updates.status as NewsletterGenerationJobStatus | undefined) ?? current.status,
        result: (updates.result as ContentGenerateResponse | null | undefined) ?? current.result,
        persistedDocument:
          (updates.persisted_document as NewsletterDocument | null | undefined) ??
          current.persistedDocument,
        completedAt:
          typeof updates.completed_at === "string" || updates.completed_at === null
            ? updates.completed_at
            : current.completedAt,
        error:
          typeof updates.error === "string" || updates.error === null ? updates.error : current.error,
        updatedAt: new Date().toISOString()
      });
    }

    if (currentRecord) {
      localJobRecords.set(jobId, {
        ...currentRecord,
        ...updates,
        updated_at: new Date().toISOString()
      });
    }

    return;
  }

  if (error) {
    throw new Error("The newsletter writing job could not be updated.");
  }
}

function queueLocalJob(
  jobId: string,
  schoolId: string,
  payload: ContentGenerateRequest,
  context: NewsletterGenerationJobContext,
  now: string,
  options?: NewsletterGenerationJobOptions
) {
  const localJob: NewsletterGenerationJob = {
    id: jobId,
    schoolId,
    draftId: context.draftDocument.id || null,
    externalThreadId: context.externalThreadId?.trim() || null,
    callbackUrl: context.callbackUrl?.trim() || null,
    status: "queued",
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    result: null,
    persistedDocument: null,
    error: null
  };

  localJobs.set(jobId, localJob);
  localJobRecords.set(jobId, {
    id: jobId,
    school_id: schoolId,
    draft_id: context.draftDocument.id || null,
    external_thread_id: context.externalThreadId?.trim() || null,
    callback_url: context.callbackUrl?.trim() || null,
    status: "queued",
    request_payload: payload,
    draft_document: context.draftDocument,
    quick_notes: context.quickNotes,
    uploaded_assets: context.uploadedAssets,
    result: null,
    persisted_document: null,
    error: null,
    created_at: now,
    updated_at: now,
    completed_at: null,
    started_at: null,
    attempt_count: 0
  });
  pruneExpiredLocalJobs();
  logJobEvent("queued", localJob, {
    draftId: context.draftDocument.id,
    title: context.draftDocument.title,
    transport: "local"
  });
  scheduleNewsletterGenerationJob(jobId, options);
  return localJob;
}

async function sendJobCallback(job: NewsletterGenerationJob) {
  if (!job.callbackUrl) {
    return;
  }

  try {
    await fetch(job.callbackUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        status: job.status,
        jobId: job.id,
        draftId: job.draftId,
        externalThreadId: job.externalThreadId,
        error: job.error,
        completedAt: job.completedAt,
        result: job.result,
        newsletter: job.persistedDocument
      })
    });
  } catch (error) {
    console.warn(
      JSON.stringify({
        level: "warn",
        scope: "newsletter-generation-job",
        event: "callback_failed",
        jobId: job.id,
        callbackUrl: job.callbackUrl,
        error: error instanceof Error ? error.message : "Unknown callback error"
      })
    );
  }
}

function mapRowToJob(row: NewsletterGenerationJobRow): NewsletterGenerationJob {
  return {
    id: row.id,
    schoolId: row.school_id,
    draftId: row.draft_id,
    externalThreadId: row.external_thread_id,
    callbackUrl: row.callback_url,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    result: row.result,
    persistedDocument: row.persisted_document,
    error: row.error
  };
}

function pruneExpiredLocalJobs() {
  for (const [jobId, job] of localJobs.entries()) {
    if (isExpiredLocalJob(job)) {
      localJobs.delete(jobId);
      localJobRecords.delete(jobId);
    }
  }
}

function isExpiredLocalJob(job: NewsletterGenerationJob) {
  const lastTouched = Date.parse(job.completedAt ?? job.updatedAt);

  if (Number.isNaN(lastTouched)) {
    return false;
  }

  return Date.now() - lastTouched > LOCAL_JOB_TTL_MS;
}

function logJobEvent(
  event: "queued" | "running" | "completed" | "failed",
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

function isMissingJobsTableError(error: { code?: string; message?: string } | null) {
  if (!error) {
    return false;
  }

  return error.code === "42P01" || /newsletter_generation_jobs/i.test(error.message ?? "");
}
