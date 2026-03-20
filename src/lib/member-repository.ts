import { getServiceSupabase } from "@/lib/supabase/server";
import type { MemberRecord } from "@/types/member";

type MemberRow = {
  id: string;
  school_id: string;
  email: string;
  full_name: string | null;
  role: "school_admin" | "editor";
  is_active: boolean;
  schools: { name: string } | { name: string }[] | null;
};

const fallbackMembers: MemberRecord[] = [
  {
    id: "demo-member-1",
    schoolId: "demo-school-1",
    schoolName: "Riverside High School",
    email: "admin@riverside.example.com",
    fullName: "Riverside Admin",
    role: "school_admin",
    isActive: true
  },
  {
    id: "demo-member-2",
    schoolId: "demo-school-1",
    schoolName: "Riverside High School",
    email: "editor@riverside.example.com",
    fullName: "Riverside Editor",
    role: "editor",
    isActive: true
  }
];

export async function listMembers() {
  const supabase = getServiceSupabase();

  if (!supabase) {
    return fallbackMembers;
  }

  const { data, error } = await supabase
    .from("school_users")
    .select("id,school_id,email,full_name,role,is_active,schools(name)")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return fallbackMembers;
  }

  return (data as MemberRow[]).map((member) => ({
    id: member.id,
    schoolId: member.school_id,
    schoolName: resolveSchoolName(member.schools),
    email: member.email,
    fullName: member.full_name ?? "",
    role: member.role,
    isActive: member.is_active
  })) as MemberRecord[];
}

export async function getMemberByEmail(email: string) {
  const members = await listMembers();
  return members.find((member) => member.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function saveMember(member: Omit<MemberRecord, "id" | "schoolName">) {
  const supabase = getServiceSupabase();

  if (!supabase) {
    return {
      ...member,
      id: `demo-member-${Date.now()}`,
      schoolName: "Demo School"
    } satisfies MemberRecord;
  }

  const { data, error } = await supabase
    .from("school_users")
    .upsert(
      {
        school_id: member.schoolId,
        email: member.email,
        full_name: member.fullName,
        role: member.role,
        is_active: member.isActive
      },
      { onConflict: "school_id,email" }
    )
    .select("id,school_id,email,full_name,role,is_active,schools(name)")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to save member.");
  }

  return {
    id: (data as MemberRow).id,
    schoolId: (data as MemberRow).school_id,
    schoolName: resolveSchoolName((data as MemberRow).schools),
    email: (data as MemberRow).email,
    fullName: (data as MemberRow).full_name ?? "",
    role: (data as MemberRow).role,
    isActive: (data as MemberRow).is_active
  } satisfies MemberRecord;
}

function resolveSchoolName(schools: MemberRow["schools"]) {
  if (Array.isArray(schools)) {
    return schools[0]?.name ?? "Unknown School";
  }

  return schools?.name ?? "Unknown School";
}
