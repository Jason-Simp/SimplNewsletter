"use client";

import imageCompression from "browser-image-compression";
import { useEffect, useMemo, useState, type DragEvent } from "react";

import { authFetch } from "@/lib/api-client";
import { useAuthSession } from "@/lib/auth-client";
import type { NewsletterDocument } from "@/types/newsletter";
import type { UploadedAsset } from "@/types/media";

type Props = {
  assets?: UploadedAsset[];
  document: NewsletterDocument;
  onAssetsChange?: (assets: UploadedAsset[]) => void;
};

function getAcceptedExtensions(document: NewsletterDocument) {
  const accepted = new Set<string>();

  for (const constraint of document.workspace.mediaConstraints) {
    for (const extension of constraint.extensions) {
      accepted.add(`.${extension}`);
    }

    if (constraint.type === "image") {
      accepted.add("image/png");
      accepted.add("image/jpeg");
      accepted.add("image/gif");
      accepted.add("image/webp");
      accepted.add("image/svg+xml");
    }

    if (constraint.type === "audio") {
      accepted.add("audio/mpeg");
      accepted.add("audio/mp4");
      accepted.add("audio/wav");
    }

    if (constraint.type === "video") {
      accepted.add("video/mp4");
      accepted.add("video/quicktime");
      accepted.add("video/webm");
    }

    if (constraint.type === "document") {
      accepted.add("application/pdf");
    }
  }

  return [...accepted];
}

