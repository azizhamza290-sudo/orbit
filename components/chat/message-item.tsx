"use client";

import { memo, useState } from "react";
import { format, isSameDay, isToday, isYesterday } from "date-fns";
import {
  Check,
  Copy,
  MessageSquareReply,
  Pencil,
  Pin,
  PinOff,
  Reply,
  SmilePlus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Hint } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EmojiPicker } from "@/components/chat/emoji-picker";
import { MessageMarkdown } from "@/components/chat/markdown";
import { AttachmentView } from "@/components/chat/attachment-view";
import type { MessageWithRelations, PublicUser } from "@/types";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉", "🚀", "👀"];

function formatMessageTime(date: Date | string) {
  const d = new Date(date);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return `Yesterday ${format(d, "HH:mm")}`;
  return format(d, "MMM d, HH:mm");
}

interface MessageItemProps {
  message: MessageWithRelations;
  currentUserId: string;
  /** Same author & <5min gap as previous message → compact rendering. */
  compact: boolean;
  showDividerDate?: string | null;
  onReply: (message: MessageWithRelations) => void;
  onOpenThread: (message: MessageWithRelations) => void;
  onEdit: (message: MessageWithRelations) => void;
  onChanged: (message: MessageWithRelations) => void;
  onDeleted: (messageId: string) => void;
}

