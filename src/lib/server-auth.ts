import { createClient, type User } from "@supabase/supabase-js";

import { ApiRouteError } from "@/lib/api-route";
import { canAccessBuilder, canManageCodes, canManageMembers, canManageSchools } from "@/lib/member-access";
import { getMemberByEmail } from "@/lib/member-repository";
import type { MemberRecord } from "@/types/member";

export async function requireSignedInUser(request: Request) {
  const user = await getSignedInUser(request);

  if (!user?.email) {
    throw new ApiRouteError(401, "Sign in is required for this action.");
  }

  return user;
}

export async function requireSignedInMember(request: Request) {
  const user = await requireSignedInUser(request);
  const member = await getMemberByEmail(user.email ?? "");

  if (!member || !member.isActive) {
    throw new ApiRouteError(403, "Your member access is not active yet.");
  }

  return { user, member };
}

export function requireSchoolManagement(member: MemberRecord | null) {
  if (!canManageSchools(member)) {
    throw new ApiRouteError(403, "Only school admins can manage school profiles.");
  }
}

export function requireMemberManagement(member: MemberRecord | null) {
  if (!canManageMembers(member)) {
    throw new ApiRouteError(403, "Only school admins can manage members.");
  }
}

export function requireCodeManagement(member: MemberRecord | null) {
  if (!canManageCodes(member)) {
    throw new ApiRouteError(403, "Only company admins can manage signup codes.");
  }
}

export function requireBuilderAccess(member: MemberRecord | null) {
  if (!canAccessBuilder(member)) {
    throw new ApiRouteError(403, "You do not have access to the newsletter builder.");
  }
}

export function assertSchoolScope(member: MemberRecord, schoolId: string) {
  if (member.role !== "company_admin" && member.schoolId !== schoolId) {
    throw new ApiRouteError(403, "This action is limited to your assigned school.");
  }
}

async function getSignedInUser(request: Request): Promise<User | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const authHeader = request.headers.get("authorization");

  if (!supabaseUrl || !anonKey || !authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const accessToken = authHeader.slice("Bearer ".length).trim();

  if (!accessToken) {
    return null;
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    return null;
  }

  return data.user;
}