export function MediaUploadPanel({ assets: externalAssets = [], document, onAssetsChange }: Props) {
  const { supabase } = useAuthSession();
  const [assets, setAssets] = useState<UploadedAsset[]>(externalAssets);
  const [message, setMessage] = useState("No uploads yet.");
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    setAssets(externalAssets);
  }, [externalAssets]);

  const acceptedExtensions = useMemo(() => getAcceptedExtensions(document).join(","), [document]);
  const canUpload = Boolean(document.workspace.schoolId);
  const photoUploads = assets.filter((asset) => asset.type.startsWith("image/")).length;
  const otherUploads = assets.filter((asset) => !asset.type.startsWith("image/")).length;

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList?.length) {
      return;
    }

    if (!document.workspace.schoolId) {
      setMessage("Finish loading the school profile before uploading files.");
      return;
    }

    setUploading(true);
    setMessage("Processing files...");

    const nextAssets: UploadedAsset[] = [];
    let nextImageCount = photoUploads;

    try {
      for (const rawFile of Array.from(fileList)) {
        if (rawFile.type.startsWith("image/")) {
          if (nextImageCount >= 10) {
            throw new Error("You can upload up to 10 photos per newsletter.");
          }
          nextImageCount += 1;
        }

        const preparedFile = await maybeCompressFile(rawFile, document);
        const formData = new FormData();
        formData.append("file", preparedFile);
        formData.append("newsletterId", document.id);
        formData.append("schoolId", document.workspace.schoolId ?? "");
        formData.append("organizationName", document.organization.name);

        const response = await authFetch(supabase, "/api/media/upload", {
          method: "POST",
          body: formData
        });

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.message ?? `Upload failed for ${preparedFile.name}`);
        }

        nextAssets.push(payload.data as UploadedAsset);
      }

      setAssets((current) => {
        const mergedAssets = [...nextAssets, ...current];
        onAssetsChange?.(mergedAssets);
        return mergedAssets;
      });
      setMessage(nextAssets.length === 1 ? "1 file uploaded." : `${nextAssets.length} files uploaded.`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Upload failed.";
      setMessage(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    if (!canUpload || uploading) {
      return;
    }

    setDragActive(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }

    setDragActive(false);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragActive(false);

    if (!canUpload || uploading) {
      return;
    }

    void handleFiles(event.dataTransfer.files);
  };

  return (
    <section className="rounded-editorial border border-slate-200 bg-white p-6 shadow-editorial">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">Media</p>
          <h2 className="mt-2 font-display text-3xl text-brand-navy">Add photos and files</h2>
        </div>
        <div
          className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] ${
            uploading ? "bg-amber-100 text-amber-700" : "bg-brand-background text-brand-primary"
          }`}
        >
          {message}
        </div>
      </div>

      <label
        className={`mt-6 block rounded-[28px] border border-dashed p-8 text-center transition ${
          dragActive
            ? "border-brand-primary bg-[#EAF2FB]"
            : "border-brand-primary/30 bg-brand-background"
        }`}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          accept={acceptedExtensions}
          className="hidden"
          disabled={!canUpload}
          multiple
          onChange={(event) => void handleFiles(event.target.files)}
          type="file"
        />
        <div className="font-semibold text-brand-text">Add up to 10 photos for this newsletter</div>
        <div className="mt-2 text-sm leading-6 text-brand-muted">
          Add up to 10 photos per newsletter. PNG, JPG, GIF, WEBP, SVG, MP3, MP4, and PDF files are
          supported. Use descriptive file names when you can so the system has better clues about which
          images fit the story. Images are compressed automatically before upload.
        </div>
        <div className="mt-2 text-sm leading-6 text-brand-muted">
          Drag and drop files here, or use the upload button below.
        </div>
        <div className="mt-2 text-sm leading-6 text-brand-muted">
          Example file names: `football-team.jpg`, `spring-concert-stage.jpg`, `science-fair-winners.png`.
        </div>
        <div className="mt-2 text-sm leading-6 text-brand-muted">
          If you assign a photo directly to Story A, Story B, or Story C in the form above, you do not need to rename
          your files. Filename prefixes still work as an advanced fallback if you ever need them.
        </div>
        <div className="mt-2 text-sm leading-6 text-brand-muted">
          The system will choose the images that best fit the newsletter it builds.
        </div>
        <div className="mt-2 text-sm leading-6 text-brand-muted">
          Images up to 4 MB, MP3 up to 4 MB, MP4 up to 5 MB, PDF up to 4 MB.
        </div>
        <div className="mt-5">
          <span className="inline-flex rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white">
            Upload photos and media
          </span>
        </div>
        {!canUpload ? (
          <div className="mt-3 text-sm font-semibold text-red-600">
            School profile is still loading. Uploads will turn on in a moment.
          </div>
        ) : null}
        {canUpload ? (
          <div className="mt-3 text-sm font-semibold text-brand-text">
            {photoUploads}/10 photos uploaded
            {otherUploads > 0 ? ` · ${otherUploads} other file${otherUploads === 1 ? "" : "s"} uploaded` : ""}
          </div>
        ) : null}
      </label>

      <div className="mt-6 grid gap-3">
        {assets.map((asset) => (
          <div key={`${asset.name}-${asset.url ?? asset.id}`} className="rounded-2xl border border-slate-200 px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold text-brand-text">{asset.name}</div>
                <div className="text-sm text-brand-muted">
                  {asset.type} · {asset.sizeMb.toFixed(2)} MB
                </div>
              </div>
              <div
                className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] ${
                  asset.status === "uploaded"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {asset.status}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

async function maybeCompressFile(file: File, document: NewsletterDocument) {
  if (!file.type.startsWith("image/")) {
    validateFile(file, document);
    return file;
  }

  validateFile(file, document);

  if (["image/gif", "image/svg+xml"].includes(file.type)) {
    return file;
  }

  const imageConstraint = document.workspace.mediaConstraints.find((constraint) => constraint.type === "image");
  const maxSizeMB = imageConstraint?.compressionTargetMb ?? 1.5;

  try {
    const compressed = await imageCompression(file, {
      maxSizeMB,
      maxWidthOrHeight: 2200,
      useWebWorker: true
    });

    return preserveOriginalFileName(compressed, file);
  } catch {
    return file;
  }
}

function preserveOriginalFileName(candidate: File | Blob, originalFile: File) {
  if (candidate instanceof File && candidate.name && candidate.name !== "blob") {
    return candidate;
  }

  return new File([candidate], originalFile.name, {
    type: candidate.type || originalFile.type,
    lastModified: originalFile.lastModified
  });
}

function validateFile(file: File, document: NewsletterDocument) {
  const constraint = findConstraintForFile(file, document);

  if (!constraint) {
    const supportedTypes = document.workspace.mediaConstraints
      .flatMap((candidate) => candidate.extensions)
      .map((candidate) => candidate.toUpperCase())
      .join(", ");
    throw new Error(`"${file.name}" is not supported. Use: ${supportedTypes}.`);
  }

  const sizeMb = file.size / (1024 * 1024);
  if (sizeMb > constraint.maxSizeMb) {
    throw new Error(`${file.name} exceeds the ${constraint.maxSizeMb} MB limit.`);
  }
}

function findConstraintForFile(file: File, document: NewsletterDocument) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const byExtension = document.workspace.mediaConstraints.find((candidate) =>
    candidate.extensions.includes(extension)
  );

  if (byExtension) {
    return byExtension;
  }

  if (file.type.startsWith("image/")) {
    return document.workspace.mediaConstraints.find((candidate) => candidate.type === "image");
  }

  if (file.type.startsWith("audio/")) {
    return document.workspace.mediaConstraints.find((candidate) => candidate.type === "audio");
  }

  if (file.type.startsWith("video/")) {
    return document.workspace.mediaConstraints.find((candidate) => candidate.type === "video");
  }

  if (file.type === "application/pdf") {
    return document.workspace.mediaConstraints.find((candidate) => candidate.type === "document");
  }

  return null;
}
