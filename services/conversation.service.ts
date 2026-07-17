import { db } from "@/lib/db";
import { HttpError } from "@/lib/api";
import { requireRole } from "@/services/workspace.service";

/**
 * Direct messages are channels of type DM with exactly two members.
 * This keeps messages, reactions, threads and read receipts unified.
 */
export async function listConversations(workspaceId: string, userId: string) {
  await requireRole(workspaceId, userId, "MEMBER");

  const memberships = await db.conversationMember.findMany({
    where: { userId, archivedAt: null },
    select: { channelId: true },
  });
  const channelIds = memberships.map((m) => m.channelId);

  const channels = await db.channel.findMany({
    where: { id: { in: channelIds }, workspaceId, type: "DM", deletedAt: null },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, image: true, status: true } } },
      },
    },
  });

  return Promise.all(
    channels.map(async (channel) => {
      const other = channel.members.find((m) => m.userId !== userId)?.user ?? null;
      const mine = await db.channelMember.findUnique({
        where: { channelId_userId: { channelId: channel.id, userId } },
        select: { lastReadAt: true },
      });
      const unreadCount = await db.message.count({
        where: {
          channelId: channel.id,
          deletedAt: null,
          authorId: { not: userId },
          createdAt: { gt: mine?.lastReadAt ?? new Date(0) },
        },
      });
      const lastMessage = await db.message.findFirst({
        where: { channelId: channel.id, deletedAt: null },
        orderBy: { createdAt: "desc" },
        select: { content: true, createdAt: true, authorId: true },
      });
      const { members: _m, ...rest } = channel;
      return { ...rest, otherMember: other, unreadCount, lastMessage };
    }),
  );
}

export async function openConversation(workspaceId: string, userId: string, otherUserId: string) {
  if (userId === otherUserId) throw new HttpError(400, "You can't DM yourself");
  await requireRole(workspaceId, userId, "MEMBER");
  await requireRole(workspaceId, otherUserId, "MEMBER");

  // Reuse an existing DM channel between the two users.
  const existing = await db.channel.findFirst({
    where: {
      workspaceId,
      type: "DM",
      deletedAt: null,
      AND: [
        { members: { some: { userId } } },
        { members: { some: { userId: otherUserId } } },
      ],
    },
    include: { members: true },
  });
  if (existing && existing.members.length === 2) {
    await db.conversationMember.updateMany({
      where: { channelId: existing.id, userId },
      data: { archivedAt: null },
    });
    return existing;
  }

  return db.$transaction(async (tx) => {
    const channel = await tx.channel.create({
      data: {
        workspaceId,
        type: "DM",
        createdById: userId,
        members: { create: [{ userId }, { userId: otherUserId }] },
      },
    });
    await tx.conversationMember.createMany({
      data: [
        { channelId: channel.id, userId },
        { channelId: channel.id, userId: otherUserId },
      ],
    });
    return channel;
  });
}

export async function archiveConversation(channelId: string, userId: string) {
  await db.conversationMember.updateMany({
    where: { channelId, userId },
    data: { archivedAt: new Date() },
  });
}
