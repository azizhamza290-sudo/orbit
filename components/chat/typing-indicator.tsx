"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { PublicUser } from "@/types";

export function TypingIndicator({ users }: { users: PublicUser[] }) {
  const label =
    users.length === 0
      ? ""
      : users.length === 1
        ? `${users[0].name} is typing`
        : users.length === 2
          ? `${users[0].name} and ${users[1].name} are typing`
          : "Several people are typing";

  return (
    <div className="flex h-6 items-center px-1">
      <AnimatePresence>
        {users.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="flex items-center gap-2 text-xs text-muted-foreground"
          >
            <span className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-dot"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </span>
            {label}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
