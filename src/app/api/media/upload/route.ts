import { randomUUID } from "crypto";

import { NextResponse } from "next/server";

import { mediaConstraints } from "@/lib/product-config";
import { serverConfig } from "@/lib/server-config";
import { getServiceSupabase } from "@/lib/supabase/server";

export async function POST(request: Request) {
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
    return NextResponse.json({ message: uploadError.message }, { status: 500 });
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
    return NextResponse.json({ message: assetError.message }, { status: 500 });
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
}

function validateFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const constraint = mediaConstraints.find((candidate) => candidate.extensions.includes(extension));

  if (!constraint) {
    return "Unsupported file type.";
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
