import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, addDays } from "date-fns";
import { Calendar as CalendarIcon, Plus, Trash2, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { SALES_STAGES, LOST_REASONS } from "@/lib/salesPipeline";

// Built-in outcome categories — Won, Lost, Nurture are the core Sales exit states
const BUILTIN_OUTCOMES = ["Won", "Lost", "Nurture", "Unqualified", "On Hold", "Testing", "Other"];

export const OUTCOME_REASONS = {
  Won: [
    { id: "won_deposit", label: "Won — Deposit Received" },
  ],
  Lost: LOST_REASONS.map(reason => ({ id: `lost_${reason.toLowerCase().replace(/[^a-z]/g, "_")}`, label: reason })),
  Nurture: [
    { id: "nurture_follow_up", label: "Revisit at Later Date" },
  ],
  Unqualified: [
    { id: "unq_area", label: "Unqualified — Out of Service Area" },
    { id: "unq_fit", label: "Unqualified — Not a Fit" },
  ],
  "On Hold": [
    { id: "hold_follow_up", label: "Not Ready — Follow Up Later" },
    { id: "hold_no_follow_up", label: "Not Ready — Do Not Follow Up" },
  ],
  Testing: [
    { id: "testing_general", label: "Testing — General" },
  ],
  Other: [
    { id: "other_none", label: "No Reason Given / Other" },
  ],
};

const IS_FREE_TEXT_OUTCOME = (cat) => cat === "Other";

export default function CloseLeadModal({ open, onClose, job }) {
  const [outcomeCategory, setOutcomeCategory] = useState("");
  const [reasonId, setReasonId] = useState("");
  const [lostTo, setLostTo] = useState("");
  const [notes, setNotes] = useState("");
  const [otherReasonText, setOtherReasonText] = useState("");
  const [followUpDate, setFollowUpDate] = useState(null);
  const [showAddReason, setShowAddReason] = useState(false);
  const [newReasonText, setNewReasonText] = useState("");
  const [reasonPopoverOpen, setReasonPopoverOpen] = useState(false);
  const [outcomePopoverOpen, setOutcomePopoverOpen] = useState(false);
  const [showAddOutcome, setShowAddOutcome] = useState(false);
  const [newOutcomeText, setNewOutcomeText] = useState("");
  const qc = useQueryClient();

  // Fetch platform-wide custom reasons
  const { data: customReasons = [] } = useQuery({
    queryKey: ["lead-close-reasons"],
    queryFn: () => base44.entities.LeadCloseReason.list("-created_date", 200),
  });

  // Merge built-in + custom outcome categories
  const allOutcomes = useMemo(() => {
    const customOutcomes = customReasons
      .filter(r => r.is_custom_outcome)
      .map(r => ({ id: `custom_outcome_${r.id}`, label: r.outcome_category, isCustom: true }));
    return [...BUILTIN_OUTCOMES.map(c => ({ id: c, label: c })), ...customOutcomes];
  }, [customReasons]);

  // Merge built-in + custom reasons for the selected outcome category
  const reasons = useMemo(() => {
    if (!outcomeCategory) return [];
    const builtIn = OUTCOME_REASONS[outcomeCategory] || [];
    const custom = customReasons
      .filter(r => !r.is_custom_outcome && r.outcome_category === outcomeCategory)
      .map(r => ({ id: `custom_${r.id}`, label: r.reason_label, isCustom: true }));
    return [...builtIn, ...custom];
  }, [outcomeCategory, customReasons]);

  // Nurture requires a revisit date; Lost requires a reason
  const requiresFollowUp = outcomeCategory === "Nurture" || reasonId === "hold_follow_up";
  const isFreeText = IS_FREE_TEXT_OUTCOME(outcomeCategory);
  const isLost = outcomeCategory === "Lost";

  const addReasonMutation = useMutation({
    mutationFn: (data) => base44.entities.LeadCloseReason.create(data),
    onSuccess: (newReason) => {
      qc.invalidateQueries({ queryKey: ["lead-close-reasons"] });
      if (newReason.is_custom_outcome) {
        setOutcomeCategory(newReason.outcome_category);
        setReasonId("");
        setShowAddOutcome(false);
        setNewOutcomeText("");
        setOutcomePopoverOpen(false);
      } else {
        setReasonId(`custom_${newReason.id}`);
        setShowAddReason(false);
        setNewReasonText("");
      }
    },
  });

  const addOutcomeMutation = useMutation({
    mutationFn: (label) => base44.entities.LeadCloseReason.create({
      outcome_category: label,
      reason_label: label,
      is_custom_outcome: true,
    }),
    onSuccess: (newReason) => {
      qc.invalidateQueries({ queryKey: ["lead-close-reasons"] });
      setOutcomeCategory(newReason.outcome_category);
      setReasonId("");
      setShowAddOutcome(false);
      setNewOutcomeText("");
      setOutcomePopoverOpen(false);
    },
  });

  const deleteOutcomeMutation = useMutation({
    mutationFn: (id) => base44.entities.LeadCloseReason.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-close-reasons"] });
    },
  });

  const deleteReasonMutation = useMutation({
    mutationFn: (id) => base44.entities.LeadCloseReason.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-close-reasons"] });
    },
  });

  const closeMutation = useMutation({
    mutationFn: () => {
      const reason = reasons.find(r => r.id === reasonId);
      const isWon = outcomeCategory === "Won";
      const isNurture = outcomeCategory === "Nurture";
      const update = {
        lead_outcome: isFreeText ? (otherReasonText || outcomeCategory) : (reason?.label || outcomeCategory),
        lead_outcome_category: outcomeCategory,
        lead_close_reason: isFreeText ? "other_custom" : reasonId,
        lead_lost_to: isLost && reasonId?.includes("competitor") ? (lostTo || null) : null,
        lead_closed_at: new Date().toISOString(),
        is_lead_closed: !isWon, // Won stays open on Sales board; everything else closes
        close_notes: notes || null,
      };
      if (isWon) {
        // Won → auto-create Shop job (handled by SalesBoard onDragEnd)
        // Here we just set the stage to Won
        update.stage = "Won";
        update.pipeline_board = "Sales";
        update.stage_entered_at = new Date().toISOString();
      }
      if (requiresFollowUp && followUpDate) {
        update.follow_up_date = format(followUpDate, "yyyy-MM-dd");
        update.follow_up_notified = false;
      } else if (!isNurture) {
        update.follow_up_date = null;
        update.follow_up_notified = false;
      }
      return base44.entities.Job.update(job.id, update);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      handleClose();
    },
  });

  function handleClose() {
    setOutcomeCategory("");
    setReasonId("");
    setLostTo("");
    setNotes("");
    setOtherReasonText("");
    setFollowUpDate(null);
    setShowAddReason(false);
    setNewReasonText("");
    setReasonPopoverOpen(false);
    setOutcomePopoverOpen(false);
    setShowAddOutcome(false);
    setNewOutcomeText("");
    onClose();
  }

  const showLostTo = isLost && reasonId?.includes("competitor");
  const isValid = outcomeCategory && (
    isFreeText
      ? otherReasonText.trim().length > 0
      : (reasonId || isLost) && (!requiresFollowUp || (requiresFollowUp && followUpDate))
  );

  function handleAddReason() {
    if (!newReasonText.trim() || !outcomeCategory) return;
    addReasonMutation.mutate({
      outcome_category: outcomeCategory,
      reason_label: newReasonText.trim(),
    });
  }

  function handleAddOutcome() {
    if (!newOutcomeText.trim()) return;
    addOutcomeMutation.mutate(newOutcomeText.trim());
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Close Lead</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            <strong>{job?.job_name}</strong> —{" "}
            {outcomeCategory === "Won"
              ? "it will move to Won and auto-create a Shop Pipeline job."
              : outcomeCategory === "Nurture"
              ? "it will be parked with a revisit date and resurface on that date."
              : "record why this lead is closing. It will be archived off the active board."}
          </p>

          {/* Step 1: Outcome Category */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Outcome</Label>
            <Popover open={outcomePopoverOpen} onOpenChange={(o) => { setOutcomePopoverOpen(o); if (!o) setShowAddOutcome(false); }}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between font-normal text-sm">
                  {outcomeCategory || "Select outcome…"}
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0" align="start" style={{ width: "var(--radix-popover-trigger-width)" }}>
                <div className="max-h-60 overflow-y-auto p-1">
                  {allOutcomes.map(o => (
                    <div key={o.id} className="flex items-center group rounded-sm hover:bg-accent">
                      <button
                        type="button"
                        onClick={() => { setOutcomeCategory(o.label); setReasonId(""); setFollowUpDate(null); setShowAddReason(false); setOutcomePopoverOpen(false); }}
                        className="flex-1 flex items-center px-2 py-1.5 text-sm text-left"
                      >
                        <Check className={cn("mr-2 h-4 w-4 shrink-0", outcomeCategory === o.label ? "opacity-100" : "opacity-0")} />
                        {o.label}
                      </button>
                      {o.isCustom && (
                        <button
                          type="button"
                          onClick={() => {
                            deleteOutcomeMutation.mutate(o.id.replace("custom_outcome_", ""));
                            if (outcomeCategory === o.label) { setOutcomeCategory(""); setReasonId(""); }
                          }}
                          className="p-1.5 mr-1 text-muted-foreground hover:text-destructive"
                          title="Delete outcome"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="border-t p-2">
                  {showAddOutcome ? (
                    <div className="flex gap-2">
                      <Input
                        value={newOutcomeText}
                        onChange={e => setNewOutcomeText(e.target.value)}
                        placeholder="Enter new outcome…"
                        className="h-8 text-sm"
                        autoFocus
                        onKeyDown={e => { if (e.key === "Enter" && newOutcomeText.trim()) handleAddOutcome(); }}
                      />
                      <Button size="sm" onClick={handleAddOutcome} disabled={!newOutcomeText.trim() || addOutcomeMutation.isPending}>
                        {addOutcomeMutation.isPending ? "Saving…" : "Add"}
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAddOutcome(true)}
                      className="flex items-center gap-1 text-xs text-primary hover:underline w-full"
                    >
                      <Plus className="h-3 w-3" /> Add new outcome
                    </button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Step 2: Specific Reason — free-text for "Other", dropdown otherwise */}
          {isFreeText ? (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Reason <span className="text-destructive">*</span></Label>
              <Textarea
                value={otherReasonText}
                onChange={e => setOtherReasonText(e.target.value)}
                placeholder="Any additional context about why this lead closed…"
                className="text-sm h-20 resize-none"
              />
            </div>
          ) : reasons.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Reason {isLost && <span className="text-destructive">*</span>}</Label>
              <Popover open={reasonPopoverOpen} onOpenChange={(o) => { setReasonPopoverOpen(o); if (!o) setShowAddReason(false); }}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between font-normal text-sm">
                    {reasonId ? reasons.find(r => r.id === reasonId)?.label : "Select reason…"}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0" align="start" style={{ width: "var(--radix-popover-trigger-width)" }}>
                  <div className="max-h-60 overflow-y-auto p-1">
                    {reasons.map(r => (
                      <div key={r.id} className="flex items-center group rounded-sm hover:bg-accent">
                        <button
                          type="button"
                          onClick={() => { setReasonId(r.id); if (r.id !== "hold_follow_up" && outcomeCategory !== "Nurture") setFollowUpDate(null); setReasonPopoverOpen(false); }}
                          className="flex-1 flex items-center px-2 py-1.5 text-sm text-left"
                        >
                          <Check className={cn("mr-2 h-4 w-4 shrink-0", reasonId === r.id ? "opacity-100" : "opacity-0")} />
                          {r.label}
                        </button>
                        {r.isCustom && (
                          <button
                            type="button"
                            onClick={() => {
                              deleteReasonMutation.mutate(r.id.replace("custom_", ""));
                              if (reasonId === r.id) setReasonId("");
                            }}
                            className="p-1.5 mr-1 text-muted-foreground hover:text-destructive"
                            title="Delete reason"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="border-t p-2">
                    {showAddReason ? (
                      <div className="flex gap-2">
                        <Input
                          value={newReasonText}
                          onChange={e => setNewReasonText(e.target.value)}
                          placeholder="Enter new reason…"
                          className="h-8 text-sm"
                          autoFocus
                          onKeyDown={e => { if (e.key === "Enter" && newReasonText.trim()) handleAddReason(); }}
                        />
                        <Button size="sm" onClick={handleAddReason} disabled={!newReasonText.trim() || addReasonMutation.isPending}>
                          {addReasonMutation.isPending ? "Saving…" : "Add"}
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowAddReason(true)}
                        className="flex items-center gap-1 text-xs text-primary hover:underline w-full"
                      >
                        <Plus className="h-3 w-3" /> Add new reason
                      </button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Lost To (competitor name) */}
          {showLostTo && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Lost To</Label>
              <Input
                value={lostTo}
                onChange={e => setLostTo(e.target.value)}
                placeholder="Competitor name or alternative…"
                className="text-sm"
              />
            </div>
          )}

          {/* Revisit Date (required for Nurture) */}
          {requiresFollowUp && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                {outcomeCategory === "Nurture" ? "Revisit Date" : "Follow-Up Date"} <span className="text-destructive">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={`w-full justify-start text-left font-normal text-sm ${!followUpDate ? "text-muted-foreground" : ""}`}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {followUpDate ? format(followUpDate, "PPP") : "Pick a date…"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={followUpDate}
                    onSelect={setFollowUpDate}
                    disabled={(date) => date < addDays(new Date(), 1)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <p className="text-[10px] text-muted-foreground">
                {outcomeCategory === "Nurture"
                  ? "The card will resurface on the Sales board on this date."
                  : "A reminder notification will be sent on this date so you can follow up with the client."}
              </p>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any additional context about why this lead closed…"
              className="text-sm h-20 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={handleClose}>Cancel</Button>
            <Button
              size="sm"
              disabled={!isValid || closeMutation.isPending}
              onClick={() => closeMutation.mutate()}
            >
              {closeMutation.isPending ? "Closing…" : "Close Lead"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}