import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";
import { listPinnedMessages } from "@/services/message.service";

export const GET = withErrorHandling(
  async (_req: Request, ctx: { params: Promise<{ channelId: string }> }) => {
    const { channelId } = await ctx.params;
    const user = await requireUser();
    const messages = await listPinnedMessages(channelId, user.id);
    return NextResponse.json({ messages });
  },
);
