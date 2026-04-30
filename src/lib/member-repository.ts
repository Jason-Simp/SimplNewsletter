import { getServiceSupabase } from "@/lib/supabase/server";
import { serverConfig } from "@/lib/server-config";
import type { MemberMembership, MemberRecord } from "@/types/member";
import type { SchoolProfile } from "@/types/school";

type MemberRow = {
  id: string;
  school_id: string;
  email: string;
  auth_user_id?: string | null;
  full_name: string | null;
  role: "company_admin" | "school_admin" | "editor";
  is_active: boolean;
  created_at?: string | null;
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
    .select("id,school_id,email,auth_user_id,full_name,role,is_active,created_at,schools(name)")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return (data as MemberRow[]).map(mapMemberRowToRecord) as MemberRecord[];
}

export async function getMemberByEmail(email: string, schoolId?: string) {
  const members = await listMembers();
  const normalizedEmail = email.toLowerCase();
  const scopedMembers = members.filter((member) => member.email.toLowerCase() === normalizedEmail);

  if (schoolId) {
    return scopedMembers.find((member) => member.schoolId === schoolId) ?? null;
  }

  return scopedMembers[0] ?? null;
}

export async function getMemberForAuth(options: {
  email: string;
  authUserId?: string | null;
  activeSchoolId?: string | null;
}) {
  const memberships = await listMemberMemberships(options);
  const activeMemberships = memberships.filter((membership) => membership.isActive);

  if (activeMemberships.length === 0) {
    return null;
  }

  const requestedSchoolId = options.activeSchoolId?.trim();
  const selectedMembership =
    (requestedSchoolId
      ? activeMemberships.find((membership) => membership.schoolId === requestedSchoolId)
      : null) ?? activeMemberships[0];

  return {
    ...selectedMembership,
    email: options.email.trim(),
    fullName:
      activeMemberships.find((membership) => membership.fullName.trim())?.fullName ??
      selectedMembership.fullName,
    memberships: activeMemberships.map((membership) => ({
      id: membership.id,
      schoolId: membership.schoolId,
      schoolName: membership.schoolName,
      role: membership.role,
      isActive: membership.isActive
    }))
  } satisfies MemberRecord;
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

export async function updateMember(member: Omit<MemberRecord, "schoolName">) {
  const supabase = getServiceSupabase();

  if (!supabase) {
    return {
      ...member,
      schoolName: "Demo School"
    } satisfies MemberRecord;
  }

  const { data, error } = await supabase
    .from("school_users")
    .update({
      school_id: member.schoolId,
      email: member.email,
      full_name: member.fullName,
      role: member.role,
      is_active: member.isActive
    })
    .eq("id", member.id)
    .select("id,school_id,email,full_name,role,is_active,schools(name)")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to update member.");
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

export async function deleteMember(memberId: string) {
  const supabase = getServiceSupabase();

  if (!supabase) {
    return { success: true };
  }

  const { error } = await supabase.from("school_users").delete().eq("id", memberId);

  if (error) {
    throw new Error(error.message || "Unable to remove member.");
  }

  return { success: true };
}

export async function sendMemberPasswordReset(email: string) {
  const supabase = getServiceSupabase();

  if (!supabase) {
    return { sent: false };
  }

  const redirectUrl = getAuthRedirectUrl();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl
  });

  if (error) {
    throw new Error(error.message || "Unable to send password reset email.");
  }

  return { sent: true };
}

export async function resendMemberInvite(email: string) {
  const supabase = getServiceSupabase();

  if (!supabase) {
    return { sent: false };
  }

  const redirectUrl = getAuthRedirectUrl();

  const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: redirectUrl
  });

  if (error && !isAlreadyProvisionedAuthError(error.message)) {
    throw new Error(error.message || "Unable to resend invite email.");
  }

  if (error) {
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl
    });

    if (resetError) {
      throw new Error(resetError.message || "Unable to send password reset email.");
    }

    return { sent: true, mode: "reset" as const };
  }

  return { sent: true, mode: "invite" as const };
}

export async function inviteMember(input: Omit<MemberRecord, "id" | "schoolName">) {
  const supabase = getServiceSupabase();

  if (!supabase) {
    return {
      member: {
        ...input,
        id: `demo-member-${Date.now()}`,
        schoolName: "Demo School"
      } satisfies MemberRecord,
      inviteSent: false
    };
  }

  const redirectUrl = getAuthRedirectUrl();

  const existingMember = await getMemberByEmail(input.email);

  if (!existingMember) {
    await saveMember(input);
  } else if (existingMember.schoolId !== input.schoolId || existingMember.role !== input.role) {
    await saveMember(input);
  }

  const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(input.email, {
    redirectTo: redirectUrl
  });

  if (inviteError && !isAlreadyProvisionedAuthError(inviteError.message)) {
    throw new Error(inviteError.message);
  }

  let accessEmailMode: "invite" | "reset" = "invite";

  if (inviteError) {
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(input.email, {
      redirectTo: redirectUrl
    });

    if (resetError) {
      throw new Error(resetError.message || "Unable to send password reset email.");
    }

    accessEmailMode = "reset";
  }

  const member = await getMemberByEmail(input.email);

  if (!member) {
    throw new Error("School user record was not created.");
  }

  return {
    member,
    inviteSent: true,
    accessEmailMode
  };
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
        encryptedKnowledgeRef: "",
        webhookUrl: "",
        webhookSecret: "",
        supportModules: []
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

async function listMemberMemberships(options: { email: string; authUserId?: string | null }) {
  const supabase = getServiceSupabase();

  if (!supabase) {
    return fallbackMembers
      .filter((member) => member.email.toLowerCase() === options.email.trim().toLowerCase())
      .map((member) => ({
        ...member,
        memberships: undefined
      }));
  }

  const normalizedEmail = options.email.trim().toLowerCase();
  let query = supabase
    .from("school_users")
    .select("id,school_id,email,auth_user_id,full_name,role,is_active,created_at,schools(name)")
    .eq("email", normalizedEmail);

  if (options.authUserId?.trim()) {
    query = query.or(
      `auth_user_id.eq.${options.authUserId.trim()},and(auth_user_id.is.null,email.eq.${normalizedEmail})`
    );
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return (data as MemberRow[])
    .map(mapMemberRowToRecord)
    .sort((left, right) => compareMemberPriority(left, right));
}

function mapMemberRowToRecord(member: MemberRow) {
  return {
    id: member.id,
    schoolId: member.school_id,
    schoolName: resolveSchoolName(member.schools),
    email: member.email,
    fullName: member.full_name ?? "",
    role: member.role,
    isActive: member.is_active
  } satisfies MemberRecord;
}

function compareMemberPriority(left: MemberRecord, right: MemberRecord) {
  const roleScore = (role: MemberMembership["role"]) => {
    if (role === "company_admin") {
      return 3;
    }

    if (role === "school_admin") {
      return 2;
    }

    return 1;
  };

  return roleScore(right.role) - roleScore(left.role);
}

function resolveSchoolName(schools: MemberRow["schools"]) {
  if (Array.isArray(schools)) {
    return schools[0]?.name ?? "Unknown School";
  }

  return schools?.name ?? "Unknown School";
}

function getAuthRedirectUrl() {
  if (!serverConfig.renderExternalUrl) {
    throw new Error(
      "Public app URL is not configured for auth emails. Set APP_PUBLIC_URL or RENDER_EXTERNAL_URL."
    );
  }

  return `${serverConfig.renderExternalUrl}/reset-password`;
}

function isAlreadyProvisionedAuthError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("already") || normalized.includes("registered");
}
