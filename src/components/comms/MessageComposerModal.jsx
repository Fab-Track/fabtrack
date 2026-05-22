import React, { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, Mail, X, Plus, Send, Clock, FileText, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { MERGE_FIELDS, resolveMergeFields, smsSegmentCount } from "@/lib/commTemplates";
import { useAuth } from "@/lib/AuthContext";

const COMPANY_PHONE = "(801) 210-9103";

export default function MessageComposerModal({ open, onClose, job, customer, prefillMessage = null, onSent }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const textareaRef = useRef(null);

  const { data: templates = [] } = useQuery({
    queryKey: ["messageTemplates"],
    queryFn: () => base44.entities.MessageTemplate.list("sort_order", 50),
    enabled: open,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list("-created_date", 100),
    enabled: open,
  });

  // Find current user's employee record for comm settings
  const myEmployee = employees.find(e => e.email === user?.email);

  const [channel, setChannel] = useState("SMS");
  const [toName, setToName] = useState("");
  const [toPhone, setToPhone] = useState("");
  const [toEmail, setToEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromPhone, setFromPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [sending, setSending] = useState(false);
  const [showMergeFields, setShowMergeFields] = useState(false);

  // Derive customer name/contact
  const cust = customer || { name: job?.customer_name, phone: job?.lead_customer_phone, email: job?.lead_customer_email };

  useEffect(() => {
    if (!open) return;
    setToName(cust?.name || "");
    setToPhone(cust?.phone || "");
    setToEmail(cust?.email || "");
    setFromName(myEmployee?.preferred_name || myEmployee?.name || user?.full_name || "");
    setFromEmail(myEmployee?.comm_email || myEmployee?.email || "info@highcountrymetalworks.com");
    setFromPhone(myEmployee?.comm_phone || COMPANY_PHONE);

    if (prefillMessage) {
      setChannel(prefillMessage.channel || "SMS");
      setSubject(prefillMessage.subject || "");
      setBody(prefillMessage.body || "");
      setSelectedTemplateId(prefillMessage.template_id || "");
    } else {
      setChannel("SMS");
      setSubject("");
      setBody("");
      setSelectedTemplateId("");
    }
  }, [open, prefillMessage]);

  function applyTemplate(templateId) {
    const tpl = templates.find(t => t.id === templateId);
    if (!tpl) return;
    setSelectedTemplateId(templateId);
    const ctx = { job: job || {}, customer: cust || {}, sender: { name: fromName, phone: fromPhone } };
    if (channel === "SMS" && tpl.sms_body) {
      setBody(resolveMergeFields(tpl.sms_body, ctx));
    } else if (channel === "Email") {
      if (tpl.subject) setSubject(resolveMergeFields(tpl.subject, ctx));
      if (tpl.email_body) setBody(resolveMergeFields(tpl.email_body, ctx));
    }
  }

  function insertMergeField(field) {
    const el = textareaRef.current;
    if (!el) { setBody(b => b + field); return; }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newVal = body.slice(0, start) + field + body.slice(end);
    setBody(newVal);
    setTimeout(() => { el.focus(); el.setSelectionRange(start + field.length, start + field.length); }, 0);
    setShowMergeFields(false);
  }

  async function handleSend(saveAs = "sent") {
    if (!body.trim()) { toast.error("Message body is required"); return; }
    if (channel === "SMS" && !toPhone) { toast.error("Recipient phone is required for SMS"); return; }
    if (channel === "Email" && !toEmail) { toast.error("Recipient email is required"); return; }

    setSending(true);
    const templateName = templates.find(t => t.id === selectedTemplateId)?.name || null;

    // Create CommMessage record
    const msgRecord = await base44.entities.CommMessage.create({
      job_id: job?.id || null,
      job_number: job?.job_number || null,
      job_name: job?.job_name || null,
      customer_id: customer?.id || null,
      customer_name: cust?.name || null,
      channel,
      status: saveAs === "draft" ? "draft" : "sent",
      to_name: toName,
      to_phone: toPhone,
      to_email: toEmail,
      from_name: fromName,
      from_email: fromEmail,
      from_phone: fromPhone,
      subject,
      body,
      template_id: selectedTemplateId || null,
      template_name: templateName,
      queued_at: new Date().toISOString(),
    });

    if (saveAs === "sent") {
      // Call send function
      const resp = await base44.functions.invoke("sendCustomerMessage", {
        message_id: msgRecord.id,
        channel,
        to_phone: toPhone,
        to_email: toEmail,
        from_phone: fromPhone,
        from_email: fromEmail,
        from_name: fromName,
        subject,
        message_body: body,
      });

      if (resp.data?.ok) {
        toast.success(channel === "SMS" ? "SMS sent!" : "Email sent!");
      } else {
        toast.error("Send failed: " + (resp.data?.error || "Unknown error"));
      }
    } else {
      toast.success("Saved as draft");
    }

    qc.invalidateQueries({ queryKey: ["commMessages"] });
    setSending(false);
    onSent?.();
    onClose();
  }

  const segments = smsSegmentCount(body);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Send Message to {toName || "Customer"}
          </DialogTitle>
        </DialogHeader>

        {/* Channel Toggle */}
        <div className="flex rounded-lg border overflow-hidden">
          <button
            onClick={() => setChannel("SMS")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors ${channel === "SMS" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            <MessageSquare className="w-4 h-4" /> SMS
          </button>
          <button
            onClick={() => setChannel("Email")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors ${channel === "Email" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            <Mail className="w-4 h-4" /> Email
          </button>
        </div>

        <div className="space-y-3">
          {/* To / From */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">To</Label>
              <Input className="h-8 text-sm" value={toName} onChange={e => setToName(e.target.value)} placeholder="Customer name" />
            </div>
            <div>
              <Label className="text-xs">{channel === "SMS" ? "Phone" : "Email"}</Label>
              {channel === "SMS"
                ? <Input className="h-8 text-sm" value={toPhone} onChange={e => setToPhone(e.target.value)} placeholder="+1..." />
                : <Input className="h-8 text-sm" value={toEmail} onChange={e => setToEmail(e.target.value)} placeholder="email@example.com" />
              }
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">From</Label>
              <Input className="h-8 text-sm" value={fromName} onChange={e => setFromName(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">{channel === "SMS" ? "From Phone" : "From Email"}</Label>
              {channel === "SMS"
                ? <Input className="h-8 text-sm" value={fromPhone} onChange={e => setFromPhone(e.target.value)} />
                : <Input className="h-8 text-sm" value={fromEmail} onChange={e => setFromEmail(e.target.value)} />
              }
            </div>
          </div>

          <Separator />

          {/* Template picker */}
          <div>
            <Label className="text-xs">Start from Template</Label>
            <Select value={selectedTemplateId} onValueChange={applyTemplate}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Choose a template…" />
              </SelectTrigger>
              <SelectContent>
                {templates
                  .filter(t => t.channel === channel || t.channel === "Both")
                  .map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)
                }
              </SelectContent>
            </Select>
          </div>

          {/* Subject (email only) */}
          {channel === "Email" && (
            <div>
              <Label className="text-xs">Subject</Label>
              <Input className="h-8 text-sm" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject…" />
            </div>
          )}

          {/* Body */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs">Message</Label>
              <button
                onClick={() => setShowMergeFields(v => !v)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <Plus className="w-3 h-3" /> Merge Fields <ChevronDown className="w-3 h-3" />
              </button>
            </div>
            {showMergeFields && (
              <div className="flex flex-wrap gap-1 mb-2 p-2 bg-muted/40 rounded-lg border">
                {MERGE_FIELDS.map(f => (
                  <button
                    key={f.key}
                    onClick={() => insertMergeField(f.key)}
                    className="text-[10px] px-1.5 py-0.5 rounded border bg-card hover:bg-accent/20 font-mono"
                  >
                    {f.key}
                  </button>
                ))}
              </div>
            )}
            <textarea
              ref={textareaRef}
              className="w-full min-h-[160px] p-3 text-sm border rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-ring bg-background"
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder={channel === "SMS" ? "Type your SMS message…" : "Type your email message…"}
            />
            {channel === "SMS" && (
              <p className="text-xs text-muted-foreground mt-1">{body.length} chars · {segments} SMS segment{segments !== 1 ? "s" : ""}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={() => handleSend("sent")}
            disabled={sending}
            className="flex-1 gap-2"
          >
            <Send className="w-4 h-4" />
            {sending ? "Sending…" : "Send Now"}
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSend("draft")}
            disabled={sending}
            className="gap-1.5"
          >
            <FileText className="w-4 h-4" /> Draft
          </Button>
          <Button variant="ghost" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}