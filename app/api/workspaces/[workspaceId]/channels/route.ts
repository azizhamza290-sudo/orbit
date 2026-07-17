import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { parseBody, withErrorHandling } from "@/lib/api";
import { createChannelSchema } from "@/lib/validations";
import { createChannel, listChannels } from "@/services/channel.service";
import { trigger, pusherChannels, pusherEvents } from "@/lib/pusher";

type Ctx = { params: Promise<{ workspaceId: string }> };

export const GET = withErrorHandling(async (_req: Request, ctx: Ctx) => {
  const { workspaceId } = await ctx.params;
  const user = await requireUser();
  const channels = await listChannels(workspaceId, user.id);
  return NextResponse.json({ channels });
});

export const POST = withErrorHandling(async (request: Request, ctx: Ctx) => {
  const { workspaceId } = await ctx.params;
  const user = await requireUser();
  const input = await parseBody(request, createChannelSchema);

  const channel = await createChannel(workspaceId, user.id, input);
  await trigger(pusherChannels.workspace(workspaceId), pusherEvents.channelUpdate, {
    type: "channel:created",
    channelId: channel.id,
  });
  return NextResponse.json({ channel }, { status: 201 });
});
