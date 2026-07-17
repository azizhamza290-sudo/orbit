import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { parseBody, withErrorHandling } from "@/lib/api";
import { inviteMemberSchema } from "@/lib/validations";
import { createInvite, requireRole } from "@/services/workspace.service";
import { sendWorkspaceInviteEmail } from "@/lib/email";
import { db } from "@/lib/db";

type Ctx = { params: Promise<{ workspaceId: string }> };

export const GET = withErrorHandling(async (_req: Request, ctx: Ctx) => {
  const { workspaceId } = await ctx.params;
  const user = await requireUser();
  await requireRole(workspaceId, user.id, "MODERATOR");

  const invites = await db.workspaceInvite.findMany({
    where: { workspaceId, acceptedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ invites });
});

export const POST = withErrorHandling(async (request: Request, ctx: Ctx) => {
  const { workspaceId } = await ctx.params;
  const user = await requireUser();
  await requireRole(workspaceId, user.id, "MODERATOR");

  const input = await parseBody(request, inviteMemberSchema);
  const invite = await createInvite(workspaceId, user.id, input.email, input.role ?? "MEMBER");

  if (input.email) {
    const workspace = await db.workspace.findUnique({ where: { id: workspaceId } });
    if (workspace) {
      await sendWorkspaceInviteEmail(input.email, workspace.name, user.name, invite.token);
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return NextResponse.json(
    { invite, url: `${appUrl}/invite/${invite.token}` },
    { status: 201 },
  );
});
