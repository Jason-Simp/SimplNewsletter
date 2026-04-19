import type { ContentGenerateResponse } from "@/types/integration";
import {
  getNewsletterAllowedSectionTypesPrompt,
  getNewsletterRendererContractPrompt
} from "@/lib/newsletter-generation-prompt";
import { serverConfig } from "@/lib/server-config";

const ELEVENLABS_API_BASE_URL = "https://api.elevenlabs.io";

export class AgentResponseFormatError extends Error {
  responsePreview: string;
  diagnosticsSummary?: string;

  constructor(message: string, responsePreview: string, diagnosticsSummary?: string) {
    super(message);
    this.name = "AgentResponseFormatError";
    this.responsePreview = responsePreview;
    this.diagnosticsSummary = diagnosticsSummary;
  }
}

export class AgentConversationTimeoutError extends Error {
  responsePreview: string;
  diagnosticsSummary: string;

  constructor(message: string, responsePreview: string, diagnosticsSummary: string) {
    super(message);
    this.name = "AgentConversationTimeoutError";
    this.responsePreview = responsePreview;
    this.diagnosticsSummary = diagnosticsSummary;
  }
}

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
    let packageCorrectionSent = false;
    let agentResponseCount = 0;
    const collectedResponses: string[] = [];
    const timeoutMs = Math.max(serverConfig.integrationTimeoutMs, 120000);
    const maxDurationMs = Math.max(serverConfig.integrationMaxDurationMs, timeoutMs, 240000);
    const diagnostics = createConversationDiagnostics();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let hardStopId: ReturnType<typeof setTimeout> | null = null;

    recordConversationEvent(diagnostics, "socket_open_requested");

    const startTimeout = () => {
      timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          socket.close();
          const responsePreview = buildResponsePreview(collectedResponses.join("\n\n"));
          const diagnosticsSummary = summarizeConversationDiagnostics(diagnostics, {
            promptSent,
            packageCorrectionSent,
            agentResponseCount,
            responsePreview
          });
          logConversationDiagnostics("timeout", diagnosticsSummary);
          reject(
            new AgentConversationTimeoutError(
              buildTimeoutMessage({
                promptSent,
                packageCorrectionSent,
                hasAgentResponse: collectedResponses.length > 0,
                responsePreview
              }),
              responsePreview,
              diagnosticsSummary
            )
          );
        }
      }, timeoutMs);
    };

    const resetTimeout = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      startTimeout();
    };

    startTimeout();
    hardStopId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        socket.close();
        const responsePreview = buildResponsePreview(collectedResponses.join("\n\n"));
        const diagnosticsSummary = summarizeConversationDiagnostics(diagnostics, {
          promptSent,
          packageCorrectionSent,
          agentResponseCount,
          responsePreview
        });
        logConversationDiagnostics("hard_stop", diagnosticsSummary);
        reject(
          new AgentConversationTimeoutError(
            buildHardStopMessage({
              promptSent,
              packageCorrectionSent,
              hasAgentResponse: collectedResponses.length > 0,
              responsePreview
            }),
            responsePreview,
            diagnosticsSummary
          )
        );
      }
    }, maxDurationMs);

    const finish = (callback: () => void) => {
      if (!resolved) {
        resolved = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (hardStopId) {
          clearTimeout(hardStopId);
        }
        callback();
      }
    };

    const handleOpen = () => {
      recordConversationEvent(diagnostics, "socket_open");
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
          agent_response_correction_event?: {
            original_agent_response?: string;
            corrected_agent_response?: string;
          };
          text_response_part?: {
            type?: "start" | "delta" | "stop";
            text?: string;
            event_id?: string;
          };
        };

        if (message.type === "ping" && message.ping_event?.event_id) {
          diagnostics.pingCount += 1;
          recordConversationEvent(diagnostics, "ping");
          resetTimeout();
          socket.send(
            JSON.stringify({
              type: "pong",
              event_id: message.ping_event.event_id
            })
          );
          return;
        }

        if (message.type === "conversation_initiation_metadata" && !promptSent) {
          resetTimeout();
          promptSent = true;
          recordConversationEvent(diagnostics, "prompt_sent");
          socket.send(
            JSON.stringify({
              type: "user_message",
              text: prompt
            })
          );
          return;
        }

        if (message.type === "agent_response" && message.agent_response_event?.agent_response) {
          resetTimeout();
          agentResponseCount += 1;
          const responseText = message.agent_response_event.agent_response;
          collectedResponses.push(responseText);
          recordConversationEvent(diagnostics, "agent_response", responseText);
          const combinedResponse = collectedResponses.join("\n\n");
          const packageStatus = getPackageStatus(combinedResponse);

          if (packageStatus === "ready") {
            logConversationDiagnostics(
              "completed",
              summarizeConversationDiagnostics(diagnostics, {
                promptSent,
                packageCorrectionSent,
                agentResponseCount,
                responsePreview: buildResponsePreview(combinedResponse)
              })
            );
            finish(() => {
              socket.close();
              resolve(combinedResponse);
            });
            return;
          }

          const shouldCorrect =
            !packageCorrectionSent &&
            packageStatus === "invalid" &&
            shouldSendPackageCorrection({
              combinedResponse,
              agentResponseCount
            });

          if (shouldCorrect) {
            packageCorrectionSent = true;
            diagnostics.correctionCount += 1;
            recordConversationEvent(diagnostics, "correction_sent", combinedResponse);
            socket.send(
              JSON.stringify({
                type: "user_message",
                text: buildPackageCorrectionMessage(
                  prompt,
                  "The reply did not yet contain the required completed newsletter JSON package.",
                  combinedResponse
                )
              })
            );
          }
        }

        if (
          message.type === "agent_response_correction" &&
          message.agent_response_correction_event?.corrected_agent_response
        ) {
          resetTimeout();
          const correctedResponse = message.agent_response_correction_event.corrected_agent_response;
          recordConversationEvent(diagnostics, "agent_response_correction", correctedResponse);

          if (collectedResponses.length > 0) {
            collectedResponses[collectedResponses.length - 1] = correctedResponse;
          } else {
            collectedResponses.push(correctedResponse);
          }

          const combinedResponse = collectedResponses.join("\n\n");
          const packageStatus = getPackageStatus(combinedResponse);

          if (packageStatus === "ready") {
            logConversationDiagnostics(
              "completed",
              summarizeConversationDiagnostics(diagnostics, {
                promptSent,
                packageCorrectionSent,
                agentResponseCount,
                responsePreview: buildResponsePreview(combinedResponse)
              })
            );
            finish(() => {
              socket.close();
              resolve(combinedResponse);
            });
          }

          return;
        }

        if (message.type === "agent_chat_response_part" && message.text_response_part) {
          resetTimeout();
          const part = message.text_response_part;
          const partText = typeof part.text === "string" ? part.text : "";
          diagnostics.streamPartCount += 1;

          if (part.type === "start") {
            collectedResponses.push(partText);
            recordConversationEvent(diagnostics, "stream_start", partText);
          } else if (part.type === "delta") {
            if (collectedResponses.length === 0) {
              collectedResponses.push(partText);
            } else {
              collectedResponses[collectedResponses.length - 1] += partText;
            }
            diagnostics.streamDeltaChars += partText.length;
          } else if (part.type === "stop") {
            if (collectedResponses.length === 0 && partText) {
              collectedResponses.push(partText);
            } else if (partText) {
              collectedResponses[collectedResponses.length - 1] += partText;
            }

            agentResponseCount += 1;
            const combinedResponse = collectedResponses.join("\n\n");
            recordConversationEvent(diagnostics, "stream_stop", combinedResponse);
            const packageStatus = getPackageStatus(combinedResponse);

            if (packageStatus === "ready") {
              logConversationDiagnostics(
                "completed",
                summarizeConversationDiagnostics(diagnostics, {
                  promptSent,
                  packageCorrectionSent,
                  agentResponseCount,
                  responsePreview: buildResponsePreview(combinedResponse)
                })
              );
              finish(() => {
                socket.close();
                resolve(combinedResponse);
              });
              return;
            }

            const shouldCorrect =
              !packageCorrectionSent &&
              packageStatus === "invalid" &&
              shouldSendPackageCorrection({
                combinedResponse,
                agentResponseCount
              });

            if (shouldCorrect) {
              packageCorrectionSent = true;
              diagnostics.correctionCount += 1;
              recordConversationEvent(diagnostics, "correction_sent", combinedResponse);
              socket.send(
                JSON.stringify({
                  type: "user_message",
                  text: buildPackageCorrectionMessage(
                    prompt,
                    "The reply did not yet contain the required completed newsletter JSON package.",
                    combinedResponse
                  )
                })
              );
            }
          }

          return;
        }
      } catch (error) {
        logConversationDiagnostics(
          "parse_error",
          summarizeConversationDiagnostics(diagnostics, {
            promptSent,
            packageCorrectionSent,
            agentResponseCount,
            responsePreview: buildResponsePreview(collectedResponses.join("\n\n"))
          })
        );
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
      logConversationDiagnostics(
        "socket_error",
        summarizeConversationDiagnostics(diagnostics, {
          promptSent,
          packageCorrectionSent,
          agentResponseCount,
          responsePreview: buildResponsePreview(collectedResponses.join("\n\n")),
          socketError: message
        })
      );

      finish(() => reject(new Error(normalizeSocketError(message))));
    };

    const handleClose = () => {
      if (!resolved) {
        const combinedResponse = collectedResponses.join("\n\n");
        const extractedJson = extractJsonBlock(combinedResponse);
        const diagnosticsSummary = summarizeConversationDiagnostics(diagnostics, {
          promptSent,
          packageCorrectionSent,
          agentResponseCount,
          responsePreview: buildResponsePreview(combinedResponse)
        });

        if (extractedJson) {
          logConversationDiagnostics("closed_with_json", diagnosticsSummary);
          finish(() => resolve(combinedResponse));
          return;
        }

        logConversationDiagnostics("closed_without_package", diagnosticsSummary);
        finish(() =>
          reject(
            new AgentResponseFormatError(
              combinedResponse
                ? "The school's writing agent replied, but it did not return the required newsletter package."
                : "The school's writing agent closed the conversation too early.",
              buildResponsePreview(combinedResponse),
              diagnosticsSummary
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

function buildHardStopMessage({
  promptSent,
  packageCorrectionSent,
  hasAgentResponse,
  responsePreview
}: {
  promptSent: boolean;
  packageCorrectionSent: boolean;
  hasAgentResponse: boolean;
  responsePreview: string;
}) {
  if (hasAgentResponse) {
    return withResponsePreview(
      "The school's writing agent stayed active, but it still did not finish the newsletter package in the allowed time.",
      responsePreview
    );
  }

  if (packageCorrectionSent) {
    return "The school's writing agent acknowledged the correction request, but it still did not return the newsletter package in the allowed time.";
  }

  if (promptSent) {
    return "The school's writing agent received the request, but it did not begin returning the newsletter package in the allowed time.";
  }

  return "The school's writing agent did not start responding in the allowed time.";
}

function buildTimeoutMessage({
  promptSent,
  packageCorrectionSent,
  hasAgentResponse,
  responsePreview
}: {
  promptSent: boolean;
  packageCorrectionSent: boolean;
  hasAgentResponse: boolean;
  responsePreview: string;
}) {
  if (hasAgentResponse) {
    return withResponsePreview(
      "The school's writing agent started responding, but it did not finish the newsletter package in time.",
      responsePreview
    );
  }

  if (packageCorrectionSent) {
    return "The school's writing agent acknowledged the request, but it did not return the newsletter package in time.";
  }

  if (promptSent) {
    return "The school's writing agent received the request, but it did not begin returning the newsletter package in time.";
  }

  return "The school's writing agent took too long to respond. Please try again in a moment.";
}

function buildPackageCorrectionMessage(prompt: string, issue: string, response: string) {
  return [
    "Your last reply was rejected.",
    `Reason: ${issue}`,
    `Last reply preview: "${buildResponsePreview(response)}"`,
    "Replace your last reply completely.",
    "Do not greet, explain, summarize, or wrap the answer in markdown.",
    "Return only the final newsletter JSON package for this exact request.",
    "Use this exact top-level shape:",
    '{"title":"string","intro":"string","sections":[{"sectionType":"string","title":"string","content":{}}]}',
    "Use only these section types:",
    getNewsletterAllowedSectionTypesPrompt(),
    "Use this renderer contract exactly:",
    getNewsletterRendererContractPrompt(),
    "The response will be rejected again if it is not valid JSON in the required newsletter package format.",
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
    throw new AgentResponseFormatError(
      "The school's writing agent returned plain text instead of the required newsletter package.",
      buildResponsePreview(rawResponse)
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

function getPackageStatus(rawResponse: string): "ready" | "pending" | "invalid" {
  const extractedJson = extractJsonBlock(rawResponse);

  if (!extractedJson) {
    if (looksLikePartialJson(rawResponse) || looksLikeStreamingDraft(rawResponse)) {
      return "pending";
    }

    return "invalid";
  }

  try {
    JSON.parse(extractedJson);
    return "ready";
  } catch {
    return looksLikePartialJson(rawResponse) ? "pending" : "invalid";
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

function looksLikePartialJson(raw: string) {
  const trimmed = raw.trim();

  if (!trimmed) {
    return false;
  }

  const hasOpeningFence = trimmed.includes("```json");
  const hasClosingFence = trimmed.includes("```", trimmed.indexOf("```json") + 7);
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (hasOpeningFence && !hasClosingFence) {
    return true;
  }

  if (firstBrace >= 0 && lastBrace < firstBrace) {
    return true;
  }

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const candidate = trimmed.slice(firstBrace, lastBrace + 1);

    try {
      JSON.parse(candidate);
      return false;
    } catch {
      return true;
    }
  }

  return false;
}

function looksLikeStreamingDraft(raw: string) {
  const normalized = raw.trim();

  if (!normalized) {
    return false;
  }

  return normalized.length < 500;
}

function shouldSendPackageCorrection({
  combinedResponse,
  agentResponseCount
}: {
  combinedResponse: string;
  agentResponseCount: number;
}) {
  const normalized = combinedResponse.trim();

  if (!normalized) {
    return false;
  }

  if (looksLikePartialJson(normalized)) {
    return false;
  }

  if (agentResponseCount < 3 && normalized.length < 700) {
    return false;
  }

  return true;
}

function buildResponsePreview(raw: string) {
  return raw.replace(/\s+/g, " ").trim().slice(0, 220);
}

function withResponsePreview(message: string, responsePreview: string) {
  return responsePreview ? `${message} Agent reply preview: "${responsePreview}"` : message;
}

type ConversationDiagnostics = {
  startedAt: number;
  pingCount: number;
  correctionCount: number;
  streamPartCount: number;
  streamDeltaChars: number;
  events: string[];
};

function createConversationDiagnostics(): ConversationDiagnostics {
  return {
    startedAt: Date.now(),
    pingCount: 0,
    correctionCount: 0,
    streamPartCount: 0,
    streamDeltaChars: 0,
    events: []
  };
}

function recordConversationEvent(
  diagnostics: ConversationDiagnostics,
  event: string,
  detail?: string
) {
  const timestampMs = Date.now() - diagnostics.startedAt;
  const summary = detail ? `${event}:${buildResponsePreview(detail)}` : event;
  diagnostics.events.push(`${timestampMs}ms ${summary}`);

  if (diagnostics.events.length > 16) {
    diagnostics.events.shift();
  }
}

function summarizeConversationDiagnostics(
  diagnostics: ConversationDiagnostics,
  extra: {
    promptSent: boolean;
    packageCorrectionSent: boolean;
    agentResponseCount: number;
    responsePreview: string;
    socketError?: string;
  }
) {
  const durationMs = Date.now() - diagnostics.startedAt;

  return JSON.stringify({
    durationMs,
    promptSent: extra.promptSent,
    packageCorrectionSent: extra.packageCorrectionSent,
    agentResponseCount: extra.agentResponseCount,
    pingCount: diagnostics.pingCount,
    correctionCount: diagnostics.correctionCount,
    streamPartCount: diagnostics.streamPartCount,
    streamDeltaChars: diagnostics.streamDeltaChars,
    responsePreview: extra.responsePreview,
    socketError: extra.socketError,
    events: diagnostics.events
  });
}

function logConversationDiagnostics(scope: string, diagnosticsSummary: string) {
  console.info(
    JSON.stringify({
      level: "info",
      scope: "elevenlabs-newsletter-conversation",
      event: scope,
      diagnostics: diagnosticsSummary
    })
  );
}