export const MessageItem = memo(function MessageItem({
  message,
  currentUserId,
  compact,
  showDividerDate,
  onReply,
  onOpenThread,
  onEdit,
  onChanged,
  onDeleted,
}: MessageItemProps) {
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const isOwn = message.authorId === currentUserId;

  const react = async (emoji: string) => {
    setEmojiOpen(false);
    const res = await fetch(`/api/messages/${message.id}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    if (res.ok) {
      const { reactions } = await res.json();
      onChanged({ ...message, reactions });
    }
  };

  const togglePin = async () => {
    const res = await fetch(`/api/messages/${message.id}/pin`, { method: "POST" });
    if (res.ok) {
      const { message: updated } = await res.json();
      onChanged(updated);
      toast.success(updated.isPinned ? "Message pinned" : "Message unpinned");
    }
  };

  const remove = async () => {
    const res = await fetch(`/api/messages/${message.id}`, { method: "DELETE" });
    if (res.ok) {
      onDeleted(message.id);
      toast.success("Message deleted");
    } else {
      toast.error("Could not delete this message");
    }
  };

  const copyText = () => {
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  // Group reactions by emoji.
  const grouped = message.reactions.reduce<
    Record<string, { count: number; users: string[]; mine: boolean }>
  >((acc, r) => {
    acc[r.emoji] ??= { count: 0, users: [], mine: false };
    acc[r.emoji].count += 1;
    acc[r.emoji].users.push(r.user.name);
    if (r.userId === currentUserId) acc[r.emoji].mine = true;
    return acc;
  }, {});

  return (
    <>
      {showDividerDate && (
        <div className="my-4 flex items-center gap-3 px-2">
          <span className="h-px flex-1 bg-border" />
          <span className="rounded-full border bg-card px-3 py-0.5 text-xs font-medium text-muted-foreground">
            {showDividerDate}
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>
      )}
      <div
        className={cn(
          "group relative flex gap-3 rounded-xl px-4 py-1.5 transition-colors hover:bg-accent/50",
          compact ? "mt-0" : "mt-3",
          message.isPinned && "bg-amber-500/[0.04]",
        )}
      >
        {/* Gutter: avatar or hover timestamp */}
        <div className="w-10 shrink-0">
          {!compact ? (
            <UserAvatar user={message.author} className="h-10 w-10" />
          ) : (
            <span className="mt-1 hidden text-[10px] text-muted-foreground group-hover:block">
              {format(new Date(message.createdAt), "HH:mm")}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          {!compact && (
            <div className="flex items-baseline gap-2">
              <span className="font-semibold">{message.author.name}</span>
              <span className="text-xs text-muted-foreground">
                {formatMessageTime(message.createdAt)}
              </span>
              {message.isPinned && (
                <span className="flex items-center gap-1 text-xs text-amber-500">
                  <Pin className="h-3 w-3" /> Pinned
                </span>
              )}
            </div>
          )}

          <MessageMarkdown content={message.content} />

          {message.editedAt && (
            <span className="ml-1 text-xs text-muted-foreground">(edited)</span>
          )}

          {message.attachments.map((a) => (
            <AttachmentView key={a.id} attachment={a} />
          ))}

          {/* Reactions */}
          {Object.keys(grouped).length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {Object.entries(grouped).map(([emoji, g]) => (
                <button
                  key={emoji}
                  onClick={() => react(emoji)}
                  title={g.users.join(", ")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm transition-all hover:scale-105",
                    g.mine
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-card hover:bg-accent",
                  )}
                >
                  <span>{emoji}</span>
                  <span className="text-xs font-medium">{g.count}</span>
                </button>
              ))}
            </div>
          )}

          {/* Thread footer */}
          {(message._count?.replies ?? 0) > 0 && !message.parentId && (
            <button
              onClick={() => onOpenThread(message)}
              className="mt-1.5 flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-primary transition-colors hover:bg-primary/10"
            >
              <div className="flex -space-x-1.5">
                {(message.replyPreview ?? []).slice(0, 3).map((u: PublicUser) => (
                  <UserAvatar key={u.id} user={u} className="h-5 w-5 rounded-md border border-background" />
                ))}
              </div>
              <span className="font-medium">
                {message._count!.replies}{" "}
                {message._count!.replies === 1 ? "reply" : "replies"}
              </span>
            </button>
          )}
        </div>

        {/* Hover action bar */}
        <div className="message-actions absolute -top-4 right-4 z-10 flex items-center gap-0.5 rounded-xl border bg-card p-1 shadow-lg">
          {QUICK_REACTIONS.slice(0, 3).map((emoji) => (
            <button
              key={emoji}
              onClick={() => react(emoji)}
              className="rounded-lg p-1.5 text-base transition-transform hover:scale-125 hover:bg-accent"
            >
              {emoji}
            </button>
          ))}
          <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="More reactions">
                <SmilePlus />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="end">
              <EmojiPicker onSelect={react} />
            </PopoverContent>
          </Popover>
          <Hint label="Reply in thread">
            <Button variant="ghost" size="icon-sm" onClick={() => onOpenThread(message)}>
              <MessageSquareReply />
            </Button>
          </Hint>
          <Hint label="Quote reply">
            <Button variant="ghost" size="icon-sm" onClick={() => onReply(message)}>
              <Reply />
            </Button>
          </Hint>
          <Hint label={copied ? "Copied!" : "Copy text"}>
            <Button variant="ghost" size="icon-sm" onClick={copyText}>
              {copied ? <Check className="text-emerald-500" /> : <Copy />}
            </Button>
          </Hint>
          <Hint label={message.isPinned ? "Unpin" : "Pin message"}>
            <Button variant="ghost" size="icon-sm" onClick={togglePin}>
              {message.isPinned ? <PinOff /> : <Pin />}
            </Button>
          </Hint>
          {isOwn && (
            <>
              <Hint label="Edit">
                <Button variant="ghost" size="icon-sm" onClick={() => onEdit(message)}>
                  <Pencil />
                </Button>
              </Hint>
              <Hint label="Delete">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:text-destructive"
                  onClick={remove}
                >
                  <Trash2 />
                </Button>
              </Hint>
            </>
          )}
        </div>
      </div>
    </>
  );
});

/** Compute the date-divider label between two messages. */
export function dateDividerLabel(
  prev: MessageWithRelations | undefined,
  current: MessageWithRelations,
): string | null {
  const d = new Date(current.createdAt);
  if (prev && isSameDay(new Date(prev.createdAt), d)) return null;
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE, MMMM d");
}
