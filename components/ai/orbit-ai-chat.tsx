"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { OrbitAiMessageItem, type OrbitAiMessage } from "./orbit-ai-message";
import { OrbitAiInput } from "./orbit-ai-input";

const EMPTY_STATE_PROMPTS = [
  "Summarize this conversation",
  "Write a professional reply",
  "Translate this message",
  "Generate project ideas",
];

function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

/**
 * Conversation state lives in React state only, per requirements.
 *
 * To add persistence later:
 *  - swap `useState<OrbitAiMessage[]>` for an SWR/useSWR-backed fetch of
 *    the conversation from a future `/api/ai/conversations/:id` route
 *  - replace the local `setMessages` appends below with mutate() calls
 *  - the `OrbitAiMessage` shape already matches what a Prisma model would
 *    look like (id, role, content, createdAt), so no shape changes needed
 */
export function OrbitAiChat() {
  const [messages, setMessages] = useState<OrbitAiMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = useCallback(
    async (rawContent: string) => {
      const content = rawContent.trim();
      if (!content || isLoading) return;

      setError(null);

      const userMessage: OrbitAiMessage = {
        id: createId(),
        role: "user",
        content,
        createdAt: new Date().toISOString(),
        status: "complete",
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsLoading(true);

      try {
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: content }),
        });

        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }

        const data: { reply: string } = await res.json();

        const assistantMessage: OrbitAiMessage = {
          id: createId(),
          role: "assistant",
          content: data.reply,
          createdAt: new Date().toISOString(),
          status: "complete",
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        setError("Something went wrong. Please try again.");
        setMessages((prev) => [
          ...prev,
          {
            id: createId(),
            role: "assistant",
            content:
              "I couldn't get a response right now. Please try again in a moment.",
            createdAt: new Date().toISOString(),
            status: "error",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading]
  );

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {hasMessages ? (
          <div className="flex flex-col divide-y divide-border/50">
            {messages.map((message) => (
              <OrbitAiMessageItem key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Orbit AI is thinking...
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-6 px-6 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">How can I help you today?</p>
              <p className="text-xs text-muted-foreground">
                Ask a question or try one of these
              </p>
            </div>
            <div className="grid w-full gap-2">
              {EMPTY_STATE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendMessage(prompt)}
                  className="w-full rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-muted dark:bg-neutral-800/50 dark:hover:bg-neutral-800"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border p-3">
        {error && (
          <p className="mb-2 px-1 text-xs text-destructive">{error}</p>
        )}
        <OrbitAiInput
          value={input}
          onChange={setInput}
          onSend={() => sendMessage(input)}
          disabled={isLoading}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
