"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import useSWR from "swr";
import {
  Check,
  ChevronsUpDown,
  Hash,
  Loader2,
  Lock,
  LogOut,
  Moon,
  Plus,
  Settings,
  Sun,
  UserPlus,
  Users,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { fetcher } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateChannelDialog } from "@/components/modals/create-channel-dialog";
import { InviteDialog } from "@/components/modals/invite-dialog";
import { NewDmDialog } from "@/components/modals/new-dm-dialog";
import { CommandPalette } from "@/components/command-palette";
import { NotificationsBell } from "@/components/notifications-bell";
import { usePusherChannel } from "@/hooks/use-pusher-channel";
import { usePresence } from "@/hooks/use-presence";
import { pusherChannels, pusherEvents } from "@/lib/pusher";
import type { ChannelWithMeta, WorkspaceWithRole } from "@/types";

interface ShellProps {
  workspace: WorkspaceWithRole;
  currentUser: { id: string; name: string; email: string; image: string | null };
  children: React.ReactNode;
}

export function WorkspaceShell({ workspace, currentUser, children }: ShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [dmOpen, setDmOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const { data: channelsData, mutate: mutateChannels } = useSWR<{
    channels: ChannelWithMeta[];
  }>(`/api/workspaces/${workspace.id}/channels`, fetcher);

  const { data: dmsData, mutate: mutateDms } = useSWR<{
    conversations: Array<ChannelWithMeta & { otherMember: { id: string; name: string; image: string | null } | null }>;
  }>(`/api/workspaces/${workspace.id}/conversations`, fetcher);

  const { data: workspacesData } = useSWR<{ workspaces: WorkspaceWithRole[] }>(
    "/api/workspaces",
    fetcher,
  );

  const onlineIds = usePresence(workspace.id);

  // Realtime sidebar: new messages bump unread badges; channel CRUD refreshes lists.
  usePusherChannel(pusherChannels.workspace(workspace.id), {
    [pusherEvents.messageNew]: (() => {
      mutateChannels();
      mutateDms();
    }) as never,
    [pusherEvents.channelUpdate]: (() => {
      mutateChannels();
    }) as never,
  });

  const channels = useMemo(
    () => (channelsData?.channels ?? []).filter((c) => c.type !== "DM"),
    [channelsData],
  );
  const dms = dmsData?.conversations ?? [];
  const activeChannelId = pathname.split("/").pop();

  const canManage = ["OWNER", "ADMIN", "MODERATOR"].includes(workspace.role);

  const sidebar = (
    <div className="flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground">
      {/* Workspace switcher */}
      <div className="flex items-center gap-2 border-b border-sidebar-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex flex-1 items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-sidebar-accent">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white">
                {workspace.name[0]?.toUpperCase()}
              </div>
              <span className="min-w-0 flex-1 truncate font-semibold">{workspace.name}</span>
              <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel>Your workspaces</DropdownMenuLabel>
            {(workspacesData?.workspaces ?? []).map((w) => (
              <DropdownMenuItem key={w.id} onClick={() => router.push(`/w/${w.id}`)}>
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white">
                  {w.name[0]?.toUpperCase()}
                </div>
                <span className="flex-1 truncate">{w.name}</span>
                {w.id === workspace.id && <Check className="h-4 w-4 text-primary" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/workspaces/new")}>
              <Plus className="h-4 w-4" /> Create workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <NotificationsBell userId={currentUser.id} />
      </div>

      {/* Search */}
      <div className="p-3 pb-1">
        <CommandPalette workspaceId={workspace.id} />
      </div>

      <ScrollArea className="flex-1 px-3 scrollbar-thin">
        {/* Channels */}
        <div className="mt-3">
          <div className="group flex items-center justify-between px-2 py-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Channels
            </span>
            <button
              onClick={() => setCreateChannelOpen(true)}
              className="rounded-md p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-sidebar-accent hover:text-foreground group-hover:opacity-100"
              aria-label="Create channel"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          {!channelsData ? (
            <div className="space-y-1.5 px-2 py-1">
              <Skeleton className="h-7 w-full" />
              <Skeleton className="h-7 w-full" />
              <Skeleton className="h-7 w-full" />
            </div>
          ) : channels.length === 0 ? (
            <p className="px-2 py-2 text-xs text-muted-foreground">No channels yet</p>
          ) : (
            channels.map((channel) => {
              const active = activeChannelId === channel.id;
              return (
                <Link
                  key={channel.id}
                  href={`/w/${workspace.id}/channels/${channel.id}`}
                  onClick={() => setMobileNavOpen(false)}
                  className={cn(
                    "group/item flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent font-medium text-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                  )}
                >
                  {channel.type === "PRIVATE" ? (
                    <Lock className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <Hash className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{channel.name}</span>
                  {(channel.unreadCount ?? 0) > 0 && !active && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                      {channel.unreadCount! > 99 ? "99+" : channel.unreadCount}
                    </span>
                  )}
                </Link>
              );
            })
          )}
          <button
            onClick={() => setCreateChannelOpen(true)}
            className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Add channel
          </button>
        </div>

        {/* Direct messages */}
        <div className="mt-5">
          <div className="group flex items-center justify-between px-2 py-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Direct messages
            </span>
            <button
              onClick={() => setDmOpen(true)}
              className="rounded-md p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-sidebar-accent hover:text-foreground group-hover:opacity-100"
              aria-label="New direct message"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          {!dmsData ? (
            <div className="space-y-1.5 px-2 py-1">
              <Skeleton className="h-7 w-full" />
              <Skeleton className="h-7 w-full" />
            </div>
          ) : dms.length === 0 ? (
            <p className="px-2 py-2 text-xs text-muted-foreground">
              No conversations yet — start one!
            </p>
          ) : (
            dms.map((dm) => {
              const active = activeChannelId === dm.id;
              const other = dm.otherMember;
              return (
                <Link
                  key={dm.id}
                  href={`/w/${workspace.id}/dm/${dm.id}`}
                  onClick={() => setMobileNavOpen(false)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent font-medium text-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                  )}
                >
                  <UserAvatar
                    user={other ?? { name: "?" }}
                    className="h-6 w-6 rounded-lg"
                    showStatus={other && onlineIds.has(other.id) ? "online" : "offline"}
                  />
                  <span className="min-w-0 flex-1 truncate">{other?.name ?? "Unknown"}</span>
                  {(dm.unreadCount ?? 0) > 0 && !active && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                      {dm.unreadCount! > 99 ? "99+" : dm.unreadCount}
                    </span>
                  )}
                </Link>
              );
            })
          )}
        </div>

        {/* Workspace pages */}
        <div className="mt-5 pb-4">
          <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Workspace
          </p>
          <Link
            href={`/w/${workspace.id}/members`}
            className={cn(
              "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
              pathname.endsWith("/members")
                ? "bg-sidebar-accent font-medium text-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            <Users className="h-3.5 w-3.5" /> Members
            <span className="ml-auto text-xs">{workspace.memberCount}</span>
          </Link>
          {canManage && (
            <Link
              href={`/w/${workspace.id}/settings`}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                pathname.endsWith("/settings")
                  ? "bg-sidebar-accent font-medium text-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
              <Settings className="h-3.5 w-3.5" /> Settings
            </Link>
          )}
          <button
            onClick={() => setInviteOpen(true)}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-foreground"
          >
            <UserPlus className="h-3.5 w-3.5" /> Invite people
          </button>
        </div>
      </ScrollArea>

      {/* User footer */}
      <div className="border-t border-sidebar-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2.5 rounded-xl p-1.5 text-left transition-colors hover:bg-sidebar-accent">
              <UserAvatar user={currentUser} className="h-9 w-9" showStatus="online" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{currentUser.name}</p>
                <p className="truncate text-xs text-muted-foreground">{currentUser.email}</p>
              </div>
              <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-64">
            <DropdownMenuItem onClick={() => router.push("/profile")}>
              <Users className="h-4 w-4" /> Profile & preferences
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            >
              {resolvedTheme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
              {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              <LogOut className="h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CreateChannelDialog
        workspaceId={workspace.id}
        open={createChannelOpen}
        onOpenChange={setCreateChannelOpen}
      />
      <InviteDialog workspaceId={workspace.id} open={inviteOpen} onOpenChange={setInviteOpen} />
      <NewDmDialog
        workspaceId={workspace.id}
        currentUserId={currentUser.id}
        open={dmOpen}
        onOpenChange={setDmOpen}
      />
    </div>
  );

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:block">{sidebar}</aside>

      {/* Mobile sidebar */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 animate-in slide-in-from-left">
            {sidebar}
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <div className="flex h-12 items-center gap-2 border-b px-3 md:hidden">
          <Button variant="ghost" size="icon-sm" onClick={() => setMobileNavOpen(true)}>
            {mobileNavOpen ? <Loader2 className="hidden" /> : null}
            <Hash className="h-4 w-4" />
          </Button>
          <span className="truncate text-sm font-semibold">{workspace.name}</span>
        </div>
        <div className="min-h-0 flex-1">{children}</div>
      </main>
    </div>
  );
}
