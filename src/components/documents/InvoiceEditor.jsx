import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, AlignJustify, LayoutList } from "lucide-react";
import { toast } from "sonner";
import { autoMoveSalesStage } from "@/lib/salesPipelineTriggers";
import { buildStageTransition } from "@/lib/pipelineHelpers";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const GROUPS = ["Materials", "Labor", "Hardware", "Other"];

const blankLine = () => ({
  _id: Math.random().toString(36).slice(2),
  group: "Labor",
  description: "",
  quantity: 1,
  unit: "ea",
  unit_cost: 0,
  total: 0,
});

function calcLine(line) {
  return { ...line, total: (line.quantity || 0) * (line.unit_cost || 0) };
}

export default function InvoiceEditor({ invoice, job, jobInvoices = [], estimates = [], changeOrders = [], prefill = null, onClose, currentUser }) {
  const qc = useQueryClient();
  const isNew = !invoice?.id;
  const [shopPrompt, setShopPrompt] = useState(false); // Trigger 4 confirm dialog

  // prefill is set when creating from an approved estimate (deposit) or final invoice
  const [invoiceType, setInvoiceType] = useState(prefill?.invoice_type || invoice?.invoice_type || "Final");
  const [status, setStatus] = useState(invoice?.status || "Unpaid");
  const [lines, setLines] = useState(() => {
    if (prefill?.line_items) return prefill.line_items.map(l => ({ ...l, _id: Math.random().toString(36).slice(2) }));
    return (invoice?.line_items || []).map(l => ({ ...l, _id: Math.random().toString(36).slice(2) }));
  });
  const [discount, setDiscount] = useState(prefill?.discount_percent ?? invoice?.discount_percent ?? 0);
  const [tax, setTax] = useState(prefill?.tax ?? invoice?.tax_percent ?? 0);
  const [depositModifier] = useState(prefill?.deposit_modifier || null); // "50%" label
  const [amountPaid, setAmountPaid] = useState(invoice?.amount_paid || 0);
  const [notes, setNotes] = useState(prefill?.notes || invoice?.notes || "");
  const [internalNotes, setInternalNotes] = useState(invoice?.internal_notes || "");
  const [viewMode, setViewMode] = useState(invoice?.view_mode || "detail");
  const [issuedDate, setIssuedDate] = useState(invoice?.issued_date || new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(() => {
    if (invoice?.due_date) return invoice.due_date;
    if (prefill?.due_days) {
      const d = new Date();
      d.setDate(d.getDate() + prefill.due_days);
      return d.toISOString().split("T")[0];
    }
    return "";
  });

  const rawSubtotal = lines.reduce((s, l) => s + (l.total || 0), 0);
  // For deposit invoices created from estimate, apply 50% at summary level
  const subtotal = depositModifier === "50%" ? rawSubtotal * 0.5 : rawSubtotal;
  const discountAmt = subtotal * (discount / 100);
  const afterDiscount = subtotal - discountAmt;
  const taxAmount = afterDiscount * (tax / 100);
  const total = afterDiscount + taxAmount;
  const balanceDue = total - (amountPaid || 0);

  // Already invoiced on this job (excluding this invoice)
  const alreadyInvoiced = jobInvoices
    .filter(inv => inv.id !== invoice?.id)
    .reduce((s, inv) => s + (inv.total || 0), 0);

  function updateLine(idx, field, value) {
    setLines(prev => {
      const next = [...prev];
      next[idx] = calcLine({ ...next[idx], [field]: (field === "quantity" || field === "unit_cost") ? parseFloat(value) || 0 : value });
      return next;
    });
  }

  function importFromEstimate(est) {
    const imported = (est.line_items || []).map(l => ({
      ...l,
      _id: Math.random().toString(36).slice(2),
      group: l.category || "Other",
      install_location: l.install_location || "N/A",
      total: (l.quantity || 0) * (l.unit_cost || 0),
    }));
    setLines(imported);
    setTax(est.tax_percent || 0);
  }

  const actorName = currentUser?.full_name || currentUser?.email || "Team Member";

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        job_id: job.id,
        job_number: job.job_number,
        job_name: job.job_name,
        customer_id: job.customer_id,
        customer_name: job.customer_name,
        site_address: job.site_address,
        invoice_type: invoiceType,
        status,
        line_items: lines.map(({ _id, ...r }) => r),
        subtotal,
        discount_percent: discount,
        tax_percent: tax,
        tax_amount: taxAmount,
        total,
        amount_paid: amountPaid,
        balance_due: balanceDue,
        issued_date: issuedDate,
        due_date: dueDate,
        notes,
        internal_notes: internalNotes,
        ...(depositModifier ? { deposit_modifier: depositModifier } : {}),
      };
      if (isNew) {
        // Auto-assign sequential invoice number
        const existing = await base44.entities.Invoice.list("-created_date", 200);
        const year = new Date().getFullYear();
        const yearPrefix = `INV-${year}-`;
        const maxNum = existing.reduce((max, inv) => {
          if (inv.invoice_number?.startsWith(yearPrefix)) {
            const n = parseInt(inv.invoice_number.slice(yearPrefix.length), 10);
            return isNaN(n) ? max : Math.max(max, n);
          }
          return max;
        }, 0);
        payload.invoice_number = `${yearPrefix}${String(maxNum + 1).padStart(4, "0")}`;
        return base44.entities.Invoice.create({ ...payload, view_mode: viewMode });
      }
      return base44.entities.Invoice.update(invoice.id, { ...payload, view_mode: viewMode });
    },
    onSuccess: async () => {
      const prevStatus = invoice?.status || "Unpaid";
      const isDepositNowPaid = invoiceType === "Deposit" && status === "Paid" && prevStatus !== "Paid";

      if (isDepositNowPaid) {
        // Trigger 4 — move job to Deposit Received / Sale Won
        await autoMoveSalesStage(
          job,
          "Deposit Received / Sale Won",
          `Deposit invoice marked Paid — job auto-moved to Deposit Received / Sale Won`,
          actorName
        );
        qc.invalidateQueries(["invoices", job.id]);
        qc.invalidateQueries(["job", job.id]);
        // Show confirm prompt to move to Shop
        setShopPrompt(true);
        return;
      }

      qc.invalidateQueries(["invoices", job.id]);
      qc.invalidateQueries(["job", job.id]);
      onClose?.();
    },
  });

  async function handleMoveToShop() {
    // Use updated stage since autoMoveSalesStage already moved job to "Deposit Received / Sale Won"
    const updatedJob = { ...job, pipeline_board: "Sales", stage: "Deposit Received / Sale Won" };
    const transition = buildStageTransition(updatedJob, "Shop", "New Jobs Landed — Needs Approval", "Deposit received — moved to Shop Flow");
    await base44.entities.Job.update(job.id, transition);
    qc.invalidateQueries(["jobs"]);
    qc.invalidateQueries(["job", job.id]);
    toast(`Deposit received — ${job.job_name} moved to Shop Flow`);
    setShopPrompt(false);
    onClose?.();
  }

  function handleStayInSales() {
    qc.invalidateQueries(["jobs"]);
    setShopPrompt(false);
    onClose?.();
  }

  const approvedEstimates = estimates.filter(e => e.status === "Approved");

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/30 shrink-0 gap-3 flex-wrap">
        <div>
          <p className="text-xs text-muted-foreground font-mono">{job.job_number}</p>
          <h2 className="font-semibold text-sm">{job.job_name}</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={invoiceType} onValueChange={setInvoiceType}>
            <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["Deposit", "Progress", "Final"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["Unpaid", "Partial", "Paid", "Overdue"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          {/* Summary / Detail toggle */}
          <div className="flex items-center border rounded-md overflow-hidden h-8">
            <button
              className={`px-2.5 h-full text-xs flex items-center gap-1 transition-colors ${viewMode === "summary" ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:bg-muted"}`}
              onClick={() => setViewMode("summary")}
            >
              <AlignJustify className="w-3 h-3" /> Summary
            </button>
            <button
              className={`px-2.5 h-full text-xs flex items-center gap-1 transition-colors ${viewMode === "detail" ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:bg-muted"}`}
              onClick={() => setViewMode("detail")}
            >
              <LayoutList className="w-3 h-3" /> Detail
            </button>
          </div>
          <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Saving…" : isNew ? "Create Invoice" : "Save Changes"}
          </Button>
          {onClose && <Button size="sm" variant="outline" onClick={onClose}>Close</Button>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* View mode banner */}
        {viewMode === "summary" && (
          <div className="mx-5 mt-4 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
            <strong>Summary View active</strong> — Customer sees one line per item (description, qty, total). Switch to Detail to show full unit cost breakdown.
          </div>
        )}

        {/* Already invoiced context */}
        {alreadyInvoiced > 0 && (
          <div className="mx-5 mt-4 bg-muted/40 rounded-lg px-4 py-2 text-xs text-muted-foreground flex justify-between">
            <span>Already invoiced on this job:</span>
            <span className="font-semibold">${alreadyInvoiced.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
          </div>
        )}

        {/* Import from estimate */}
        {approvedEstimates.length > 0 && isNew && (
          <div className="mx-5 mt-3">
            <p className="text-xs text-muted-foreground mb-1.5">Pull line items from approved estimate:</p>
            <div className="flex gap-2 flex-wrap">
              {approvedEstimates.map(est => (
                <Button key={est.id} size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => importFromEstimate(est)}>
                  Import Est #{est.id.slice(-4)} (${(est.total || 0).toLocaleString()})
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Dates */}
        <div className="p-5 pb-0 grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Issue Date</Label>
            <Input type="date" value={issuedDate} onChange={e => setIssuedDate(e.target.value)} className="h-8 text-xs mt-1" />
          </div>
          <div>
            <Label className="text-xs">Due Date</Label>
            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="h-8 text-xs mt-1" />
          </div>
        </div>

        {/* Line items */}
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Line Items</h3>
            <Button size="sm" variant="outline" className="gap-1 h-8 text-xs" onClick={() => setLines(p => [...p, blankLine()])}>
              <Plus className="w-3.5 h-3.5" /> Add Line
            </Button>
          </div>

          <div className="grid grid-cols-[1fr_1.5fr_0.8fr_0.7fr_0.9fr_0.9fr_auto] gap-1.5 text-xs text-muted-foreground font-medium mb-1.5 px-1">
            <span>Group</span><span>Description</span><span>Qty</span><span>Unit</span><span>Unit Cost</span><span>Total</span><span></span>
          </div>
          <div className="space-y-1.5">
            {lines.map((line, idx) => (
              <div key={line._id} className="grid grid-cols-[1fr_1.5fr_0.8fr_0.7fr_0.9fr_0.9fr_auto] gap-1.5 items-center">
                <Select value={line.group} onValueChange={v => updateLine(idx, "group", v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{GROUPS.map(g => <SelectItem key={g} value={g} className="text-xs">{g}</SelectItem>)}</SelectContent>
                </Select>
                <Input className="h-8 text-xs" placeholder="Description" value={line.description} onChange={e => updateLine(idx, "description", e.target.value)} />
                <Input className="h-8 text-xs" type="number" value={line.quantity} onChange={e => updateLine(idx, "quantity", e.target.value)} />
                <Input className="h-8 text-xs" placeholder="ea" value={line.unit} onChange={e => updateLine(idx, "unit", e.target.value)} />
                <Input className="h-8 text-xs" type="number" placeholder="0.00" value={line.unit_cost} onChange={e => updateLine(idx, "unit_cost", e.target.value)} />
                <span className="text-sm font-semibold text-right">${(line.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setLines(p => p.filter((_, i) => i !== idx))}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
            {lines.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No line items yet.</p>}
          </div>
        </div>

        <Separator />

        {/* Totals */}
        <div className="p-5 grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Payment</h3>
            <div className="flex items-center gap-3">
              <Label className="w-32 text-xs shrink-0">Discount %</Label>
              <Input type="number" className="h-8 w-24 text-xs" value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="flex items-center gap-3">
              <Label className="w-32 text-xs shrink-0">Tax %</Label>
              <Input type="number" className="h-8 w-24 text-xs" value={tax} onChange={e => setTax(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="flex items-center gap-3">
              <Label className="w-32 text-xs shrink-0">Amount Paid</Label>
              <Input type="number" className="h-8 w-24 text-xs" value={amountPaid} onChange={e => setAmountPaid(parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          <div className="space-y-1 text-sm">
            <h3 className="font-semibold text-sm mb-3">Summary</h3>
            <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></div>
            {discount > 0 && <div className="flex justify-between text-red-600"><span>Discount ({discount}%)</span><span>−${discountAmt.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></div>}
            {tax > 0 && <div className="flex justify-between text-muted-foreground"><span>Tax ({tax}%)</span><span>+${taxAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></div>}
            {depositModifier === "50%" && (
            <div className="flex justify-between text-muted-foreground text-xs bg-amber-50 px-2 py-1 rounded">
              <span>Deposit — 50% of Approved Estimate</span>
              <span>${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base border-t pt-1"><span>Total</span><span>${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Paid</span><span>−${(amountPaid || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></div>
            <div className={`flex justify-between font-bold ${balanceDue > 0 ? "text-destructive" : "text-emerald-600"}`}>
              <span>Balance Due</span><span>${balanceDue.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Notes */}
        <div className="p-5 grid md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Customer Notes</Label>
            <Textarea rows={3} className="text-xs" placeholder="Visible on invoice…" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Internal Notes</Label>
            <Textarea rows={3} className="text-xs" placeholder="Internal only, not shown to customer…" value={internalNotes} onChange={e => setInternalNotes(e.target.value)} />
          </div>
        </div>
      </div>

    {/* Trigger 4 — Deposit Paid: confirm move to Shop */}
    <AlertDialog open={shopPrompt} onOpenChange={setShopPrompt}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deposit received for {job.job_name}</AlertDialogTitle>
          <AlertDialogDescription>
            The deposit invoice is marked paid. Move this job to the Shop Flow board under "New Jobs Landed — Needs Approval"?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleStayInSales}>Keep in Sales Flow</AlertDialogCancel>
          <AlertDialogAction onClick={handleMoveToShop}>Yes, Move to Shop</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
  );
}