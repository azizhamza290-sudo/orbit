import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireUser } from "@/lib/auth";
import { apiError, withErrorHandling } from "@/lib/api";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { randomToken } from "@/lib/utils";

export const runtime = "nodejs";

const MAX_SIZE = 25 * 1024 * 1024;

const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "video/mp4",
  "video/webm",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/x-zip-compressed",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export const POST = withErrorHandling(async (request: Request) => {
  const user = await requireUser();

  const limit = rateLimit(`upload:${user.id}`, {
    limit: 20,
    windowMs: 60_000,
  });

  if (!limit.success) {
    return apiError(429, "Too many uploads");
  }


  const form = await request.formData();

  const file = form.get("file");


  if (!(file instanceof File)) {
    return apiError(400, "No file received");
  }


  console.log("UPLOAD FILE:", {
    name: file.name,
    type: file.type,
    size: file.size,
  });


  if (file.size > MAX_SIZE) {
    return apiError(
      413,
      "File too large. Maximum size is 25MB"
    );
  }


  if (!ALLOWED.has(file.type)) {
    return apiError(
      415,
      `File type not allowed: ${file.type}`
    );
  }


  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return apiError(
      500,
      "Missing BLOB_READ_WRITE_TOKEN"
    );
  }


  const safeName = file.name
    .replace(/[^\w.\-() ]/g, "_")
    .slice(0,120);


  const blob = await put(
    `uploads/${user.id}/${randomToken(8)}-${safeName}`,
    file,
    {
      access: "public",
      contentType: file.type,
    }
  );


  const attachment = await db.attachment.create({
    data:{
      uploaderId:user.id,
      url:blob.url,
      name:file.name.slice(0,200),
      mimeType:file.type,
      size:file.size,
    }
  });


  return NextResponse.json(
    {
      attachment,
      url:blob.url
    },
    {
      status:201
    }
  );

});
