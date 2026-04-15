import type { ContentGenerateResponse } from "@/types/integration";

const ELEVENLABS_API_BASE_URL = "https://api.elevenlabs.io";

export async function generateNewsletterWithElevenLabs({
  agentId,
  apiKey,
  prompt,
  trigger
}: {
  agentId: string;
  apiKey: string;
  prompt: string;
  trigger: string;
}): Promise<ContentGenerateResponse> {
  const signedUrl = await getSignedUrl(agentId, apiKey);
  const rawResponse = await sendPromptOverConversation(
    signedUrl,
    buildTriggeredConversationMessage(trigger, prompt)
  );

  return parseGeneratedNewsletter(rawResponse);
}

function buildTriggeredConversationMessage(trigger: string, prompt: string) {
  return [
    "Hello. Please switch into the requested newsletter mode and complete the task below.",
    "",
    "[THE_WIRE_AGENT_CALL]",
    trigger,
    "[/THE_WIRE_AGENT_CALL]",
    "",
    prompt
  ].join("\n");
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
  const WebSocketImpl = await getWebSocketImplementation();

  return new Promise<string>((resolve, reject) => {
    const socket = new WebSocketImpl(signedUrl);
    let resolved = false;
    let promptSent = false;
    let jsonReminderSent = false;
    const collectedResponses: string[] = [];

    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        socket.close();
        reject(new Error("The assistant took too long to respond. Please try again in a moment."));
      }
    }, 20000);

    const finish = (callback: () => void) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        callback();
      }
    };

    const handleOpen = () => {
      socket.send(
        JSON.stringify({
          type: "conversation_initiation_client_data"
        })
      );
    };

    const handleMessage = (raw: unknown) => {
      try {
        const rawText = normalizeSocketMessage(raw);
        const message = JSON.parse(rawText) as {
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
          collectedResponses.push(responseText);
          const combinedResponse = collectedResponses.join("\n\n");

          if (extractJsonBlock(combinedResponse)) {
            finish(() => {
              socket.close();
              resolve(combinedResponse);
            });
            return;
          }

          if (!jsonReminderSent && shouldRequestJsonRetry(combinedResponse)) {
            jsonReminderSent = true;
            socket.send(
              JSON.stringify({
                type: "user_message",
                text: buildJsonRetryMessage(prompt)
              })
            );
          }
        }
      } catch (error) {
        finish(() => {
          socket.close();
          reject(
            error instanceof Error ? error : new Error("The assistant response could not be read.")
          );
        });
      }
    };

    const handleError = (error?: unknown) => {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Unable to connect to the school's writing agent right now.";

      finish(() => reject(new Error(normalizeSocketError(message))));
    };

    const handleClose = () => {
      if (!resolved) {
        const combinedResponse = collectedResponses.join("\n\n");
        const extractedJson = extractJsonBlock(combinedResponse);

        if (extractedJson) {
          finish(() => resolve(combinedResponse));
          return;
        }

        finish(() =>
          reject(
            new Error(
              combinedResponse
                ? "The school's writing agent replied, but it did not return the required newsletter package."
                : "The school's writing agent closed the conversation too early."
            )
          )
        );
      }
    };

    attachSocketListener(socket, "open", handleOpen);
    attachSocketListener(socket, "message", handleMessage);
    attachSocketListener(socket, "error", handleError);
    attachSocketListener(socket, "close", handleClose);
  });
}

function shouldRequestJsonRetry(response: string) {
  const normalized = response.trim().toLowerCase();

  if (!normalized) {
    return false;
  }

  return (
    normalized.includes("how can i help") ||
    normalized.includes("hello") ||
    normalized.includes("hi ") ||
    normalized.includes("sure,") ||
    normalized.includes("i can help") ||
    !extractJsonBlock(response)
  );
}

function buildJsonRetryMessage(prompt: string) {
  return [
    "Thank you. Do not greet or explain.",
    "Return only the final newsletter JSON package for this exact request.",
    "Do not include any prose before or after the JSON.",
    'Use this exact top-level shape: {"title":"string","intro":"string","sections":[{"sectionType":"string","title":"string","content":{}}]}',
    "The response will be rejected if it is not valid JSON in the required newsletter package format.",
    "",
    prompt
  ].join("\n");
}

async function getWebSocketImplementation() {
  if (typeof globalThis.WebSocket === "function") {
    return globalThis.WebSocket;
  }

  const wsModule = await import("ws");
  return wsModule.WebSocket;
}

function attachSocketListener(
  socket: any,
  type: "open" | "message" | "error" | "close",
  listener: (...args: unknown[]) => void
) {
  if (typeof socket.addEventListener === "function") {
    socket.addEventListener(type, listener);
    return;
  }

  if (typeof socket.on === "function") {
    socket.on(type, listener);
  }
}

function normalizeSocketMessage(raw: unknown) {
  if (
    typeof raw === "object" &&
    raw !== null &&
    "data" in raw &&
    typeof (raw as { data?: unknown }).data === "string"
  ) {
    return (raw as { data: string }).data;
  }

  if (
    typeof raw === "object" &&
    raw !== null &&
    "data" in raw &&
    typeof Buffer !== "undefined" &&
    Buffer.isBuffer((raw as { data?: unknown }).data)
  ) {
    return ((raw as { data: Buffer }).data).toString();
  }

  if (typeof raw === "string") {
    return raw;
  }

  if (typeof Buffer !== "undefined" && Buffer.isBuffer(raw)) {
    return raw.toString();
  }

  return String(raw);
}

function normalizeSocketError(message: string) {
  if (message.toLowerCase().includes("mask")) {
    return "The school's writing agent could not accept the submission. Please try again, and if it keeps happening we should re-check the agent connection settings.";
  }

  return message;
}

function parseGeneratedNewsletter(rawResponse: string): ContentGenerateResponse {
  const extractedJson = extractJsonBlock(rawResponse);

  if (!extractedJson) {
    throw new Error(
      "The school's writing agent returned plain text instead of the required newsletter package."
    );
  }

  try {
    return JSON.parse(extractedJson) as ContentGenerateResponse;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error(
      "The school's writing agent returned a newsletter package that could not be read."
    );
  }
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
