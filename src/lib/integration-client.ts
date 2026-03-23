import { serverConfig } from "@/lib/server-config";
import type {
  ContentGenerateRequest,
  ContentGenerateResponse,
  ContentSyncRequest
} from "@/types/integration";

function getHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  if (serverConfig.integrationApiKey) {
    headers.Authorization = `Bearer ${serverConfig.integrationApiKey}`;
  }

  return headers;
}

async function callIntegration<T>(path: string, body: unknown): Promise<T> {
  if (!serverConfig.hasIntegrationBridge) {
    throw new Error("The newsletter writing connection is not set up yet.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), serverConfig.integrationTimeoutMs);

  try {
    const response = await fetch(`${serverConfig.integrationBaseUrl}${path}`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(body),
      signal: controller.signal
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload?.message ?? `Integration call failed for ${path}`);
    }

    return payload as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function generateContentWithProvider(request: ContentGenerateRequest) {
  return callIntegration<ContentGenerateResponse>("/generate_content", request);
}

export async function syncContentToProvider(request: ContentSyncRequest) {
  return callIntegration<{ status: string; id?: string; raw?: unknown }>("/sync_content", request);
}
