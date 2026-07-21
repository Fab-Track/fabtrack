import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, Send, Link, Check, Mail, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

function getBillingEmail(customer) {
  if (!customer) return "";
  const sameAsJob = customer.billing_same_as_job !== false;
  if (sameAsJob) return customer.job_contact_email || customer.email || "";
  return customer.billing_contact_email || customer.job_contact_email || customer.email || "";
}

function getPhone(customer) {
  return customer?.job_contact_phone || customer?.phone || "";
}

function getShareableLink(estimate) {
  return `${window.location.origin}/estimate-view/${estimate?.share_token || estimate?.id}`;
}

const METHODS = ["email", "text", "both"];

export default function SendEstimatePanel({ estimate, job, customer, onClose, onSent }) {
  const { user } = useAuth();
  const orgName = user?.organization_name || "";
  const firstName = customer?.name?.split(" ")[0] || customer?.name || "there";
  const link = getShareableLink(estimate);

  // Email fields
  const [to, setTo] = useState(getBillingEmail(customer));
  const [subject, setSubject] = useState(`Your Estimate${orgName ? ` from ${orgName}` : ""} — ${job?.job_name || ""}`);
  const [message, setMessage] = useState(
    `Hi ${firstName},\n\nPlease find your estimate attached. Let us know if you have any questions!\n\nThank you,\n${orgName || "The Team"}`
  );

  // SMS fields
  const estimateNum = estimate?.job_number ? `EST-${estimate.job_number}` : `EST-${estimate?.id?.slice(-6).toUpperCase()}`;
  const [phone, setPhone] = useState(getPhone(customer));
  const [smsBody, setSmsBody] = useState(
    `Hi ${firstName}, your estimate ${estimateNum}${orgName ? ` from ${orgName}` : ""} is ready to view here: ${link}`
  );

  // Send method
  const [method, setMethod] = useState("email");
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);

  const showEmail = method === "email" || method === "both";
  const showText = method === "text" || method === "both";

  function handleCopyLink() {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copied to clipboard");
  }

  async function handleSend() {
    setSending(true);
    try {
      if (showEmail) {
        const body = `${message}\n\nView your estimate: ${link}\n\n---\nEstimate Total: $${(estimate?.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
        const html = body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
        const resp = await base44.functions.invoke("sendGmail", {
          to, subject, html_body: html, text_body: body, routing_type: "estimate",
        });
        if (!resp.data?.ok) throw new Error(resp.data?.error || "Email failed to send");
      }

      if (showText) {
        await base44.functions.invoke("sendCustomerMessage", {
          channel: "SMS",
          to_phone: phone,
          body: smsBody,
          job_id: job?.id,
          job_number: job?.job_number,
          job_name: job?.job_name,
          customer_id: customer?.id,
          customer_name: customer?.name,
        });
      }

      onSent?.(to);

      if (showEmail && showText) toast.success("Email and text message sent");
      else if (showEmail) toast.success(`Email sent to ${to}`);
      else toast.success(`Text message sent to ${phone}`);
    } catch (err) {
      toast.error(`Failed to send: ${err.response?.data?.error || err.message}`);
    } finally {
      setSending(false);
    }
  }

  const canSend = (showEmail && to) || (showText && phone);

  return (
    <div className="absolute inset-y-0 right-0 w-80 bg-background border-l shadow-xl flex flex-col z-10">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b">
        <h3 className="font-semibold text-sm">Review &amp; Send</h3>
        <div className="flex items-center gap-2">
          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={handleSend} disabled={!canSend || sending}>
            <Send className="w-3.5 h-3.5" />
            {sending ? "Sending…" : method === "text" ? "Send Text" : method === "both" ? "Send Both" : "Send Estimate"}
          </Button>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Send via toggle */}
        <div className="space-y-1.5">
          <Label className="text-xs">Send via</Label>
          <div className="flex rounded-md border overflow-hidden">
            {METHODS.map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium transition-colors
                  ${method === m ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
              >
                {m === "email" && <Mail className="w-3 h-3" />}
                {m === "text" && <MessageSquare className="w-3 h-3" />}
                {m === "both" && <><Mail className="w-3 h-3" /><span>+</span><MessageSquare className="w-3 h-3" /></>}
                {m === "email" ? "Email" : m === "text" ? "Text" : "Both"}
              </button>
            ))}
          </div>
        </div>

        {/* Email fields */}
        {showEmail && (
          <>
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
              <Textarea rows={5} className="text-xs resize-none" value={message} onChange={e => setMessage(e.target.value)} />
            </div>
          </>
        )}

        {/* SMS fields */}
        {showText && (
          <>
            {showEmail && <div className="border-t pt-2" />}
            <div className="space-y-1.5">
              <Label className="text-xs">Mobile Phone</Label>
              <Input className="h-8 text-xs" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Text Message</Label>
              <Textarea rows={4} className="text-xs resize-none" value={smsBody} onChange={e => setSmsBody(e.target.value)} />
            </div>
          </>
        )}

        {/* Copy link */}
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

    </div>
  );
}