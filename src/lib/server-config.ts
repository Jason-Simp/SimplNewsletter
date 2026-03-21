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
    process.env.INTEGRATION_TIMEOUT_MS ?? process.env.ELEVENLABS_AGENT_TIMEOUT_MS ?? 30000
  ),
  hasSupabase:
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  hasResend: Boolean(process.env.RESEND_API_KEY),
  hasIntegrationBridge: Boolean(
    process.env.INTEGRATION_BASE_URL || process.env.ELEVENLABS_AGENT_BASE_URL
  ),
  renderExternalUrl: process.env.RENDER_EXTERNAL_URL ?? "http://localhost:3000"
} as const;
