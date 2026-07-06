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
import { Plus, Trash2, CheckCircle2, FileText, LayoutList, AlignJustify, AlertCircle, ImageOff, Image, Lock } from "lucide-react";
import AddLineItemWizard from "./AddLineItemWizard";
import LineItemCostBreakdown from "./LineItemCostBreakdown";
import { useJobDetailConfig } from "@/hooks/useJobDetailConfig";
import { toast } from "sonner";
import { autoMoveSalesStage } from "@/lib/salesPipelineTriggers";

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
  description: "",
  install_location: "N/A",
  color: "",
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
  const [approvalMethod, setApprovalMethod] = useState(estimate?.approval_method || "");
  const [collapsed, setCollapsed] = useState({});
  // Only lock editing when the estimate is already saved as Approved in the DB
  const isLocked = estimate?.status === "Approved" && !!estimate?.id;
  const [wizardOpen, setWizardOpen] = useState(false);
  const { config: detailConfig } = useJobDetailConfig();
  const powdercoatColors = detailConfig.powdercoat_colors || [];
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
        ...(status === "Approved" ? {
          approved_date: new Date().toISOString().split("T")[0],
          approved_at: estimate?.approved_at || new Date().toISOString(),
          approval_method: approvalMethod || estimate?.approval_method,
          approved_by_name: estimate?.approved_by_name || actorName,
          approved_by_id: estimate?.approved_by_id || currentUser?.id,
        } : {}),
      };
      return isNew
        ? base44.entities.Estimate.create({ ...payload, share_token: crypto.randomUUID().replace(/-/g, "") })
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
          `Estimate approved by ${signature || actorName} — job auto-moved to Awaiting Deposit`,
          actorName
        );
        if (moved) {
          toast("Estimate approved — job moved to Awaiting Deposit");
        }
        // Fire in-app notification
        await base44.entities.Notification.create({
          title: "Estimate Approved",
          body: `Estimate for ${job.job_name || job.job_number} has been approved${approvalMethod ? ` (${approvalMethod})` : ""}.`,
          type: "info",
          link: `/jobs/${job.id}`,
          target_roles: ["owner", "admin", "estimator"],
        });
      }

      qc.invalidateQueries(["estimates"]);
      qc.invalidateQueries(["estimates", job.id]);
      qc.invalidateQueries(["job", job.id]);
      onClose?.();
    },
  });

  function addLine() {
    setWizardOpen(true);
  }

  function handleWizardAdd(newLine) {
    setLines(prev => [...prev, newLine]);
  }

  function updateLine(idx, field, value) {
    setLines(prev => {
      const next = [...prev];
      let updated = { ...next[idx], [field]: field === "quantity" || field === "unit_cost" || field === "_markup_multiplier" ? parseFloat(value) || 0 : value };
      // If markup changed and line has cost model, recompute unit_cost from stored hard cost
      if (field === "_markup_multiplier" && updated._hard_cost_per_unit) {
        updated.unit_cost = Math.round(updated._hard_cost_per_unit * (parseFloat(value) || 1) * 100) / 100;
      }
      next[idx] = calcLine(updated);
      return next;
    });
  }

  function removeLine(idx) {
    setLines(prev => prev.filter((_, i) => i !== idx));
  }



  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Toolbar */}
      <div className="sticky top-0 z-20 bg-background border-b px-4 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between shrink-0 gap-2">
      <div className="flex items-center gap-3 flex-wrap min-w-0">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground font-mono truncate">{job.job_number}</p>
          <h2 className="font-semibold text-sm truncate">{job.job_name}</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <Select value={serviceCategory} onValueChange={setServiceCategory}>
            <SelectTrigger className={`h-9 text-xs w-36 sm:w-44 touch-target ${!serviceCategory ? "border-amber-400 bg-amber-50" : ""}`}>
              <SelectValue placeholder="Category…" />
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
      <div className="flex items-center gap-1.5 flex-wrap">
          {/* Editor view toggle */}
          <div className="flex items-center border rounded-md overflow-hidden h-8">
            <button
              className={`px-2 sm:px-2.5 h-full text-xs flex items-center gap-1 transition-colors touch-target ${editorView === "summary" ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:bg-muted"}`}
              onClick={() => setEditorView("summary")}
            >
              <AlignJustify className="w-3 h-3" /> <span className="hidden sm:inline">Summary</span>
            </button>
            <button
              className={`px-2 sm:px-2.5 h-full text-xs flex items-center gap-1 transition-colors touch-target ${editorView === "detail" ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:bg-muted"}`}
              onClick={() => setEditorView("detail")}
            >
              <LayoutList className="w-3 h-3" /> <span className="hidden sm:inline">Detail</span>
            </button>
          </div>
          {/* Customer-facing view mode */}
          <button
            onClick={() => setViewMode(v => v === "summary" ? "detail" : "summary")}
            className="h-8 px-2 sm:px-2.5 text-xs border rounded-md flex items-center gap-1.5 hover:bg-muted transition-colors text-muted-foreground touch-target"
            title="Toggle what the customer sees"
          >
            <span className="text-[10px] uppercase tracking-wide font-medium opacity-60">Cust:</span>
            <span className="font-semibold text-foreground">{viewMode === "summary" ? "Sum" : "Det"}</span>
          </button>
          {isLocked && estimate?.id ? (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-700">
              <Lock className="w-3 h-3" />
              <span className="text-xs font-semibold">Locked</span>
            </div>
          ) : (
            <Select value={status} onValueChange={(v) => { setStatus(v); if (v !== "Approved") setApprovalMethod(""); }}>
              <SelectTrigger className="h-8 text-xs w-24 touch-target"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Draft", "Sent", "Approved", "Rejected"].map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending} className="touch-target">
            {save.isPending ? "Saving…" : isNew ? "Create" : "Save"}
          </Button>
          {!isNew && status === "Approved" && onCreateDepositInvoice && (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 touch-target"
              onClick={() => onCreateDepositInvoice({ lines, total, markup, overhead, tax, notes })}
            >
              <FileText className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Create Deposit Invoice</span><span className="sm:hidden">Deposit</span>
            </Button>
          )}
          {onClose && (
            <Button size="sm" variant="outline" onClick={onClose} className="touch-target">Close</Button>
          )}
        </div>
      </div>

      <div className="flex-1">
        {/* Internal approval audit — shown when manually setting to Approved */}
        {status === "Approved" && !estimate?.approved_at && (
          <div className="mx-5 mt-4 p-4 rounded-lg border border-emerald-200 bg-emerald-50 space-y-3">
            <p className="text-sm font-semibold text-emerald-800">Internal Approval Override</p>
            <div className="space-y-1.5">
              <Label className="text-xs text-emerald-700">How was this approved? <span className="text-red-500">*</span></Label>
              <Select value={approvalMethod} onValueChange={setApprovalMethod}>
                <SelectTrigger className="h-8 text-xs bg-white border-emerald-300">
                  <SelectValue placeholder="Select approval method…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Customer Signed">Customer Signed</SelectItem>
                  <SelectItem value="Verbal Approval">Verbal Approval</SelectItem>
                  <SelectItem value="Email Approval">Email Approval</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-emerald-600">
              Will be recorded as approved by <span className="font-semibold">{actorName}</span> at {new Date().toLocaleString()}.
            </p>
          </div>
        )}

        {/* Approval audit trail — shown when already approved */}
        {estimate?.approved_at && estimate?.status === "Approved" && (
          <div className="mx-5 mt-4 p-3 rounded-lg border border-emerald-200 bg-emerald-50 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-800 space-y-0.5">
              <p className="font-semibold">Approved — Locked</p>
              {estimate.approval_method && <p>Method: {estimate.approval_method}</p>}
              {estimate.approved_by_name && <p>Approved by: {estimate.approved_by_name}</p>}
              {estimate.customer_printed_name && <p>Customer signature: {estimate.customer_printed_name}</p>}
              <p>{new Date(estimate.approved_at).toLocaleString()}</p>
            </div>
          </div>
        )}

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
            {isLocked && estimate?.id ? (
              <div className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded">
                <Lock className="w-3 h-3" /> Locked — use Change Orders to modify
              </div>
            ) : (
              <Button size="sm" variant="outline" className="gap-1 h-8 text-xs" onClick={addLine}>
                <Plus className="w-3.5 h-3.5" /> Add Line
              </Button>
            )}
          </div>

          {editorView === "detail" ? (
            <>
              {/* Desktop: grid layout */}
              <div className="hidden md:block overflow-x-auto -mx-1 px-1">
              <div style={{ minWidth: 640 }}>
              <div className="grid grid-cols-[2fr_1.5fr_1fr_0.7fr_1fr_1fr_auto] gap-1.5 text-xs text-muted-foreground font-medium mb-1.5 px-1">
                 <span>Description</span>
                 <span>Install Location</span>
                 <span>Color</span>
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
                         disabled={isLocked && !!estimate?.id}
                       />
                       <Select value={line.install_location || "N/A"} onValueChange={v => updateLine(idx, "install_location", v)} disabled={isLocked && !!estimate?.id}>
                         <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                         <SelectContent>{INSTALL_LOCATIONS.map(l => <SelectItem key={l} value={l} className="text-xs">{l}</SelectItem>)}</SelectContent>
                       </Select>
                       <Select value={line.color || "__none__"} onValueChange={v => updateLine(idx, "color", v === "__none__" ? "" : v)} disabled={isLocked && !!estimate?.id}>
                         <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                         <SelectContent>
                           <SelectItem value="__none__" className="text-xs">None</SelectItem>
                           {powdercoatColors.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                         </SelectContent>
                       </Select>
                       <Input
                         className="h-8 text-xs"
                         type="number"
                         value={line.quantity}
                        onChange={e => updateLine(idx, "quantity", e.target.value)}
                        disabled={isLocked && !!estimate?.id}
                      />
                      <Input
                        className="h-8 text-xs"
                        type="number"
                        placeholder="0.00"
                        value={line.unit_cost}
                        onChange={e => updateLine(idx, "unit_cost", e.target.value)}
                        disabled={isLocked && !!estimate?.id}
                      />
                      <span className="text-sm font-semibold text-right pr-1">
                        ${(line.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      {!(isLocked && !!estimate?.id) && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeLine(idx)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {(isLocked && !!estimate?.id) && <span className="w-7" />}
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
                    <LineItemCostBreakdown line={line} onMarkupChange={v => updateLine(idx, "_markup_multiplier", v)} disabled={isLocked && !!estimate?.id} />
                  </div>
                ))}
              </div>
              </div>{/* minWidth wrapper */}
              </div>{/* overflow-x-auto */}

              {/* Mobile: card layout */}
              <div className="md:hidden space-y-3">
                {lines.map((line, idx) => (
                  <div key={line._id} className="bg-card rounded-xl border p-3 space-y-2.5">
                    <div>
                      <Label className="text-[10px] uppercase text-muted-foreground tracking-wider">Description</Label>
                      <Input
                        className="h-9 text-sm mt-0.5"
                        placeholder="Description"
                        value={line.description}
                        onChange={e => updateLine(idx, "description", e.target.value)}
                        disabled={isLocked && !!estimate?.id}
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase text-muted-foreground tracking-wider">Install Location</Label>
                      <Select value={line.install_location || "N/A"} onValueChange={v => updateLine(idx, "install_location", v)} disabled={isLocked && !!estimate?.id}>
                        <SelectTrigger className="h-9 text-sm w-full mt-0.5"><SelectValue /></SelectTrigger>
                        <SelectContent>{INSTALL_LOCATIONS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase text-muted-foreground tracking-wider">Color</Label>
                      <Select value={line.color || "__none__"} onValueChange={v => updateLine(idx, "color", v === "__none__" ? "" : v)} disabled={isLocked && !!estimate?.id}>
                        <SelectTrigger className="h-9 text-sm w-full mt-0.5"><SelectValue placeholder="None" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {powdercoatColors.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px] uppercase text-muted-foreground tracking-wider">Qty</Label>
                        <Input
                          className="h-9 text-sm mt-0.5"
                          type="number"
                          value={line.quantity}
                          onChange={e => updateLine(idx, "quantity", e.target.value)}
                          disabled={isLocked && !!estimate?.id}
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] uppercase text-muted-foreground tracking-wider">Unit Cost</Label>
                        <Input
                          className="h-9 text-sm mt-0.5"
                          type="number"
                          placeholder="0.00"
                          value={line.unit_cost}
                          onChange={e => updateLine(idx, "unit_cost", e.target.value)}
                          disabled={isLocked && !!estimate?.id}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t">
                      <div>
                        <Label className="text-[10px] uppercase text-muted-foreground tracking-wider">Amount</Label>
                        <p className="text-base font-bold mt-0.5">
                          ${(line.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      {!(isLocked && !!estimate?.id) && (
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-destructive touch-target" onClick={() => removeLine(idx)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    {line.photo_url && (
                      <div className="flex items-center gap-2">
                        <img src={line.photo_url} alt="" className="h-12 w-20 object-cover rounded border" />
                        <button
                          className={`flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors ${line.show_photo !== false ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border"}`}
                          onClick={() => updateLine(idx, "show_photo", line.show_photo === false)}
                        >
                          {line.show_photo !== false ? <Image className="w-3 h-3" /> : <ImageOff className="w-3 h-3" />}
                          {line.show_photo !== false ? "Show photo" : "Hide photo"}
                        </button>
                      </div>
                    )}
                    <LineItemCostBreakdown line={line} onMarkupChange={v => updateLine(idx, "_markup_multiplier", v)} disabled={isLocked && !!estimate?.id} />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Summary header */}
              <div className="grid gap-1.5 text-xs text-muted-foreground font-medium mb-1.5 px-1" style={{ gridTemplateColumns: "2fr 0.6fr 1.5fr 1fr 1fr auto" }}>
                 <span>Description</span>
                 <span className="text-right">Qty</span>
                 <span>Install Location</span>
                 <span>Color</span>
                 <span className="text-right">Amount</span>
                 <span></span>
               </div>
              <div className="space-y-1">
                {lines.map((line, idx) => (
                  <div
                    key={line._id}
                    className="grid gap-1.5 items-center py-2 px-1 rounded hover:bg-muted/50 cursor-pointer group"
                     style={{ gridTemplateColumns: "2fr 0.6fr 1.5fr 1fr 1fr auto" }}
                     onClick={() => setEditorView("detail")}
                     title="Click to switch to Detail view and edit"
                    >
                     <span className="text-sm truncate">{line.description || <span className="text-muted-foreground italic">No description</span>}</span>
                     <span className="text-sm text-muted-foreground text-right">{line.quantity}</span>
                     <span className="text-xs text-muted-foreground truncate">{line.install_location !== "N/A" ? line.install_location : "—"}</span>
                     <span className="text-xs text-muted-foreground truncate">{line.color || "—"}</span>
                     <span className="text-sm font-semibold text-right">
                      ${(line.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    {!(isLocked && !!estimate?.id) && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100" onClick={e => { e.stopPropagation(); removeLine(idx); }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {(isLocked && !!estimate?.id) && <span className="w-7" />}
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

      <AddLineItemWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onAdd={handleWizardAdd}
      />
    </div>
  );
}