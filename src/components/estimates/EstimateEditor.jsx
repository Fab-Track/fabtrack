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
import { Plus, Trash2, CheckCircle2, FileText, LayoutList, AlignJustify, AlertCircle, ImageOff, Image } from "lucide-react";
import LineItemCategorySelect from "./LineItemCategorySelect";
import { toast } from "sonner";
import { autoMoveSalesStage } from "@/lib/salesPipelineTriggers";

const CATEGORIES = ["Labor", "Material", "Equipment", "Sub-contractor", "Other"];

const INSTALL_LOCATIONS = [
  "Interior — Main Staircase",
  "Interior — Secondary Staircase",
  "Interior — Loft / Mezzanine",
  "Interior — Balcony / Overlook",
  "Interior — Basement Staircase",
  "Interior — Other",
  "Exterior — Front Porch",
  "Exterior — Front Balcony",
  "Exterior — Back Deck",
  "Exterior — Back Porch",
  "Exterior — Side Yard",
  "Exterior — Pool Area",
  "Exterior — Driveway / Entry",
  "Exterior — Rooftop / Terrace",
  "Exterior — Staircase to Grade",
  "Exterior — Other",
  "Commercial — Staircase",
  "Commercial — Corridor / Hallway",
  "Commercial — Parking Structure",
  "Commercial — Exterior Entry",
  "Commercial — Other",
  "N/A",
];

const blankLine = () => ({
  _id: Math.random().toString(36).slice(2),
  category: "All",
  description: "",
  install_location: "N/A",
  quantity: 1,
  unit: "ea",
  unit_cost: 0,
  total: 0,
  photo_url: null,
  show_photo: true,
});

function calcLine(line) {
  return { ...line, total: (line.quantity || 0) * (line.unit_cost || 0) };
}

