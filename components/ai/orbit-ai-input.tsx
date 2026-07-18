"use client";

import { KeyboardEvent, forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { ArrowUp, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface OrbitAiInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  placeholder?: string;
}

const MAX_TEXTAREA_HEIGHT = 160;

export const OrbitAiInput = forwardRef<HTMLTextAreaElement, OrbitAiInputProps>(
  function OrbitAiInput(
    { value, onChange, onSend, disabled, isLoading, placeholder },
    forwardedRef,
  ) {
    const innerRef = useRef<HTMLTextAreaElement>(null);
    useImperativeHandle(forwardedRef, () => innerRef.current as HTMLTextAreaElement);

    useEffect(() => {
      const el = innerRef.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
    }, [value]);

    function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!disabled && value.trim().length > 0) {
          onSend();
        }
      }
    }

    const canSend = !disabled && value.trim().length > 0;

    return (
      <div className="flex items-end gap-2 rounded-xl border border-input bg-background p-1.5 shadow-sm focus-within:ring-2 focus-within:ring-ring">
        <Textarea
          ref={innerRef}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder ?? "Ask Orbit AI anything..."}
          className="min-h-0 max-h-[160px] flex-1 resize-none border-0 px-2 py-1.5 shadow-none focus-visible:ring-0"
        />
        <Button
          type="button"
          size="icon-sm"
          onClick={onSend}
          disabled={!canSend}
          aria-label="Send message"
          className="mb-0.5 shrink-0"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
        </Button>
      </div>
    );
  },
);
