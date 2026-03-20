import { getServiceSupabase } from "@/lib/supabase/server";
import type { SignupCodeRecord } from "@/types/signup-code";

const fallbackCodes: SignupCodeRecord[] = [
  {
    id: "default-thewire-code",
    code: "thewire",
    description: "Default launch signup code",
    isActive: true,
    maxUses: null,
    useCount: 0,
    expiresAt: null
  }
];

type SignupCodeRow = {
  id: string;
  code: string;
  description: string | null;
  is_active: boolean;
  max_uses: number | null;
  use_count: number;
  expires_at: string | null;
};

export async function listSignupCodes() {
  const supabase = getServiceSupabase();

  if (!supabase) {
    return fallbackCodes;
  }

  const { data, error } = await supabase
    .from("signup_codes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return fallbackCodes;
  }

  return (data as SignupCodeRow[]).map(mapCodeRow);
}

export async function saveSignupCode(input: {
  code: string;
  description?: string;
  maxUses?: number | null;
  expiresAt?: string | null;
}) {
  const normalizedCode = input.code.trim().toLowerCase();
  const supabase = getServiceSupabase();

  if (!supabase) {
    return {
      id: `local-${Date.now()}`,
      code: normalizedCode,
      description: input.description ?? "",
      isActive: true,
      maxUses: input.maxUses ?? null,
      useCount: 0,
      expiresAt: input.expiresAt ?? null
    } satisfies SignupCodeRecord;
  }

  const { data, error } = await supabase
    .from("signup_codes")
    .upsert(
      {
        code: normalizedCode,
        description: input.description ?? null,
        is_active: true,
        max_uses: input.maxUses ?? null,
        expires_at: input.expiresAt ?? null
      },
      { onConflict: "code" }
    )
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to save signup code.");
  }

  return mapCodeRow(data as SignupCodeRow);
}

export async function consumeSignupCode(code: string) {
  const normalizedCode = code.trim().toLowerCase();
  const supabase = getServiceSupabase();

  if (!supabase) {
    const fallback = fallbackCodes.find((item) => item.code === normalizedCode && item.isActive);
    if (!fallback) {
      throw new Error("Invalid signup code.");
    }
    return fallback;
  }

  const { data, error } = await supabase
    .from("signup_codes")
    .select("*")
    .eq("code", normalizedCode)
    .single();

  if (error || !data) {
    throw new Error("Invalid signup code.");
  }

  const codeRow = data as SignupCodeRow;

  if (!codeRow.is_active) {
    throw new Error("This signup code is inactive.");
  }

  if (codeRow.expires_at && new Date(codeRow.expires_at).getTime() < Date.now()) {
    throw new Error("This signup code has expired.");
  }

  if (codeRow.max_uses !== null && codeRow.use_count >= codeRow.max_uses) {
    throw new Error("This signup code has already been used.");
  }

  const { error: updateError } = await supabase
    .from("signup_codes")
    .update({ use_count: codeRow.use_count + 1 })
    .eq("id", codeRow.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return mapCodeRow({ ...codeRow, use_count: codeRow.use_count + 1 });
}

function mapCodeRow(row: SignupCodeRow): SignupCodeRecord {
  return {
    id: row.id,
    code: row.code,
    description: row.description ?? "",
    isActive: row.is_active,
    maxUses: row.max_uses,
    useCount: row.use_count,
    expiresAt: row.expires_at
  };
}