export default function EstimateEditor({ estimate, job, onClose, onCreateDepositInvoice, currentUser, prefillData }) {
  const qc = useQueryClient();
  const isNew = !estimate?.id;

  const [status, setStatus] = useState(estimate?.status || "Draft");
  const [serviceCategory, setServiceCategory] = useState(estimate?.service_category || "");
  const [lines, setLines] = useState(() => {
    if (isNew && prefillData?.lineItems) {
      return prefillData.lineItems.map(l => ({ ...l, _id: Math.random().toString(36).slice(2) }));
    }
    return (estimate?.line_items || []).map(l => ({ ...l, _id: Math.random().toString(36).slice(2) }));
  });
  const [markup, setMarkup] = useState(estimate?.markup_percent || 0);
  const [overhead, setOverhead] = useState(estimate?.overhead_percent || 0);
  const [tax, setTax] = useState(estimate?.tax_percent || 0);
  const [notes, setNotes] = useState(() => {
    if (isNew && prefillData?.notes) return prefillData.notes;
    return estimate?.notes || "";
  });
  const [signature, setSignature] = useState(estimate?.customer_signature || "");
  const [collapsed, setCollapsed] = useState({});
  const [editorView, setEditorView] = useState("detail"); // always start in detail for editing
  const [viewMode, setViewMode] = useState(estimate?.view_mode || "summary"); // customer-facing saved mode
  const stylePhotoUrl = isNew ? prefillData?.stylePhotoUrl : estimate?.style_photo_url;
  const railingStyle = isNew ? prefillData?.style : estimate?.railing_style;
  const railingLnft = isNew ? prefillData?.lnft : estimate?.railing_lnft;

  const subtotal = lines.reduce((s, l) => s + (l.total || 0), 0);
  const afterMarkup = subtotal * (1 + markup / 100);
  const afterOverhead = afterMarkup * (1 + overhead / 100);
  const total = afterOverhead * (1 + tax / 100);

  const actorName = currentUser?.full_name || currentUser?.email || "Team Member";

  const save = useMutation({
    mutationFn: () => {
      // Validate — require service_category before Sent
      if (status === "Sent" && !serviceCategory) {
        toast.error("Please select a Primary Service Category before marking as Sent.");
        throw new Error("service_category required");
      }
      const payload = {
        job_id: job.id,
        job_number: job.job_number,
        status,
        service_category: serviceCategory || undefined,
        line_items: lines.map(({ _id, ...rest }) => rest),
        subtotal,
        markup_percent: markup,
        overhead_percent: overhead,
        tax_percent: tax,
        total,
        notes,
        customer_signature: signature,
        view_mode: viewMode,
        ...(stylePhotoUrl ? { style_photo_url: stylePhotoUrl } : {}),
        ...(railingStyle ? { railing_style: railingStyle, railing_lnft: railingLnft } : {}),
        ...(status === "Approved" ? { approved_date: new Date().toISOString().split("T")[0] } : {}),
      };
      return isNew
        ? base44.entities.Estimate.create(payload)
        : base44.entities.Estimate.update(estimate.id, payload);
    },
    onSuccess: async () => {
      const prevStatus = estimate?.status || "Draft";

      // Trigger 1 — New estimate created while job is in "New Lead"
      if (isNew) {
        const moved = await autoMoveSalesStage(
          job,
          "Estimate In Progress",
          "Estimate created — job auto-moved to Estimate In Progress",
          actorName
        );
        if (moved) {
          // update local job ref for downstream triggers in same save
          job = { ...job, stage: "Estimate In Progress", pipeline_board: "Sales" };
        }
      }

      // Trigger 2 — Estimate status changed to "Sent"
      if (status === "Sent" && prevStatus !== "Sent") {
        const moved = await autoMoveSalesStage(
          job,
          "Estimate Sent",
          `Estimate marked Sent — job auto-moved to Estimate Sent`,
          actorName
        );
        if (moved) {
          toast("Job moved to Estimate Sent");
          job = { ...job, stage: "Estimate Sent", pipeline_board: "Sales" };
        }
      }

      // Trigger 3 — Estimate Approved
      if (status === "Approved" && prevStatus !== "Approved") {
        const estUpdate = { estimate_total: total, customer_approval_status: "approved" };
        await base44.entities.Job.update(job.id, estUpdate);
        const moved = await autoMoveSalesStage(
          { ...job, ...estUpdate },
          "Awaiting Deposit",
          `Estimate approved by ${signature} — job auto-moved to Awaiting Deposit`,
          actorName
        );
        if (moved) {
          toast("Estimate approved — job moved to Awaiting Deposit");
        }
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



  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/30 shrink-0">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-xs text-muted-foreground font-mono">{job.job_number}</p>
            <h2 className="font-semibold text-sm">{job.job_name}</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <Select value={serviceCategory} onValueChange={setServiceCategory}>
              <SelectTrigger className={`h-8 text-xs w-44 ${!serviceCategory ? "border-amber-400 bg-amber-50" : ""}`}>
                <SelectValue placeholder="Service Category…" />
              </SelectTrigger>
              <SelectContent>
                {["Railing","Staircase","Structural","Gate","Planter Box","Wall Wrap","Awning","Other / Custom"].map(c => (
                  <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!serviceCategory && <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" title="Required for Sent status" />}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Editor view toggle — local only, does not save */}
          <div className="flex items-center border rounded-md overflow-hidden h-8">
            <button
              className={`px-2.5 h-full text-xs flex items-center gap-1 transition-colors ${editorView === "summary" ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:bg-muted"}`}
              onClick={() => setEditorView("summary")}
            >
              <AlignJustify className="w-3 h-3" /> Summary
            </button>
            <button
              className={`px-2.5 h-full text-xs flex items-center gap-1 transition-colors ${editorView === "detail" ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:bg-muted"}`}
              onClick={() => setEditorView("detail")}
            >
              <LayoutList className="w-3 h-3" /> Detail
            </button>
          </div>
          {/* Customer-facing view mode — saved with estimate */}
          <button
            onClick={() => setViewMode(v => v === "summary" ? "detail" : "summary")}
            className="h-8 px-2.5 text-xs border rounded-md flex items-center gap-1.5 hover:bg-muted transition-colors text-muted-foreground"
            title="Toggle what the customer sees"
          >
            <span className="text-[10px] uppercase tracking-wide font-medium opacity-60">Customer:</span>
            <span className="font-semibold text-foreground">{viewMode === "summary" ? "Summary" : "Detail"}</span>
          </button>
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
          {!isNew && status === "Approved" && onCreateDepositInvoice && (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
              onClick={() => onCreateDepositInvoice({ lines, total, markup, overhead, tax, notes })}
            >
              <FileText className="w-3.5 h-3.5" /> Create Deposit Invoice
            </Button>
          )}
          {onClose && (
            <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Style Photo */}
        {stylePhotoUrl && (
          <div className="px-5 pt-4">
            <img src={stylePhotoUrl} alt={railingStyle || "Style"} className="max-h-48 rounded-lg object-cover border" />
            {railingStyle && <p className="text-xs text-muted-foreground mt-1">{railingStyle} — {railingLnft} lnft</p>}
          </div>
        )}

        {/* Line Items */}
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Line Items</h3>
            <Button size="sm" variant="outline" className="gap-1 h-8 text-xs" onClick={addLine}>
              <Plus className="w-3.5 h-3.5" /> Add Line
            </Button>
          </div>

          {editorView === "detail" ? (
            <>
              {/* Detail header */}
              <div className="grid grid-cols-[2fr_1.5fr_1fr_0.7fr_1fr_1fr_auto] gap-1.5 text-xs text-muted-foreground font-medium mb-1.5 px-1">
                <span>Description</span>
                <span>Install Location</span>
                <span>Category</span>
                <span>Qty</span>
                <span>Unit Cost</span>
                <span>Total</span>
                <span></span>
              </div>
              <div className="space-y-2">
                {lines.map((line, idx) => (
                  <div key={line._id} className="space-y-1">
                    <div className="grid grid-cols-[2fr_1.5fr_1fr_0.7fr_1fr_1fr_auto] gap-1.5 items-center">
                      <Input
                        className="h-8 text-xs"
                        placeholder="Description"
                        value={line.description}
                        onChange={e => updateLine(idx, "description", e.target.value)}
                      />
                      <Select value={line.install_location || "N/A"} onValueChange={v => updateLine(idx, "install_location", v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{INSTALL_LOCATIONS.map(l => <SelectItem key={l} value={l} className="text-xs">{l}</SelectItem>)}</SelectContent>
                      </Select>
                      <LineItemCategorySelect
                        value={line.category}
                        onChange={v => updateLine(idx, "category", v)}
                      />
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
                    {line.photo_url && (
                      <div className="flex items-center gap-2 pl-1">
                        <img src={line.photo_url} alt="" className="h-10 w-16 object-cover rounded border" />
                        <button
                          className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border transition-colors ${line.show_photo !== false ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border"}`}
                          onClick={() => updateLine(idx, "show_photo", line.show_photo === false)}
                          title="Toggle photo visibility on customer estimate"
                        >
                          {line.show_photo !== false ? <Image className="w-2.5 h-2.5" /> : <ImageOff className="w-2.5 h-2.5" />}
                          {line.show_photo !== false ? "Show photo" : "Hide photo"}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Summary header */}
              <div className="grid gap-1.5 text-xs text-muted-foreground font-medium mb-1.5 px-1" style={{ gridTemplateColumns: "2fr 0.6fr 1.5fr 1fr auto" }}>
                <span>Description</span>
                <span className="text-right">Qty</span>
                <span>Install Location</span>
                <span className="text-right">Amount</span>
                <span></span>
              </div>
              <div className="space-y-1">
                {lines.map((line, idx) => (
                  <div
                    key={line._id}
                    className="grid gap-1.5 items-center py-2 px-1 rounded hover:bg-muted/50 cursor-pointer group"
                    style={{ gridTemplateColumns: "2fr 0.6fr 1.5fr 1fr auto" }}
                    onClick={() => setEditorView("detail")}
                    title="Click to switch to Detail view and edit"
                  >
                    <span className="text-sm truncate">{line.description || <span className="text-muted-foreground italic">No description</span>}</span>
                    <span className="text-sm text-muted-foreground text-right">{line.quantity}</span>
                    <span className="text-xs text-muted-foreground truncate">{line.install_location !== "N/A" ? line.install_location : "—"}</span>
                    <span className="text-sm font-semibold text-right">
                      ${(line.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100" onClick={e => { e.stopPropagation(); removeLine(idx); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}

          {lines.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No line items yet. Add one above.</p>
          )}
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