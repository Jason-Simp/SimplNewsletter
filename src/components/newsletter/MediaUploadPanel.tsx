"use client";

import imageCompression from "browser-image-compression";
import { useMemo, useState } from "react";

import type { NewsletterDocument } from "@/types/newsletter";
import type { UploadedAsset } from "@/types/media";

type Props = {
  document: NewsletterDocument;
};

function getAcceptedExtensions(document: NewsletterDocument) {
  return document.workspace.mediaConstraints.flatMap((constraint) =>
    constraint.extensions.map((extension) => `.${extension}`)
  );
}

export function MediaUploadPanel({ document }: Props) {
  const [assets, setAssets] = useState<UploadedAsset[]>([]);
  const [message, setMessage] = useState("No uploads yet.");
  const [uploading, setUploading] = useState(false);

  const acceptedExtensions = useMemo(() => getAcceptedExtensions(document).join(","), [document]);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList?.length) {
      return;
    }

    setUploading(true);
    setMessage("Processing files...");

    const nextAssets: UploadedAsset[] = [];

    try {
      for (const rawFile of Array.from(fileList)) {
        const preparedFile = await maybeCompressFile(rawFile, document);
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
          throw new Error(payload?.message ?? `Upload failed for ${preparedFile.name}`);
        }

        nextAssets.push(payload.data as UploadedAsset);
      }

      setAssets((current) => [...nextAssets, ...current]);
      setMessage("Uploads processed.");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Upload failed.";
      setMessage(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="rounded-editorial border border-slate-200 bg-white p-6 shadow-editorial">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">Media</p>
          <h2 className="mt-2 font-display text-3xl text-brand-navy">Upload and compress assets</h2>
        </div>
        <div
          className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] ${
            uploading ? "bg-amber-100 text-amber-700" : "bg-brand-background text-brand-primary"
          }`}
        >
          {message}
        </div>
      </div>

      <label className="mt-6 block rounded-[28px] border border-dashed border-brand-primary/30 bg-brand-background p-8 text-center">
        <input
          accept={acceptedExtensions}
          className="hidden"
          multiple
          onChange={(event) => void handleFiles(event.target.files)}
          type="file"
        />
        <div className="font-semibold text-brand-text">Drop files here or click to upload</div>
        <div className="mt-2 text-sm leading-6 text-brand-muted">
          Images up to 4 MB, MP3 up to 4 MB, MP4 up to 5 MB, PDF up to 4 MB. Images are compressed
          before upload when possible.
        </div>
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

  const imageConstraint = document.workspace.mediaConstraints.find((constraint) => constraint.type === "image");
  const maxSizeMB = imageConstraint?.compressionTargetMb ?? 1.5;

  return imageCompression(file, {
    maxSizeMB,
    maxWidthOrHeight: 2200,
    useWebWorker: true
  });
}

function validateFile(file: File, document: NewsletterDocument) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const constraint = document.workspace.mediaConstraints.find((candidate) =>
    candidate.extensions.includes(extension)
  );

  if (!constraint) {
    throw new Error(`Unsupported file type: ${file.name}`);
  }

  const sizeMb = file.size / (1024 * 1024);
  if (sizeMb > constraint.maxSizeMb) {
    throw new Error(`${file.name} exceeds the ${constraint.maxSizeMb} MB limit.`);
  }
}
