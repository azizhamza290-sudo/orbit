import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";
import { requireRole } from "@/services/workspace.service";
import { db } from "@/lib/db";

export const GET = withErrorHandling(
  async (_req: Request, ctx: { params: Promise<{ workspaceId: string }> }) => {
    const { workspaceId } = await ctx.params;
    const user = await requireUser();
    await requireRole(workspaceId, user.id, "MEMBER");

    const members = await db.workspaceMember.findMany({
      where: { workspaceId, deletedAt: null },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            bio: true,
            status: true,
            statusMessage: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ members });
  },
);
