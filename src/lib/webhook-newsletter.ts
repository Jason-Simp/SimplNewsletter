import { createHmac, timingSafeEqual } from "crypto";

import { ApiRouteError } from "@/lib/api-route";
import { defaultDistributionOptions, mediaConstraints } from "@/lib/product-config";
import { sampleNewsletter } from "@/lib/sample-data";
import { getSchoolById } from "@/lib/school-repository";
import type { UploadedAsset } from "@/types/media";
import type { NewsletterDocument } from "@/types/newsletter";
import type { SchoolProfile } from "@/types/school";

export type WebhookDraftRequest = {
  prompt?: string;
  notes?: string;
  links?: string[];
  imageHints?: string[];
  uploadedAssets?: UploadedAsset[];
  callbackUrl?: string;
  externalThreadId?: string;
};

const WEBHOOK_MAX_SKEW_MS = 1000 * 60 * 5;
const WEBHOOK_RATE_LIMIT_WINDOW_MS = 1000 * 60 * 5;
const WEBHOOK_RATE_LIMIT_MAX_REQUESTS = 60;
const webhookRequestLog = new Map<string, number[]>();
const webhookReplayCache = new Map<string, number>();

export function createFreshDraftForSchool(school: SchoolProfile): NewsletterDocument {
  const base = structuredClone(sampleNewsletter) as NewsletterDocument;
  const issueDate = new Date().toISOString().slice(0, 10);

  return {
    ...base,
    id: `draft-${Date.now()}`,
    status: "draft",
    title: `${school.name} newsletter`,
    issueDate,
    audience: `${school.name} families and staff`,
    intro: "",
    subjectLine: "",
    previewText: "",
    publishedAt: null,
    organization: {
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
    },
    workspace: {
      ...base.workspace,
      schoolId: school.id,
      publishMode: school.publishMode,
      generationProvider: school.generationProvider,
      knowledgeProvider: school.knowledgeProvider,
      syncProvider: school.syncProvider,
      assistantReference: school.assistantReference,
      integrationEndpoint: school.integrationEndpoint,
      encryptedKnowledgeRef: school.encryptedKnowledgeRef,
      mediaConstraints,
      roles: ["school_admin", "editor"]
    },
    distributionOptions: defaultDistributionOptions.map((option) => ({
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
            eyebrow: school.name,
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

export async function requireWebhookSchool(schoolId: string) {
  const school = await getSchoolById(schoolId.trim());

  if (!school) {
    throw new Error("School not found.");
  }

  return school;
}

export function getWebhookSecretFromHeaders(headers: Headers) {
  const authorization = headers.get("authorization") ?? "";

  if (authorization.toLowerCase().startsWith("bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  return headers.get("x-the-wire-webhook-secret")?.trim() ?? "";
}

export function assertWebhookSecret(providedSecret: string, school: SchoolProfile) {
  const expectedSecret = school.webhookSecret.trim();

  if (!expectedSecret) {
    throw new ApiRouteError(400, "This school's inbound webhook is not ready yet. Save a webhook secret on the school profile first.");
  }

  if (!providedSecret || !safeCompareSecrets(providedSecret, expectedSecret)) {
    throw new ApiRouteError(401, "Webhook secret is missing or invalid.");
  }
}

export function assertWebhookRequestSecurity({
  request,
  school,
  rawBody = ""
}: {
  request: Request;
  school: SchoolProfile;
  rawBody?: string;
}) {
  assertWebhookRateLimit(request, school.id);
  assertWebhookSecret(getWebhookSecretFromHeaders(request.headers), school);
  assertWebhookSignatureIfPresent(request, school, rawBody);
}

export function normalizeWebhookDraftRequest(body: Partial<WebhookDraftRequest> & Record<string, unknown>) {
  const prompt = String(body.prompt ?? body.notes ?? "").trim();

  return {
    prompt,
    notes: String(body.notes ?? prompt),
    links: Array.isArray(body.links) ? body.links.map(String) : [],
    imageHints: Array.isArray(body.imageHints) ? body.imageHints.map(String) : [],
    uploadedAssets: Array.isArray(body.uploadedAssets)
      ? body.uploadedAssets.map((item) => ({
          id: String(item?.id ?? ""),
          name: String(item?.name ?? ""),
          type: String(item?.type ?? ""),
          sizeMb: Number(item?.sizeMb ?? 0),
          status: item?.status === "local" ? ("local" as "local" | "uploaded") : ("uploaded" as "local" | "uploaded"),
          url: item?.url ? String(item.url) : undefined
        }))
      : [],
    callbackUrl: typeof body.callbackUrl === "string" ? body.callbackUrl.trim() : "",
    externalThreadId: typeof body.externalThreadId === "string" ? body.externalThreadId.trim() : ""
  };
}

function assertWebhookRateLimit(request: Request, schoolId: string) {
  const now = Date.now();
  const ip = getWebhookClientIp(request.headers);
  const key = `${schoolId}:${ip}`;
  const recentRequests = (webhookRequestLog.get(key) ?? []).filter(
    (timestamp) => now - timestamp < WEBHOOK_RATE_LIMIT_WINDOW_MS
  );

  if (recentRequests.length >= WEBHOOK_RATE_LIMIT_MAX_REQUESTS) {
    throw new ApiRouteError(429, "Webhook request limit reached. Please slow down and try again shortly.");
  }

  recentRequests.push(now);
  webhookRequestLog.set(key, recentRequests);
}

function assertWebhookSignatureIfPresent(request: Request, school: SchoolProfile, rawBody: string) {
  const timestamp = request.headers.get("x-the-wire-timestamp")?.trim() ?? "";
  const signature = request.headers.get("x-the-wire-signature")?.trim() ?? "";

  if (!timestamp && !signature) {
    return;
  }

  if (!timestamp || !signature) {
    throw new ApiRouteError(401, "Webhook signature headers are incomplete.");
  }

  const parsedTimestamp = Number.parseInt(timestamp, 10);

  if (!Number.isFinite(parsedTimestamp)) {
    throw new ApiRouteError(401, "Webhook timestamp is invalid.");
  }

  const now = Date.now();

  if (Math.abs(now - parsedTimestamp) > WEBHOOK_MAX_SKEW_MS) {
    throw new ApiRouteError(401, "Webhook timestamp is outside the allowed window.");
  }

  const replayKey = `${school.id}:${timestamp}:${signature}`;
  const replayExpiry = webhookReplayCache.get(replayKey);

  if (replayExpiry && replayExpiry > now) {
    throw new ApiRouteError(409, "Webhook request was already processed.");
  }

  const expectedSignature = createHmac("sha256", school.webhookSecret.trim())
    .update([timestamp, request.method.toUpperCase(), new URL(request.url).pathname, rawBody].join("."))
    .digest("hex");

  if (!safeCompareSecrets(signature, expectedSignature)) {
    throw new ApiRouteError(401, "Webhook signature is invalid.");
  }

  webhookReplayCache.set(replayKey, now + WEBHOOK_MAX_SKEW_MS);
  pruneReplayCache(now);
}

function safeCompareSecrets(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function getWebhookClientIp(headers: Headers) {
  const forwardedFor = headers.get("x-forwarded-for") ?? "";
  const realIp = headers.get("x-real-ip") ?? "";

  return forwardedFor.split(",")[0]?.trim() || realIp.trim() || "unknown";
}

function pruneReplayCache(now: number) {
  for (const [key, expiry] of webhookReplayCache.entries()) {
    if (expiry <= now) {
      webhookReplayCache.delete(key);
    }
  }
}

export function buildCreatePrompt(notes: string) {
  return `Write a school newsletter from the provided request. Decide which newsletter sections are needed, write those sections, and return a clean finished draft in the school's tone.\n\nWhat the newsletter should be about:\n${notes}`;
}

export function buildRevisionPrompt(document: NewsletterDocument, revisionNotes: string) {
  const currentSummary = summarizeDraftForRevision(document);

  return [
    "Revise the existing school newsletter draft using the new feedback below.",
    "Return a full updated newsletter package, not just comments.",
    "",
    "Current draft summary:",
    currentSummary,
    "",
    "Revision notes:",
    revisionNotes
  ].join("\n");
}

function summarizeDraftForRevision(document: NewsletterDocument) {
  const enabledSections = document.sections
    .filter((section) => section.enabled && !["hero", "footer"].includes(section.type))
    .map((section) => section.title)
    .slice(0, 6);

  return [
    `Title: ${document.title}`,
    document.intro ? `Intro: ${document.intro}` : "",
    enabledSections.length ? `Sections: ${enabledSections.join(", ")}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}
