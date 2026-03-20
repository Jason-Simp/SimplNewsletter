import { schoolAmplifiedBrand } from "@/lib/brand";
import { decryptProjectCode, encryptProjectCode } from "@/lib/crypto";
import { defaultDistributionOptions, mediaConstraints } from "@/lib/product-config";
import { sampleNewsletter } from "@/lib/sample-data";
import { getServiceSupabase } from "@/lib/supabase/server";
import type { Channel, NewsletterDocument, NewsletterSection } from "@/types/newsletter";

type SchoolRow = {
  id: string;
  name: string;
  tagline: string | null;
  logo_url: string | null;
  website_url: string | null;
  contact_email: string | null;
  phone: string | null;
  address: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  surface_color: string;
  text_color: string;
  muted_text_color: string;
  publish_mode: "instant" | "approval";
  agent_id: string | null;
  archive_days: number;
  users_managed_by_school: boolean;
  vector_provider: "supabase" | "openai" | "none";
  encrypted_project_code: string | null;
};

type NewsletterRow = {
  id: string;
  title: string;
  issue_date: string | null;
  audience: string | null;
  intro: string | null;
  subject_line: string | null;
  preview_text: string | null;
};

type SectionRow = {
  id: string;
  section_type: NewsletterSection["type"];
  title: string;
  enabled: boolean;
  sort_order: number;
  layout_variant: string | null;
  visibility: NewsletterSection["visibility"];
  content: NewsletterSection["content"];
};

type DistributionRow = {
  channel: Channel;
  selected: boolean;
  config: { label?: string; description?: string };
};

function toDocument(
  school: SchoolRow,
  newsletter: NewsletterRow,
  sections: SectionRow[],
  distributionRows: DistributionRow[]
): NewsletterDocument {
  const secret = process.env.VECTOR_PROJECT_SECRET;
  const selectedMap = new Map(distributionRows.map((row) => [row.channel, row]));

  return {
    id: newsletter.id,
    title: newsletter.title,
    issueDate: newsletter.issue_date ?? sampleNewsletter.issueDate,
    audience: newsletter.audience ?? sampleNewsletter.audience,
    intro: newsletter.intro ?? sampleNewsletter.intro,
    principalName: sampleNewsletter.principalName,
    subjectLine: newsletter.subject_line ?? sampleNewsletter.subjectLine,
    previewText: newsletter.preview_text ?? sampleNewsletter.previewText,
    organization: {
      name: school.name,
      tagline: school.tagline ?? "",
      websiteUrl: school.website_url ?? "",
      contactEmail: school.contact_email ?? "",
      phone: school.phone ?? "",
      address: school.address ?? "",
      logoUrl: school.logo_url ?? schoolAmplifiedBrand.logoUrl,
      colors: {
        primary: school.primary_color,
        secondary: school.secondary_color,
        accent: school.accent_color,
        background: school.background_color,
        surface: school.surface_color,
        text: school.text_color,
        muted: school.muted_text_color
      }
    },
    workspace: {
      schoolId: school.id,
      publishMode: school.publish_mode,
      archiveDays: school.archive_days,
      usersManagedBySchool: school.users_managed_by_school,
      agentId: school.agent_id ?? "",
      vectorProvider: school.vector_provider,
      encryptedProjectCode:
        school.encrypted_project_code && secret
          ? decryptProjectCode(school.encrypted_project_code, secret)
          : school.encrypted_project_code ?? "",
      mediaConstraints,
      roles: ["school_admin", "editor"]
    },
    distributionOptions: defaultDistributionOptions.map((option) => ({
      ...option,
      selected: selectedMap.get(option.channel)?.selected ?? option.selected
    })),
    sections: sections.sort((a, b) => a.sort_order - b.sort_order).map((section) => ({
      id: section.id,
      type: section.section_type,
      title: section.title,
      enabled: section.enabled,
      sortOrder: section.sort_order,
      layoutVariant: section.layout_variant ?? undefined,
      visibility: section.visibility,
      content: section.content
    }))
  };
}

