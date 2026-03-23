const ELEVENLABS_API_BASE_URL = "https://api.elevenlabs.io";

export async function verifyElevenLabsAgent({
  agentId,
  apiKey
}: {
  agentId: string;
  apiKey: string;
}) {
  const response = await fetch(`${ELEVENLABS_API_BASE_URL}/v1/convai/agents/${encodeURIComponent(agentId)}`, {
    method: "GET",
    headers: {
      "xi-api-key": apiKey
    }
  });

  let payload: unknown = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "detail" in payload &&
      typeof (payload as { detail?: unknown }).detail === "string"
        ? (payload as { detail: string }).detail
        : "Unable to connect to the ElevenLabs agent.";

    throw new Error(message);
  }

  return payload;
}
