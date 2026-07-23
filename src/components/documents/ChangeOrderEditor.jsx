import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import AutoGrowTextarea from "@/components/ui/auto-grow-textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

const CATEGORIES = ["Labor", "Material", "Equipment", "Sub-contractor", "Other"];

const blankLine = () => ({
  _id: Math.random().toString(36).slice(2),
  category: "Labor",
  description: "",
  quantity: 1,
  unit_cost: 0,
  total: 0,
});

function calcLine(line) {
  return { ...line, total: (line.quantity || 0) * (line.unit_cost || 0) };
}

export default function ChangeOrderEditor({ changeOrder, job, originalEstimateTotal = 0, onClose }) {
  const qc = useQueryClient();
  const isNew = !changeOrder?.id;

  const [description, setDescription] = useState(changeOrder?.description || "");
  const [status, setStatus] = useState(changeOrder?.status || "Draft");
  const [notes, setNotes] = useState(changeOrder?.notes || "");
  const [signature, setSignature] = useState(changeOrder?.customer_signature || "");
  const [lines, setLines] = useState(
    (changeOrder?.line_items || []).map(l => ({ ...l, _id: Math.random().toString(36).slice(2) }))
  );

  const totalImpact = lines.reduce((s, l) => s + (l.total || 0), 0);
  const newTotal = originalEstimateTotal + totalImpact;

  function updateLine(idx, field, value) {
    setLines(prev => {
      const next = [...prev];
      next[idx] = calcLine({ ...next[idx], [field]: (field === "quantity" || field === "unit_cost") ? parseFloat(value) || 0 : value });
      return next;
    });
  }

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        organization_id: job.organization_id,
        job_id: job.id,
        job_number: job.job_number,
        description,
        status,
        notes,
        customer_signature: signature,
        line_items: lines.map(({ _id, ...r }) => r),
        cost_impact: totalImpact,
        ...(status === "Approved" ? { customer_approval_date: new Date().toISOString() } : {}),
      };
      return isNew
        ? base44.entities.ChangeOrder.create(payload)
        : base44.entities.ChangeOrder.update(changeOrder.id, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries(["changeOrders", job.id]);
      onClose?.();
    },
  });

  const del = useMutation({
    mutationFn: () => base44.entities.ChangeOrder.delete(changeOrder.id),
    onSuccess: () => { qc.invalidateQueries(["changeOrders", job.id]); onClose?.(); },
  });

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/30 shrink-0 gap-3 flex-wrap">
        <div>
          <p className="text-xs text-muted-foreground font-mono">{job.job_number}</p>
          <h2 className="font-semibold text-sm">{job.job_name}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["Draft", "Sent", "Approved", "Rejected"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          {!isNew && (
            <Button size="sm" variant="destructive" onClick={() => del.mutate()} disabled={del.isPending}>Delete</Button>
          )}
          <Button size="sm" onClick={() => save.mutate()} disabled={!description || save.isPending}>
            {save.isPending ? "Saving…" : isNew ? "Create CO" : "Save Changes"}
          </Button>
          {onClose && <Button size="sm" variant="outline" onClick={onClose}>Close</Button>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Original estimate context */}
        {originalEstimateTotal > 0 && (
          <div className="bg-muted/40 rounded-lg px-4 py-3 text-xs space-y-1">
            <div className="flex justify-between text-muted-foreground"><span>Original Estimate</span><span>${originalEstimateTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></div>
            <div className={`flex justify-between font-semibold ${totalImpact >= 0 ? "text-emerald-600" : "text-destructive"}`}>
              <span>Change Impact</span><span>{totalImpact >= 0 ? "+" : ""}${totalImpact.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between font-bold border-t pt-1"><span>New Total</span><span>${newTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></div>
          </div>
        )}

        {/* Description */}
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Description of Scope Change *</Label>
          <Textarea rows={2} placeholder="Describe what changed…" value={description} onChange={e => setDescription(e.target.value)} />
        </div>

        {/* Line Items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-semibold">Line Items</Label>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setLines(p => [...p, blankLine()])}>
              <Plus className="w-3.5 h-3.5" /> Add
            </Button>
          </div>
          <div className="space-y-1.5">
            {lines.map((line, idx) => (
              <div key={line._id} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-1.5 items-start">
                <AutoGrowTextarea className="text-xs" placeholder="Description" value={line.description} onChange={e => updateLine(idx, "description", e.target.value)} />
                <Select value={line.category} onValueChange={v => updateLine(idx, "category", v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
                </Select>
                <Input className="h-8 text-xs" type="number" placeholder="Qty" value={line.quantity} onChange={e => updateLine(idx, "quantity", e.target.value)} />
                <Input className="h-8 text-xs" type="number" placeholder="Unit Cost" value={line.unit_cost} onChange={e => updateLine(idx, "unit_cost", e.target.value)} />
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setLines(p => p.filter((_, i) => i !== idx))}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
            {lines.length === 0 && <p className="text-xs text-muted-foreground py-3 text-center">No line items yet.</p>}
          </div>
          {lines.length > 0 && (
            <div className="flex justify-end mt-2 text-sm font-bold">
              Total Impact: <span className={`ml-2 ${totalImpact >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                {totalImpact >= 0 ? "+" : ""}${totalImpact.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Notes</Label>
            <Textarea rows={3} className="text-xs" placeholder="Internal notes…" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Customer Signature</Label>
            <Input
              className="text-sm"
              placeholder="Name / initials for approval"
              value={signature}
              onChange={e => { setSignature(e.target.value); if (e.target.value) setStatus("Approved"); }}
            />
            {signature && <p className="text-xs text-emerald-600">Signed by {signature}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}