import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { parseBody, withErrorHandling } from "@/lib/api";
import { updateMessageSchema } from "@/lib/validations";
import { deleteMessage, updateMessage } from "@/services/message.service";

type Ctx = { params: Promise<{ messageId: string }> };

export const PATCH = withErrorHandling(async (request: Request, ctx: Ctx) => {
  const { messageId } = await ctx.params;
  const user = await requireUser();
  const { content } = await parseBody(request, updateMessageSchema);
  const message = await updateMessage(messageId, user.id, content);
  return NextResponse.json({ message });
});

export const DELETE = withErrorHandling(async (_req: Request, ctx: Ctx) => {
  const { messageId } = await ctx.params;
  const user = await requireUser();
  await deleteMessage(messageId, user.id);
  return NextResponse.json({ ok: true });
});
