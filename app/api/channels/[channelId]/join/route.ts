import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";
import { joinChannel, leaveChannel, markChannelRead } from "@/services/channel.service";

type Ctx = { params: Promise<{ channelId: string }> };

export const POST = withErrorHandling(async (_req: Request, ctx: Ctx) => {
  const { channelId } = await ctx.params;
  const user = await requireUser();
  await joinChannel(channelId, user.id);
  await markChannelRead(channelId, user.id);
  return NextResponse.json({ ok: true });
});

export const DELETE = withErrorHandling(async (_req: Request, ctx: Ctx) => {
  const { channelId } = await ctx.params;
  const user = await requireUser();
  await leaveChannel(channelId, user.id);
  return NextResponse.json({ ok: true });
});
