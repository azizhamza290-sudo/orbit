"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { OrbitAiChat } from "./orbit-ai-chat";

/**
 * Global AI assistant sidebar for Orbit.
 *
 * Mount this once near the root of the app shell (e.g. workspace-shell.tsx)
 * so it's available on every authenticated page. It manages its own
 * open/close state and does not require any props.
 */
export function OrbitAiSidebar() {
  const [open, setOpen] = useState(false);

  // Lock body scroll on mobile when the sidebar is open full-screen.
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // Close on Escape for keyboard users.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open Orbit AI assistant"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: open ? 0 : 1, scale: open ? 0.8 : 1 }}
        transition={{ duration: 0.2 }}
        style={{ pointerEvents: open ? "none" : "auto" }}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:opacity-90 active:scale-95 transition-transform"
      >
        <Sparkles className="h-6 w-6" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="orbit-ai-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px] sm:bg-black/20"
            />

            <motion.aside
              key="orbit-ai-panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-border bg-background shadow-2xl sm:w-[420px]"
              role="dialog"
              aria-label="Orbit AI assistant"
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-semibold">Orbit AI</span>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close Orbit AI assistant"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground dark:hover:bg-neutral-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="min-h-0 flex-1">
                <OrbitAiChat />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

