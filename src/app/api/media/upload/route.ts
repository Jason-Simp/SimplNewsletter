import { randomUUID } from "crypto";

import { NextResponse } from "next/server";

import { jsonApiError } from "@/lib/api-route";
import { mediaConstraints } from "@/lib/product-config";
import { assertSchoolScope, requireBuilderAccess, requireSignedInMember } from "@/lib/server-auth";
import { serverConfig } from "@/lib/server-config";
import { getServiceSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { member } = await requireSignedInMember(request);
    requireBuilderAccess(member);

    const formData = await request.formData();
    const file = formData.get("file");
    const newsletterId = String(formData.get("newsletterId") ?? "");
    const schoolId = String(formData.get("schoolId") ?? "");
    const organizationName = String(formData.get("organizationName") ?? "school");

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "Missing file." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const detectedMimeType = detectMimeType(fileBuffer, file.name, file.type);
    const validationError = validateFile(file, detectedMimeType);
    if (validationError) {
      return NextResponse.json({ message: validationError }, { status: 400 });
    }

    assertSchoolScope(member, schoolId);

    const sizeMb = file.size / (1024 * 1024);
    const supabase = getServiceSupabase();

    if (!supabase) {
      return NextResponse.json({
        status: "ok",
        data: {
          id: randomUUID(),
          name: file.name,
          type: file.type,
          sizeMb,
          status: "local"
        }
      });
    }

    if (!isUuid(schoolId)) {
      return NextResponse.json(
        { message: "Upload is missing a valid school workspace." },
        { status: 400 }
      );
    }

    const objectPath = buildStoragePath(organizationName, newsletterId, file.name);
    const { error: uploadError } = await supabase.storage
      .from(serverConfig.storageBucket)
      .upload(objectPath, fileBuffer, {
        contentType: detectedMimeType,
        upsert: true
      });

    if (uploadError) {
      const message =
        uploadError.message.toLowerCase().includes("bucket")
          ? `Upload bucket not found. Create a Supabase storage bucket named "${serverConfig.storageBucket}" or update SUPABASE_STORAGE_BUCKET.`
          : uploadError.message;

      return NextResponse.json({ message }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage
      .from(serverConfig.storageBucket)
      .getPublicUrl(objectPath);

    const { error: assetError } = await supabase.from("assets").insert({
      school_id: schoolId,
      newsletter_id: isUuid(newsletterId) ? newsletterId : null,
      kind: resolveAssetKind(detectedMimeType),
      original_filename: file.name,
      mime_type: detectedMimeType,
      storage_path: objectPath,
      public_url: publicUrlData.publicUrl,
      original_size_bytes: file.size,
      processed_size_bytes: file.size,
      metadata: {
        uploaded_from: "builder-ui"
      },
      expires_at: new Date(Date.now() + serverConfig.assetRetentionDays * 24 * 60 * 60 * 1000).toISOString()
    });

    if (assetError) {
      throw assetError;
    }

    return NextResponse.json({
      status: "ok",
      data: {
        id: randomUUID(),
        name: file.name,
        type: detectedMimeType,
        sizeMb,
        status: "uploaded",
        url: publicUrlData.publicUrl
      }
    });
  } catch (error) {
    return jsonApiError("api.media.upload.post", error, "The file could not be uploaded.");
  }
}

function validateFile(file: File, detectedMimeType: string) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const constraint =
    mediaConstraints.find((candidate) => candidate.extensions.includes(extension)) ??
    mediaConstraints.find((candidate) => matchesMimeType(candidate.type, detectedMimeType));

  if (!constraint) {
    return `"${file.name}" is not supported. Use PNG, JPG, JPEG, GIF, WEBP, MP3, MP4, MOV, WEBM, WAV, M4A, or PDF.`;
  }

  if (!matchesExtensionToMime(extension, detectedMimeType)) {
    return `${file.name} does not match its expected file type. Please upload the original file in its real format.`;
  }

  const sizeMb = file.size / (1024 * 1024);
  if (sizeMb > constraint.maxSizeMb) {
    return `${file.name} exceeds the ${constraint.maxSizeMb} MB limit.`;
  }

  return null;
}

