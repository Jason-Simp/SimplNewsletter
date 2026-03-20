"use client";

import imageCompression from "browser-image-compression";
import Image from "next/image";
import { useState } from "react";

import { extractPaletteFromImage } from "@/lib/color-extraction";
import type { NewsletterDocument } from "@/types/newsletter";

type Props = {
  document: NewsletterDocument;
  onOrganizationFieldChange: (
    field: keyof NewsletterDocument["organization"],
    value: string
  ) => void;
  onOrganizationColorChange: (
    field: keyof NewsletterDocument["organization"]["colors"],
    value: string
  ) => void;
};

export function OrganizationBrandingPanel({
  document,
  onOrganizationFieldChange,
  onOrganizationColorChange
}: Props) {
  const [status, setStatus] = useState("School branding ready.");

  const handleLogoUpload = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) {
      return;
    }

    try {
      setStatus("Uploading logo...");

      const preparedFile = file.type.startsWith("image/")
        ? await imageCompression(file, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1800,
            useWebWorker: true
          })
        : file;

      const formData = new FormData();
      formData.append("file", preparedFile);
      formData.append("newsletterId", document.id);
      formData.append("organizationName", document.organization.name);

      const response = await fetch("/api/media/upload", {
        method: "POST",
        body: formData
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message ?? "Unable to upload logo.");
      }

      onOrganizationFieldChange("logoUrl", payload.data.url ?? document.organization.logoUrl);
      setStatus("Logo uploaded.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Logo upload failed.");
    }
  };

  const handleAutoColors = async () => {
    try {
      setStatus("Extracting colors from logo...");
      const palette = await extractPaletteFromImage(document.organization.logoUrl);
      onOrganizationColorChange("primary", palette.primary);
      onOrganizationColorChange("secondary", palette.secondary);
      onOrganizationColorChange("accent", palette.accent);
      setStatus("Colors pulled from logo.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Color extraction failed.");
    }
  };

  return (
    <section className="rounded-editorial border border-slate-200 bg-white p-6 shadow-editorial">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">
            School branding
          </p>
          <h2 className="mt-2 font-display text-3xl text-brand-navy">Logo and color controls</h2>
        </div>
        <div className="rounded-full bg-brand-background px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-brand-primary">
          {status}
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-4">
          <div className="rounded-[28px] border border-slate-200 bg-[#EAF2FB] p-5">
            <div className="text-sm font-semibold text-brand-text">Current logo</div>
            <div className="mt-4 rounded-[24px] bg-white p-5">
              <Image
                alt={`${document.organization.name} logo`}
                className="h-16 w-auto object-contain"
                height={64}
                src={document.organization.logoUrl}
                width={320}
              />
            </div>
          </div>

          <label className="block rounded-[24px] border border-dashed border-brand-primary/30 bg-brand-background p-5">
            <input className="hidden" onChange={(event) => void handleLogoUpload(event.target.files)} type="file" accept=".png,.jpg,.jpeg,.webp,.svg" />
            <div className="font-semibold text-brand-text">Upload school logo</div>
            <div className="mt-2 text-sm leading-6 text-brand-muted">
              Upload a logo image. The app will compress it and save it as the school brand asset.
            </div>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-brand-text">School name</span>
            <input
              className="rounded-2xl border border-slate-200 px-4 py-3"
              onChange={(event) => onOrganizationFieldChange("name", event.target.value)}
              value={document.organization.name}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-brand-text">Tagline</span>
            <input
              className="rounded-2xl border border-slate-200 px-4 py-3"
              onChange={(event) => onOrganizationFieldChange("tagline", event.target.value)}
              value={document.organization.tagline}
            />
          </label>
        </div>

        <div className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] bg-[#EAF2FB] p-4">
            <div>
              <div className="font-semibold text-brand-text">School colors</div>
              <div className="mt-1 text-sm leading-6 text-brand-muted">
                Pull colors from the logo or enter exact hex codes manually.
              </div>
            </div>
            <button
              className="rounded-full bg-brand-secondary px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-white"
              onClick={() => void handleAutoColors()}
              type="button"
            >
              Pull from logo
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <ColorInput
              label="Primary"
              value={document.organization.colors.primary}
              onChange={(value) => onOrganizationColorChange("primary", value)}
            />
            <ColorInput
              label="Secondary"
              value={document.organization.colors.secondary}
              onChange={(value) => onOrganizationColorChange("secondary", value)}
            />
            <ColorInput
              label="Accent"
              value={document.organization.colors.accent}
              onChange={(value) => onOrganizationColorChange("accent", value)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ColorInput
              label="Background"
              value={document.organization.colors.background}
              onChange={(value) => onOrganizationColorChange("background", value)}
            />
            <ColorInput
              label="Text"
              value={document.organization.colors.text}
              onChange={(value) => onOrganizationColorChange("text", value)}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function ColorInput({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-brand-text">{label}</span>
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 px-3 py-3">
        <input
          className="h-10 w-12 rounded border border-slate-200"
          onChange={(event) => onChange(event.target.value)}
          type="color"
          value={normalizeHex(value)}
        />
        <input
          className="w-full outline-none"
          onChange={(event) => onChange(normalizeHex(event.target.value))}
          value={value}
        />
      </div>
    </label>
  );
}

function normalizeHex(value: string) {
  if (!value.startsWith("#")) {
    return `#${value}`;
  }

  return value;
}
