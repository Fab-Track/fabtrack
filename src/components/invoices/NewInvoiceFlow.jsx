import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CreditCard, TrendingUp, CheckSquare, Sparkles } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

/**
 * NewInvoiceFlow — two-step invoice creation:
 *  Step 1: Choose type (Deposit / Progress / Final)
 *  Step 2: Select services to include + set amounts
 * Calls onConfirm({ invoiceType, lineItems }) when done.
 */
export default function NewInvoiceFlow({ open, onClose, services = [], onConfirm }) {
  const [step, setStep] = useState(1);
  const [invoiceType, setInvoiceType] = useState(null);
  const [selected, setSelected] = useState({}); // serviceId -> amount

  function reset() {
    setStep(1);
    setInvoiceType(null);
    setSelected({});
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleTypeSelect(type) {
    setInvoiceType(type);
    // Pre-populate amounts based on type
    const initial = {};
    const eligibleServices = services.filter(s => s.status !== "Fully Invoiced");
    eligibleServices.forEach(svc => {
      const remaining = (svc.total_price || 0) - (svc.invoiced_amount || 0);
      if (type === "Deposit") {
        initial[svc.id] = { checked: true, amount: parseFloat(((svc.total_price || 0) * 0.5).toFixed(2)) };
      } else if (type === "Final") {
        initial[svc.id] = { checked: true, amount: parseFloat(remaining.toFixed(2)) };
      } else {
        // Progress — unchecked, 0 by default
        initial[svc.id] = { checked: false, amount: 0 };
      }
    });
    setSelected(initial);
    setStep(2);
  }

  function toggleService(svcId) {
    setSelected(prev => ({
      ...prev,
      [svcId]: { ...prev[svcId], checked: !prev[svcId]?.checked },
    }));
  }

  function setAmount(svcId, amount) {
    setSelected(prev => ({
      ...prev,
      [svcId]: { ...prev[svcId], amount: parseFloat(amount) || 0 },
    }));
  }

  function applyHalfToAll() {
    setSelected(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(id => {
        const svc = services.find(s => s.id === id);
        if (svc) next[id] = { ...next[id], checked: true, amount: parseFloat(((svc.total_price || 0) * 0.5).toFixed(2)) };
      });
      return next;
    });
  }

  function applyRemainingToAll() {
    setSelected(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(id => {
        const svc = services.find(s => s.id === id);
        if (svc) {
          const rem = (svc.total_price || 0) - (svc.invoiced_amount || 0);
          next[id] = { ...next[id], checked: rem > 0, amount: parseFloat(rem.toFixed(2)) };
        }
      });
      return next;
    });
  }

  function handleCreate() {
    const lineItems = Object.entries(selected)
      .filter(([, v]) => v.checked && v.amount > 0)
      .map(([id, v]) => {
        const svc = services.find(s => s.id === id);
        return {
          _service_id: id,
          group: "Labor",
          description: svc?.description || svc?.name || "",
          quantity: 1,
          unit: svc?.unit || "ls",
          unit_cost: v.amount,
          total: v.amount,
        };
      });

    onConfirm({ invoiceType, lineItems, selectedAmounts: selected });
    handleClose();
  }

  const eligibleServices = services.filter(s => s.status !== "Fully Invoiced");
  const checkedTotal = Object.entries(selected)
    .filter(([, v]) => v.checked)
    .reduce((s, [, v]) => s + (v.amount || 0), 0);
  const checkedCount = Object.values(selected).filter(v => v.checked).length;

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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        {/* Step 1 — Choose type */}
        {step === 1 && (
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-1">New Invoice</h2>
            <p className="text-sm text-muted-foreground mb-6">What type of invoice is this?</p>
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

        {/* Step 2 — Select services */}
        {step === 2 && (
          <div className="flex flex-col max-h-[80vh]">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex-1">
                <h2 className="font-semibold text-base">Select Services to Invoice</h2>
                <p className="text-xs text-muted-foreground">{invoiceType} Invoice — choose which services to include</p>
              </div>
              <Badge className={
                invoiceType === "Deposit" ? "bg-blue-100 text-blue-800" :
                invoiceType === "Progress" ? "bg-amber-100 text-amber-800" :
                "bg-emerald-100 text-emerald-800"
              }>{invoiceType}</Badge>
            </div>

            {/* Quick actions */}
            <div className="px-6 py-2 border-b shrink-0 flex items-center gap-2 flex-wrap bg-muted/30">
              {invoiceType === "Deposit" && (
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={applyHalfToAll}>
                  <Sparkles className="w-3 h-3" /> 50% of All Services
                </Button>
              )}
              {invoiceType === "Final" && (
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={applyRemainingToAll}>
                  <Sparkles className="w-3 h-3" /> Invoice Remaining Balance
                </Button>
              )}
              <span className="text-xs text-muted-foreground ml-auto">{eligibleServices.length} services available</span>
            </div>

            {/* Table header */}
            <div className="grid grid-cols-[auto_1fr_6rem_6rem_8rem] gap-3 px-6 py-2 text-xs text-muted-foreground font-medium border-b bg-muted/20 shrink-0">
              <span></span>
              <span>Service</span>
              <span className="text-right">Total</span>
              <span className="text-right">Invoiced</span>
              <span className="text-right">This Invoice</span>
            </div>

            {/* Services list */}
            <div className="flex-1 overflow-y-auto divide-y">
              {eligibleServices.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">All services have been fully invoiced.</p>
              ) : (
                eligibleServices.map(svc => {
                  const sel = selected[svc.id] || { checked: false, amount: 0 };
                  const remaining = (svc.total_price || 0) - (svc.invoiced_amount || 0);
                  return (
                    <div key={svc.id} className={`grid grid-cols-[auto_1fr_6rem_6rem_8rem] gap-3 px-6 py-3 items-center transition-colors ${sel.checked ? "bg-primary/5" : ""}`}>
                      <Checkbox
                        checked={sel.checked}
                        onCheckedChange={() => toggleService(svc.id)}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{svc.name}</p>
                        {svc.description && <p className="text-xs text-muted-foreground truncate">{svc.description}</p>}
                        {svc.status === "Partially Invoiced" && (
                          <Badge className="mt-0.5 text-xs bg-amber-100 text-amber-700 border-transparent">Partial</Badge>
                        )}
                      </div>
                      <span className="text-sm text-right">
                        ${(svc.total_price || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-sm text-right text-muted-foreground">
                        {svc.invoiced_amount > 0
                          ? `$${(svc.invoiced_amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                          : "—"}
                      </span>
                      <div className="flex justify-end">
                        <Input
                          type="number"
                          value={sel.amount}
                          onChange={e => setAmount(svc.id, e.target.value)}
                          disabled={!sel.checked}
                          className="h-7 text-xs w-24 text-right"
                          placeholder={remaining.toFixed(2)}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t bg-muted/20 flex items-center justify-between shrink-0">
              <div className="text-sm">
                <span className="text-muted-foreground">{checkedCount} service{checkedCount !== 1 ? "s" : ""} selected · </span>
                <span className="font-semibold">Invoice Total: ${checkedTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleClose}>Cancel</Button>
                <Button
                  size="sm"
                  disabled={checkedCount === 0 || checkedTotal === 0}
                  onClick={handleCreate}
                >
                  Create Invoice →
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}