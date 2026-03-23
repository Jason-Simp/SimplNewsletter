import WebSocket from "ws";

import type { ContentGenerateResponse } from "@/types/integration";

const ELEVENLABS_API_BASE_URL = "https://api.elevenlabs.io";

export async function generateNewsletterWithElevenLabs({
  agentId,
  apiKey,
  prompt
}: {
  agentId: string;
  apiKey: string;
  prompt: string;
}): Promise<ContentGenerateResponse> {
  const signedUrl = await getSignedUrl(agentId, apiKey);
  const rawResponse = await sendPromptOverConversation(signedUrl, prompt);

  return parseGeneratedNewsletter(rawResponse);
}

async function getSignedUrl(agentId: string, apiKey: string) {
  const url = new URL(`${ELEVENLABS_API_BASE_URL}/v1/convai/conversation/get-signed-url`);
  url.searchParams.set("agent_id", agentId);

  const response = await fetch(url.toString(), {
    headers: {
      "xi-api-key": apiKey
    }
  });

  const payload = (await response.json()) as { signed_url?: string; detail?: string };

  if (!response.ok || !payload.signed_url) {
    throw new Error(payload.detail || "Unable to start the ElevenLabs conversation.");
  }

  return payload.signed_url;
}

async function sendPromptOverConversation(signedUrl: string, prompt: string) {
  return new Promise<string>((resolve, reject) => {
    const socket = new WebSocket(signedUrl);
    let resolved = false;
    let promptSent = false;

    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        socket.close();
        reject(new Error("The assistant took too long to respond."));
      }
    }, 45000);

    const finish = (callback: () => void) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        callback();
      }
    };

    socket.on("open", () => {
      socket.send(
        JSON.stringify({
          type: "conversation_initiation_client_data"
        })
      );
    });

    socket.on("message", (raw) => {
      try {
        const message = JSON.parse(raw.toString()) as {
          type?: string;
          ping_event?: { event_id?: number };
          agent_response_event?: { agent_response?: string };
        };

        if (message.type === "ping" && message.ping_event?.event_id) {
          socket.send(
            JSON.stringify({
              type: "pong",
              event_id: message.ping_event.event_id
            })
          );
          return;
        }

        if (message.type === "conversation_initiation_metadata" && !promptSent) {
          promptSent = true;
          socket.send(
            JSON.stringify({
              type: "user_message",
              text: prompt
            })
          );
          return;
        }

        if (message.type === "agent_response" && message.agent_response_event?.agent_response) {
          const responseText = message.agent_response_event.agent_response;
          finish(() => {
            socket.close();
            resolve(responseText);
          });
        }
      } catch (error) {
        finish(() => {
          socket.close();
          reject(error instanceof Error ? error : new Error("The assistant response could not be read."));
        });
      }
    });

    socket.on("error", () => {
      finish(() => reject(new Error("Unable to connect to the ElevenLabs assistant.")));
    });

    socket.on("close", () => {
      if (!resolved) {
        finish(() => reject(new Error("The ElevenLabs assistant closed the conversation too early.")));
      }
    });
  });
}

function parseGeneratedNewsletter(rawResponse: string): ContentGenerateResponse {
  const extractedJson = extractJsonBlock(rawResponse);

  if (extractedJson) {
    try {
      return JSON.parse(extractedJson) as ContentGenerateResponse;
    } catch {
      // fall through to text fallback
    }
  }

  return {
    title: "Generated Newsletter Draft",
    intro: rawResponse,
    sections: [
      {
        sectionType: "top_story",
        title: "Top story",
        content: {
          headline: "Generated draft",
          summary: rawResponse,
          url: "#"
        }
      }
    ],
    raw: rawResponse
  };
}

function extractJsonBlock(raw: string) {
  const fencedMatch = raw.match(/```json\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return raw.slice(firstBrace, lastBrace + 1);
  }

  return null;
}
