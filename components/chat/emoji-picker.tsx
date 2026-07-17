"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

const EMOJI_GROUPS: Record<string, string[]> = {
  Smileys: ["😀","😄","😁","😂","🤣","😊","😍","😘","😜","🤪","😎","🤩","🥳","😏","😴","🤔","🙃","😇","🤗","🤫","😬","🥺","😢","😭","😤","😡","🤯","🥶","😱","🫡","🤝","🙌","👏","👍","👎","👌","✌️","🤞","💪","🙏"],
  Hearts: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","💖","💗","💯","✨","🔥","🎉","🎊","💥","💫","⭐","🌟","⚡"],
  Objects: ["📌","📎","🔗","📁","📅","📈","📊","🗂️","🔒","🔑","🛠️","⚙️","🧭","🚀","🛰️","💡","🖥️","⌨️","📱","🎧","☕","🍕","🎂","🏆","🎯"],
  Symbols: ["✅","❌","⭕","❗","❓","➕","➖","♻️","🔔","🔕","🏁","🚩","💬","👀","🧠","🫶","☀️","🌙","🌈","🍀"],
};

const ALL = Object.entries(EMOJI_GROUPS).flatMap(([group, emojis]) =>
  emojis.map((emoji) => ({ emoji, group })),
);

export function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    if (!query.trim()) return EMOJI_GROUPS;
    // Simple filter: match by nothing semantic — keep frequent ones.
    const q = query.trim();
    const aliases: Record<string, string[]> = {
      "+1": ["👍"], thumbsup: ["👍"], heart: ["❤️"], fire: ["🔥"], tada: ["🎉"],
      rocket: ["🚀"], eyes: ["👀"], check: ["✅"], x: ["❌"], smile: ["😄"],
      laugh: ["😂"], cry: ["😢"], think: ["🤔"], pin: ["📌"], star: ["⭐"],
      clap: ["👏"], pray: ["🙏"], muscle: ["💪"], ok: ["👌"], coffee: ["☕"],
    };
    const hits = new Set<string>();
    for (const [alias, emojis] of Object.entries(aliases)) {
      if (alias.includes(q.toLowerCase())) emojis.forEach((e) => hits.add(e));
    }
    const filtered = ALL.filter((e) => hits.has(e.emoji));
    return filtered.length ? { Results: filtered.map((f) => f.emoji) } : {};
  }, [query]);

  return (
    <div className="w-72">
      <div className="relative mb-2">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search emoji"
          className="h-8 pl-8 text-xs"
        />
      </div>
      <ScrollArea className="h-56 scrollbar-thin">
        {Object.keys(groups).length === 0 && (
          <p className="py-6 text-center text-xs text-muted-foreground">No emoji found</p>
        )}
        {Object.entries(groups).map(([group, emojis]) => (
          <div key={group} className="mb-2">
            <p className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {group}
            </p>
            <div className="grid grid-cols-8 gap-0.5">
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => onSelect(emoji)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-lg transition-transform hover:scale-125 hover:bg-accent"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </ScrollArea>
    </div>
  );
}
