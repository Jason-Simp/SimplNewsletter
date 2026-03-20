import { NextResponse } from "next/server";

import { defaultDistributionOptions, mediaConstraints, publishModeOptions } from "@/lib/product-config";
import { serverConfig } from "@/lib/server-config";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    config: {
      mediaConstraints,
      publishModeOptions,
      distributionOptions: defaultDistributionOptions,
      assetRetentionDays: serverConfig.assetRetentionDays,
      providers: {
        supabaseConfigured: serverConfig.hasSupabase,
        resendConfigured: serverConfig.hasResend
      }
    }
  });
}
