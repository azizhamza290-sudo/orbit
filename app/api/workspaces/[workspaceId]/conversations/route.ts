import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { parseBody, withErrorHandling } from "@/lib/api";
import { createConversationSchema } from "@/lib/validations";
import { listConversations, openConversation } from "@/services/conversation.service";

type Ctx = { params: Promise<{ workspaceId: string }> };

export const GET = withErrorHandling(async (_req: Request, ctx: Ctx) => {
  const { workspaceId } = await ctx.params;
  const user = await requireUser();
  const conversations = await listConversations(workspaceId, user.id);
  return NextResponse.json({ conversations });
});

export const POST = withErrorHandling(async (request: Request, ctx: Ctx) => {
  const { workspaceId } = await ctx.params;
  const user = await requireUser();
  const { userId: otherUserId } = await parseBody(request, createConversationSchema);
  const conversation = await openConversation(workspaceId, user.id, otherUserId);
  return NextResponse.json({ conversation }, { status: 201 });
});
