"use client";

import { useEffect, useState } from "react";
import { getPusherClient } from "@/lib/pusher-client";
import { pusherChannels } from "@/lib/pusher";

/** Track which workspace members are currently online (Pusher presence). */
export function usePresence(workspaceId: string | null) {
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!workspaceId) return;
    const client = getPusherClient();
    if (!client) return;

    const name = pusherChannels.presence(workspaceId);
    const channel = client.subscribe(name);

    const sync = () => {
      const ids = new Set<string>();
      // pusher-js presence members shape: members.each((m) => ...)
      const members = (channel as unknown as { members?: { each: (cb: (m: { id: string }) => void) => void } }).members;
      members?.each((m) => ids.add(m.id));
      setOnlineIds(ids);
    };

    channel.bind("pusher:subscription_succeeded", sync);
    channel.bind("pusher:member_added", sync);
    channel.bind("pusher:member_removed", sync);

    return () => {
      channel.unbind_all();
      client.unsubscribe(name);
    };
  }, [workspaceId]);

  return onlineIds;
}
