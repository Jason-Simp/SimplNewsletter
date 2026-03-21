export type Channel = "web" | "email" | "pdf" | "html" | "blog";

export type PublishMode = "instant" | "approval";

export type UserRole = "school_admin" | "editor";

export type IntegrationProvider = "elevenlabs" | "openai" | "supabase" | "n8n" | "custom" | "none";

export type SectionType =
  | "hero"
  | "stats_band"
  | "principal_message"
  | "top_story"
  | "news_grid"
  | "academics"
  | "athletics"
  | "student_spotlight"
  | "arts_events"
  | "clubs_and_organizations"
  | "calendar_snapshot"
  | "cta_band"
  | "quote_or_mission"
  | "quick_links"
  | "footer";

export type Visibility = Record<Channel, boolean>;

export type StoryItem = {
  id: string;
  headline: string;
  summary: string;
  url: string;
  tag?: string;
};

export type EventItem = {
  id: string;
  date: string;
  title: string;
  summary: string;
  url: string;
};

export type LinkItem = {
  id: string;
  label: string;
  url: string;
};

export type NewsletterSection<T = Record<string, unknown>> = {
  id: string;
  type: SectionType;
  enabled: boolean;
  sortOrder: number;
  title: string;
  layoutVariant?: string;
  visibility: Visibility;
  content: T;
};

export type OrganizationBrand = {
  name: string;
  tagline: string;
  websiteUrl: string;
  contactEmail: string;
  phone: string;
  address: string;
  logoUrl: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    muted: string;
  };
};

export type MediaConstraint = {
  type: "image" | "audio" | "video" | "document";
  extensions: string[];
  maxSizeMb: number;
  compressionTargetMb?: number;
  notes?: string;
};

export type DistributionOption = {
  channel: Channel;
  label: string;
  description: string;
  selected: boolean;
};

export type WorkspaceSettings = {
  schoolId?: string;
  publishMode: PublishMode;
  archiveDays: number;
  usersManagedBySchool: boolean;
  generationProvider: IntegrationProvider;
  knowledgeProvider: IntegrationProvider;
  syncProvider: IntegrationProvider;
  assistantReference?: string;
  integrationEndpoint?: string;
  encryptedKnowledgeRef: string;
  mediaConstraints: MediaConstraint[];
  roles: UserRole[];
};

export type NewsletterDocument = {
  id: string;
  title: string;
  issueDate: string;
  audience: string;
  intro: string;
  principalName: string;
  subjectLine: string;
  previewText: string;
  organization: OrganizationBrand;
  workspace: WorkspaceSettings;
  distributionOptions: DistributionOption[];
  sections: NewsletterSection[];
};
