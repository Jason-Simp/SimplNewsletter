import { randomUUID } from "crypto";

import { NextResponse } from "next/server";
import type { MemberRecord } from "@/types/member";

type LogDetails = Record<string, unknown> | undefined;

const SENSITIVE_KEY_PATTERN = /api|authorization|cookie|key|pass|secret|token/i;

export class ApiRouteError extends Error {
  status: number;
  exposeMessage: boolean;

  constructor(status: number, message: string, options?: { exposeMessage?: boolean }) {
    super(message);
    this.name = "ApiRouteError";
    this.status = status;
    this.exposeMessage = options?.exposeMessage ?? true;
  }
}

export function logApiError(scope: string, error: unknown, details?: LogDetails) {
  const requestId = randomUUID();
  const errorObject =
    error instanceof Error
      ? {
          name: error.name,
          message: redactMessage(error.message),
          stack: error.stack
        }
      : {
          name: "UnknownError",
          message: "Unknown error"
        };

  console.error(
    JSON.stringify({
      level: "error",
      requestId,
      scope,
      error: errorObject,
      details: sanitizeForLogs(details)
    })
  );

  return requestId;
}

export function jsonApiError(
  scope: string,
  error: unknown,
  fallbackMessage: string,
  details?: LogDetails
) {
  const requestId = logApiError(scope, error, details);
  const status = error instanceof ApiRouteError ? error.status : 500;
  const message =
    error instanceof ApiRouteError && error.exposeMessage
      ? error.message
      : fallbackMessage;

  return NextResponse.json(
    {
      status: "error",
      message,
      requestId
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}

export function logAuditEvent(
  action: string,
  actor: Pick<MemberRecord, "id" | "email" | "role" | "schoolId"> | null,
  details?: LogDetails
) {
  const auditId = randomUUID();

  console.info(
    JSON.stringify({
      level: "audit",
      auditId,
      action,
      actor: actor
        ? {
            id: actor.id,
            email: actor.email,
            role: actor.role,
            schoolId: actor.schoolId
          }
        : null,
      details: sanitizeForLogs(details)
    })
  );

  return auditId;
}

function sanitizeForLogs(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLogs(item));
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key) ? "[redacted]" : sanitizeForLogs(nested)
    ]);
    return Object.fromEntries(entries);
  }

  if (typeof value === "string") {
    return redactMessage(value);
  }

  return value;
}

function redactMessage(message: string) {
  return message
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
    .replace(/\b(sk|sb|supabase)_[A-Za-z0-9._-]+\b/gi, "[redacted]")
    .replace(/\beyJ[A-Za-z0-9._-]+\b/g, "[redacted]");
}
