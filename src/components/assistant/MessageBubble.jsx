import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { ChevronDown, ChevronRight, Check, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

const FAILED = new Set(["failed", "error", "cancelled"]);

function ToolCallRow({ toolCall }) {
  const [open, setOpen] = useState(false);
  const proj = toolCall.display_projection || {};
  const status = (toolCall.status || "").toLowerCase();
  const running = status === "running" || status === "in_progress" || status === "pending";
  const failed = FAILED.has(status);

  const label = failed
    ? proj.error_label || proj.label || toolCall.name
    : running
      ? proj.active_label || proj.label || toolCall.name
      : proj.label || toolCall.name;

  const name = String(toolCall.name || "tool").replace(/_/g, " ");

  if (proj.hide_details && proj.details_redacted) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground py-0.5">
        {running ? <Loader2 className="w-3 h-3 animate-spin" /> : failed ? <X className="w-3 h-3 text-destructive" /> : <Check className="w-3 h-3 text-success" />}
        <span>{label}</span>
      </div>
    );
  }

  let parsed = null;
  try { parsed = JSON.parse(toolCall.results); } catch { parsed = toolCall.results; }

  return (
    <div className="text-[11px] text-muted-foreground">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 hover:text-foreground transition-colors py-0.5">
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {running ? <Loader2 className="w-3 h-3 animate-spin" /> : failed ? <X className="w-3 h-3 text-destructive" /> : <Check className="w-3 h-3 text-success" />}
        <span className="capitalize">{name}</span>
      </button>
      {open && (
        <div className="mt-1 ml-4 space-y-1.5">
          <div>
            <p className="font-medium text-foreground/70 mb-0.5">Parameters</p>
            <pre className="bg-muted/60 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all font-mono text-[10px] leading-relaxed">
              {toolCall.arguments_string || "—"}
            </pre>
          </div>
          {parsed != null && (
            <div>
              <p className="font-medium text-foreground/70 mb-0.5">Result</p>
              <pre className="bg-muted/60 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all font-mono text-[10px] leading-relaxed">
                {typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function MessageBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[85%] min-w-0", isUser && "items-end")}>
        {message.content && (
          isUser ? (
            <div className="rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </div>
          ) : (
            <div className="rounded-2xl rounded-bl-sm bg-card border border-border px-3.5 py-2.5">
              <div className="text-sm leading-relaxed prose prose-sm max-w-none break-words
                prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5
                prose-headings:mt-3 prose-headings:mb-1.5 prose-headings:text-sm prose-headings:font-semibold
                prose-strong:text-foreground prose-code:text-xs prose-pre:bg-muted prose-pre:text-foreground">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            </div>
          )
        )}
        {message.tool_calls?.length > 0 && (
          <div className={cn("mt-1 space-y-0.5", isUser ? "text-right" : "")}>
            {message.tool_calls.map((tc, i) => <ToolCallRow key={i} toolCall={tc} />)}
          </div>
        )}
      </div>
    </div>
  );
}

export default MessageBubble;