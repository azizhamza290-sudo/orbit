"use client";

import { useEffect } from "react";
import { getPusherClient } from "@/lib/pusher-client";

// Ref-count subscriptions so multiple components can share one channel.
const refCounts = new Map<string, number>();

/**
 * Subscribe to a Pusher channel for the lifetime of the component.
 * Handlers is a map of event name → callback.
 */
export function usePusherChannel(
  channelName: string | null,
  handlers: Record<string, (data: never) => void>,
) {
  useEffect(() => {
    if (!channelName) return;
    const client = getPusherClient();
    if (!client) return;

    const channel = client.subscribe(channelName);
    refCounts.set(channelName, (refCounts.get(channelName) ?? 0) + 1);

    const entries = Object.entries(handlers);
    for (const [event, handler] of entries) {
      channel.bind(event, handler);
    }

    return () => {
      for (const [event, handler] of entries) {
        channel.unbind(event, handler);
      }
      const count = (refCounts.get(channelName) ?? 1) - 1;
      if (count <= 0) {
        refCounts.delete(channelName);
        client.unsubscribe(channelName);
      } else {
        refCounts.set(channelName, count);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, ...Object.keys(handlers)]);
}
