"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { Hash, Loader2, Lock, Pin, Users } from "lucide-react";
import { toast } from "sonner";
import { fetcher } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";
import { Skeleton, MessageListSkeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MessageItem, dateDividerLabel } from "@/components/chat/message-item";
import { MessageComposer, type ComposerHandle } from "@/components/chat/message-composer";
import { ThreadPanel } from "@/components/chat/thread-panel";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import { useChannelMessages } from "@/hooks/use-channel-messages";
import { usePusherChannel } from "@/hooks/use-pusher-channel";
import { useTyping } from "@/hooks/use-typing";
import { pusherChannels, pusherEvents } from "@/lib/pusher";
import type { Channel, MessageWithRelations, PublicUser } from "@/types";

interface ChatViewProps {
  channel: Channel & { otherMember?: PublicUser | null };
  workspaceId: string;
  currentUserId: string;
}

export function ChatView({ channel, workspaceId: _workspaceId, currentUserId }: ChatViewProps) {
  const isDM = channel.type === "DM";
  const {
    messages,
    isLoading,
    hasMore,
    loadMore,
    isLoadingMore,
    upsertMessage,
    removeMessage,
  } = useChannelMessages(channel.id);

  const [threadRoot, setThreadRoot] = useState<MessageWithRelations | null>(null);
  const [editing, setEditing] = useState<MessageWithRelations | null>(null);
  const [pinsOpen, setPinsOpen] = useState(false);
  const composerRef = useRef<ComposerHandle>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  // Channel members (mention autocomplete + read receipts).
  const { data: membersData } = useSWR<{ members: PublicUser[] }>(
    `/api/channels/${channel.id}/members`,
    fetcher,
  );
  const members = useMemo(() => membersData?.members ?? [], [membersData]);

  const { typingUsers, onTypingEvent, broadcastTyping } = useTyping(channel.id, currentUserId);

  // ── Realtime subscriptions ─────────────────────────────────
  usePusherChannel(pusherChannels.channel(channel.id), {
    [pusherEvents.messageNew]: ((payload: { message: MessageWithRelations }) => {
      upsertMessage(payload.message);
      if (payload.message.authorId !== currentUserId) {
        markRead();
      }
    }) as never,
    [pusherEvents.messageUpdate]: ((payload: { message: MessageWithRelations }) => {
      upsertMessage(payload.message);
    }) as never,
    [pusherEvents.messageDelete]: ((payload: { messageId: string }) => {
      removeMessage(payload.messageId);
    }) as never,
    [pusherEvents.reactionUpdate]: ((payload: { messageId: string; reactions: MessageWithRelations["reactions"] }) => {
      const existing = messages.find((m) => m.id === payload.messageId);
      if (existing) upsertMessage({ ...existing, reactions: payload.reactions });
    }) as never,
    [pusherEvents.typing]: onTypingEvent as never,
  });

  // ── Read receipts ──────────────────────────────────────────
  const markRead = useCallback(() => {
    fetch(`/api/channels/${channel.id}/read`, { method: "POST" }).catch(() => {});
  }, [channel.id]);

  useEffect(() => {
    markRead();
  }, [channel.id, markRead]);

  // ── Auto-scroll ────────────────────────────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (el.scrollTop < 120 && hasMore && !isLoadingMore) {
      const prevHeight = el.scrollHeight;
      loadMore().then(() => {
        requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight - prevHeight + el.scrollTop;
        });
      });
    }
  };

  // ── Send / edit ────────────────────────────────────────────
  const send = useCallback(
    async ({
      content,
      attachmentIds,
      mentionedUserIds,
      messageId,
    }: {
      content: string;
      attachmentIds: string[];
      mentionedUserIds: string[];
      messageId?: string;
    }) => {
      const isEdit = !!messageId;
      const res = await fetch(
        isEdit ? `/api/messages/${messageId}` : `/api/channels/${channel.id}/messages`,
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(isEdit ? { content } : { content, attachmentIds, mentionedUserIds }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error(body?.error ?? "Failed to send message");
        return false;
      }
      if (isEdit) {
        const { message } = await res.json();
        upsertMessage(message);
        setEditing(null);
      }
      stickToBottomRef.current = true;
      return true;
    },
    [channel.id, upsertMessage],
  );

  const quoteReply = (message: MessageWithRelations) => {
    const quoted = message.content
      .split("\n")
      .map((l) => `> ${l}`)
      .join("\n");
    composerRef.current?.insertText(`> **${message.author.name}:**\n${quoted}\n\n`);
    composerRef.current?.focus();
  };

  const title = isDM ? (channel.otherMember?.name ?? "Direct message") : channel.name;

  return (
    <div className="flex h-full min-w-0 flex-1">
      <div className="flex h-full min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-card/40 px-4 backdrop-blur">
          {isDM ? (
            <UserAvatar
              user={channel.otherMember ?? { name: "?" }}
              className="h-7 w-7 rounded-lg"
              showStatus="online"
            />
          ) : channel.type === "PRIVATE" ? (
            <Lock className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Hash className="h-4 w-4 text-muted-foreground" />
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold">{title}</h1>
            {channel.topic && !isDM && (
              <p className="truncate text-xs text-muted-foreground">{channel.topic}</p>
            )}
          </div>

          {!isDM && (
            <Hint label={`${members.length} members`}>
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span className="text-xs">{members.length}</span>
              </Button>
            </Hint>
          )}

          <Dialog open={pinsOpen} onOpenChange={setPinsOpen}>
            <Hint label="Pinned messages">
              <Button variant="ghost" size="icon-sm" onClick={() => setPinsOpen(true)}>
                <Pin />
              </Button>
            </Hint>
            <DialogContent className="max-h-[70vh] overflow-y-auto scrollbar-thin">
              <DialogHeader>
                <DialogTitle>Pinned messages</DialogTitle>
              </DialogHeader>
              <PinnedList channelId={channel.id} />
            </DialogContent>
          </Dialog>
        </header>

        {/* Messages */}
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="flex-1 overflow-y-auto py-4 scrollbar-thin"
        >
          {isLoadingMore && (
            <div className="flex justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {isLoading ? (
            <MessageListSkeleton />
          ) : messages.length === 0 ? (
            <EmptyChannel name={title ?? "channel"} isDM={isDM} />
          ) : (
            messages.map((message, i) => {
              const prev = messages[i - 1];
              const compact =
                !!prev &&
                prev.authorId === message.authorId &&
                new Date(message.createdAt).getTime() - new Date(prev.createdAt).getTime() <
                  5 * 60 * 1000 &&
                !dateDividerLabel(prev, message);
              return (
                <MessageItem
                  key={message.id}
                  message={message}
                  currentUserId={currentUserId}
                  compact={compact}
                  showDividerDate={dateDividerLabel(prev, message)}
                  onReply={quoteReply}
                  onOpenThread={setThreadRoot}
                  onEdit={setEditing}
                  onChanged={upsertMessage}
                  onDeleted={removeMessage}
                />
              );
            })
          )}
        </div>

        {/* Composer */}
        <div className="shrink-0 px-4 pb-4">
          <TypingIndicator users={typingUsers.map((t) => t.user)} />
          <MessageComposer
            ref={composerRef}
            placeholder={
              isDM ? `Message ${title}` : `Message #${title}${channel.isArchived ? " (archived)" : ""}`
            }
            members={members}
            editingMessageId={editing?.id}
            initialValue={editing?.content}
            onCancelEdit={() => setEditing(null)}
            onTyping={broadcastTyping}
            onSend={send}
          />
        </div>
      </div>

      {/* Thread side panel */}
      {threadRoot && (
        <ThreadPanel
          root={threadRoot}
          currentUserId={currentUserId}
          members={members}
          onClose={() => setThreadRoot(null)}
        />
      )}
    </div>
  );
}

function Hint({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-auto px-2.5 py-1.5 text-xs" side="bottom">
        {label}
      </PopoverContent>
    </Popover>
  );
}

function EmptyChannel({ name, isDM }: { name: string; isDM: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/15 to-violet-500/15">
        {isDM ? (
          <UserAvatar user={{ name }} className="h-10 w-10" />
        ) : (
          <Hash className="h-6 w-6 text-primary" />
        )}
      </div>
      <div>
        <h3 className="font-semibold">
          {isDM ? `This is the beginning of your conversation with ${name}` : `Welcome to #${name}`}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {isDM
            ? "Messages here are private between the two of you."
            : "Send the first message and get the conversation going."}
        </p>
      </div>
    </div>
  );
}

function PinnedList({ channelId }: { channelId: string }) {
  const { data, isLoading } = useSWR<{ messages: MessageWithRelations[] }>(
    `/api/channels/${channelId}/pins`,
    fetcher,
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  if (!data?.messages.length) {
    return (
      <div className="py-8 text-center">
        <Pin className="mx-auto h-8 w-8 text-muted-foreground/40" />
        <p className="mt-2 text-sm text-muted-foreground">
          No pinned messages yet. Hover a message and hit the pin icon.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {data.messages.map((m) => (
        <div key={m.id} className="rounded-xl border bg-card p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <UserAvatar user={m.author} className="h-5 w-5 rounded-md" />
            <span className="font-medium text-foreground">{m.author.name}</span>
          </div>
          <p className="mt-1 line-clamp-3 text-sm">{m.content}</p>
        </div>
      ))}
    </div>
  );
}
