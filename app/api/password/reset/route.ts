import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { apiError, parseBody, withErrorHandling } from "@/lib/api";
import { resetPasswordSchema } from "@/lib/validations";

export const POST = withErrorHandling(async (request: Request) => {
  const { token, password } = await parseBody(request, resetPasswordSchema);

  const record = await db.passwordResetToken.findUnique({ where: { token } });
  if (!record || record.usedAt || record.expires < new Date()) {
    return apiError(410, "This reset link is invalid or has expired");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db.$transaction([
    db.user.update({
      where: { email: record.email },
      data: { passwordHash },
    }),
    db.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    // Invalidate any other outstanding tokens for this email.
    db.passwordResetToken.updateMany({
      where: { email: record.email, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true });
});
