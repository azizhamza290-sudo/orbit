import type {
  User,
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
  Channel,
  ChannelType,
  Message,
  Reaction,
  Attachment,
  Notification,
  NotificationType,
} from "@prisma/client";

export type {
  User,
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
  Channel,
  ChannelType,
  Message,
  Reaction,
  Attachment,
  Notification,
  NotificationType,
};

/** User fields safe to send to any client. */
export interface PublicUser {
  id: string;
  name: string;
  image: string | null;
  bio?: string | null;
  statusMessage?: string | null;
}

export interface MessageWithRelations extends Message {
  author: PublicUser;
  reactions: Array<Reaction & { user: Pick<User, "id" | "name"> }>;
  attachments: Attachment[];
  _count?: { replies: number };
  replyPreview?: PublicUser[];
}

export interface ChannelWithMeta extends Channel {
  unreadCount?: number;
  otherMember?: PublicUser | null; // for DM channels
  memberCount?: number;
}

export interface WorkspaceWithRole extends Workspace {
  role: WorkspaceRole;
  memberCount: number;
}

export interface TypingEvent {
  channelId: string;
  user: PublicUser;
}

export interface NotificationPayload {
  id: string;
  type: NotificationType;
  preview: string | null;
  channelId: string | null;
  workspaceId: string | null;
  createdAt: string;
}

export interface SearchResults {
  messages: Array<{
    id: string;
    content: string;
    channelId: string;
    channelName: string | null;
    author: PublicUser;
    createdAt: string;
  }>;
  channels: Array<{
    id: string;
    name: string | null;
    description: string | null;
    type: ChannelType;
  }>;
  members: PublicUser[];
  files: Array<{
    id: string;
    name: string;
    url: string;
    mimeType: string;
    size: number;
    createdAt: string;
  }>;
}

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}
