import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";
import { getChannelForUser } from "@/services/channel.service";
import { db } from "@/lib/db";

/** Channel members — used by the mention autocomplete. */
export const GET = withErrorHandling(
  async (_req: Request, ctx: { params: Promise<{ channelId: string }> }) => {
    const { channelId } = await ctx.params;
    const user = await requireUser();
    await getChannelForUser(channelId, user.id);

    const members = await db.channelMember.findMany({
      where: { channelId },
      include: { user: { select: { id: true, name: true, image: true, status: true } } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ members: members.map((m) => m.user) });
  },
);