function buildStoragePath(organizationName: string, newsletterId: string, fileName: string) {
  const safeOrg = organizationName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const safeName = fileName.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
  return `${safeOrg}/${newsletterId || "draft"}/${Date.now()}-${safeName}`;
}

function resolveAssetKind(mimeType: string) {
  if (mimeType.startsWith("image/")) {
    return "image";
  }

  if (mimeType.startsWith("audio/")) {
    return "audio";
  }

  if (mimeType.startsWith("video/")) {
    return "video";
  }

  return "document";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function matchesMimeType(type: "image" | "audio" | "video" | "document", mimeType: string) {
  if (type === "document") {
    return mimeType === "application/pdf";
  }

  return mimeType.startsWith(`${type}/`);
}

function detectMimeType(buffer: Buffer, fileName: string, fallbackMimeType: string) {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";

  if (hasPrefix(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }

  if (hasPrefix(buffer, [0xff, 0xd8, 0xff])) {
    return "image/jpeg";
  }

  if (hasPrefix(buffer, [0x47, 0x49, 0x46, 0x38])) {
    return "image/gif";
  }

  if (buffer.slice(0, 4).toString("ascii") === "RIFF" && buffer.slice(8, 12).toString("ascii") === "WEBP") {
    return "image/webp";
  }

  if (hasPrefix(buffer, [0x25, 0x50, 0x44, 0x46])) {
    return "application/pdf";
  }

  if (buffer.slice(4, 8).toString("ascii") === "ftyp") {
    const brand = buffer.slice(8, 12).toString("ascii").toLowerCase();

    if (["m4a ", "m4b ", "mp41", "mp42", "isom"].includes(brand)) {
      return extension === "m4a" ? "audio/mp4" : "video/mp4";
    }

    if (brand === "qt  ") {
      return "video/quicktime";
    }
  }

  if (hasPrefix(buffer, [0x1a, 0x45, 0xdf, 0xa3])) {
    return "video/webm";
  }

  if (buffer.slice(0, 4).toString("ascii") === "RIFF" && buffer.slice(8, 12).toString("ascii") === "WAVE") {
    return "audio/wav";
  }

  if (buffer.slice(0, 3).toString("ascii") === "ID3" || hasPrefix(buffer, [0xff, 0xfb]) || hasPrefix(buffer, [0xff, 0xf3]) || hasPrefix(buffer, [0xff, 0xf2])) {
    return "audio/mpeg";
  }

  return fallbackMimeType || mimeTypeFromExtension(extension) || "application/octet-stream";
}

function mimeTypeFromExtension(extension: string) {
  switch (extension) {
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "pdf":
      return "application/pdf";
    case "mp3":
      return "audio/mpeg";
    case "wav":
      return "audio/wav";
    case "m4a":
      return "audio/mp4";
    case "mp4":
      return "video/mp4";
    case "mov":
      return "video/quicktime";
    case "webm":
      return "video/webm";
    default:
      return "";
  }
}

function matchesExtensionToMime(extension: string, mimeType: string) {
  const allowedMimeTypesByExtension: Record<string, string[]> = {
    png: ["image/png"],
    jpg: ["image/jpeg"],
    jpeg: ["image/jpeg"],
    gif: ["image/gif"],
    webp: ["image/webp"],
    pdf: ["application/pdf"],
    mp3: ["audio/mpeg"],
    wav: ["audio/wav"],
    m4a: ["audio/mp4"],
    mp4: ["video/mp4"],
    mov: ["video/quicktime"],
    webm: ["video/webm"]
  };

  const allowedMimeTypes = allowedMimeTypesByExtension[extension];

  if (!allowedMimeTypes) {
    return false;
  }

  return allowedMimeTypes.includes(mimeType);
}

function hasPrefix(buffer: Buffer, prefix: number[]) {
  if (buffer.length < prefix.length) {
    return false;
  }

  return prefix.every((value, index) => buffer[index] === value);
}
