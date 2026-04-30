import { createClient, type User } from "@supabase/supabase-js";

import { ApiRouteError } from "@/lib/api-route";
import { isWithinSchoolScope } from "@/lib/authorization";
import {
  canAccessBuilder,
  canDeleteNewsletters,
  canManageCodes,
  canManageMembers,
  canManageSchools,
  canPublishNewsletters
} from "@/lib/member-access";
import { getMemberForAuth } from "@/lib/member-repository";
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
  const member = await getMemberForAuth({
    email: user.email ?? "",
    authUserId: user.id,
    activeSchoolId: request.headers.get("x-active-school-id")
  });

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

export function requireNewsletterPublishAccess(member: MemberRecord | null) {
  if (!canPublishNewsletters(member)) {
    throw new ApiRouteError(403, "Only school admins can publish newsletters.");
  }
}

export function requireNewsletterDeleteAccess(member: MemberRecord | null) {
  if (!canDeleteNewsletters(member)) {
    throw new ApiRouteError(403, "Only school admins can delete newsletters.");
  }
}

export function assertSchoolScope(member: MemberRecord, schoolId: string) {
  if (!isWithinSchoolScope(member, schoolId)) {
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
