"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Hash, Loader2, Lock, MessageSquare, User } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { UserAvatar } from "@/components/ui/avatar";
import { useDebounce } from "@/hooks/use-debounce";
import type { SearchResults } from "@/types";

/** Global ⌘K palette: search everything in the workspace + quick nav. */
export function CommandPalette({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 250);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/workspaces/${workspaceId}/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setResults(data);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, workspaceId]);

  const go = (path: string) => {
    setOpen(false);
    setQuery("");
    router.push(path);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-full items-center gap-2 rounded-xl border bg-background/60 px-3 text-sm text-muted-foreground transition-colors hover:bg-accent"
      >
        <MessageSquare className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="rounded-md border bg-muted px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search messages, channels, people, files…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {loading && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching…
            </div>
          )}
          {!loading && <CommandEmpty>No results found.</CommandEmpty>}

          {results && results.channels.length > 0 && (
            <CommandGroup heading="Channels">
              {results.channels.map((c) => (
                <CommandItem
                  key={c.id}
                  onSelect={() => go(`/w/${workspaceId}/channels/${c.id}`)}
                >
                  {c.type === "PRIVATE" ? <Lock /> : <Hash />}
                  <span>{c.name}</span>
                  {c.description && (
                    <span className="ml-2 truncate text-xs text-muted-foreground">
                      {c.description}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {results && results.members.length > 0 && (
            <CommandGroup heading="People">
              {results.members.map((m) => (
                <CommandItem
                  key={m.id}
                  onSelect={() => go(`/w/${workspaceId}/members`)}
                >
                  <UserAvatar user={m} className="h-5 w-5 rounded-md" />
                  <span>{m.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {results && results.messages.length > 0 && (
            <CommandGroup heading="Messages">
              {results.messages.map((m) => (
                <CommandItem
                  key={m.id}
                  onSelect={() => go(`/w/${workspaceId}/channels/${m.channelId}`)}
                >
                  <User />
                  <div className="min-w-0">
                    <p className="truncate">{m.content.replace(/[#*_`>\[\]]/g, "").slice(0, 80)}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.author.name} in #{m.channelName}
                    </p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {results && results.files.length > 0 && (
            <CommandGroup heading="Files">
              {results.files.map((f) => (
                <CommandItem key={f.id} onSelect={() => window.open(f.url, "_blank")}>
                  <FileText />
                  <span className="truncate">{f.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
