import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError, parseBody, withErrorHandling } from "@/lib/api";

const schema = z.object({ token: z.string().min(10) });

export const POST = withErrorHandling(async (request: Request) => {
  const { token } = await parseBody(request, schema);

  const record = await db.verificationToken.findUnique({ where: { token } });
  if (!record || record.expires < new Date()) {
    if (record) await db.verificationToken.delete({ where: { token } });
    return apiError(410, "This verification link is invalid or has expired");
  }

  await db.$transaction([
    db.user.update({
      where: { email: record.identifier },
      data: { emailVerified: new Date() },
    }),
    db.verificationToken.delete({ where: { token } }),
  ]);

  return NextResponse.json({ verified: true });
});
