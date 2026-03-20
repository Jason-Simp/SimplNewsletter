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
  agentId: string;
  vectorProvider: "supabase" | "openai" | "none";
  encryptedProjectCode: string;
};
