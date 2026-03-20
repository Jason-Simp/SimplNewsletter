export const serverConfig = {
  assetRetentionDays: Number(process.env.ASSET_RETENTION_DAYS ?? 30),
  hasSupabase:
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  hasResend: Boolean(process.env.RESEND_API_KEY),
  renderExternalUrl: process.env.RENDER_EXTERNAL_URL ?? "http://localhost:3000"
} as const;
