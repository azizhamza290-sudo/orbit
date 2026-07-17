"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/ui/avatar";
import { fetcher } from "@/lib/fetcher";
import type { WorkspaceMember, User } from "@/types";

type MemberRow = WorkspaceMember & { user: Pick<User, "id" | "name" | "email" | "image" | "status"> };

export function NewDmDialog({
  workspaceId,
  currentUserId,
  open,
  onOpenChange,
}: {
  workspaceId: string;
  currentUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const { data } = useSWR<{ members: MemberRow[] }>(
    open ? `/api/workspaces/${workspaceId}/members` : null,
    fetcher,
  );

  const candidates = (data?.members ?? [])
    .filter((m) => m.user.id !== currentUserId)
    .filter(
      (m) =>
        m.user.name.toLowerCase().includes(query.toLowerCase()) ||
        m.user.email.toLowerCase().includes(query.toLowerCase()),
    );

  const openDm = async (userId: string) => {
    setLoading(true);
    const res = await fetch(`/api/workspaces/${workspaceId}/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setLoading(false);
    if (!res.ok) {
      toast.error("Could not open conversation");
      return;
    }
    const { conversation } = await res.json();
    onOpenChange(false);
    router.push(`/w/${workspaceId}/dm/${conversation.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New direct message</DialogTitle>
          <DialogDescription>Pick a teammate to chat with privately.</DialogDescription>
        </DialogHeader>
        <Input
          placeholder="Search people…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <div className="max-h-72 space-y-1 overflow-y-auto scrollbar-thin">
          {loading && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && candidates.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">No people found</p>
          )}
          {!loading &&
            candidates.map((m) => (
              <button
                key={m.id}
                onClick={() => openDm(m.user.id)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-accent"
              >
                <UserAvatar
                  user={m.user}
                  className="h-9 w-9"
                  showStatus={m.user.status === "ONLINE" ? "online" : "offline"}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{m.user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{m.user.email}</p>
                </div>
              </button>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
