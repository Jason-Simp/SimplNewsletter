import { serverConfig } from "@/lib/server-config";
import type {
  AgentGenerateRequest,
  AgentGenerateResponse,
  AgentVectorSyncRequest
} from "@/types/agent";

function getHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  if (serverConfig.elevenLabsAgentApiKey) {
    headers.Authorization = `Bearer ${serverConfig.elevenLabsAgentApiKey}`;
  }

  return headers;
}

async function callAgent<T>(path: string, body: unknown): Promise<T> {
  if (!serverConfig.hasElevenLabsAgent) {
    throw new Error("ElevenLabs agent base URL is not configured.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), serverConfig.elevenLabsAgentTimeoutMs);

  try {
    const response = await fetch(`${serverConfig.elevenLabsAgentBaseUrl}${path}`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(body),
      signal: controller.signal
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload?.message ?? `Agent call failed for ${path}`);
    }

    return payload as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function generateNewsletterDraftWithAgent(request: AgentGenerateRequest) {
  return callAgent<AgentGenerateResponse>("/generate_newsletter", request);
}

export async function syncNewsletterToAgentVectorStore(request: AgentVectorSyncRequest) {
  return callAgent<{ status: string; id?: string; raw?: unknown }>("/vector_sync", request);
}
