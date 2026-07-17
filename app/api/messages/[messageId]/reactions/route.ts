import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { parseBody, withErrorHandling } from "@/lib/api";
import { reactionSchema } from "@/lib/validations";
import { toggleReaction } from "@/services/message.service";

export const POST = withErrorHandling(
  async (request: Request, ctx: { params: Promise<{ messageId: string }> }) => {
    const { messageId } = await ctx.params;
    const user = await requireUser();
    const { emoji } = await parseBody(request, reactionSchema);
    const reactions = await toggleReaction(messageId, user.id, emoji);
    return NextResponse.json({ reactions });
  },
);
