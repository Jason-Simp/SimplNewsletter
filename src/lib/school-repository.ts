import { schoolAmplifiedBrand } from "@/lib/brand";
import { decryptProjectCode, encryptProjectCode } from "@/lib/crypto";
import { getServiceSupabase } from "@/lib/supabase/server";
import type { SchoolProfile } from "@/types/school";
import type { SupportModule, SupportModuleGraphic, SupportModuleTone } from "@/types/support-module";

function normalizeVectorProvider(value: SchoolProfile["knowledgeProvider"]) {
  return value === "supabase" || value === "openai" ? value : "none";
}

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
    generationProvider: "elevenlabs",
    knowledgeProvider: "supabase",
    syncProvider: "elevenlabs",
    assistantReference: "",
    integrationEndpoint: "",
    encryptedKnowledgeRef: "enc_proj_riverside_demo_001",
    webhookUrl: "",
    webhookSecret: "",
    supportModules: []
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
    generationProvider: (school.agent_id ? "elevenlabs" : "none"),
    knowledgeProvider: school.vector_provider,
    syncProvider: (school.agent_id ? "elevenlabs" : "none"),
    assistantReference: school.agent_id ?? "",
    integrationEndpoint: school.agent_api ?? "",
    encryptedKnowledgeRef:
      school.encrypted_project_code && secret
        ? decryptProjectCode(school.encrypted_project_code, secret)
        : school.encrypted_project_code ?? "",
    webhookUrl: school.webhook_url ?? "",
    webhookSecret: school.webhook_secret ?? "",
    supportModules: normalizeSupportModules(school.support_modules)
  })) as SchoolProfile[];
}

export async function getSchoolById(schoolId: string) {
  const supabase = getServiceSupabase();

  if (!supabase) {
    return fallbackSchools.find((school) => school.id === schoolId) ?? null;
  }

  const { data, error } = await supabase.from("schools").select("*").eq("id", schoolId).single();

  if (error || !data) {
    return null;
  }

  const secret = process.env.VECTOR_PROJECT_SECRET;

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
    generationProvider: data.agent_id ? "elevenlabs" : "none",
    knowledgeProvider: data.vector_provider,
    syncProvider: data.agent_id ? "elevenlabs" : "none",
    assistantReference: data.agent_id ?? "",
    integrationEndpoint: data.agent_api ?? "",
    encryptedKnowledgeRef:
      data.encrypted_project_code && secret
        ? decryptProjectCode(data.encrypted_project_code, secret)
        : data.encrypted_project_code ?? "",
    webhookUrl: data.webhook_url ?? "",
    webhookSecret: data.webhook_secret ?? "",
    supportModules: normalizeSupportModules(data.support_modules)
  } satisfies SchoolProfile;
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
      agent_id: profile.assistantReference,
      agent_api: profile.integrationEndpoint,
      webhook_url: profile.webhookUrl,
      webhook_secret: profile.webhookSecret,
      support_modules: profile.supportModules,
      vector_provider: normalizeVectorProvider(profile.knowledgeProvider),
      encrypted_project_code:
        profile.encryptedKnowledgeRef && secret
          ? encryptProjectCode(profile.encryptedKnowledgeRef, secret)
          : profile.encryptedKnowledgeRef
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
    generationProvider: profile.generationProvider,
    knowledgeProvider: profile.knowledgeProvider,
    syncProvider: profile.syncProvider,
    assistantReference: data.agent_id ?? "",
    integrationEndpoint: data.agent_api ?? "",
    encryptedKnowledgeRef: profile.encryptedKnowledgeRef,
    webhookUrl: data.webhook_url ?? "",
    webhookSecret: data.webhook_secret ?? "",
    supportModules: normalizeSupportModules(data.support_modules)
  } satisfies SchoolProfile;
}

function normalizeSupportModules(value: unknown): SupportModule[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const title = typeof record.title === "string" ? record.title.trim() : "";
      const body = typeof record.body === "string" ? record.body.trim() : "";

      if (!title && !body) {
        return null;
      }

      const tone = normalizeSupportTone(record.tone);

      return {
        id:
          typeof record.id === "string" && record.id.trim()
            ? record.id.trim()
            : `support-module-${index + 1}`,
        eyebrow: typeof record.eyebrow === "string" ? record.eyebrow.trim() : "",
        title,
        body,
        actionLabel: typeof record.actionLabel === "string" ? record.actionLabel.trim() : "",
        actionHref: typeof record.actionHref === "string" ? record.actionHref.trim() : "",
        tone,
        graphic: normalizeSupportGraphic(record.graphic)
      } satisfies SupportModule;
    })
    .filter(Boolean) as SupportModule[];
}

function normalizeSupportTone(value: unknown): SupportModuleTone {
  return value === "primary" || value === "secondary" ? value : "neutral";
}

function normalizeSupportGraphic(value: unknown): SupportModuleGraphic {
  return value === "spark" ||
    value === "calendar" ||
    value === "contact" ||
    value === "announcement"
    ? value
    : "none";
}
