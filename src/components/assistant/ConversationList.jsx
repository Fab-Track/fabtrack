import React from "react";
import { Plus, MessageSquare, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ConversationList({ conversations, activeId, onSelect, onNew, loading }) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <button
          onClick={onNew}
          className="w-full flex items-center justify-center gap-2 h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {loading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {!loading && conversations.length === 0 && (
          <p className="text-xs text-muted-foreground text-center px-3 py-6 leading-relaxed">
            No conversations yet.
          </p>
        )}
        {conversations.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={cn(
              "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left text-sm transition-colors",
              c.id === activeId
                ? "bg-secondary font-medium"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            )}
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60" />
            <span className="truncate">{c.metadata?.name || "Untitled chat"}</span>
          </button>
        ))}
      </div>
    </div>
  );
}