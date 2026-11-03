import React from "react";
import { ArrowUp, Loader2 } from "lucide-react";

export default function AssistantComposer({ value, onChange, onSend, disabled, sending, placeholder }) {
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && !sending && value.trim()) onSend();
    }
  };

  return (
    <div className="border-t border-border bg-background px-4 py-3">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end gap-2 rounded-xl border border-input bg-card px-3 py-2 focus-within:ring-1 focus-within:ring-ring transition-shadow">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={disabled}
            placeholder={placeholder || "Ask about a job, an estimate, or your shop…"}
            className="flex-1 resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground max-h-40 py-1 disabled:opacity-50"
            style={{ minHeight: 24 }}
            onInput={(e) => {
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
            }}
          />
          <button
            onClick={onSend}
            disabled={disabled || sending || !value.trim()}
            className="shrink-0 w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
            aria-label="Send message"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 px-1">
          Job and estimate changes are proposed first — nothing saves until you confirm.
        </p>
      </div>
    </div>
  );
}