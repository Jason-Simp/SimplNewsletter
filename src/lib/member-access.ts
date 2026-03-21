import type { MemberRecord } from "@/types/member";

export function isCompanyAdmin(member: MemberRecord | null) {
  return member?.role === "company_admin";
}

export function canManageSchools(member: MemberRecord | null) {
  return member?.role === "company_admin" || member?.role === "school_admin";
}

export function canManageMembers(member: MemberRecord | null) {
  return member?.role === "company_admin" || member?.role === "school_admin";
}

export function canManageCodes(member: MemberRecord | null) {
  return member?.role === "company_admin";
}

export function canAccessBuilder(member: MemberRecord | null) {
  return member?.role === "company_admin" || member?.role === "school_admin" || member?.role === "editor";
}
