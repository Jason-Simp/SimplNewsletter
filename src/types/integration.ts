import type { IntegrationProvider } from "@/types/newsletter";

export type ContentGenerateRequest = {
  schoolId?: string;
  schoolName: string;
  generationProvider: IntegrationProvider;
  knowledgeProvider: IntegrationProvider;
  assistantReference?: string;
  integrationEndpoint?: string;
  encryptedKnowledgeRef: string;
  prompt: string;
  links?: string[];
  notes?: string;
  sectionTypes?: string[];
};

export type ContentGenerateResponse = {
  title?: string;
  intro?: string;
  sections?: Array<{
    sectionType: string;
    title?: string;
    content: Record<string, unknown>;
  }>;
  raw?: unknown;
};

export type ContentSyncRequest = {
  schoolName: string;
  syncProvider: IntegrationProvider;
  knowledgeProvider: IntegrationProvider;
  assistantReference?: string;
  integrationEndpoint?: string;
  encryptedKnowledgeRef: string;
  newsletterId: string;
  title: string;
  html: string;
  summary: string;
  metadata?: Record<string, unknown>;
};
