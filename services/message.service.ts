import { db } from "@/lib/db";
import { HttpError } from "@/lib/api";
import { trigger, pusherChannels, pusherEvents } from "@/lib/pusher";
import { getChannelForUser } from "@/services/channel.service";
import { createNotificationsForMessage } from "@/services/notification.service";
import type { CreateMessageInput } from "@/lib/validations";
import { Prisma } from "@prisma/client";

const authorSelect = {
  id: true,
  name: true,
  image: true,
  bio: true,
  statusMessage: true,
} satisfies Prisma.UserSelect;

export const messageInclude = {
  author: { select: authorSelect },
  reactions: { include: { user: { select: { id: true, name: true } } } },
  attachments: true,
  _count: { select: { replies: { where: { deletedAt: null } } } },
} satisfies Prisma.MessageInclude;

export type MessageRecord = Prisma.MessageGetPayload<{ include: typeof messageInclude }>;

/** Paginated channel history (cursor = message id, newest-first). */
export async function listMessages(
  channelId: string,
  userId: string,
  { cursor, limit = 40 }: { cursor?: string; limit?: number },
) {
  await getChannelForUser(channelId, userId);

  const messages = await db.message.findMany({
    where: { channelId, parentId: null, deletedAt: null },
    include: {
      ...messageInclude,
      replies: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" as const },
        take: 3,
        select: { author: { select: authorSelect } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = messages.length > limit;
  const items = hasMore ? messages.slice(0, limit) : messages;

  return {
    items: items.map((m) => ({
      ...m,
      replyPreview: m.replies.map((r) => r.author),
      replies: undefined,
    })),
    nextCursor: hasMore ? items[items.length - 1].id : null,
  };
}

export async function listThread(parentId: string, userId: string) {
  const parent = await db.message.findUnique({ where: { id: parentId } });
  if (!parent || parent.deletedAt) throw new HttpError(404, "Message not found");
  await getChannelForUser(parent.channelId, userId);

  const [root, replies] = await Promise.all([
    db.message.findUnique({ where: { id: parentId }, include: messageInclude }),
    db.message.findMany({
      where: { parentId, deletedAt: null },
      include: messageInclude,
      orderBy: { createdAt: "asc" },
      take: 200,
    }),
  ]);
  return { root, replies };
}

export async function createMessage(
  channelId: string,
  authorId: string,
  input: CreateMessageInput,
) {
  const channel = await getChannelForUser(channelId, authorId);

  if (input.parentId) {
    const parent = await db.message.findUnique({ where: { id: input.parentId } });
    if (!parent || parent.channelId !== channelId) {
      throw new HttpError(400, "Invalid thread parent");
    }
  }

  const message = await db.message.create({
    data: {
      channelId,
      authorId,
      content: input.content,
      parentId: input.parentId,
    },
    include: messageInclude,
  });

  // Link any pre-uploaded attachments to this message.
  if (input.attachmentIds?.length) {
    await db.attachment.updateMany({
      where: { id: { in: input.attachmentIds }, uploaderId: authorId, messageId: null },
      data: { messageId: message.id },
    });
    message.attachments = await db.attachment.findMany({ where: { messageId: message.id } });
  }

  // Bump the author's read cursor so their own message is never "unread".
  await db.channelMember.updateMany({
    where: { channelId, userId: authorId },
    data: { lastReadAt: new Date() },
  });

  await trigger(pusherChannels.channel(channelId), pusherEvents.messageNew, {
    channelId,
    message,
  });
  // Workspace-level event so sidebars can bump unread badges from anywhere.
  await trigger(pusherChannels.workspace(channel.workspaceId), pusherEvents.messageNew, {
    channelId,
    message: { id: message.id, authorId: message.authorId, createdAt: message.createdAt },
  });

  await createNotificationsForMessage(message, channel, input.mentionedUserIds ?? []);

  return message;
}

export async function updateMessage(messageId: string, userId: string, content: string) {
  const message = await db.message.findUnique({ where: { id: messageId } });
  if (!message || message.deletedAt) throw new HttpError(404, "Message not found");
  if (message.authorId !== userId) throw new HttpError(403, "You can only edit your own messages");

  const updated = await db.message.update({
    where: { id: messageId },
    data: { content, editedAt: new Date() },
    include: messageInclude,
  });

  await trigger(pusherChannels.channel(message.channelId), pusherEvents.messageUpdate, {
    channelId: message.channelId,
    message: updated,
  });
  return updated;
}

export async function deleteMessage(messageId: string, userId: string) {
  const message = await db.message.findUnique({
    where: { id: messageId },
    include: { channel: { select: { workspaceId: true } } },
  });
  if (!message || message.deletedAt) throw new HttpError(404, "Message not found");

  const isAuthor = message.authorId === userId;
  if (!isAuthor) {
    const member = await db.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: message.channel.workspaceId, userId },
      },
    });
    if (!member || !["OWNER", "ADMIN", "MODERATOR"].includes(member.role)) {
      throw new HttpError(403, "You can only delete your own messages");
    }
  }

  await db.message.update({ where: { id: messageId }, data: { deletedAt: new Date() } });
  await trigger(pusherChannels.channel(message.channelId), pusherEvents.messageDelete, {
    channelId: message.channelId,
    messageId,
  });
}

export async function toggleReaction(messageId: string, userId: string, emoji: string) {
  const message = await db.message.findUnique({ where: { id: messageId } });
  if (!message || message.deletedAt) throw new HttpError(404, "Message not found");
  await getChannelForUser(message.channelId, userId);

  const existing = await db.reaction.findUnique({
    where: { messageId_userId_emoji: { messageId, userId, emoji } },
  });

  if (existing) {
    await db.reaction.delete({ where: { id: existing.id } });
  } else {
    await db.reaction.create({ data: { messageId, userId, emoji } });
  }

  const reactions = await db.reaction.findMany({
    where: { messageId },
    include: { user: { select: { id: true, name: true } } },
  });

  await trigger(pusherChannels.channel(message.channelId), pusherEvents.reactionUpdate, {
    channelId: message.channelId,
    messageId,
    reactions,
  });
  return reactions;
}

export async function togglePin(messageId: string, userId: string) {
  const message = await db.message.findUnique({
    where: { id: messageId },
    include: { channel: { select: { workspaceId: true } } },
  });
  if (!message || message.deletedAt) throw new HttpError(404, "Message not found");

  const member = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: message.channel.workspaceId, userId } },
  });
  if (!member) throw new HttpError(403, "Not a workspace member");

  const updated = await db.message.update({
    where: { id: messageId },
    data: message.isPinned
      ? { isPinned: false, pinnedAt: null, pinnedById: null }
      : { isPinned: true, pinnedAt: new Date(), pinnedById: userId },
    include: messageInclude,
  });

  await trigger(pusherChannels.channel(message.channelId), pusherEvents.messageUpdate, {
    channelId: message.channelId,
    message: updated,
  });
  return updated;
}

export async function listPinnedMessages(channelId: string, userId: string) {
  await getChannelForUser(channelId, userId);
  return db.message.findMany({
    where: { channelId, isPinned: true, deletedAt: null },
    include: messageInclude,
    orderBy: { pinnedAt: "desc" },
  });
}
