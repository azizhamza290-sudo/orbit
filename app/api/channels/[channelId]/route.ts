import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { parseBody, withErrorHandling } from "@/lib/api";
import { updateChannelSchema } from "@/lib/validations";
import {
  deleteChannel,
  getChannelForUser,
  updateChannel,
} from "@/services/channel.service";
import { trigger, pusherChannels, pusherEvents } from "@/lib/pusher";

type Ctx = { params: Promise<{ channelId: string }> };

export const GET = withErrorHandling(async (_req: Request, ctx: Ctx) => {
  const { channelId } = await ctx.params;
  const user = await requireUser();
  const channel = await getChannelForUser(channelId, user.id);
  return NextResponse.json({ channel });
});

export const PATCH = withErrorHandling(async (request: Request, ctx: Ctx) => {
  const { channelId } = await ctx.params;
  const user = await requireUser();
  const input = await parseBody(request, updateChannelSchema);

  const channel = await updateChannel(channelId, user.id, input);
  await trigger(pusherChannels.workspace(channel.workspaceId), pusherEvents.channelUpdate, {
    type: "channel:updated",
    channelId,
  });
  return NextResponse.json({ channel });
});

export const DELETE = withErrorHandling(async (_req: Request, ctx: Ctx) => {
  const { channelId } = await ctx.params;
  const user = await requireUser();
  const channel = await deleteChannel(channelId, user.id);
  await trigger(pusherChannels.workspace(channel.workspaceId), pusherEvents.channelUpdate, {
    type: "channel:deleted",
    channelId,
  });
  return NextResponse.json({ ok: true });
});