export async function listNewsletters(schoolId?: string) {
  const supabase = getServiceSupabase();

  if (!supabase) {
    return [sampleNewsletter];
  }

  let query = supabase
    .from("newsletters")
    .select("id,title,issue_date,audience,intro,subject_line,preview_text,school_id")
    .order("created_at", { ascending: false })
    .limit(10);

  if (schoolId) {
    query = query.eq("school_id", schoolId);
  }

  const { data: newsletterRows, error } = await query;

  if (error || !newsletterRows?.length) {
    return [sampleNewsletter];
  }

  const documents = await Promise.all(
    newsletterRows.map(async (newsletter) => {
      const [{ data: school }, { data: sections }, { data: distributionRows }] = await Promise.all([
        supabase.from("schools").select("*").eq("id", newsletter.school_id).single(),
        supabase
          .from("newsletter_sections")
          .select("id,section_type,title,enabled,sort_order,layout_variant,visibility,content")
          .eq("newsletter_id", newsletter.id),
        supabase
          .from("newsletter_distribution_targets")
          .select("channel,selected,config")
          .eq("newsletter_id", newsletter.id)
      ]);

      if (!school) {
        return sampleNewsletter;
      }

      return toDocument(
        school as SchoolRow,
        newsletter as NewsletterRow,
        (sections ?? []) as SectionRow[],
        (distributionRows ?? []) as DistributionRow[]
      );
    })
  );

  return documents;
}

export async function saveNewsletter(document: NewsletterDocument) {
  const supabase = getServiceSupabase();

  if (!supabase) {
    return {
      mode: "local",
      newsletter: document
    };
  }

  const secret = process.env.VECTOR_PROJECT_SECRET;

  const schoolPayload = {
    id: document.workspace.schoolId,
    name: document.organization.name,
    tagline: document.organization.tagline,
    logo_url: document.organization.logoUrl,
    website_url: document.organization.websiteUrl,
    contact_email: document.organization.contactEmail,
    phone: document.organization.phone,
    address: document.organization.address,
    primary_color: document.organization.colors.primary,
    secondary_color: document.organization.colors.secondary,
    accent_color: document.organization.colors.accent,
    background_color: document.organization.colors.background,
    surface_color: document.organization.colors.surface,
    text_color: document.organization.colors.text,
    muted_text_color: document.organization.colors.muted,
    publish_mode: document.workspace.publishMode,
    agent_id: document.workspace.agentId ?? null,
    archive_days: document.workspace.archiveDays,
    users_managed_by_school: document.workspace.usersManagedBySchool,
    vector_provider: document.workspace.vectorProvider,
    encrypted_project_code:
      document.workspace.encryptedProjectCode && secret
        ? encryptProjectCode(document.workspace.encryptedProjectCode, secret)
        : document.workspace.encryptedProjectCode
  };

  const { data: school, error: schoolError } = await supabase
    .from("schools")
    .upsert(schoolPayload)
    .select("id")
    .single();

  if (schoolError || !school) {
    throw new Error(schoolError?.message ?? "Failed to save school settings.");
  }

  const newsletterPayload = {
    school_id: school.id,
    title: document.title,
    slug: slugify(document.title),
    issue_date: normalizeIssueDate(document.issueDate),
    audience: document.audience,
    intro: document.intro,
    subject_line: document.subjectLine,
    preview_text: document.previewText
  };

  const { data: newsletter, error: newsletterError } = await supabase
    .from("newsletters")
    .upsert(newsletterPayload, { onConflict: "school_id,slug" })
    .select("id")
    .single();

  if (newsletterError || !newsletter) {
    throw new Error(newsletterError?.message ?? "Failed to save newsletter.");
  }

  await supabase.from("newsletter_sections").delete().eq("newsletter_id", newsletter.id);
  await supabase.from("newsletter_distribution_targets").delete().eq("newsletter_id", newsletter.id);

  const sectionsPayload = document.sections.map((section) => ({
    newsletter_id: newsletter.id,
    section_type: section.type,
    title: section.title,
    enabled: section.enabled,
    sort_order: section.sortOrder,
    layout_variant: section.layoutVariant ?? null,
    visibility: section.visibility,
    content: section.content
  }));

  const distributionPayload = document.distributionOptions.map((option) => ({
    newsletter_id: newsletter.id,
    channel: option.channel,
    selected: option.selected,
    config: {
      label: option.label,
      description: option.description
    }
  }));

  const [{ error: sectionsError }, { error: distributionError }] = await Promise.all([
    supabase.from("newsletter_sections").insert(sectionsPayload),
    supabase.from("newsletter_distribution_targets").insert(distributionPayload)
  ]);

  if (sectionsError) {
    throw new Error(sectionsError.message);
  }

  if (distributionError) {
    throw new Error(distributionError.message);
  }

  return {
    mode: "supabase",
    newsletter: document
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeIssueDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}
