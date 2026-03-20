import type { MemberRecord } from "@/types/member";

export function canManageSchools(member: MemberRecord | null) {
  return member?.role === "school_admin";
}

export function canManageMembers(member: MemberRecord | null) {
  return member?.role === "school_admin";
}

export function canAccessBuilder(member: MemberRecord | null) {
  return member?.role === "school_admin" || member?.role === "editor";
}
