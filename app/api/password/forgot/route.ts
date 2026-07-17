import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseBody, withErrorHandling } from "@/lib/api";
import { forgotPasswordSchema } from "@/lib/validations";
import { randomToken } from "@/lib/utils";
import { sendPasswordResetEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

export const POST = withErrorHandling(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
  const { success } = rateLimit(`forgot:${ip}`, { limit: 5, windowMs: 60_000 });
  if (!success) {
    // Still return 200 — never leak rate-limit state on this endpoint.
    return NextResponse.json({ ok: true });
  }

  const { email } = await parseBody(request, forgotPasswordSchema);
  const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });

  // Always respond identically to prevent account enumeration.
  if (user && user.passwordHash) {
    const token = randomToken(32);
    await db.passwordResetToken.create({
      data: {
        email: user.email,
        token,
        expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });
    await sendPasswordResetEmail(user.email, token);
  }

  return NextResponse.json({ ok: true });
});
