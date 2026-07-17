import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { apiError, parseBody, withErrorHandling } from "@/lib/api";
import { registerSchema } from "@/lib/validations";
import { randomToken } from "@/lib/utils";
import { sendVerificationEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

export const POST = withErrorHandling(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
  const { success } = rateLimit(`register:${ip}`, { limit: 5, windowMs: 60_000 });
  if (!success) return apiError(429, "Too many attempts. Please wait a minute.");

  const input = await parseBody(request, registerSchema);
  const email = input.email.toLowerCase();

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return apiError(409, "An account with this email already exists");

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await db.user.create({
    data: { name: input.name, email, passwordHash },
  });

  // Issue an email-verification token (24h).
  const token = randomToken(32);
  await db.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  await sendVerificationEmail(email, token);

  return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
});
