import React, { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Camera, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";

export default function MessageComposer({ channel, currentUser, onSent, replyTo, onCancelReply }) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionPos, setMentionPos] = useState(null);
  const textRef = useRef(null);
  const fileRef = useRef(null);

  // Simple member list for mentions — pulled from channel.member_roles hint
  // In practice you'd fetch channel members; we use role labels as a shortcut
  const mentionSuggestions = [
    { id: "owner", name: "Owner" },
    { id: "shop_manager", name: "Shop Manager" },
    { id: "estimator", name: "Estimator" },
    { id: "foreman", name: "Foreman" },
  ].filter(m => mentionQuery ? m.name.toLowerCase().includes(mentionQuery.toLowerCase()) : true);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setText(val);
    // Detect @ mention
    const cursor = e.target.selectionStart;
    const before = val.slice(0, cursor);
    const match = before.match(/@(\w*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (name) => {
    const cursor = textRef.current?.selectionStart || text.length;
    const before = text.slice(0, cursor);
    const after = text.slice(cursor);
    const replaced = before.replace(/@(\w*)$/, `@${name} `);
    setText(replaced + after);
    setShowMentions(false);
    textRef.current?.focus();
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    const uploaded = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploaded.push({ url: file_url, name: file.name, type: file.type, size: file.size });
    }
    setAttachments(prev => [...prev, ...uploaded]);
    setUploading(false);
    e.target.value = "";
  };

  const handleSend = async () => {
    const content = text.trim();
    if (!content && !attachments.length) return;
    setSending(true);

    // Extract mentions
    const mentionMatches = content.match(/@(\w[\w\s]*)/g) || [];
    const mentions = mentionMatches.map(m => m.slice(1).trim());

    const payload = {
      organization_id: currentUser?.organization_id || channel.organization_id,
      channel_id: channel.id,
      sender_id: currentUser?.id || currentUser?.email || "unknown",
      sender_name: currentUser?.full_name || currentUser?.email || "Unknown",
      sender_role: currentUser?.role || "",
      content,
      is_system: false,
      mentions,
      attachments,
      ...(replyTo ? {
        reply_to_id: replyTo.id,
        reply_to_preview: replyTo.content?.slice(0, 80),
      } : {}),
    };

    await base44.entities.Message.create(payload);

    // Update channel preview
    await base44.entities.MessageChannel.update(channel.id, {
      last_message_at: new Date().toISOString(),
      last_message_preview: `${currentUser?.full_name || "Someone"}: ${content.slice(0, 60)}`,
    });

    setText("");
    setAttachments([]);
    onCancelReply?.();
    setSending(false);
    onSent?.();
  };

  return (
    <div className="border-t bg-card px-4 py-3 shrink-0">
      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-muted rounded-lg text-xs">
          <span className="text-muted-foreground">Replying to <strong>{replyTo.sender_name}</strong>: {replyTo.content?.slice(0, 60)}</span>
          <button onClick={onCancelReply} className="ml-auto text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((att, i) => {
            const isImage = att.type?.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp)$/i.test(att.name);
            return (
              <div key={i} className="relative">
                {isImage
                  ? <img src={att.url} alt={att.name} className="w-16 h-16 rounded object-cover border" />
                  : <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded text-xs border">{att.name}</div>
                }
                <button
                  onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-[10px]"
                >×</button>
              </div>
            );
          })}
        </div>
      )}

      {/* Mention suggestions */}
      {showMentions && mentionSuggestions.length > 0 && (
        <div className="mb-2 bg-card border rounded-lg shadow-lg overflow-hidden">
          {mentionSuggestions.map(m => (
            <button
              key={m.id}
              onClick={() => insertMention(m.name)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                {m.name.charAt(0)}
              </div>
              {m.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* File upload */}
        <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" className="hidden" onChange={handleFileChange} />
        {/* Camera (mobile — accepts image capture) */}
        <input id="camera-input" type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />

        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors shrink-0"
          aria-label="Attach file"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <label htmlFor="camera-input" className="md:hidden p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors shrink-0 cursor-pointer">
          <Camera className="w-4 h-4" />
        </label>

        {/* Text input */}
        <textarea
          ref={textRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={`Message #${channel?.display_name || "channel"}…`}
          rows={1}
          disabled={sending}
          className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring min-h-[38px] max-h-32 overflow-y-auto"
          style={{ lineHeight: "1.5" }}
        />

        <button
          onClick={handleSend}
          disabled={sending || uploading || (!text.trim() && !attachments.length)}
          className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}