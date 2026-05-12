import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";

const CATEGORIES = ["Labor", "Material", "Equipment", "Sub-contractor", "Other"];
const PHASES = ["Fabrication", "Powder Coat", "Install", "Design", "Other"];

const blankLine = () => ({
  _id: Math.random().toString(36).slice(2),
  category: "Material",
  description: "",
  quantity: 1,
  unit: "ea",
  unit_cost: 0,
  phase: "Fabrication",
  total: 0,
});

function calcLine(line) {
  return { ...line, total: (line.quantity || 0) * (line.unit_cost || 0) };
}

export default function EstimateEditor({ estimate, job, onClose }) {
  const qc = useQueryClient();
  const isNew = !estimate?.id;

  const [status, setStatus] = useState(estimate?.status || "Draft");
  const [lines, setLines] = useState(
    (estimate?.line_items || []).map(l => ({ ...l, _id: Math.random().toString(36).slice(2) }))
  );
  const [markup, setMarkup] = useState(estimate?.markup_percent || 0);
  const [overhead, setOverhead] = useState(estimate?.overhead_percent || 0);
  const [tax, setTax] = useState(estimate?.tax_percent || 0);
  const [notes, setNotes] = useState(estimate?.notes || "");
  const [signature, setSignature] = useState(estimate?.customer_signature || "");
  const [collapsed, setCollapsed] = useState({});

  const subtotal = lines.reduce((s, l) => s + (l.total || 0), 0);
  const afterMarkup = subtotal * (1 + markup / 100);
  const afterOverhead = afterMarkup * (1 + overhead / 100);
  const total = afterOverhead * (1 + tax / 100);

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        job_id: job.id,
        job_number: job.job_number,
        status,
        line_items: lines.map(({ _id, ...rest }) => rest),
        subtotal,
        markup_percent: markup,
        overhead_percent: overhead,
        tax_percent: tax,
        total,
        notes,
        customer_signature: signature,
        ...(status === "Approved" ? { approved_date: new Date().toISOString().split("T")[0] } : {}),
      };
      return isNew
        ? base44.entities.Estimate.create(payload)
        : base44.entities.Estimate.update(estimate.id, payload);
    },
    onSuccess: async (saved) => {
      // Update job estimate_total when approved
      if (status === "Approved") {
        await base44.entities.Job.update(job.id, { estimate_total: total, customer_approval_status: "approved" });
      }
      qc.invalidateQueries(["estimates"]);
      qc.invalidateQueries(["estimates", job.id]);
      qc.invalidateQueries(["job", job.id]);
      onClose?.();
    },
  });

  function addLine() {
    setLines(prev => [...prev, blankLine()]);
  }

  function updateLine(idx, field, value) {
    setLines(prev => {
      const next = [...prev];
      next[idx] = calcLine({ ...next[idx], [field]: field === "quantity" || field === "unit_cost" ? parseFloat(value) || 0 : value });
      return next;
    });
  }

  function removeLine(idx) {
    setLines(prev => prev.filter((_, i) => i !== idx));
  }

  // Group lines by phase for display
  const byPhase = PHASES.reduce((acc, p) => {
    acc[p] = lines.filter(l => l.phase === p);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/30 shrink-0">
        <div>
          <p className="text-xs text-muted-foreground font-mono">{job.job_number}</p>
          <h2 className="font-semibold text-sm">{job.job_name}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["Draft", "Sent", "Approved", "Rejected"].map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Saving…" : isNew ? "Create Estimate" : "Save Changes"}
          </Button>
          {onClose && (
            <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Line Items */}
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Line Items</h3>
            <Button size="sm" variant="outline" className="gap-1 h-8 text-xs" onClick={addLine}>
              <Plus className="w-3.5 h-3.5" /> Add Line
            </Button>
          </div>

          {/* Header row */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-1.5 text-xs text-muted-foreground font-medium mb-1.5 px-1">
            <span>Description</span>
            <span>Category</span>
            <span>Phase</span>
            <span>Qty</span>
            <span>Unit Cost</span>
            <span>Total</span>
            <span></span>
          </div>

          <div className="space-y-1.5">
            {lines.map((line, idx) => (
              <div key={line._id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-1.5 items-center">
                <Input
                  className="h-8 text-xs"
                  placeholder="Description"
                  value={line.description}
                  onChange={e => updateLine(idx, "description", e.target.value)}
                />
                <Select value={line.category} onValueChange={v => updateLine(idx, "category", v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={line.phase} onValueChange={v => updateLine(idx, "phase", v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{PHASES.map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}</SelectContent>
                </Select>
                <Input
                  className="h-8 text-xs"
                  type="number"
                  value={line.quantity}
                  onChange={e => updateLine(idx, "quantity", e.target.value)}
                />
                <Input
                  className="h-8 text-xs"
                  type="number"
                  placeholder="0.00"
                  value={line.unit_cost}
                  onChange={e => updateLine(idx, "unit_cost", e.target.value)}
                />
                <span className="text-sm font-semibold text-right pr-1">
                  ${(line.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeLine(idx)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
            {lines.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No line items yet. Add one above.</p>
            )}
          </div>
        </div>

        <Separator />

        {/* Totals */}
        <div className="p-5 grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Adjustments</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Label className="w-32 text-xs shrink-0">Markup %</Label>
                <Input type="number" className="h-8 w-24 text-xs" value={markup} onChange={e => setMarkup(parseFloat(e.target.value) || 0)} />
                <span className="text-xs text-muted-foreground">+ ${(subtotal * markup / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex items-center gap-3">
                <Label className="w-32 text-xs shrink-0">Overhead %</Label>
                <Input type="number" className="h-8 w-24 text-xs" value={overhead} onChange={e => setOverhead(parseFloat(e.target.value) || 0)} />
                <span className="text-xs text-muted-foreground">+ ${(afterMarkup * overhead / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex items-center gap-3">
                <Label className="w-32 text-xs shrink-0">Tax %</Label>
                <Input type="number" className="h-8 w-24 text-xs" value={tax} onChange={e => setTax(parseFloat(e.target.value) || 0)} />
                <span className="text-xs text-muted-foreground">+ ${(afterOverhead * tax / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm mb-3">Summary</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              </div>
              {markup > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Markup ({markup}%)</span>
                  <span>+${(subtotal * markup / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {overhead > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Overhead ({overhead}%)</span>
                  <span>+${(afterMarkup * overhead / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {tax > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax ({tax}%)</span>
                  <span>+${(afterOverhead * tax / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <Separator className="my-1" />
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span>${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Notes + Approval */}
        <div className="p-5 grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Notes</Label>
            <Textarea
              rows={4}
              placeholder="Scope clarifications, exclusions, payment terms…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="text-xs"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Customer Approval</Label>
            <p className="text-xs text-muted-foreground">Enter customer name/initials to mark as approved.</p>
            <Input
              placeholder="Customer signature / initials"
              value={signature}
              onChange={e => { setSignature(e.target.value); if (e.target.value) setStatus("Approved"); }}
              className="text-sm"
            />
            {signature && (
              <div className="flex items-center gap-1.5 text-emerald-600 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Approved by {signature}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}