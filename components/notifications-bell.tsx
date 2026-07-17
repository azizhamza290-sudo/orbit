"use client";

import { useEffect } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { formatDistanceToNow } from "date-fns";
import { AtSign, Bell, Check, MessageSquareReply, SmilePlus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { fetcher } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { usePusherChannel } from "@/hooks/use-pusher-channel";
import { pusherChannels, pusherEvents } from "@/lib/pusher";
import { cn } from "@/lib/utils";
import type { NotificationType } from "@/types";

interface NotificationRow {
  id: string;
  type: NotificationType;
  preview: string | null;
  workspaceId: string | null;
  channelId: string | null;
  readAt: string | null;
  createdAt: string;
  actor: { id: string; name: string; image: string | null } | null;
}

const ICONS: Record<string, typeof AtSign> = {
  MENTION: AtSign,
  REPLY: MessageSquareReply,
  REACTION: SmilePlus,
  INVITE: UserPlus,
  DM: MessageSquareReply,
  SYSTEM: Bell,
};

export function NotificationsBell({ userId }: { userId: string }) {
  const router = useRouter();
  const { data, mutate } = useSWR<{
    notifications: NotificationRow[];
    unreadCount: number;
  }>("/api/notifications", fetcher, { refreshInterval: 60_000 });

  // Realtime: new notification arrives → refetch + toast.
  usePusherChannel(pusherChannels.user(userId), {
    [pusherEvents.notification]: ((payload: { type: string; preview: string | null }) => {
      mutate();
      toast(`New ${payload.type.toLowerCase()}`, {
        description: payload.preview ?? undefined,
        icon: <Bell className="h-4 w-4" />,
      });
    }) as never,
  });

  // Browser notifications (permission-gated).
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  const unread = data?.unreadCount ?? 0;

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    mutate();
    globalMutate("/api/notifications");
  };

  const openNotification = async (n: NotificationRow) => {
    if (!n.readAt) {
      fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [n.id] }),
      }).then(() => mutate());
    }
    if (n.workspaceId && n.channelId) {
      router.push(`/w/${n.workspaceId}/channels/${n.channelId}`);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllRead}>
              <Check className="mr-1 h-3 w-3" /> Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto scrollbar-thin">
          {!data?.notifications.length && (
            <div className="py-10 text-center">
              <Bell className="mx-auto h-8 w-8 text-muted-foreground/30" />
              <p className="mt-2 text-sm text-muted-foreground">All caught up 🎉</p>
            </div>
          )}
          {data?.notifications.map((n) => {
            const Icon = ICONS[n.type] ?? Bell;
            return (
              <button
                key={n.id}
                onClick={() => openNotification(n)}
                className={cn(
                  "flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors last:border-0 hover:bg-accent/60",
                  !n.readAt && "bg-primary/[0.05]",
                )}
              >
                {n.actor ? (
                  <UserAvatar user={n.actor} className="h-8 w-8" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted">
                    <Icon className="h-4 w-4" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{n.actor?.name ?? "Orbit"}</span>{" "}
                    <span className="text-muted-foreground">
                      {n.type === "MENTION"
                        ? "mentioned you"
                        : n.type === "REPLY"
                          ? "replied to you"
                          : n.type === "DM"
                            ? "sent you a message"
                            : n.type === "INVITE"
                              ? "invited you"
                              : "notification"}
                    </span>
                  </p>
                  {n.preview && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{n.preview}</p>
                  )}
                  <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </p>
                </div>
                {!n.readAt && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
