import { NextResponse } from "next/server";
import { requireUser, auth } from "@/lib/auth";
import { HttpError, withErrorHandling } from "@/lib/api";
import { acceptInvite } from "@/services/workspace.service";
import { db } from "@/lib/db";

type Ctx = { params: Promise<{ token: string }> };

/** Public invite preview (name, workspace) — used by the accept page. */
export const GET = withErrorHandling(async (_req: Request, ctx: Ctx) => {
  const { token } = await ctx.params;
  const invite = await db.workspaceInvite.findUnique({
    where: { token },
    include: {
      workspace: { select: { id: true, name: true, image: true, description: true } },
      createdBy: { select: { name: true } },
    },
  });
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    throw new HttpError(404, "This invite is invalid or has expired");
  }
  const session = await auth();
  return NextResponse.json({
    invite: {
      workspace: invite.workspace,
      invitedBy: invite.createdBy.name,
      email: invite.email,
    },
    authenticated: !!session?.user,
  });
});

export const POST = withErrorHandling(async (_req: Request, ctx: Ctx) => {
  const { token } = await ctx.params;
  const user = await requireUser();
  const { workspace } = await acceptInvite(token, user.id);
  return NextResponse.json({ workspace });
});
