import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { apiError, parseBody, withErrorHandling } from "@/lib/api";
import { createMessageSchema, listMessagesSchema } from "@/lib/validations";
import { createMessage, listMessages } from "@/services/message.service";
import { rateLimit } from "@/lib/rate-limit";

type Ctx = { params: Promise<{ channelId: string }> };

export const GET = withErrorHandling(async (request: Request, ctx: Ctx) => {
  const { channelId } = await ctx.params;
  const user = await requireUser();

  const { searchParams } = new URL(request.url);
  const { cursor, limit } = listMessagesSchema.parse({
    cursor: searchParams.get("cursor") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });

  const page = await listMessages(channelId, user.id, { cursor, limit });
  return NextResponse.json(page);
});

export const POST = withErrorHandling(async (request: Request, ctx: Ctx) => {
  const { channelId } = await ctx.params;
  const user = await requireUser();

  const { success } = rateLimit(`msg:${user.id}`, { limit: 60, windowMs: 60_000 });
  if (!success) return apiError(429, "You're sending messages too fast");

  const input = await parseBody(request, createMessageSchema);
  const message = await createMessage(channelId, user.id, input);
  return NextResponse.json({ message }, { status: 201 });
});
