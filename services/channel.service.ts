import { db } from "@/lib/db";
import { HttpError } from "@/lib/api";
import { requireRole } from "@/services/workspace.service";
import type { CreateChannelInput, UpdateChannelInput } from "@/lib/validations";

/** All channels visible to a user in a workspace (member of, or public). */
export async function listChannels(workspaceId: string, userId: string) {
  await requireRole(workspaceId, userId, "MEMBER");

  const channels = await db.channel.findMany({
    where: {
      workspaceId,
      deletedAt: null,
      isArchived: false,
      OR: [
        { type: "PUBLIC" },
        { members: { some: { userId } } },
      ],
    },
    include: {
      members: {
        where: { userId },
        select: { lastReadAt: true },
      },
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Unread counts per channel.
  const withUnread = await Promise.all(
    channels.map(async (channel) => {
      const lastReadAt = channel.members[0]?.lastReadAt ?? new Date(0);
      const unreadCount = await db.message.count({
        where: {
          channelId: channel.id,
          deletedAt: null,
          parentId: null,
          createdAt: { gt: lastReadAt },
          authorId: { not: userId },
        },
      });
      const { members: _m, ...rest } = channel;
      return { ...rest, unreadCount, memberCount: channel._count.members };
    }),
  );

  return withUnread;
}

export async function createChannel(
  workspaceId: string,
  userId: string,
  input: CreateChannelInput,
) {
  await requireRole(workspaceId, userId, "MEMBER");

  const existing = await db.channel.findFirst({
    where: { workspaceId, name: input.name, type: { not: "DM" }, deletedAt: null },
  });
  if (existing) throw new HttpError(409, "A channel with that name already exists");

  const memberIds = Array.from(new Set([userId, ...(input.memberIds ?? [])]));

  return db.channel.create({
    data: {
      workspaceId,
      name: input.name,
      description: input.description,
      topic: input.topic,
      type: input.type ?? "PUBLIC",
      createdById: userId,
      members: { create: memberIds.map((id) => ({ userId: id })) },
    },
  });
}

export async function getChannelForUser(channelId: string, userId: string) {
  const channel = await db.channel.findFirst({
    where: {
      id: channelId,
      deletedAt: null,
      OR: [{ type: "PUBLIC" }, { members: { some: { userId } } }],
    },
    include: {
      workspace: { select: { id: true, name: true, slug: true } },
      _count: { select: { members: true } },
    },
  });
  if (!channel) throw new HttpError(404, "Channel not found");
  return channel;
}

export async function updateChannel(
  channelId: string,
  userId: string,
  input: UpdateChannelInput,
) {
  const channel = await db.channel.findUnique({ where: { id: channelId } });
  if (!channel || channel.deletedAt) throw new HttpError(404, "Channel not found");
  await requireRole(channel.workspaceId, userId, "MODERATOR");

  return db.channel.update({
    where: { id: channelId },
    data: {
      name: input.name,
      description: input.description,
      topic: input.topic,
      isArchived: input.isArchived,
    },
  });
}

export async function deleteChannel(channelId: string, userId: string) {
  const channel = await db.channel.findUnique({ where: { id: channelId } });
  if (!channel || channel.deletedAt) throw new HttpError(404, "Channel not found");
  await requireRole(channel.workspaceId, userId, "ADMIN");

  return db.channel.update({
    where: { id: channelId },
    data: { deletedAt: new Date() },
  });
}

export async function joinChannel(channelId: string, userId: string) {
  const channel = await db.channel.findFirst({
    where: { id: channelId, type: "PUBLIC", deletedAt: null, isArchived: false },
  });
  if (!channel) throw new HttpError(404, "Channel not found");
  await requireRole(channel.workspaceId, userId, "MEMBER");

  return db.channelMember.upsert({
    where: { channelId_userId: { channelId, userId } },
    update: {},
    create: { channelId, userId },
  });
}

export async function leaveChannel(channelId: string, userId: string) {
  const channel = await db.channel.findUnique({ where: { id: channelId } });
  if (!channel) throw new HttpError(404, "Channel not found");
  await db.channelMember.deleteMany({ where: { channelId, userId } });
  await db.readState.deleteMany({ where: { channelId, userId } });
}

/** Mark a channel as read "now" (read receipts). */
export async function markChannelRead(channelId: string, userId: string) {
  await db.readState.upsert({
    where: { channelId_userId: { channelId, userId } },
    update: { lastReadAt: new Date() },
    create: { channelId, userId },
  });
  await db.channelMember.updateMany({
    where: { channelId, userId },
    data: { lastReadAt: new Date() },
  });
}
