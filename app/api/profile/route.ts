import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { parseBody, withErrorHandling } from "@/lib/api";
import { updateProfileSchema } from "@/lib/validations";
import { db } from "@/lib/db";

export const GET = withErrorHandling(async () => {
  const user = await requireUser();
  const { passwordHash: _ph, ...safeUser } = user;
  return NextResponse.json({ user: safeUser });
});

export const PATCH = withErrorHandling(async (request: Request) => {
  const user = await requireUser();
  const input = await parseBody(request, updateProfileSchema);

  const updated = await db.user.update({
    where: { id: user.id },
    data: input,
  });
  const { passwordHash: _ph, ...safeUser } = updated;
  return NextResponse.json({ user: safeUser });
});
