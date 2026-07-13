import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Send, Mail, MessageSquare, CheckSquare } from "lucide-react";
import InvoiceCustomerView from "@/components/invoices/InvoiceCustomerView";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { format, parseISO } from "date-fns";

const DEFAULT_PAYMENT_TERMS = `PAYMENT TERMS

Payment is due within 30 days of invoice date unless otherwise agreed in writing.

Accepted payment methods: Check, ACH, Credit Card, or Stripe.

Late payments may be subject to a 1.5% monthly finance charge. For questions regarding this invoice, please contact High Country Metal Works directly.`;

function buildDefaultMessage({ invoice, invoiceLabel, job, customer, total, balanceDue, dueDate }) {
  const name = customer?.name || job?.customer_name || "Valued Customer";
  const invNum = invoice?.invoice_number || "your invoice";
  const label = invoiceLabel || invoice?.invoice_type || "Invoice";
  const totalFmt = `$${(total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  const dueFmt = dueDate ? format(parseISO(dueDate), "MMMM d, yyyy") : "the due date shown on your invoice";

  const payLink = invoice?.id ? `\n\nView & Pay Online: ${window.location.origin}/invoice-view/${invoice.share_token || invoice.id}` : '';

  return `Hi ${name},

Please find your ${label} from High Country Metal Works attached.

Invoice: ${invNum}
Total: ${totalFmt}
Due: ${dueFmt}${payLink}

Please don't hesitate to reach out with any questions.

Thank you for your business!
– High Country Metal Works`;
}

function buildDefaultSubject({ invoice, invoiceLabel, job }) {
  const invNum = invoice?.invoice_number || "Invoice";
  const label = invoiceLabel || invoice?.invoice_type || "Invoice";
  const jobName = job?.job_name || "";
  return `${label} ${invNum}${jobName ? ` — ${jobName}` : ""}`;
}

// PDF generation from invoice data — fully paginated
function generateInvoicePDF({ invoice, job, customer, lines, subtotal, discountPct, discountAmt, tax, taxAmount, total, amountPaid, balanceDue, notes, viewMode, issuedDate, dueDate, invoiceLabel, status, contractText }) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const pageW = 215.9;
  const pageH = 279.4; // letter height in mm
  const margin = 18;
  const contentW = pageW - margin * 2;
  const BOTTOM_MARGIN = 20; // reserved at bottom of each page
  const usableBottom = pageH - BOTTOM_MARGIN;
  const LINE_H = 5.5; // baseline line height for body text

  const invNum = invoice?.invoice_number || "DRAFT";

  // ── Continuation header drawn at top of pages 2+ ──────────────
  function drawContinuationHeader() {
    doc.setFillColor(34, 47, 62);
    doc.rect(0, 0, pageW, 14, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("High Country Metal Works", margin, 9);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(200, 210, 220);
    doc.text(`${invNum}${invoiceLabel ? "  ·  " + invoiceLabel : ""}  — continued`, pageW - margin, 9, { align: "right" });
  }

  // ── Page break helper ─────────────────────────────────────────
  // neededSpace: how many mm we need before breaking
  function checkBreak(neededSpace = LINE_H) {
    if (y + neededSpace > usableBottom) {
      doc.addPage();
      drawContinuationHeader();
      y = 22; // below the continuation header
    }
  }

  let y = 0;

  // ── Page 1 main header ────────────────────────────────────────
  doc.setFillColor(34, 47, 62);
  doc.rect(0, 0, pageW, 38, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("High Country Metal Works", margin, 16);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 210, 220);
  doc.text("INVOICE", pageW - margin, 11, { align: "right" });

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(invNum, pageW - margin, 19, { align: "right" });

  if (invoiceLabel) {
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(180, 200, 215);
    doc.text(invoiceLabel, pageW - margin, 25, { align: "right" });
  }

  doc.setFontSize(8);
  doc.setTextColor(240, 240, 240);
  doc.text(status || "Unpaid", pageW - margin, 32, { align: "right" });

  y = 50;

  // ── Bill To + Dates ───────────────────────────────────────────
  doc.setTextColor(100, 110, 120);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("BILL TO", margin, y);

  const rightColX = margin + contentW * 0.55;
  doc.text("JOB DETAILS", rightColX, y);

  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(30, 40, 50);

  const billStartY = y;

  doc.setFont("helvetica", "bold");
  doc.text(customer?.name || job?.customer_name || "—", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(80, 90, 100);
  if (customer?.email) { y += 5; doc.text(customer.email, margin, y); }
  if (customer?.phone) { y += 4.5; doc.text(customer.phone, margin, y); }
  if (customer?.address) { y += 4.5; doc.text(customer.address, margin, y); }

  let ry = billStartY;
  doc.setFontSize(8.5);
  doc.setTextColor(80, 90, 100);
  if (job?.job_name) { doc.text(`Job: ${job.job_name}`, rightColX, ry); ry += 5; }
  if (job?.site_address) { doc.text(`Site: ${job.site_address}`, rightColX, ry); ry += 5; }
  if (issuedDate) { doc.text(`Invoice Date: ${format(parseISO(issuedDate), "MMM d, yyyy")}`, rightColX, ry); ry += 5; }
  if (dueDate) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 40, 50);
    doc.text(`Due: ${format(parseISO(dueDate), "MMM d, yyyy")}`, rightColX, ry);
    doc.setFont("helvetica", "normal");
  }

  y = Math.max(y, ry) + 10;

  // ── Divider ───────────────────────────────────────────────────
  doc.setDrawColor(220, 225, 230);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 7;

  // ── Line items header ─────────────────────────────────────────
  doc.setFillColor(245, 247, 249);
  doc.rect(margin, y - 3, contentW, 8, "F");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 110, 120);

  if (viewMode === "summary") {
    doc.text("DESCRIPTION", margin + 2, y + 2);
    doc.text("QTY", margin + contentW * 0.72, y + 2, { align: "right" });
    doc.text("AMOUNT", pageW - margin - 2, y + 2, { align: "right" });
  } else {
    doc.text("DESCRIPTION", margin + 2, y + 2);
    doc.text("QTY", margin + contentW * 0.58, y + 2, { align: "right" });
    doc.text("UNIT COST", margin + contentW * 0.76, y + 2, { align: "right" });
    doc.text("AMOUNT", pageW - margin - 2, y + 2, { align: "right" });
  }
  y += 10;

  // ── Line items ────────────────────────────────────────────────
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  lines.forEach((line, idx) => {
    const desc = line.description || "—";
    const descLines = doc.splitTextToSize(desc, contentW * 0.55);
    const rowH = descLines.length > 1 ? descLines.length * LINE_H + 2 : 7;
    checkBreak(rowH);

    if (idx % 2 === 1) {
      doc.setFillColor(249, 250, 251);
      doc.rect(margin, y - 3, contentW, rowH, "F");
    }
    doc.setTextColor(30, 40, 50);
    doc.text(descLines, margin + 2, y);

    if (viewMode === "summary") {
      doc.setTextColor(80, 90, 100);
      doc.text(String(line.quantity || 0), margin + contentW * 0.72, y, { align: "right" });
      doc.setTextColor(30, 40, 50);
      doc.text(`$${(line.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`, pageW - margin - 2, y, { align: "right" });
    } else {
      doc.setTextColor(80, 90, 100);
      doc.text(`${line.quantity || 0} ${line.unit || ""}`.trim(), margin + contentW * 0.58, y, { align: "right" });
      doc.text(`$${(line.unit_cost || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`, margin + contentW * 0.76, y, { align: "right" });
      doc.setTextColor(30, 40, 50);
      doc.text(`$${(line.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`, pageW - margin - 2, y, { align: "right" });
    }
    y += rowH;
  });

  checkBreak(10);
  doc.setDrawColor(220, 225, 230);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  // ── Totals ────────────────────────────────────────────────────
  const totalsX = margin + contentW * 0.58;
  const totalsValX = pageW - margin - 2;

  function totalsRow(label, value, bold = false, color = null) {
    checkBreak(7);
    if (color) doc.setTextColor(...color);
    else doc.setTextColor(80, 90, 100);
    doc.setFontSize(9);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.text(label, totalsX, y);
    doc.text(value, totalsValX, y, { align: "right" });
    y += 6;
  }

  totalsRow("Subtotal", `$${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}`);
  if (discountPct > 0) totalsRow(`Discount (${discountPct}%)`, `−$${discountAmt.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, false, [180, 50, 50]);
  if (tax > 0) totalsRow(`Tax (${tax}%)`, `+$${taxAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`);

  checkBreak(10);
  doc.setDrawColor(180, 185, 195);
  doc.line(totalsX, y, totalsValX, y);
  y += 4;

  totalsRow("Total", `$${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, true, [30, 40, 50]);

  if (amountPaid > 0) {
    totalsRow("Amount Paid", `−$${amountPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}`);
    const bdColor = balanceDue > 0 ? [180, 40, 40] : [30, 130, 80];
    totalsRow("Balance Due", `$${balanceDue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, true, bdColor);
  }

  y += 8;

  // ── Customer Notes ────────────────────────────────────────────
  if (notes) {
    const noteLines = doc.splitTextToSize(notes, contentW - 8);
    const noteH = noteLines.length * LINE_H + 14;
    checkBreak(noteH);

    doc.setFillColor(248, 249, 250);
    doc.rect(margin, y, contentW, noteH, "F");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 110, 120);
    doc.text("NOTES", margin + 4, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(40, 50, 60);
    doc.text(noteLines, margin + 4, y + 12);
    y += noteH + 8;
  }

  // ── Payment Terms — rendered line-by-line for proper pagination ─
  checkBreak(14);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 110, 120);
  doc.text("PAYMENT TERMS", margin, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(80, 90, 100);

  const termsText = contractText || DEFAULT_PAYMENT_TERMS;
  // Split into paragraph blocks first, then wrap each
  const termsLines = doc.splitTextToSize(termsText, contentW);
  termsLines.forEach(line => {
    checkBreak(LINE_H + 1);
    doc.text(line, margin, y);
    y += LINE_H;
  });

  const filename = `${invoice?.invoice_number || "Invoice"}_${job?.job_name?.replace(/\s+/g, "_") || "HCMW"}.pdf`;
  doc.save(filename);
}

const SEND_MODES = ["Email", "Text", "Both"];

export default function InvoiceReviewSend({
  invoice, job, customer, lines, subtotal, discountPct, discountAmt, tax, taxAmount,
  total, amountPaid, balanceDue, notes, viewMode, issuedDate, dueDate,
  invoiceLabel, status, contractText, onBack,
}) {
  const billingEmail = customer?.billing_contact_email || customer?.email || "";
  const billingPhone = customer?.billing_contact_phone || customer?.phone || "";

  const [toEmail, setToEmail] = useState(billingEmail);
  const [toPhone, setToPhone] = useState(billingPhone);
  const [sendMode, setSendMode] = useState("Email");
  const [subject, setSubject] = useState(() => buildDefaultSubject({ invoice, invoiceLabel, job }));
  const [messageBody, setMessageBody] = useState(() =>
    buildDefaultMessage({ invoice, invoiceLabel, job, customer, total, balanceDue, dueDate })
  );
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const previewRef = useRef(null);

  const pdfProps = {
    invoice, job, customer, lines, subtotal, discountPct, discountAmt, tax, taxAmount,
    total, amountPaid, balanceDue, notes, viewMode, issuedDate, dueDate,
    invoiceLabel, status, contractText,
  };

  function handleDownloadPDF() {
    generateInvoicePDF(pdfProps);
  }

  async function handleSend() {
    setSending(true);
    try {
      if (sendMode === "Email" || sendMode === "Both") {
        const resp = await base44.functions.invoke("sendResendEmail", {
          to: toEmail,
          subject,
          body: messageBody,
        });
        if (!resp.data?.ok) throw new Error(resp.data?.error || "Email failed to send");
      }
      if (sendMode === "Text" || sendMode === "Both") {
        const smsBody = encodeURIComponent(`${subject}\n\n${messageBody}`);
        window.open(`sms:${toPhone}?body=${smsBody}`);
      }
      setSent(true);
    } catch (err) {
      toast.error(err.message || "Failed to send invoice");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-muted/30 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Edit
          </button>
          <Separator orientation="vertical" className="h-5" />
          <div>
            <p className="text-xs text-muted-foreground font-mono">{job?.job_number}</p>
            <h2 className="font-semibold text-sm">{job?.job_name}</h2>
          </div>
          {invoiceLabel && (
            <Badge className="text-xs border bg-muted/50">{invoiceLabel}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">
            ${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Two-panel body */}
      <div className="flex-1 overflow-hidden flex">

        {/* ── Left panel: Send Details ── */}
        <div className="w-[400px] shrink-0 border-r flex flex-col overflow-y-auto bg-background">
          <div className="p-6 space-y-5">
            <div>
              <h3 className="font-semibold text-base mb-0.5">Review &amp; Send Invoice</h3>
              <p className="text-xs text-muted-foreground">
                {invoice?.invoice_number || "Draft"} · {invoiceLabel || invoice?.invoice_type || "Invoice"}
              </p>
            </div>

            {/* Send mode toggle */}
            <div>
              <Label className="text-xs font-semibold mb-2 block">Send Via</Label>
              <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
                {SEND_MODES.map(mode => (
                  <button
                    key={mode}
                    onClick={() => setSendMode(mode)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                      sendMode === mode
                        ? "bg-background shadow text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {mode === "Email" && <Mail className="w-3 h-3" />}
                    {mode === "Text" && <MessageSquare className="w-3 h-3" />}
                    {mode === "Both" && <CheckSquare className="w-3 h-3" />}
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* To fields */}
            {(sendMode === "Email" || sendMode === "Both") && (
              <div className="space-y-1">
                <Label className="text-xs">To (Email)</Label>
                <Input
                  type="email"
                  value={toEmail}
                  onChange={e => setToEmail(e.target.value)}
                  placeholder="customer@email.com"
                  className="h-8 text-sm"
                />
              </div>
            )}
            {(sendMode === "Text" || sendMode === "Both") && (
              <div className="space-y-1">
                <Label className="text-xs">To (Phone)</Label>
                <Input
                  type="tel"
                  value={toPhone}
                  onChange={e => setToPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="h-8 text-sm"
                />
              </div>
            )}

            {/* Subject */}
            {(sendMode === "Email" || sendMode === "Both") && (
              <div className="space-y-1">
                <Label className="text-xs">Subject</Label>
                <Input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            )}

            {/* Message body */}
            <div className="space-y-1">
              <Label className="text-xs">Message</Label>
              <Textarea
                rows={9}
                value={messageBody}
                onChange={e => setMessageBody(e.target.value)}
                className="text-sm resize-none"
              />
            </div>

            <Separator />

            {/* Download PDF */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Download a formatted PDF copy of this invoice to save or share manually.
              </p>
              <Button variant="outline" className="w-full gap-2" onClick={handleDownloadPDF}>
                <Download className="w-4 h-4" /> Download PDF
              </Button>
            </div>

            <Separator />

            {/* Primary send action */}
            {sent ? (
              <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm font-medium">
                <CheckSquare className="w-4 h-4" /> Invoice sent successfully!
              </div>
            ) : (
              <Button
                className="w-full gap-2"
                onClick={handleSend}
                disabled={sending || (sendMode !== "Text" && !toEmail) || (sendMode !== "Email" && !toPhone)}
              >
                <Send className="w-4 h-4" />
                {sending ? "Opening…" : `Send Invoice via ${sendMode}`}
              </Button>
            )}

            <button
              onClick={onBack}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors w-full text-center"
            >
              ← Back to edit invoice
            </button>
          </div>
        </div>

        {/* ── Right panel: Live Preview ── */}
        <div className="flex-1 overflow-y-auto bg-muted/20">
          {/* Preview toolbar */}
          <div className="flex items-center justify-between px-6 py-3 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer Preview</p>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={handleDownloadPDF}>
              <Download className="w-3 h-3" /> Download PDF
            </Button>
          </div>

          <div ref={previewRef} className="p-6">
            <InvoiceCustomerView
              invoice={invoice}
              job={job}
              customer={customer}
              lines={lines}
              subtotal={subtotal}
              discountPct={discountPct}
              discountAmt={discountAmt}
              tax={tax}
              taxAmount={taxAmount}
              total={total}
              amountPaid={amountPaid}
              balanceDue={balanceDue}
              notes={notes}
              viewMode={viewMode}
              issuedDate={issuedDate}
              dueDate={dueDate}
              invoiceLabel={invoiceLabel}
              status={status}
              contractText={contractText}
            />
          </div>
        </div>
      </div>
    </div>
  );
}