import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { HttpError, parseBody, withErrorHandling } from "@/lib/api";
import { updateMemberRoleSchema } from "@/lib/validations";
import { requireRole } from "@/services/workspace.service";
import { db } from "@/lib/db";

type Ctx = { params: Promise<{ workspaceId: string; memberId: string }> };

export const PATCH = withErrorHandling(async (request: Request, ctx: Ctx) => {
  const { workspaceId, memberId } = await ctx.params;
  const user = await requireUser();
  await requireRole(workspaceId, user.id, "ADMIN");

  const target = await db.workspaceMember.findUnique({ where: { id: memberId } });
  if (!target || target.workspaceId !== workspaceId) {
    throw new HttpError(404, "Member not found");
  }
  if (target.role === "OWNER") throw new HttpError(400, "The owner's role can't be changed");

  const { role } = await parseBody(request, updateMemberRoleSchema);
  const member = await db.workspaceMember.update({
    where: { id: memberId },
    data: { role },
    include: { user: { select: { id: true, name: true, image: true } } },
  });
  return NextResponse.json({ member });
});

export const DELETE = withErrorHandling(async (_req: Request, ctx: Ctx) => {
  const { workspaceId, memberId } = await ctx.params;
  const user = await requireUser();
  await requireRole(workspaceId, user.id, "ADMIN");

  const target = await db.workspaceMember.findUnique({ where: { id: memberId } });
  if (!target || target.workspaceId !== workspaceId) {
    throw new HttpError(404, "Member not found");
  }
  if (target.role === "OWNER") throw new HttpError(400, "The owner can't be removed");
  if (target.userId === user.id) throw new HttpError(400, "Use 'leave workspace' instead");

  await db.workspaceMember.update({
    where: { id: memberId },
    data: { deletedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
});
