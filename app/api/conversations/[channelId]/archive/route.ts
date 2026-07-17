import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";
import { archiveConversation } from "@/services/conversation.service";

export const POST = withErrorHandling(
  async (_req: Request, ctx: { params: Promise<{ channelId: string }> }) => {
    const { channelId } = await ctx.params;
    const user = await requireUser();
    await archiveConversation(channelId, user.id);
    return NextResponse.json({ ok: true });
  },
);
