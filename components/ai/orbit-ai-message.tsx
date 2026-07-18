"use client";

import { memo } from "react";
import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { MessageMarkdown } from "@/components/chat/markdown";

/**
 * Shaped close to a future `AiMessage` Prisma model (id / role / content /
 * createdAt) so persisting AI conversation history later is a drop-in
 * change rather than a rewrite of this component.
 */
export interface OrbitAiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  status?: "pending" | "error" | "complete";
}

interface OrbitAiMessageItemProps {
  message: OrbitAiMessage;
}

function OrbitAiMessageItemComponent({ message }: OrbitAiMessageItemProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex w-full gap-3 px-4 py-3", isUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground dark:bg-neutral-800",
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-muted/60 text-foreground rounded-tl-sm dark:bg-neutral-800/70",
          message.status === "error" &&
            "border border-destructive/40 bg-destructive/10 text-destructive",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <MessageMarkdown content={message.content} />
        )}
      </div>
    </div>
  );
}

export const OrbitAiMessageItem = memo(OrbitAiMessageItemComponent);
