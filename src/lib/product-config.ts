import type { DistributionChannel, DistributionOption, MediaConstraint, PublishMode } from "@/types/newsletter";

export const mediaConstraints: MediaConstraint[] = [
  {
    type: "image",
    extensions: ["png", "jpg", "jpeg", "webp", "gif", "svg"],
    maxSizeMb: 4,
    compressionTargetMb: 1.5,
    notes: "Compress images automatically on upload and retain a higher-quality derivative for PDF."
  },
  {
    type: "audio",
    extensions: ["mp3", "m4a", "wav"],
    maxSizeMb: 4,
    compressionTargetMb: 3,
    notes: "Audio uploads should be normalized and re-encoded through a worker pipeline."
  },
  {
    type: "video",
    extensions: ["mp4", "mov", "webm"],
    maxSizeMb: 5,
    compressionTargetMb: 4,
    notes: "Video uploads should be transcoded server-side to a web-safe derivative."
  },
  {
    type: "document",
    extensions: ["pdf"],
    maxSizeMb: 4,
    notes: "Allow PDF attachments as source/reference assets."
  }
];

export const defaultDistributionOptions: DistributionOption[] = [
  {
    channel: "web",
    label: "School website feed",
    description: "Add this newsletter to the school's hosted archive and website feed.",
    selected: true
  },
  {
    channel: "pdf",
    label: "PDF export",
    description: "Generate a paginated PDF using the same visual direction as the polished preview.",
    selected: false
  }
];

export const publishModeOptions: { value: PublishMode; label: string; description: string }[] = [
  {
    value: "instant",
    label: "Instant publish",
    description: "Any authenticated school user can publish immediately."
  },
  {
    value: "approval",
    label: "Optional approval",
    description: "Writers can submit to an admin when the school wants review before publish."
  }
];

export const distributionLabels: Record<DistributionChannel, string> = {
  web: "School website feed",
  email: "Email send",
  pdf: "PDF export",
  html: "HTML export",
  blog: "Blog/CMS post",
  webhook: "Webhook"
};
