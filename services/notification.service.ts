import { db } from "@/lib/db";
import { trigger, pusherChannels, pusherEvents } from "@/lib/pusher";
import type { Channel, Message, NotificationType } from "@prisma/client";

interface NotifyInput {
  type: NotificationType;
  recipientId: string;
  actorId?: string;
  workspaceId?: string;
  channelId?: string;
  messageId?: string;
  preview?: string;
}

export async function notify(input: NotifyInput) {
  if (input.actorId && input.actorId === input.recipientId) return; // never notify yourself

  const notification = await db.notification.create({
    data: {
      type: input.type,
      recipientId: input.recipientId,
      actorId: input.actorId,
      workspaceId: input.workspaceId,
      channelId: input.channelId,
      messageId: input.messageId,
      preview: input.preview?.slice(0, 200),
    },
  });

  await trigger(pusherChannels.user(input.recipientId), pusherEvents.notification, {
    id: notification.id,
    type: notification.type,
    preview: notification.preview,
    channelId: notification.channelId,
    workspaceId: notification.workspaceId,
    createdAt: notification.createdAt,
  });

  return notification;
}

/**
 * Fan out notifications after a message is created:
 *  - @mentions
 *  - thread replies (notify the thread root author)
 *  - DMs (notify the other participant)
 */
export async function createNotificationsForMessage(
  message: Message,
  channel: Channel,
  mentionedUserIds: string[],
) {
  const preview = message.content.replace(/[#*_`>\[\]()!]/g, "").slice(0, 140);
  const notified = new Set<string>();

  for (const userId of mentionedUserIds) {
    if (notified.has(userId)) continue;
    notified.add(userId);
    await notify({
      type: "MENTION",
      recipientId: userId,
      actorId: message.authorId,
      workspaceId: channel.workspaceId,
      channelId: channel.id,
      messageId: message.id,
      preview,
    });
  }

  if (message.parentId) {
    const parent = await db.message.findUnique({
      where: { id: message.parentId },
      select: { authorId: true },
    });
    if (parent && !notified.has(parent.authorId)) {
      notified.add(parent.authorId);
      await notify({
        type: "REPLY",
        recipientId: parent.authorId,
        actorId: message.authorId,
        workspaceId: channel.workspaceId,
        channelId: channel.id,
        messageId: message.id,
        preview,
      });
    }
  }

  if (channel.type === "DM") {
    const others = await db.channelMember.findMany({
      where: { channelId: channel.id, userId: { not: message.authorId } },
      select: { userId: true },
    });
    for (const other of others) {
      if (notified.has(other.userId)) continue;
      notified.add(other.userId);
      await notify({
        type: "DM",
        recipientId: other.userId,
        actorId: message.authorId,
        workspaceId: channel.workspaceId,
        channelId: channel.id,
        messageId: message.id,
        preview,
      });
    }
  }
}

export async function listNotifications(userId: string, limit = 30) {
  const notifications = await db.notification.findMany({
    where: { recipientId: userId },
    include: { actor: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  const unreadCount = await db.notification.count({
    where: { recipientId: userId, readAt: null },
  });
  return { notifications, unreadCount };
}

export async function markNotificationsRead(userId: string, ids?: string[]) {
  await db.notification.updateMany({
    where: { recipientId: userId, readAt: null, ...(ids?.length ? { id: { in: ids } } : {}) },
    data: { readAt: new Date() },
  });
}
