import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, Send, Link, Check } from "lucide-react";
import { toast } from "sonner";
export default function SendEstimatePanel({ estimate, job, customer, onClose, onSent }) {
  const firstName = customer?.name?.split(" ")[0] || customer?.name || "there";
  const [to, setTo] = useState(customer?.email || "");
  const [subject, setSubject] = useState(`Your Estimate from High Country Metal Works — ${job?.job_name || ""}`);
  const [message, setMessage] = useState(`Hi ${firstName},\n\nPlease find your estimate attached. Let us know if you have any questions!\n\nThank you,\nHigh Country Metal Works`);
  const [copied, setCopied] = useState(false);

  function handleSend() {
    const body = `${message}\n\n---\nEstimate Total: $${(estimate?.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
    const mailtoUrl = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, "_blank");
    onSent?.(to);
    toast.success(`Email draft opened for ${to}`);
  }

  function handleCopyLink() {
    const link = `${window.location.origin}/estimate-view/${estimate?.id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copied to clipboard");
  }

  return (
    <div className="absolute inset-y-0 right-0 w-80 bg-background border-l shadow-xl flex flex-col z-10">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-semibold text-sm">Review & Send</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">To</Label>
          <Input className="h-8 text-xs" value={to} onChange={e => setTo(e.target.value)} placeholder="customer@email.com" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Subject</Label>
          <Input className="h-8 text-xs" value={subject} onChange={e => setSubject(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Message</Label>
          <Textarea
            rows={6}
            className="text-xs resize-none"
            value={message}
            onChange={e => setMessage(e.target.value)}
          />
        </div>
        <div className="pt-1">
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center justify-center gap-2 border rounded-md px-3 py-2 text-xs hover:bg-muted transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Link className="w-3.5 h-3.5" />}
            {copied ? "Copied!" : "Copy Shareable Link"}
          </button>
        </div>
      </div>
      <div className="p-4 border-t">
        <Button className="w-full gap-2" onClick={handleSend} disabled={!to}>
          <Send className="w-3.5 h-3.5" />
          Send Estimate
        </Button>
      </div>
    </div>
  );
}