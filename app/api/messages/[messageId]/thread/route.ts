import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";
import { listThread } from "@/services/message.service";

export const GET = withErrorHandling(
  async (_req: Request, ctx: { params: Promise<{ messageId: string }> }) => {
    const { messageId } = await ctx.params;
    const user = await requireUser();
    const thread = await listThread(messageId, user.id);
    return NextResponse.json(thread);
  },
);
