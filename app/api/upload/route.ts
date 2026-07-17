import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireUser } from "@/lib/auth";
import { apiError, withErrorHandling } from "@/lib/api";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { randomToken } from "@/lib/utils";

const MAX_SIZE = 25 * 1024 * 1024; // 25 MB
const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "video/mp4",
  "video/webm",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/x-zip-compressed",
  "text/plain",
  "text/csv",
]);

/**
 * Upload a file to Vercel Blob and register an Attachment row.
 * The attachment is linked to a message when the message is sent
 * (via attachmentIds in the create-message payload).
 */
export const POST = withErrorHandling(async (request: Request) => {
  const user = await requireUser();

  const { success } = rateLimit(`upload:${user.id}`, { limit: 20, windowMs: 60_000 });
  if (!success) return apiError(429, "Too many uploads. Slow down.");

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return apiError(400, "No file provided");
  if (file.size > MAX_SIZE) return apiError(413, "File exceeds the 25 MB limit");
  if (!ALLOWED.has(file.type)) return apiError(415, `File type ${file.type} is not allowed`);

  const safeName = file.name.replace(/[^\w.\-() ]/g, "_").slice(0, 120);
  const blob = await put(`uploads/${user.id}/${randomToken(8)}-${safeName}`, file, {
    access: "public",
    contentType: file.type,
  });

  const attachment = await db.attachment.create({
    data: {
      uploaderId: user.id,
      url: blob.url,
      name: file.name.slice(0, 200),
      mimeType: file.type,
      size: file.size,
    },
  });

  return NextResponse.json({ attachment }, { status: 201 });
});
