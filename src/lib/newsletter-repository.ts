import { schoolAmplifiedBrand } from "@/lib/brand";
import { decryptProjectCode, encryptProjectCode } from "@/lib/crypto";
import { defaultDistributionOptions, mediaConstraints } from "@/lib/product-config";
import { sampleNewsletter } from "@/lib/sample-data";
import { getServiceSupabase } from "@/lib/supabase/server";
import type { DistributionChannel, NewsletterDocument, NewsletterSection } from "@/types/newsletter";
import type { SupportModule, SupportModuleGraphic, SupportModuleTone } from "@/types/support-module";

function normalizeVectorProvider(value: NewsletterDocument["workspace"]["knowledgeProvider"]) {
  return value === "supabase" || value === "openai" ? value : "none";
}

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
  agent_api: string | null;
  archive_days: number;
  users_managed_by_school: boolean;
  vector_provider: "supabase" | "openai" | "none";
  encrypted_project_code: string | null;
  support_modules?: unknown;
};

type NewsletterRow = {
  id: string;
  status: "draft" | "published" | "archived";
  title: string;
  issue_date: string | null;
  audience: string | null;
  intro: string | null;
  subject_line: string | null;
  preview_text: string | null;
  published_at: string | null;
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
  channel: DistributionChannel;
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
    status: newsletter.status ?? "draft",
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
      },
      supportModules: normalizeSupportModules(school.support_modules)
    },
    workspace: {
      schoolId: school.id,
      publishMode: school.publish_mode,
      archiveDays: school.archive_days,
      usersManagedBySchool: school.users_managed_by_school,
      generationProvider: school.agent_id ? "elevenlabs" : "none",
      knowledgeProvider: school.vector_provider,
      syncProvider: school.agent_id ? "elevenlabs" : "none",
      assistantReference: school.agent_id ?? "",
      integrationEndpoint: school.agent_api ?? "",
      encryptedKnowledgeRef:
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
    publishedAt: newsletter.published_at,
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
    return [];
  }

  let query = supabase
    .from("newsletters")
    .select("id,status,title,issue_date,audience,intro,subject_line,preview_text,published_at,school_id")
    .order("created_at", { ascending: false })
    .limit(10);

  if (schoolId) {
    query = query.eq("school_id", schoolId);
  }

  const { data: newsletterRows, error } = await query;

  if (error || !newsletterRows?.length) {
    return [];
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
        return null;
      }

      return toDocument(
        school as SchoolRow,
        newsletter as NewsletterRow,
        (sections ?? []) as SectionRow[],
        (distributionRows ?? []) as DistributionRow[]
      );
    })
  );

  return documents.filter(Boolean) as NewsletterDocument[];
}

export async function getNewsletterById(newsletterId: string, schoolId?: string) {
  const newsletters = await listNewsletters(schoolId);
  return newsletters.find((newsletter) => newsletter.id === newsletterId) ?? null;
}

export async function saveNewsletter(
  document: NewsletterDocument,
  options?: { publish?: boolean }
) {
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
    agent_id: document.workspace.assistantReference ?? null,
    agent_api: document.workspace.integrationEndpoint ?? null,
    archive_days: document.workspace.archiveDays,
    users_managed_by_school: document.workspace.usersManagedBySchool,
    vector_provider: normalizeVectorProvider(document.workspace.knowledgeProvider),
    encrypted_project_code:
      document.workspace.encryptedKnowledgeRef && secret
        ? encryptProjectCode(document.workspace.encryptedKnowledgeRef, secret)
        : document.workspace.encryptedKnowledgeRef,
    support_modules: document.organization.supportModules ?? []
  };

  let schoolResult = await supabase
    .from("schools")
    .upsert(schoolPayload)
    .select("id")
    .single();

  if (isMissingSupportModulesColumnError(schoolResult.error)) {
    const { support_modules, ...fallbackSchoolPayload } = schoolPayload;
    schoolResult = await supabase
      .from("schools")
      .upsert(fallbackSchoolPayload)
      .select("id")
      .single();
  }

  const { data: school, error: schoolError } = schoolResult;

  if (schoolError || !school) {
    throw new Error(schoolError?.message ?? "Failed to save school settings.");
  }

  const hasPersistedNewsletterId =
    Boolean(document.id?.trim()) &&
    !document.id.startsWith("draft-") &&
    !document.id.startsWith("demo-") &&
    document.id !== sampleNewsletter.id;

  const baseSlug = slugify(document.title || `${document.organization.name} newsletter`);
  const initialSlug = await resolveUniqueNewsletterSlug(
    supabase,
    school.id,
    baseSlug,
    hasPersistedNewsletterId ? document.id : null
  );

  let newsletterPayload = {
    ...(hasPersistedNewsletterId ? { id: document.id } : {}),
    school_id: school.id,
    status: options?.publish ? "published" : document.status ?? "draft",
    title: document.title,
    slug: initialSlug,
    issue_date: normalizeIssueDate(document.issueDate),
    audience: document.audience,
    intro: document.intro,
    subject_line: document.subjectLine,
    preview_text: document.previewText,
    published_at: options?.publish ? new Date().toISOString() : document.publishedAt ?? null
  };

  let newsletterResult = await persistNewsletterRow(
    supabase,
    newsletterPayload,
    hasPersistedNewsletterId
  );
  let { data: newsletter, error: newsletterError } = newsletterResult;

  if (isDuplicateNewsletterSlugError(newsletterError)) {
    if (!hasPersistedNewsletterId) {
      const existingDraft = await supabase
        .from("newsletters")
        .select("id")
        .eq("school_id", school.id)
        .eq("slug", newsletterPayload.slug)
        .maybeSingle();

      if (existingDraft.data?.id) {
        newsletterPayload = {
          ...newsletterPayload,
          id: existingDraft.data.id
        };
        newsletterResult = await persistNewsletterRow(supabase, newsletterPayload, true);
        newsletter = newsletterResult.data;
        newsletterError = newsletterResult.error;
      }
    }

    if (isDuplicateNewsletterSlugError(newsletterError)) {
      const retrySlug = await resolveUniqueNewsletterSlug(
        supabase,
        school.id,
        baseSlug,
        hasPersistedNewsletterId ? document.id : newsletterPayload.id ?? null
      );

      newsletterPayload = {
        ...newsletterPayload,
        slug: retrySlug
      };
      newsletterResult = await persistNewsletterRow(
        supabase,
        newsletterPayload,
        hasPersistedNewsletterId || Boolean(newsletterPayload.id)
      );
      newsletter = newsletterResult.data;
      newsletterError = newsletterResult.error;
    }
  }

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
    newsletter: {
      ...document,
      id: newsletter.id,
      status: newsletterPayload.status,
      workspace: {
        ...document.workspace,
        schoolId: school.id
      },
      publishedAt: newsletterPayload.published_at
    }
  };
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
        tone: normalizeSupportTone(record.tone),
        graphic: normalizeSupportGraphic(record.graphic)
      } satisfies SupportModule;
    })
    .filter(Boolean) as SupportModule[];
}

