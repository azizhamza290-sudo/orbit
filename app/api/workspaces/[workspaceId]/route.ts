import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { HttpError, parseBody, withErrorHandling } from "@/lib/api";
import { updateWorkspaceSchema } from "@/lib/validations";
import { requireRole } from "@/services/workspace.service";
import { db } from "@/lib/db";
import { trigger, pusherChannels, pusherEvents } from "@/lib/pusher";

type Ctx = { params: Promise<{ workspaceId: string }> };

export const GET = withErrorHandling(async (_req: Request, ctx: Ctx) => {
  const { workspaceId } = await ctx.params;
  const user = await requireUser();
  const member = await requireRole(workspaceId, user.id, "MEMBER");

  const workspace = await db.workspace.findFirst({
    where: { id: workspaceId, deletedAt: null },
    include: { _count: { select: { members: { where: { deletedAt: null } } } } },
  });
  if (!workspace) throw new HttpError(404, "Workspace not found");

  return NextResponse.json({
    workspace: { ...workspace, role: member.role, memberCount: workspace._count.members },
  });
});

export const PATCH = withErrorHandling(async (request: Request, ctx: Ctx) => {
  const { workspaceId } = await ctx.params;
  const user = await requireUser();
  await requireRole(workspaceId, user.id, "ADMIN");

  const input = await parseBody(request, updateWorkspaceSchema);
  const workspace = await db.workspace.update({
    where: { id: workspaceId },
    data: input,
  });

  await trigger(pusherChannels.workspace(workspaceId), pusherEvents.memberUpdate, {
    type: "workspace:updated",
  });
  return NextResponse.json({ workspace });
});

export const DELETE = withErrorHandling(async (_req: Request, ctx: Ctx) => {
  const { workspaceId } = await ctx.params;
  const user = await requireUser();
  await requireRole(workspaceId, user.id, "OWNER");

  await db.workspace.update({
    where: { id: workspaceId },
    data: { deletedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
});
