"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Bold, Code, Italic, Link2, Loader2, Paperclip, Send, SmilePlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Hint } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UserAvatar } from "@/components/ui/avatar";
import { EmojiPicker } from "@/components/chat/emoji-picker";
import { formatBytes, isImage } from "@/lib/utils";
import type { Attachment, PublicUser } from "@/types";

export interface ComposerHandle {
  insertText: (text: string) => void;
  focus: () => void;
}

interface PendingFile {
  localId: string;
  file: File;
  progress: "uploading" | "done" | "error";
  attachment?: Attachment;
}

interface MessageComposerProps {
  placeholder: string;
  members: PublicUser[];
  editingMessageId?: string | null;
  initialValue?: string;
  onCancelEdit?: () => void;
  onTyping?: () => void;
  onSend: (payload: {
    content: string;
    attachmentIds: string[];
    mentionedUserIds: string[];
    messageId?: string;
  }) => Promise<boolean>;
}

export const MessageComposer = forwardRef<ComposerHandle, MessageComposerProps>(
  function MessageComposer(
    { placeholder, members, editingMessageId, initialValue, onCancelEdit, onTyping, onSend },
    ref,
  ) {
    const [value, setValue] = useState(initialValue ?? "");
    const [files, setFiles] = useState<PendingFile[]>([]);
    const [sending, setSending] = useState(false);
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [mentionIndex, setMentionIndex] = useState(0);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Switch content when entering/leaving edit mode.
    useEffect(() => {
      setValue(initialValue ?? "");
      if (editingMessageId) {
        setTimeout(() => {
          textareaRef.current?.focus();
          textareaRef.current?.setSelectionRange(
            textareaRef.current.value.length,
            textareaRef.current.value.length,
          );
        }, 0);
      }
    }, [editingMessageId, initialValue]);

    const autoResize = useCallback(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
    }, []);

    useEffect(autoResize, [value, autoResize]);

    const insertText = useCallback(
      (text: string) => {
        const el = textareaRef.current;
        if (!el) {
          setValue((v) => v + text);
          return;
        }
        const start = el.selectionStart;
        const end = el.selectionEnd;
        setValue((v) => v.slice(0, start) + text + v.slice(end));
        requestAnimationFrame(() => {
          el.focus();
          const pos = start + text.length;
          el.setSelectionRange(pos, pos);
        });
      },
      [],
    );

    useImperativeHandle(ref, () => ({
      insertText,
      focus: () => textareaRef.current?.focus(),
    }));

    // ── Mentions ──────────────────────────────────────────────
    const mentionMatches =
      mentionQuery !== null
        ? members
            .filter((m) => m.name.toLowerCase().includes(mentionQuery.toLowerCase()))
            .slice(0, 6)
        : [];

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const next = e.target.value;
      setValue(next);
      onTyping?.();

      const el = e.target;
      const beforeCursor = next.slice(0, el.selectionStart);
      const match = beforeCursor.match(/@([\w\s-]{0,24})$/);
      if (match) {
        setMentionQuery(match[1]);
        setMentionIndex(0);
      } else {
        setMentionQuery(null);
      }
    };

    const applyMention = (member: PublicUser) => {
      const el = textareaRef.current;
      if (!el) return;
      const beforeCursor = value.slice(0, el.selectionStart);
      const afterCursor = value.slice(el.selectionStart);
      const replaced = beforeCursor.replace(/@([\w\s-]{0,24})$/, `@${member.name} `);
      setValue(replaced + afterCursor);
      setMentionQuery(null);
      el.focus();
    };

    // ── Formatting helpers ────────────────────────────────────
    const wrapSelection = (prefix: string, suffix = prefix) => {
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const selected = value.slice(start, end) || "text";
      setValue(value.slice(0, start) + prefix + selected + suffix + value.slice(end));
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
      });
    };

    // ── Uploads ───────────────────────────────────────────────
    const uploadFiles = async (list: FileList | File[]) => {
      for (const file of Array.from(list)) {
        const localId = crypto.randomUUID();
        setFiles((prev) => [...prev, { localId, file, progress: "uploading" }]);
        try {
          const form = new FormData();
          form.append("file", file);
          const res = await fetch("/api/upload", { method: "POST", body: form });
          if (!res.ok) {
            const body = await res.json().catch(() => null);
            throw new Error(body?.error ?? "Upload failed");
          }
          const { attachment } = await res.json();
          setFiles((prev) =>
            prev.map((f) => (f.localId === localId ? { ...f, progress: "done", attachment } : f)),
          );
        } catch (error) {
          setFiles((prev) =>
            prev.map((f) => (f.localId === localId ? { ...f, progress: "error" } : f)),
          );
          toast.error(error instanceof Error ? error.message : "Upload failed");
        }
      }
    };

    // ── Send ──────────────────────────────────────────────────
    const mentionedUserIds = members
      .filter((m) => value.includes(`@${m.name}`))
      .map((m) => m.id);

    const submit = async () => {
      const content = value.trim();
      const attachmentIds = files
        .filter((f) => f.progress === "done" && f.attachment)
        .map((f) => f.attachment!.id);
      if (!content && attachmentIds.length === 0) return;
      if (files.some((f) => f.progress === "uploading")) {
        toast.info("Wait for uploads to finish");
        return;
      }

      setSending(true);
      const ok = await onSend({
        content: content || " ",
        attachmentIds,
        mentionedUserIds,
        messageId: editingMessageId ?? undefined,
      });
      setSending(false);
      if (ok) {
        setValue("");
        setFiles([]);
        setMentionQuery(null);
        textareaRef.current?.focus();
      }
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (mentionQuery !== null && mentionMatches.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setMentionIndex((i) => (i + 1) % mentionMatches.length);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setMentionIndex((i) => (i - 1 + mentionMatches.length) % mentionMatches.length);
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          applyMention(mentionMatches[mentionIndex]);
          return;
        }
        if (e.key === "Escape") {
          setMentionQuery(null);
          return;
        }
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
      if (e.key === "Escape" && editingMessageId) {
        onCancelEdit?.();
      }
    };

    return (
      <div className="relative">
        {/* Mention autocomplete */}
        {mentionQuery !== null && mentionMatches.length > 0 && (
          <div className="absolute bottom-full left-0 z-20 mb-2 w-64 overflow-hidden rounded-xl border bg-popover shadow-xl">
            {mentionMatches.map((m, i) => (
              <button
                key={m.id}
                onClick={() => applyMention(m)}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm ${
                  i === mentionIndex ? "bg-accent" : ""
                }`}
              >
                <UserAvatar user={m} className="h-6 w-6 rounded-lg" />
                <span className="font-medium">{m.name}</span>
              </button>
            ))}
          </div>
        )}

        <div className="rounded-2xl border bg-card shadow-sm transition-shadow focus-within:shadow-md focus-within:ring-2 focus-within:ring-ring/40">
          {editingMessageId && (
            <div className="flex items-center justify-between border-b bg-amber-500/10 px-4 py-1.5 text-xs text-amber-600 dark:text-amber-400">
              Editing message — Esc to cancel
              <button onClick={onCancelEdit} className="hover:opacity-70">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Pending uploads */}
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 border-b px-4 py-3">
              {files.map((f) => (
                <div
                  key={f.localId}
                  className="relative flex items-center gap-2 rounded-xl border bg-background p-2 pr-8 text-xs"
                >
                  {isImage(f.file.type) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={URL.createObjectURL(f.file)}
                      alt=""
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Paperclip className="h-4 w-4" />
                    </div>
                  )}
                  <div>
                    <p className="max-w-[140px] truncate font-medium">{f.file.name}</p>
                    <p className="text-muted-foreground">
                      {f.progress === "uploading" ? (
                        <span className="flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" /> Uploading…
                        </span>
                      ) : f.progress === "error" ? (
                        <span className="text-destructive">Failed</span>
                      ) : (
                        formatBytes(f.file.size)
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => setFiles((prev) => prev.filter((x) => x.localId !== f.localId))}
                    className="absolute right-1.5 top-1.5 rounded-md p-0.5 text-muted-foreground hover:bg-accent"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={onKeyDown}
            onPaste={(e) => {
              const pasted = Array.from(e.clipboardData?.files ?? []);
              if (pasted.length) {
                e.preventDefault();
                uploadFiles(pasted);
              }
            }}
            placeholder={placeholder}
            rows={1}
            className="max-h-[220px] w-full resize-none bg-transparent px-4 py-3.5 text-[15px] outline-none placeholder:text-muted-foreground scrollbar-thin"
          />

          <div className="flex items-center gap-1 border-t px-2.5 py-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              onChange={(e) => {
                if (e.target.files?.length) uploadFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <Hint label="Attach files">
              <Button variant="ghost" size="icon-sm" onClick={() => fileInputRef.current?.click()}>
                <Paperclip />
              </Button>
            </Hint>
            <Hint label="Bold">
              <Button variant="ghost" size="icon-sm" onClick={() => wrapSelection("**")}>
                <Bold />
              </Button>
            </Hint>
            <Hint label="Italic">
              <Button variant="ghost" size="icon-sm" onClick={() => wrapSelection("*")}>
                <Italic />
              </Button>
            </Hint>
            <Hint label="Code">
              <Button variant="ghost" size="icon-sm" onClick={() => wrapSelection("`")}>
                <Code />
              </Button>
            </Hint>
            <Hint label="Link">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => wrapSelection("[", "](https://)")}
              >
                <Link2 />
              </Button>
            </Hint>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Emoji">
                  <SmilePlus />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="start" side="top">
                <EmojiPicker onSelect={(emoji) => insertText(emoji)} />
              </PopoverContent>
            </Popover>

            <div className="ml-auto flex items-center gap-2">
              <span className="hidden text-xs text-muted-foreground sm:block">
                Enter to send · Shift+Enter for newline
              </span>
              <Button
                size="sm"
                variant="gradient"
                onClick={submit}
                disabled={sending || (!value.trim() && files.length === 0)}
                className="rounded-xl"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send />}
                {editingMessageId ? "Save" : "Send"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  },
);
