export type SupportModuleTone = "primary" | "secondary" | "neutral";

export type SupportModule = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  actionLabel?: string;
  actionHref?: string;
  tone: SupportModuleTone;
};
