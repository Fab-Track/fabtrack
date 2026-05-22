import React, { useState } from "react";
import { Reply, Copy, Trash2, MoreHorizontal, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { REACTION_EMOJIS, formatMessageTime } from "@/lib/messagingHelpers";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";

function AttachmentPreview({ attachment }) {
  const isImage = attachment.type?.startsWith("image/") ||
    /\.(jpg|jpeg|png|gif|webp)$/i.test(attachment.name || "");
  const isPdf = attachment.type === "application/pdf" || /\.pdf$/i.test(attachment.name || "");

  if (isImage) {
    return (
      <a href={attachment.url} target="_blank" rel="noopener noreferrer">
        <img
          src={attachment.url}
          alt={attachment.name || "attachment"}
          className="max-w-[260px] max-h-[200px] rounded-lg object-cover border hover:opacity-90 transition-opacity cursor-zoom-in"
          loading="lazy"
        />
      </a>
    );
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/50 hover:bg-muted text-xs transition-colors max-w-[260px]"
    >
      <div className="w-6 h-8 bg-red-100 rounded flex items-center justify-center shrink-0">
        <span className="text-[9px] font-bold text-red-700">
          {isPdf ? "PDF" : "FILE"}
        </span>
      </div>
      <div className="min-w-0">
        <p className="font-medium truncate text-foreground">{attachment.name}</p>
        <p className="text-muted-foreground">Download</p>
      </div>
    </a>
  );
}

export default function MessageBubble({ message, currentUser, onReply, channelId, queryKey }) {
  const [showActions, setShowActions] = useState(false);
  const queryClient = useQueryClient();
  const isSystem = message.is_system;
  const isOwn = message.sender_id === currentUser?.id || message.sender_id === currentUser?.email;
  const canDelete = isOwn || ["admin", "owner"].includes(currentUser?.role);

  const addReaction = async (emoji) => {
    const reactions = { ...(message.reactions || {}) };
    const uid = currentUser?.id || currentUser?.email || "unknown";
    if (!reactions[emoji]) reactions[emoji] = [];
    const idx = reactions[emoji].indexOf(uid);
    if (idx >= 0) reactions[emoji].splice(idx, 1);
    else reactions[emoji].push(uid);
    await base44.entities.Message.update(message.id, { reactions });
    queryClient.invalidateQueries({ queryKey });
    setShowActions(false);
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this message?")) return;
    await base44.entities.Message.update(message.id, { is_deleted: true, content: "This message was deleted." });
    queryClient.invalidateQueries({ queryKey });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setShowActions(false);
  };

  if (message.is_deleted) {
    return (
      <div className="px-4 py-1">
        <span className="text-xs italic text-muted-foreground">This message was deleted.</span>
      </div>
    );
  }

  if (isSystem) {
    return (
      <div className="flex justify-center px-4 py-1.5">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted/60 text-xs text-muted-foreground">
          <Bot className="w-3 h-3" />
          <span>{message.content}</span>
        </div>
      </div>
    );
  }

  // Parse @mentions for highlighting
  const renderContent = (text) => {
    if (!text) return null;
    const parts = text.split(/(@\w[\w\s]*)/g);
    return parts.map((part, i) =>
      part.startsWith("@")
        ? <span key={i} className="text-orange-500 font-medium">{part}</span>
        : <span key={i}>{part}</span>
    );
  };

  return (
    <div
      className="group relative px-4 py-1.5 hover:bg-muted/20 transition-colors"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Reply context */}
      {message.reply_to_id && message.reply_to_preview && (
        <div className="ml-10 mb-1 pl-2 border-l-2 border-muted text-xs text-muted-foreground italic line-clamp-1">
          ↩ {message.reply_to_preview}
        </div>
      )}

      <div className="flex items-start gap-2.5">
        {/* Avatar */}
        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0 mt-0.5">
          {(message.sender_name || "?").charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          {/* Name + time */}
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="text-xs font-semibold text-foreground">
              {message.sender_name}
            </span>
            {message.sender_role && (
              <span className="text-[10px] text-muted-foreground capitalize">{message.sender_role}</span>
            )}
            <span className="text-[10px] text-muted-foreground">
              {formatMessageTime(message.created_date)}
            </span>
          </div>

          {/* Content */}
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">
            {renderContent(message.content)}
          </p>

          {/* Attachments */}
          {message.attachments?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {message.attachments.map((att, i) => (
                <AttachmentPreview key={i} attachment={att} />
              ))}
            </div>
          )}

          {/* Reactions */}
          {message.reactions && Object.keys(message.reactions).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {Object.entries(message.reactions).map(([emoji, users]) => {
                if (!users?.length) return null;
                const uid = currentUser?.id || currentUser?.email;
                const reacted = users.includes(uid);
                return (
                  <button
                    key={emoji}
                    onClick={() => addReaction(emoji)}
                    className={cn(
                      "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-colors",
                      reacted ? "bg-accent/20 border-accent/50" : "bg-muted border-border hover:bg-muted/80"
                    )}
                  >
                    <span>{emoji}</span>
                    <span className="text-muted-foreground font-medium">{users.length}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Hover action bar */}
      {showActions && (
        <div className="absolute right-4 top-0 -translate-y-1/2 flex items-center gap-1 bg-card border rounded-lg shadow-md px-1.5 py-1 z-10">
          {REACTION_EMOJIS.map(emoji => (
            <button
              key={emoji}
              onClick={() => addReaction(emoji)}
              className="text-sm hover:scale-125 transition-transform px-0.5"
              title={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
          <div className="w-px h-4 bg-border mx-1" />
          <button
            onClick={() => { onReply(message); setShowActions(false); }}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Reply"
          >
            <Reply className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCopy}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Copy"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          {canDelete && (
            <button
              onClick={handleDelete}
              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}