export type AgentGenerateRequest = {
  schoolName: string;
  encryptedProjectCode: string;
  prompt: string;
  links?: string[];
  notes?: string;
  sectionTypes?: string[];
};

export type AgentGenerateResponse = {
  title?: string;
  intro?: string;
  sections?: Array<{
    sectionType: string;
    title?: string;
    content: Record<string, unknown>;
  }>;
  raw?: unknown;
};

export type AgentVectorSyncRequest = {
  schoolName: string;
  encryptedProjectCode: string;
  newsletterId: string;
  title: string;
  html: string;
  summary: string;
  metadata?: Record<string, unknown>;
};
