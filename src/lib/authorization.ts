import { canDeleteNewsletters, canManageMembers, canPublishNewsletters } from "./member-access";
import type { MemberRecord } from "../types/member";

export function isWithinSchoolScope(member: MemberRecord | null, schoolId: string) {
  return Boolean(
    member &&
      schoolId.trim() &&
      (member.role === "company_admin" || member.schoolId === schoolId.trim())
  );
}

export function canPublishForSchool(member: MemberRecord | null, schoolId: string) {
  return canPublishNewsletters(member) && isWithinSchoolScope(member, schoolId);
}

export function canDeleteForSchool(member: MemberRecord | null, schoolId: string) {
  return canDeleteNewsletters(member) && isWithinSchoolScope(member, schoolId);
}

export function canManageMemberAtSchool(member: MemberRecord | null, schoolId: string) {
  return canManageMembers(member) && isWithinSchoolScope(member, schoolId);
}
