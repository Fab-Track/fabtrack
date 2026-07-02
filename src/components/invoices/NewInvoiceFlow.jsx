import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CreditCard, TrendingUp, CheckSquare, Sparkles, FileText, FileDiff } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const fmt = (n) => `$${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

const TYPE_OPTIONS = [
  {
    type: "Deposit",
    icon: CreditCard,
    label: "Deposit Invoice",
    desc: "First invoice — typically 50% upfront before work begins.",
    color: "border-blue-200 hover:border-blue-400 hover:bg-blue-50",
    badge: "bg-blue-100 text-blue-800",
  },
  {
    type: "Progress",
    icon: TrendingUp,
    label: "Progress Invoice",
    desc: "Mid-job billing for completed phases or milestones.",
    color: "border-amber-200 hover:border-amber-400 hover:bg-amber-50",
    badge: "bg-amber-100 text-amber-800",
  },
  {
    type: "Final",
    icon: CheckSquare,
    label: "Final Invoice",
    desc: "Remaining balance after job completion.",
    color: "border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50",
    badge: "bg-emerald-100 text-emerald-800",
  },
];

/**
 * NewInvoiceFlow — two-step invoice creation from estimate line items.
 * Props:
 *   open, onClose
 *   approvedEstimate   — the approved Estimate object (or null)
 *   approvedChangeOrders — array of approved CO objects
 *   existingInvoices   — array of existing Invoice objects (to compute already-invoiced per line)
 *   onConfirm({ invoiceType, lineItems }) — called with prefill data for InvoiceEditor
 */
export default function NewInvoiceFlow({ open, onClose, approvedEstimate, approvedChangeOrders = [], existingInvoices = [], onConfirm }) {
  const [step, setStep] = useState(1);
  const [invoiceType, setInvoiceType] = useState(null);
  const [estSelected, setEstSelected] = useState({}); // lineIndex -> { checked, amount }
  const [coSelected, setCoSelected] = useState({});   // "co_<coId>_<lineIdx>" -> { checked, amount }

  // Compute already-invoiced amounts per estimate line (by index matching description)
  function getAlreadyInvoiced(lineIdx, estLines) {
    const desc = estLines[lineIdx]?.description || "";
    let total = 0;
    for (const inv of existingInvoices) {
      for (const li of inv.line_items || []) {
        if (li._est_line_idx === lineIdx || li.description === desc) {
          total += li._invoiced_amount || li.total || 0;
        }
      }
    }
    return total;
  }

  function reset() {
    setStep(1);
    setInvoiceType(null);
    setEstSelected({});
    setCoSelected({});
  }

  function handleClose() { reset(); onClose(); }

  function handleTypeSelect(type) {
    setInvoiceType(type);
    const estLines = approvedEstimate?.line_items || [];
    const initEst = {};
    estLines.forEach((line, idx) => {
      const lineTotal = line.total || (line.quantity || 0) * (line.unit_cost || 0);
      const alreadyInvoiced = getAlreadyInvoiced(idx, estLines);
      const remaining = Math.max(0, lineTotal - alreadyInvoiced);
      if (type === "Deposit") {
        initEst[idx] = { checked: true, amount: parseFloat((lineTotal * 0.5).toFixed(2)) };
      } else if (type === "Final") {
        initEst[idx] = { checked: remaining > 0, amount: parseFloat(remaining.toFixed(2)) };
      } else {
        initEst[idx] = { checked: false, amount: 0 };
      }
    });
    setEstSelected(initEst);

    const initCo = {};
    approvedChangeOrders.forEach(co => {
      (co.line_items || []).forEach((line, idx) => {
        const key = `${co.id}_${idx}`;
        const lineTotal = line.total || (line.quantity || 0) * (line.unit_cost || 0);
        initCo[key] = { checked: false, amount: parseFloat(lineTotal.toFixed(2)) };
      });
    });
    setCoSelected(initCo);
    setStep(2);
  }

  function toggleEst(idx) {
    setEstSelected(prev => ({ ...prev, [idx]: { ...prev[idx], checked: !prev[idx]?.checked } }));
  }

  function setEstAmount(idx, val) {
    setEstSelected(prev => ({ ...prev, [idx]: { ...prev[idx], amount: parseFloat(val) || 0 } }));
  }

  function toggleCo(key) {
    setCoSelected(prev => ({ ...prev, [key]: { ...prev[key], checked: !prev[key]?.checked } }));
  }

  function setCoAmount(key, val) {
    setCoSelected(prev => ({ ...prev, [key]: { ...prev[key], amount: parseFloat(val) || 0 } }));
  }

  function applyAllRemaining() {
    const estLines = approvedEstimate?.line_items || [];
    const next = {};
    estLines.forEach((line, idx) => {
      const lineTotal = line.total || (line.quantity || 0) * (line.unit_cost || 0);
      const alreadyInvoiced = getAlreadyInvoiced(idx, estLines);
      const remaining = Math.max(0, lineTotal - alreadyInvoiced);
      next[idx] = { checked: remaining > 0, amount: parseFloat(remaining.toFixed(2)) };
    });
    setEstSelected(next);
    // Select all CO lines too
    const nextCo = {};
    Object.entries(coSelected).forEach(([key, v]) => {
      nextCo[key] = { ...v, checked: v.amount > 0 };
    });
    setCoSelected(nextCo);
  }

  function handleCreate() {
    const estLines = approvedEstimate?.line_items || [];
    const lineItems = [];

    estLines.forEach((line, idx) => {
      const sel = estSelected[idx];
      if (!sel?.checked || sel.amount <= 0) return;
      lineItems.push({
        _est_line_idx: idx,
        _invoiced_amount: sel.amount,
        group: line.category || "Labor",
        description: line.description || "",
        quantity: line.quantity || 1,
        unit: line.unit || "ls",
        unit_cost: sel.amount / (line.quantity || 1),
        total: sel.amount,
        ...(line.components?.length ? { components: line.components } : {}),
      });
    });

    approvedChangeOrders.forEach(co => {
      (co.line_items || []).forEach((line, idx) => {
        const key = `${co.id}_${idx}`;
        const sel = coSelected[key];
        if (!sel?.checked || sel.amount <= 0) return;
        lineItems.push({
          _co_id: co.id,
          group: line.category || "Labor",
          description: `CO: ${line.description || co.description || "Change Order"}`,
          quantity: line.quantity || 1,
          unit: line.unit || "ls",
          unit_cost: sel.amount / (line.quantity || 1),
          total: sel.amount,
        });
      });
    });

    // Derive a permanent label based on type and selection
    let invoice_label = "Final Invoice";
    if (invoiceType === "Deposit") invoice_label = "Deposit Invoice (50%)";
    else if (invoiceType === "Progress") invoice_label = "Progress Invoice";
    else if (invoiceType === "Final") {
      // If all lines come from COs only, label as Change Order Invoice
      const hasEstLines = Object.values(estSelected).some(v => v.checked);
      invoice_label = hasEstLines ? "Final Invoice" : "Change Order Invoice";
    }

    onConfirm({ invoiceType, lineItems, invoice_label });
    handleClose();
  }

  const estLines = approvedEstimate?.line_items || [];
  const estTotal = Object.values(estSelected).filter(v => v.checked).reduce((s, v) => s + (v.amount || 0), 0);
  const coTotal = Object.values(coSelected).filter(v => v.checked).reduce((s, v) => s + (v.amount || 0), 0);
  const checkedTotal = estTotal + coTotal;
  const checkedCount = Object.values(estSelected).filter(v => v.checked).length + Object.values(coSelected).filter(v => v.checked).length;

  const hasApprovedEstimate = !!approvedEstimate;
  const typeColor = invoiceType === "Deposit" ? "bg-blue-100 text-blue-800" : invoiceType === "Progress" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        {/* Step 1 — Choose type */}
        {step === 1 && (
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-1">New Invoice</h2>
            <p className="text-sm text-muted-foreground mb-6">What type of invoice is this?</p>
            {!hasApprovedEstimate && (
              <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                <p className="font-semibold mb-1">No approved estimate found</p>
                <p className="text-xs">You can still create a manual invoice, or go back and create an estimate first.</p>
              </div>
            )}
            <div className="grid grid-cols-3 gap-4">
              {TYPE_OPTIONS.map(({ type, icon: Icon, label, desc, color, badge }) => (
                <button
                  key={type}
                  className={`rounded-xl border-2 p-4 text-left transition-all ${color}`}
                  onClick={() => handleTypeSelect(type)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="w-5 h-5 text-muted-foreground" />
                    <Badge className={`text-xs ${badge}`}>{type}</Badge>
                  </div>
                  <p className="font-semibold text-sm mb-1">{label}</p>
                  <p className="text-xs text-muted-foreground leading-snug">{desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 — Select line items from estimate + COs */}
        {step === 2 && (
          <div className="flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex-1">
                <h2 className="font-semibold text-base">Select Line Items to Invoice</h2>
                <p className="text-xs text-muted-foreground">{invoiceType} Invoice — choose which items to include</p>
              </div>
              <Badge className={typeColor}>{invoiceType}</Badge>
            </div>

            {/* Quick actions */}
            <div className="px-6 py-2 border-b shrink-0 flex items-center gap-2 flex-wrap bg-muted/30">
              {invoiceType === "Final" && (
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={applyAllRemaining}>
                  <Sparkles className="w-3 h-3" /> Select All Remaining
                </Button>
              )}
              <span className="text-xs text-muted-foreground ml-auto">{estLines.length} estimate line{estLines.length !== 1 ? "s" : ""}</span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y">
              {/* Estimate section */}
              {hasApprovedEstimate ? (
                <>
                  <div className="px-6 py-2 bg-muted/20 flex items-center gap-2 shrink-0">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                     Approved Estimate — {approvedEstimate.estimate_number || `EST-${approvedEstimate.id?.slice(-6).toUpperCase()}`}
                    </span>
                  </div>
                  {/* Table header */}
                  <div className="grid grid-cols-[auto_1fr_5rem_5rem_5rem_8rem] gap-3 px-6 py-2 text-xs text-muted-foreground font-medium bg-muted/10 shrink-0">
                    <span></span>
                    <span>Description</span>
                    <span className="text-right">Total</span>
                    <span className="text-right">Invoiced</span>
                    <span className="text-right">Remaining</span>
                    <span className="text-right">This Invoice</span>
                  </div>
                  {estLines.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">No line items on this estimate.</p>
                  )}
                  {estLines.map((line, idx) => {
                    const lineTotal = line.total || (line.quantity || 0) * (line.unit_cost || 0);
                    const alreadyInvoiced = getAlreadyInvoiced(idx, estLines);
                    const remaining = Math.max(0, lineTotal - alreadyInvoiced);
                    const sel = estSelected[idx] || { checked: false, amount: 0 };
                    return (
                      <div key={idx} className={`grid grid-cols-[auto_1fr_5rem_5rem_5rem_8rem] gap-3 px-6 py-3 items-center transition-colors ${sel.checked ? "bg-primary/5" : ""}`}>
                        <Checkbox checked={sel.checked} onCheckedChange={() => toggleEst(idx)} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{line.description || "—"}</p>
                          {line.install_location && line.install_location !== "N/A" && (
                            <p className="text-xs text-muted-foreground truncate">{line.install_location}</p>
                          )}
                          <p className="text-xs text-muted-foreground">{line.quantity} {line.unit}</p>
                        </div>
                        <span className="text-sm text-right">{fmt(lineTotal)}</span>
                        <span className="text-sm text-right text-muted-foreground">
                          {alreadyInvoiced > 0 ? fmt(alreadyInvoiced) : "—"}
                        </span>
                        <span className={`text-sm text-right font-medium ${remaining <= 0 ? "text-muted-foreground line-through" : ""}`}>
                          {fmt(remaining)}
                        </span>
                        <div className="flex justify-end">
                          <Input
                            type="number"
                            value={sel.amount}
                            onChange={e => setEstAmount(idx, e.target.value)}
                            disabled={!sel.checked}
                            className="h-7 text-xs w-24 text-right"
                          />
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : (
                <div className="px-6 py-8 text-center text-muted-foreground text-sm">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>No approved estimate — line items will be entered manually on the invoice.</p>
                </div>
              )}

              {/* Change Orders section */}
              {approvedChangeOrders.length > 0 && (
                <>
                  <div className="px-6 py-2 bg-amber-50 flex items-center gap-2 shrink-0">
                    <FileDiff className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Change Orders</span>
                  </div>
                  {approvedChangeOrders.map(co => (
                    (co.line_items || []).map((line, idx) => {
                      const key = `${co.id}_${idx}`;
                      const lineTotal = line.total || (line.quantity || 0) * (line.unit_cost || 0);
                      const sel = coSelected[key] || { checked: false, amount: lineTotal };
                      return (
                        <div key={key} className={`grid grid-cols-[auto_1fr_5rem_5rem_5rem_8rem] gap-3 px-6 py-3 items-center transition-colors ${sel.checked ? "bg-amber-50/50" : ""}`}>
                          <Checkbox checked={sel.checked} onCheckedChange={() => toggleCo(key)} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{line.description || co.description || "Change Order"}</p>
                            <p className="text-xs text-amber-700">CO #{co.id?.slice(-6).toUpperCase()}</p>
                          </div>
                          <span className="text-sm text-right">{fmt(lineTotal)}</span>
                          <span className="text-sm text-right text-muted-foreground">—</span>
                          <span className="text-sm text-right font-medium">{fmt(lineTotal)}</span>
                          <div className="flex justify-end">
                            <Input
                              type="number"
                              value={sel.amount}
                              onChange={e => setCoAmount(key, e.target.value)}
                              disabled={!sel.checked}
                              className="h-7 text-xs w-24 text-right"
                            />
                          </div>
                        </div>
                      );
                    })
                  ))}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t bg-muted/20 flex items-center justify-between shrink-0">
              <div className="text-sm">
                <span className="text-muted-foreground">{checkedCount} item{checkedCount !== 1 ? "s" : ""} selected · </span>
                <span className="font-semibold">Invoice Total: {fmt(checkedTotal)}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleClose}>Cancel</Button>
                <Button
                  size="sm"
                  onClick={handleCreate}
                  disabled={hasApprovedEstimate && checkedCount === 0}
                >
                  Open Invoice →
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}