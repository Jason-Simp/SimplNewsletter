function normalizeExternalUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  const withProtocol =
    trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;

  return withProtocol.replace(/\/+$/, "");
}

function resolveExternalUrl() {
  const candidates = [
    process.env.APP_PUBLIC_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.RENDER_EXTERNAL_URL,
    process.env.VERCEL_URL
  ];

  for (const candidate of candidates) {
    const normalized = normalizeExternalUrl(candidate ?? "");

    if (normalized) {
      return normalized;
    }
  }

  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }

  return "";
}

const renderExternalUrl = resolveExternalUrl();

export const serverConfig = {
  assetRetentionDays: Number(process.env.ASSET_RETENTION_DAYS ?? 30),
  storageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? "newsletter-assets",
  integrationBaseUrl:
    process.env.INTEGRATION_BASE_URL ?? process.env.ELEVENLABS_AGENT_BASE_URL ?? "",
  integrationApiKey:
    process.env.INTEGRATION_API_KEY ??
    process.env.ELEVENLABS_API_KEY ??
    process.env.ELEVENLABS_AGENT_API_KEY ??
    "",
  integrationTimeoutMs: Number(
    process.env.INTEGRATION_TIMEOUT_MS ?? process.env.ELEVENLABS_AGENT_TIMEOUT_MS ?? 90000
  ),
  integrationMaxDurationMs: Number(
    process.env.INTEGRATION_MAX_DURATION_MS ?? process.env.ELEVENLABS_AGENT_MAX_DURATION_MS ?? 180000
  ),
  hasSupabase:
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  hasResend: Boolean(process.env.RESEND_API_KEY),
  hasIntegrationBridge: Boolean(
    process.env.INTEGRATION_BASE_URL || process.env.ELEVENLABS_AGENT_BASE_URL
  ),
  hasPublicAppUrl: Boolean(renderExternalUrl),
  renderExternalUrl
} as const;
