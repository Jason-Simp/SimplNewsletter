import type { IntegrationProvider } from "@/types/newsletter";
import type { SupportModule } from "@/types/support-module";

export type SchoolProfile = {
  id: string;
  name: string;
  tagline: string;
  logoUrl: string;
  websiteUrl: string;
  contactEmail: string;
  phone: string;
  address: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  publishMode: "instant" | "approval";
  generationProvider: IntegrationProvider;
  knowledgeProvider: IntegrationProvider;
  syncProvider: IntegrationProvider;
  assistantReference: string;
  integrationEndpoint: string;
  encryptedKnowledgeRef: string;
  webhookUrl: string;
  webhookSecret: string;
  supportModules: SupportModule[];
};
