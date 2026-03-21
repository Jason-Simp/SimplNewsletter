import { getServiceSupabase } from "@/lib/supabase/server";
import type { MemberRecord } from "@/types/member";
import type { SchoolProfile } from "@/types/school";

type MemberRow = {
  id: string;
  school_id: string;
  email: string;
  full_name: string | null;
  role: "company_admin" | "school_admin" | "editor";
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
    return [];
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

export async function bootstrapSchoolAdmin(input: {
  authUserId: string;
  email: string;
  fullName: string;
  schoolName: string;
}) {
  const supabase = getServiceSupabase();

  if (!supabase) {
    return {
      school: {
        id: "demo-school-bootstrap",
        name: input.schoolName,
        tagline: "",
        logoUrl: "",
        websiteUrl: "",
        contactEmail: input.email,
        phone: "",
        address: "",
        primaryColor: "#123A69",
        secondaryColor: "#86201A",
        accentColor: "#3E86D1",
        backgroundColor: "#F7F9FC",
        textColor: "#142033",
        publishMode: "instant",
        generationProvider: "none",
        knowledgeProvider: "none",
        syncProvider: "none",
        assistantReference: "",
        integrationEndpoint: "",
        encryptedKnowledgeRef: ""
      } satisfies SchoolProfile,
      member: {
        id: "demo-member-bootstrap",
        schoolId: "demo-school-bootstrap",
        schoolName: input.schoolName,
        email: input.email,
        fullName: input.fullName,
        role: "school_admin",
        isActive: true
      } satisfies MemberRecord
    };
  }

  const existingMember = await getMemberByEmail(input.email);

  if (existingMember) {
    const { error: updateError } = await supabase
      .from("school_users")
      .update({
        auth_user_id: input.authUserId,
        full_name: input.fullName || existingMember.fullName
      })
      .eq("id", existingMember.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return {
      school: {
        id: existingMember.schoolId,
        name: existingMember.schoolName
      },
      member: {
        ...existingMember,
        fullName: input.fullName || existingMember.fullName
      }
    };
  }

  const { data: school, error: schoolError } = await supabase
    .from("schools")
    .insert({
      name: input.schoolName,
      contact_email: input.email
    })
    .select("id,name")
    .single();

  if (schoolError || !school) {
    throw new Error(schoolError?.message ?? "Unable to create school.");
  }

  const { data: member, error: memberError } = await supabase
    .from("school_users")
    .insert({
      school_id: school.id,
      auth_user_id: input.authUserId,
      email: input.email,
      full_name: input.fullName,
      role: "school_admin",
      is_active: true
    })
    .select("id,school_id,email,full_name,role,is_active,schools(name)")
    .single();

  if (memberError || !member) {
    throw new Error(memberError?.message ?? "Unable to create school admin.");
  }

  return {
    school: {
      id: school.id,
      name: school.name
    },
    member: {
      id: (member as MemberRow).id,
      schoolId: (member as MemberRow).school_id,
      schoolName: resolveSchoolName((member as MemberRow).schools),
      email: (member as MemberRow).email,
      fullName: (member as MemberRow).full_name ?? "",
      role: (member as MemberRow).role,
      isActive: (member as MemberRow).is_active
    } satisfies MemberRecord
  };
}

function resolveSchoolName(schools: MemberRow["schools"]) {
  if (Array.isArray(schools)) {
    return schools[0]?.name ?? "Unknown School";
  }

  return schools?.name ?? "Unknown School";
}
