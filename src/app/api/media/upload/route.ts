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

    const validationError = validateFile(file);
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
    const arrayBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from(serverConfig.storageBucket)
      .upload(objectPath, Buffer.from(arrayBuffer), {
        contentType: file.type,
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
      kind: resolveAssetKind(file.type),
      original_filename: file.name,
      mime_type: file.type,
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
        type: file.type,
        sizeMb,
        status: "uploaded",
        url: publicUrlData.publicUrl
      }
    });
  } catch (error) {
    return jsonApiError("api.media.upload.post", error, "The file could not be uploaded.");
  }
}

function validateFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const constraint =
    mediaConstraints.find((candidate) => candidate.extensions.includes(extension)) ??
    mediaConstraints.find((candidate) => matchesMimeType(candidate.type, file.type));

  if (!constraint) {
    return `"${file.name}" is not supported. Use PNG, JPG, JPEG, GIF, WEBP, SVG, MP3, MP4, MOV, WEBM, WAV, M4A, or PDF.`;
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
