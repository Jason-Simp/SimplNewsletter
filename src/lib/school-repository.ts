import { schoolAmplifiedBrand } from "@/lib/brand";
import { decryptProjectCode, encryptProjectCode } from "@/lib/crypto";
import { getServiceSupabase } from "@/lib/supabase/server";
import type { SchoolProfile } from "@/types/school";

const fallbackSchools: SchoolProfile[] = [
  {
    id: "demo-school-1",
    name: "Riverside High School",
    tagline: "Curiosity, Character, Community",
    logoUrl: schoolAmplifiedBrand.logoUrl,
    websiteUrl: "https://schoolamplified.example.com/riverside",
    contactEmail: "hello@schoolamplified.example.com",
    phone: "(555) 010-2400",
    address: "15 River Walk Drive, Marietta, GA 30060",
    primaryColor: "#123A69",
    secondaryColor: "#86201A",
    accentColor: "#3E86D1",
    backgroundColor: "#F7F9FC",
    textColor: "#142033",
    publishMode: "instant",
    agentId: "",
    vectorProvider: "supabase",
    encryptedProjectCode: "enc_proj_riverside_demo_001"
  }
];

export async function listSchools() {
  const supabase = getServiceSupabase();

  if (!supabase) {
    return fallbackSchools;
  }

  const { data, error } = await supabase.from("schools").select("*").order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  const secret = process.env.VECTOR_PROJECT_SECRET;

  return data.map((school) => ({
    id: school.id,
    name: school.name,
    tagline: school.tagline ?? "",
    logoUrl: school.logo_url ?? schoolAmplifiedBrand.logoUrl,
    websiteUrl: school.website_url ?? "",
    contactEmail: school.contact_email ?? "",
    phone: school.phone ?? "",
    address: school.address ?? "",
    primaryColor: school.primary_color,
    secondaryColor: school.secondary_color,
    accentColor: school.accent_color,
    backgroundColor: school.background_color,
    textColor: school.text_color,
    publishMode: school.publish_mode,
    agentId: school.agent_id ?? "",
    vectorProvider: school.vector_provider,
    encryptedProjectCode:
      school.encrypted_project_code && secret
        ? decryptProjectCode(school.encrypted_project_code, secret)
        : school.encrypted_project_code ?? ""
  })) as SchoolProfile[];
}

export async function saveSchool(profile: SchoolProfile) {
  const supabase = getServiceSupabase();

  if (!supabase) {
    return profile;
  }

  const secret = process.env.VECTOR_PROJECT_SECRET;
  const { data, error } = await supabase
    .from("schools")
    .upsert({
      id: profile.id.startsWith("demo-") ? undefined : profile.id,
      name: profile.name,
      tagline: profile.tagline,
      logo_url: profile.logoUrl,
      website_url: profile.websiteUrl,
      contact_email: profile.contactEmail,
      phone: profile.phone,
      address: profile.address,
      primary_color: profile.primaryColor,
      secondary_color: profile.secondaryColor,
      accent_color: profile.accentColor,
      background_color: profile.backgroundColor,
      text_color: profile.textColor,
      publish_mode: profile.publishMode,
      agent_id: profile.agentId,
      vector_provider: profile.vectorProvider,
      encrypted_project_code:
        profile.encryptedProjectCode && secret
          ? encryptProjectCode(profile.encryptedProjectCode, secret)
          : profile.encryptedProjectCode
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to save school profile.");
  }

  return {
    id: data.id,
    name: data.name,
    tagline: data.tagline ?? "",
    logoUrl: data.logo_url ?? schoolAmplifiedBrand.logoUrl,
    websiteUrl: data.website_url ?? "",
    contactEmail: data.contact_email ?? "",
    phone: data.phone ?? "",
    address: data.address ?? "",
    primaryColor: data.primary_color,
    secondaryColor: data.secondary_color,
    accentColor: data.accent_color,
    backgroundColor: data.background_color,
    textColor: data.text_color,
    publishMode: data.publish_mode,
    agentId: data.agent_id ?? "",
    vectorProvider: data.vector_provider,
    encryptedProjectCode: profile.encryptedProjectCode
  } satisfies SchoolProfile;
}
