"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicUser } from "@/types";

interface TypingEntry {
  user: PublicUser;
  expiresAt: number;
}

/**
 * Tracks "X is typing…" state for a channel. `broadcastTyping` is
 * called by the composer (throttled server-side too).
 */
export function useTyping(channelId: string | null, currentUserId?: string) {
  const [typingUsers, setTypingUsers] = useState<TypingEntry[]>([]);
  const lastSentRef = useRef(0);

  const onTypingEvent = useCallback(
    (data: { channelId: string; user: PublicUser }) => {
      if (!channelId || data.channelId !== channelId) return;
      if (data.user.id === currentUserId) return;
      setTypingUsers((prev) => {
        const next = prev.filter((t) => t.user.id !== data.user.id);
        return [...next, { user: data.user, expiresAt: Date.now() + 4000 }];
      });
    },
    [channelId, currentUserId],
  );

  // Expire stale typing entries.
  useEffect(() => {
    if (typingUsers.length === 0) return;
    const timer = setInterval(() => {
      setTypingUsers((prev) => prev.filter((t) => t.expiresAt > Date.now()));
    }, 1000);
    return () => clearInterval(timer);
  }, [typingUsers.length]);

  const broadcastTyping = useCallback(() => {
    if (!channelId) return;
    const now = Date.now();
    if (now - lastSentRef.current < 2500) return; // client-side throttle
    lastSentRef.current = now;
    fetch(`/api/channels/${channelId}/typing`, { method: "POST" }).catch(() => {});
  }, [channelId]);

  return { typingUsers, onTypingEvent, broadcastTyping };
}