async function persistNewsletterRow(
  supabase: NonNullable<ReturnType<typeof getServiceSupabase>>,
  payload: {
    id?: string;
    school_id: string;
    status: "draft" | "published" | "archived";
    title: string;
    slug: string;
    issue_date: string | null;
    audience: string;
    intro: string;
    subject_line: string;
    preview_text: string;
    published_at: string | null;
  },
  useIdConflict: boolean
) {
  const mutation = useIdConflict
    ? supabase.from("newsletters").upsert(payload, { onConflict: "id" })
    : supabase.from("newsletters").upsert(payload, { onConflict: "school_id,slug" });

  return mutation.select("id").single();
}

async function resolveUniqueNewsletterSlug(
  supabase: NonNullable<ReturnType<typeof getServiceSupabase>>,
  schoolId: string,
  preferredSlug: string,
  currentNewsletterId: string | null
) {
  const baseSlug = preferredSlug || "newsletter";
  const { data, error } = await supabase
    .from("newsletters")
    .select("id,slug")
    .eq("school_id", schoolId)
    .like("slug", `${baseSlug}%`);

  if (error || !data?.length) {
    return baseSlug;
  }

  const takenSlugs = new Set(
    data
      .filter((row) => row.id !== currentNewsletterId)
      .map((row) => row.slug)
      .filter((slug): slug is string => Boolean(slug?.trim()))
  );

  if (!takenSlugs.has(baseSlug)) {
    return baseSlug;
  }

  let suffix = 2;
  while (takenSlugs.has(`${baseSlug}-${suffix}`)) {
    suffix += 1;
  }

  return `${baseSlug}-${suffix}`;
}

function isDuplicateNewsletterSlugError(error: { message?: string; code?: string } | null | undefined) {
  if (!error) {
    return false;
  }

  return (
    error.code === "23505" ||
    Boolean(error.message?.includes('newsletters_school_slug_idx')) ||
    Boolean(error.message?.includes("duplicate key value violates unique constraint"))
  );
}

function normalizeSupportTone(value: unknown): SupportModuleTone {
  return value === "primary" || value === "secondary" ? value : "neutral";
}

function isMissingSupportModulesColumnError(error: { message?: string } | null) {
  return Boolean(error?.message?.toLowerCase().includes("support_modules"));
}

function normalizeSupportGraphic(value: unknown): SupportModuleGraphic {
  return value === "spark" ||
    value === "calendar" ||
    value === "contact" ||
    value === "announcement"
    ? value
    : "none";
}

export async function deleteNewsletter(newsletterId: string, schoolId?: string) {
  const supabase = getServiceSupabase();

  if (!supabase) {
    return { deleted: true };
  }

  let existingQuery = supabase.from("newsletters").select("id").eq("id", newsletterId);

  if (schoolId) {
    existingQuery = existingQuery.eq("school_id", schoolId);
  }

  const { data: existingNewsletter, error: existingError } = await existingQuery.maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (!existingNewsletter) {
    return { deleted: false };
  }

  await Promise.all([
    supabase.from("newsletter_sections").delete().eq("newsletter_id", newsletterId),
    supabase.from("newsletter_distribution_targets").delete().eq("newsletter_id", newsletterId),
    supabase.from("distribution_jobs").delete().eq("newsletter_id", newsletterId),
    supabase.from("assets").delete().eq("newsletter_id", newsletterId),
    clearNullableNewsletterReference(supabase, "newsletter_generation_jobs", "draft_id", newsletterId),
    clearNullableNewsletterReference(supabase, "vector_content_queue", "newsletter_id", newsletterId)
  ]);

  let query = supabase.from("newsletters").delete().eq("id", newsletterId);

  if (schoolId) {
    query = query.eq("school_id", schoolId);
  }

  const { error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return { deleted: true };
}

async function clearNullableNewsletterReference(
  supabase: NonNullable<ReturnType<typeof getServiceSupabase>>,
  table: string,
  column: string,
  newsletterId: string
) {
  const { error } = await supabase
    .from(table)
    .update({ [column]: null })
    .eq(column, newsletterId);

  if (error && error.code !== "42P01") {
    throw new Error(error.message);
  }
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
