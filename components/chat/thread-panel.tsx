"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import { X } from "lucide-react";
import { toast } from "sonner";
import { fetcher } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";
import { MessageItem } from "@/components/chat/message-item";
import { MessageComposer } from "@/components/chat/message-composer";
import { Skeleton } from "@/components/ui/skeleton";
import { usePusherChannel } from "@/hooks/use-pusher-channel";
import { pusherChannels, pusherEvents } from "@/lib/pusher";
import type { MessageWithRelations, PublicUser } from "@/types";

interface ThreadPanelProps {
  root: MessageWithRelations;
  currentUserId: string;
  members: PublicUser[];
  onClose: () => void;
}

export function ThreadPanel({ root, currentUserId, members, onClose }: ThreadPanelProps) {
  const { data, mutate } = useSWR<{ root: MessageWithRelations; replies: MessageWithRelations[] }>(
    `/api/messages/${root.id}/thread`,
    fetcher,
  );
  const [editing, setEditing] = useState<MessageWithRelations | null>(null);

  // Live updates for the whole channel also flow into the thread.
  usePusherChannel(pusherChannels.channel(root.channelId), {
    [pusherEvents.messageNew]: ((payload: { message: MessageWithRelations }) => {
      if (payload.message.parentId === root.id) mutate();
    }) as never,
    [pusherEvents.messageUpdate]: (() => mutate()) as never,
    [pusherEvents.messageDelete]: (() => mutate()) as never,
    [pusherEvents.reactionUpdate]: (() => mutate()) as never,
  });

  const send = useCallback(
    async ({ content, attachmentIds, mentionedUserIds, messageId }: {
      content: string;
      attachmentIds: string[];
      mentionedUserIds: string[];
      messageId?: string;
    }) => {
      const isEdit = !!messageId;
      const res = await fetch(
        isEdit ? `/api/messages/${messageId}` : `/api/channels/${root.channelId}/messages`,
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isEdit ? { content } : { content, parentId: root.id, attachmentIds, mentionedUserIds },
          ),
        },
      );
      if (!res.ok) {
        toast.error("Failed to send reply");
        return false;
      }
      if (isEdit) setEditing(null);
      mutate();
      return true;
    },
    [root.channelId, root.id, mutate],
  );

  const upsert = (message: MessageWithRelations) => {
    mutate(
      (current) =>
        current && {
          root: current.root.id === message.id ? message : current.root,
          replies: current.replies.map((r) => (r.id === message.id ? message : r)),
        },
      { revalidate: false },
    );
  };

  const remove = (messageId: string) => {
    mutate(
      (current) =>
        current && {
          root: current.root,
          replies: current.replies.filter((r) => r.id !== messageId),
        },
      { revalidate: false },
    );
  };

  return (
    <div className="flex h-full w-full flex-col border-l bg-card/50 md:w-[380px] md:shrink-0">
      <div className="flex h-14 items-center justify-between border-b px-4">
        <div>
          <h3 className="text-sm font-semibold">Thread</h3>
          <p className="text-xs text-muted-foreground">
            {data ? `${data.replies.length} ${data.replies.length === 1 ? "reply" : "replies"}` : "…"}
          </p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close thread">
          <X />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto py-3 scrollbar-thin">
        {!data ? (
          <div className="space-y-4 p-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-10 w-4/5" />
            <Skeleton className="h-10 w-3/5" />
          </div>
        ) : (
          <>
            <MessageItem
              message={data.root}
              currentUserId={currentUserId}
              compact={false}
              onReply={() => {}}
              onOpenThread={() => {}}
              onEdit={setEditing}
              onChanged={upsert}
              onDeleted={() => {
                onClose();
              }}
            />
            <div className="mx-4 my-3 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              {data.replies.length} {data.replies.length === 1 ? "reply" : "replies"}
              <span className="h-px flex-1 bg-border" />
            </div>
            {data.replies.map((reply) => (
              <MessageItem
                key={reply.id}
                message={reply}
                currentUserId={currentUserId}
                compact={false}
                onReply={() => {}}
                onOpenThread={() => {}}
                onEdit={setEditing}
                onChanged={upsert}
                onDeleted={remove}
              />
            ))}
          </>
        )}
      </div>

      <div className="border-t p-3">
        <MessageComposer
          placeholder="Reply in thread…"
          members={members}
          editingMessageId={editing?.id}
          initialValue={editing?.content}
          onCancelEdit={() => setEditing(null)}
          onSend={send}
        />
      </div>
    </div>
  );
}
