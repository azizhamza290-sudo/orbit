import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";
import { togglePin } from "@/services/message.service";

export const POST = withErrorHandling(
  async (_req: Request, ctx: { params: Promise<{ messageId: string }> }) => {
    const { messageId } = await ctx.params;
    const user = await requireUser();
    const message = await togglePin(messageId, user.id);
    return NextResponse.json({ message });
  },
);
