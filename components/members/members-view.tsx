"use client";

import { useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { Crown, Loader2, Mail, MessageSquare, MoreHorizontal, Shield, ShieldCheck, Trash2, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { fetcher } from "@/lib/fetcher";
import { UserAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePresence } from "@/hooks/use-presence";
import type { User, WorkspaceMember, WorkspaceRole } from "@/types";

type MemberRow = WorkspaceMember & {
  user: Pick<User, "id" | "name" | "email" | "image" | "bio" | "status" | "statusMessage">;
};

const ROLE_ICONS: Record<WorkspaceRole, typeof Crown> = {
  OWNER: Crown,
  ADMIN: ShieldCheck,
  MODERATOR: Shield,
  MEMBER: UserIcon,
};

export function MembersView({
  workspaceId,
  currentUserId,
  myRole,
}: {
  workspaceId: string;
  currentUserId: string;
  myRole: WorkspaceRole;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { data, mutate, isLoading } = useSWR<{ members: MemberRow[] }>(
    `/api/workspaces/${workspaceId}/members`,
    fetcher,
  );
  const onlineIds = usePresence(workspaceId);

  const canManage = myRole === "OWNER" || myRole === "ADMIN";

  const members = (data?.members ?? []).filter(
    (m) =>
      m.user.name.toLowerCase().includes(query.toLowerCase()) ||
      m.user.email.toLowerCase().includes(query.toLowerCase()),
  );

  const changeRole = async (memberId: string, role: string) => {
    const res = await fetch(`/api/workspaces/${workspaceId}/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      toast.success("Role updated");
      mutate();
    } else {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Could not update role");
    }
  };

  const removeMember = async (memberId: string) => {
    const res = await fetch(`/api/workspaces/${workspaceId}/members/${memberId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Member removed");
      mutate();
    } else {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Could not remove member");
    }
  };

  const messageMember = async (userId: string) => {
    const res = await fetch(`/api/workspaces/${workspaceId}/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      const { conversation } = await res.json();
      router.push(`/w/${workspaceId}/dm/${conversation.id}`);
    }
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Members</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {data?.members.length ?? "…"} people in this workspace ·{" "}
              {onlineIds.size} online now
            </p>
          </div>
          <Input
            placeholder="Search members…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-64"
          />
        </div>

        <div className="mt-6 space-y-2">
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl border p-4">
                <Skeleton className="h-11 w-11 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
              </div>
            ))}

          {members.map((m) => {
            const RoleIcon = ROLE_ICONS[m.role];
            const online = onlineIds.has(m.user.id);
            return (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-2xl border bg-card p-4 transition-shadow hover:shadow-sm"
              >
                <UserAvatar
                  user={m.user}
                  className="h-11 w-11"
                  showStatus={online ? "online" : "offline"}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{m.user.name}</p>
                    {m.user.id === currentUserId && (
                      <span className="text-xs text-muted-foreground">(you)</span>
                    )}
                    <Badge
                      variant={m.role === "OWNER" ? "default" : "secondary"}
                      className="gap-1"
                    >
                      <RoleIcon className="h-3 w-3" />
                      {m.role.toLowerCase()}
                    </Badge>
                  </div>
                  <p className="flex items-center gap-1 truncate text-sm text-muted-foreground">
                    <Mail className="h-3 w-3" /> {m.user.email}
                    {m.user.statusMessage && (
                      <span className="ml-2 truncate">· {m.user.statusMessage}</span>
                    )}
                  </p>
                </div>

                {m.user.id !== currentUserId && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => messageMember(m.user.id)}
                      aria-label={`Message ${m.user.name}`}
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                    {canManage && m.role !== "OWNER" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Member actions">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Change role</DropdownMenuLabel>
                          {(["ADMIN", "MODERATOR", "MEMBER"] as const).map((role) => (
                            <DropdownMenuItem
                              key={role}
                              onClick={() => changeRole(m.id, role)}
                              disabled={m.role === role}
                            >
                              {role.charAt(0) + role.slice(1).toLowerCase()}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => removeMember(m.id)}
                          >
                            <Trash2 className="h-4 w-4" /> Remove from workspace
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {!isLoading && members.length === 0 && (
            <div className="rounded-2xl border border-dashed py-12 text-center">
              <Loader2 className="hidden" />
              <p className="text-sm text-muted-foreground">No members match your search.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
