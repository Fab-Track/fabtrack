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
import { MessageSquare, Mail, X, Plus, Send, Clock, FileText, ChevronDown, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { MERGE_FIELDS, resolveMergeFields, smsSegmentCount } from "@/lib/commTemplates";
import { useAuth } from "@/lib/AuthContext";
import { useAssignedSmsNumber, formatPhone } from "@/lib/useAssignedSmsNumber";
import { AlertCircle, Link as LinkIcon } from "lucide-react";

export default function MessageComposerModal({ open, onClose, job, customer, prefillMessage = null, onSent }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const textareaRef = useRef(null);

  const isOwner = ["admin", "owner"].includes(user?.role?.toLowerCase() || "");

  const { data: appSettings } = useQuery({
    queryKey: ["appSettings"],
    queryFn: () => base44.functions.invoke("getAppSettings", {}).then(r => r.data),
    enabled: open,
    staleTime: 60000,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["messageTemplates"],
    queryFn: () => base44.entities.MessageTemplate.list("sort_order", 50),
    enabled: open,
  });

  const { myEmployee, myAssignedNumber, mainNumber, numbersWithEmployees, allEmployees } = useAssignedSmsNumber(user?.email, open);

  // Email send-as state
  const [sendAsEmailId, setSendAsEmailId] = useState(null); // null = use my email

  const DEFAULT_EMAIL = "info@highcountrymetalworks.com";
  const EMAIL_ROLES = ["owner", "estimator", "shop_manager", "admin", "accountant"];

  // All employees with an assigned email (for owner "send as" dropdown)
  const emailEmployees = (allEmployees || []).filter(e =>
    e.assigned_comm_email && EMAIL_ROLES.includes(e.role?.toLowerCase() || "")
  );

  const sendAsEmailEmployee = sendAsEmailId
    ? emailEmployees.find(e => e.id === sendAsEmailId)
    : null;

  const myCommEmail = myEmployee?.assigned_comm_email || "";
  const myGmailConnected = myEmployee?.gmail_connected && myEmployee?.gmail_token_status === "connected";

  const effectiveFromEmail = sendAsEmailEmployee?.assigned_comm_email
    || myCommEmail
    || DEFAULT_EMAIL;

  const effectiveFromEmailName = sendAsEmailEmployee
    ? (sendAsEmailEmployee.preferred_name || sendAsEmailEmployee.name)
    : (myEmployee?.preferred_name || myEmployee?.name || user?.full_name || "");

  const usingEmailFallback = !myCommEmail || !myGmailConnected;
  const sendingEmailAsOtherUser = !!sendAsEmailEmployee && sendAsEmailEmployee.id !== myEmployee?.id;

  // "Send As" state — defaults to current user's number; owner can change
  const [sendAsNumberId, setSendAsNumberId] = useState(null); // null = use my number

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

  // Compute effective "from" number for SMS
  // If owner has selected "send as" another number, use that; else use own assigned or main fallback
  const effectiveSendAsRecord = sendAsNumberId
    ? numbersWithEmployees.find(n => n.id === sendAsNumberId)
    : null;

  const effectiveFromPhone = effectiveSendAsRecord?.phone_number
    || myAssignedNumber
    || mainNumber?.phone_number
    || appSettings?.twilio_from_number
    || "";

  const effectiveFromName = effectiveSendAsRecord
    ? (effectiveSendAsRecord.employee?.preferred_name || effectiveSendAsRecord.employee?.name || effectiveSendAsRecord.displayName)
    : (myEmployee?.preferred_name || myEmployee?.name || user?.full_name || "");

  const usingMainFallback = !myAssignedNumber && !effectiveSendAsRecord;
  const sendingAsOtherUser = !!effectiveSendAsRecord && effectiveSendAsRecord.assigned_employee_id !== myEmployee?.id;

  useEffect(() => {
    if (!open) return;
    setToName(cust?.name || "");
    setToPhone(cust?.phone || "");
    setToEmail(cust?.email || "");
    setFromName(myEmployee?.preferred_name || myEmployee?.name || user?.full_name || "");
    setFromEmail(myEmployee?.comm_email || myEmployee?.email || "info@highcountrymetalworks.com");
    setFromPhone(appSettings?.twilio_from_number || "");
    setSendAsNumberId(null);
    setSendAsEmailId(null);

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
  }, [open, prefillMessage, appSettings, myEmployee]);

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

    // Use effective from details
    const actualFromPhone = channel === "SMS" ? effectiveFromPhone : fromPhone;
    const actualFromName = channel === "SMS" ? effectiveFromName : effectiveFromEmailName;
    const actualFromEmail = channel === "Email" ? effectiveFromEmail : fromEmail;
    const actualSentByName = channel === "SMS"
      ? (sendingAsOtherUser ? (myEmployee?.name || user?.full_name) : null)
      : (sendingEmailAsOtherUser ? (myEmployee?.name || user?.full_name) : null);

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
      from_name: actualFromName,
      from_email: actualFromEmail,
      from_phone: actualFromPhone,
      subject,
      body,
      template_id: selectedTemplateId || null,
      template_name: templateName,
      sent_by_name: actualSentByName,
      queued_at: new Date().toISOString(),
    });

    if (saveAs === "sent") {
      // Call send function
      const resp = await base44.functions.invoke("sendCustomerMessage", {
        message_id: msgRecord.id,
        channel,
        to_phone: toPhone,
        to_email: toEmail,
        from_phone: actualFromPhone,
        from_email: actualFromEmail,
        from_name: actualFromName,
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

          {/* SMS From — smart display */}
          {channel === "SMS" ? (
            <div className="space-y-1.5">
              {isOwner && numbersWithEmployees.length > 1 ? (
                /* Owner: editable "send as" dropdown */
                <div>
                  <Label className="text-xs">Send As</Label>
                  <Select
                    value={sendAsNumberId || "mine"}
                    onValueChange={val => setSendAsNumberId(val === "mine" ? null : val)}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mine">
                        {myAssignedNumber
                          ? `${effectiveFromName} — ${formatPhone(myAssignedNumber)}`
                          : `${effectiveFromName} — Main Number`}
                      </SelectItem>
                      {numbersWithEmployees
                        .filter(n => n.assigned_employee_id && n.assigned_employee_id !== myEmployee?.id)
                        .map(n => (
                          <SelectItem key={n.id} value={n.id}>
                            {n.displayName} — {formatPhone(n.phone_number)}
                          </SelectItem>
                        ))
                      }
                      {mainNumber && !mainNumber.assigned_employee_id && (
                        <SelectItem value={mainNumber.id}>
                          Main Business Number — {formatPhone(mainNumber.phone_number)}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {sendingAsOtherUser && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Will be logged as: "Sent by {myEmployee?.name || user?.full_name} as {effectiveFromName}"
                    </p>
                  )}
                </div>
              ) : (
                /* Non-owner: read-only "Sending from" label */
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${usingMainFallback ? "bg-amber-50 border border-amber-200" : "bg-muted/40"}`}>
                  {usingMainFallback
                    ? <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    : <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                  }
                  <span className={usingMainFallback ? "text-amber-800" : "text-foreground"}>
                    Sending from: <strong>{formatPhone(effectiveFromPhone)}</strong>
                    {usingMainFallback ? " — Main Business Number" : ` — ${effectiveFromName}`}
                  </span>
                  {usingMainFallback && (
                    <a href="/settings" className="ml-auto text-xs text-amber-600 underline shrink-0">Assign a number</a>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Email From — smart display, mirrors SMS */
            <div className="space-y-1.5">
              {isOwner && emailEmployees.length > 1 ? (
                <div>
                  <Label className="text-xs">Send As</Label>
                  <Select
                    value={sendAsEmailId || "mine"}
                    onValueChange={val => setSendAsEmailId(val === "mine" ? null : val)}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mine">
                        {myCommEmail
                          ? `${effectiveFromEmailName} — ${myCommEmail}`
                          : `${effectiveFromEmailName} — ${DEFAULT_EMAIL} (default)`}
                      </SelectItem>
                      {emailEmployees
                        .filter(e => e.id !== myEmployee?.id)
                        .map(e => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.preferred_name || e.name} — {e.assigned_comm_email}
                          </SelectItem>
                        ))}
                      <SelectItem value="default">Default — {DEFAULT_EMAIL}</SelectItem>
                    </SelectContent>
                  </Select>
                  {sendingEmailAsOtherUser && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Will be logged as: "Sent by {myEmployee?.name || user?.full_name} as {effectiveFromEmailName}"
                    </p>
                  )}
                </div>
              ) : (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${usingEmailFallback ? "bg-amber-50 border border-amber-200" : "bg-muted/40"}`}>
                  {usingEmailFallback
                    ? <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    : <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />}
                  <span className={usingEmailFallback ? "text-amber-800" : "text-foreground"}>
                    Sending from: <strong>{effectiveFromEmail}</strong>
                    {usingEmailFallback && " — Main"}
                  </span>
                  {usingEmailFallback && (
                    <a href="/settings" className="ml-auto text-xs text-amber-600 underline shrink-0">Connect email</a>
                  )}
                </div>
              )}
            </div>
          )}

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