"use client";
 
import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";
 
/**
 * Message shape is intentionally shaped close to a future Prisma `AiMessage`
 * model (id / role / content / createdAt) so that swapping in-memory state
 * for persisted history later is a drop-in change, not a rewrite.
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
    <div
      className={cn(
        "flex w-full gap-3 px-4 py-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground dark:bg-neutral-800"
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
            "border border-destructive/40 bg-destructive/10 text-destructive"
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-pre:my-2 prose-pre:bg-transparent prose-pre:p-0">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                pre({ children, ...props }) {
                  return (
                    <pre
                      className="overflow-x-auto rounded-xl bg-neutral-900 p-3 text-[0.8rem] dark:bg-neutral-950"
                      {...props}
                    >
                      {children}
                    </pre>
                  );
                },
                code({ className, children, ...props }) {
                  const isBlock =
                    !!className &&
                    (className.includes("language-") || className.includes("hljs"));
 
                  if (!isBlock) {
                    return (
                      <code
                        className="rounded bg-black/10 px-1.5 py-0.5 font-mono text-[0.85em] dark:bg-white/10"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  }
 
                  return (
                    <code className={cn(className, "font-mono")} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
 
export const OrbitAiMessageItem = memo(OrbitAiMessageItemComponent);
