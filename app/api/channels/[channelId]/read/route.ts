import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";
import { markChannelRead } from "@/services/channel.service";
import { trigger, pusherChannels } from "@/lib/pusher";

export const POST = withErrorHandling(
  async (_req: Request, ctx: { params: Promise<{ channelId: string }> }) => {
    const { channelId } = await ctx.params;
    const user = await requireUser();
    await markChannelRead(channelId, user.id);

    // Broadcast so DM partners can render "seen" receipts.
    await trigger(pusherChannels.channel(channelId), "read:update", {
      channelId,
      userId: user.id,
      lastReadAt: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true });
  },
);
