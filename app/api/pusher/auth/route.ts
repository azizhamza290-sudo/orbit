import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { apiError, withErrorHandling } from "@/lib/api";
import { getPusher } from "@/lib/pusher";
import { db } from "@/lib/db";

/**
 * Pusher private/presence channel authorization.
 * Clients POST socket_id + channel_name; we verify membership.
 */
export const POST = withErrorHandling(async (request: Request) => {
  const user = await requireUser();
  const pusher = getPusher();
  if (!pusher) return apiError(503, "Realtime is not configured");

  const form = await request.formData();
  const socketId = form.get("socket_id") as string;
  const channelName = form.get("channel_name") as string;
  if (!socketId || !channelName) return apiError(400, "Missing socket_id or channel_name");

  // private-user-{id}: only the owner.
  if (channelName.startsWith("private-user-")) {
    if (channelName !== `private-user-${user.id}`) return apiError(403, "Forbidden");
    return NextResponse.json(pusher.authorizeChannel(socketId, channelName));
  }

  // private-channel-{id}: must be a member or a public channel in a workspace of the user.
  if (channelName.startsWith("private-channel-")) {
    const channelId = channelName.replace("private-channel-", "");
    const channel = await db.channel.findFirst({
      where: {
        id: channelId,
        OR: [
          { members: { some: { userId: user.id } } },
          { type: "PUBLIC", workspace: { members: { some: { userId: user.id, deletedAt: null } } } },
        ],
      },
    });
    if (!channel) return apiError(403, "Forbidden");
    return NextResponse.json(pusher.authorizeChannel(socketId, channelName));
  }

  // presence-workspace-{id} / private-workspace-{id}: must be a member.
  const match = channelName.match(/^(?:presence|private)-workspace-(.+)$/);
  if (match) {
    const workspaceId = match[1];
    const member = await db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: user.id }, deletedAt: null },
    });
    if (!member) return apiError(403, "Forbidden");

    if (channelName.startsWith("presence-")) {
      return NextResponse.json(
        pusher.authorizeChannel(socketId, channelName, {
          user_id: user.id,
          user_info: { name: user.name, image: user.image },
        }),
      );
    }
    return NextResponse.json(pusher.authorizeChannel(socketId, channelName));
  }

  return apiError(403, "Forbidden");
});
