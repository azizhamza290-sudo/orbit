import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";
import { getChannelForUser } from "@/services/channel.service";
import { trigger, pusherChannels, pusherEvents } from "@/lib/pusher";
import { rateLimit } from "@/lib/rate-limit";

export const POST = withErrorHandling(
  async (_req: Request, ctx: { params: Promise<{ channelId: string }> }) => {
    const { channelId } = await ctx.params;
    const user = await requireUser();

    const { success } = rateLimit(`typing:${user.id}:${channelId}`, {
      limit: 10,
      windowMs: 10_000,
    });
    if (!success) return NextResponse.json({ ok: true });

    await getChannelForUser(channelId, user.id);
    await trigger(pusherChannels.channel(channelId), pusherEvents.typing, {
      channelId,
      user: { id: user.id, name: user.name, image: user.image },
    });
    return NextResponse.json({ ok: true });
  },
);
