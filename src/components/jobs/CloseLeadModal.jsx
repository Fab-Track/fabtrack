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
import { Calendar as CalendarIcon, Plus } from "lucide-react";

export const OUTCOME_REASONS = {
  Won: [
    { id: "won_deposit", label: "Won — Deposit Received" },
  ],
  Lost: [
    { id: "lost_price_expensive", label: "Price — Too Expensive" },
    { id: "lost_price_competitor", label: "Price — Lost to Competitor" },
    { id: "lost_dark", label: "Non-Responsive / Went Dark" },
    { id: "lost_diy", label: "Chose to DIY / In-House" },
    { id: "lost_cancelled", label: "Project Cancelled / Fell Through" },
    { id: "lost_lead_time", label: "Too Short of Lead Time" },
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
const OUTCOME_CATEGORIES = Object.keys(OUTCOME_REASONS);

export default function CloseLeadModal({ open, onClose, job }) {
  const [outcomeCategory, setOutcomeCategory] = useState("");
  const [reasonId, setReasonId] = useState("");
  const [lostTo, setLostTo] = useState("");
  const [notes, setNotes] = useState("");
  const [otherReasonText, setOtherReasonText] = useState("");
  const [followUpDate, setFollowUpDate] = useState(null);
  const [leadTimeWeeks, setLeadTimeWeeks] = useState("");
  const [showAddReason, setShowAddReason] = useState(false);
  const [newReasonText, setNewReasonText] = useState("");
  const qc = useQueryClient();

  // Fetch platform-wide custom reasons
  const { data: customReasons = [] } = useQuery({
    queryKey: ["lead-close-reasons"],
    queryFn: () => base44.entities.LeadCloseReason.list("-created_date", 200),
  });

  // Merge built-in + custom reasons for the selected outcome category
  const reasons = useMemo(() => {
    if (!outcomeCategory) return [];
    const builtIn = OUTCOME_REASONS[outcomeCategory] || [];
    const custom = customReasons
      .filter(r => r.outcome_category === outcomeCategory)
      .map(r => ({ id: `custom_${r.id}`, label: r.reason_label, isCustom: true }));
    return [...builtIn, ...custom];
  }, [outcomeCategory, customReasons]);

  const requiresFollowUp = reasonId === "hold_follow_up";
  const requiresLeadTime = reasonId === "lost_lead_time";
  const isFreeText = IS_FREE_TEXT_OUTCOME(outcomeCategory);

  const addReasonMutation = useMutation({
    mutationFn: (data) => base44.entities.LeadCloseReason.create(data),
    onSuccess: (newReason) => {
      qc.invalidateQueries({ queryKey: ["lead-close-reasons"] });
      setReasonId(`custom_${newReason.id}`);
      setShowAddReason(false);
      setNewReasonText("");
    },
  });

  const closeMutation = useMutation({
    mutationFn: () => {
      const reason = reasons.find(r => r.id === reasonId);
      const isWon = outcomeCategory === "Won";
      const leadTimeNote = requiresLeadTime && leadTimeWeeks ? `Needed lead time: ${leadTimeWeeks} weeks` : "";
      const combinedNotes = [leadTimeNote, notes].filter(Boolean).join("\n");
      const update = {
        lead_outcome: isFreeText ? (otherReasonText || outcomeCategory) : (reason?.label || outcomeCategory),
        lead_outcome_category: outcomeCategory,
        lead_close_reason: isFreeText ? "other_custom" : reasonId,
        lead_lost_to: ["lost_price_competitor", "lost_price_expensive"].includes(reasonId) ? (lostTo || null) : null,
        lead_closed_at: new Date().toISOString(),
        is_lead_closed: !isWon,
        close_notes: combinedNotes || null,
      };
      if (isWon) {
        update.stage = "Deposit Received / Sale Won";
        update.pipeline_board = "Sales";
        update.stage_entered_at = new Date().toISOString();
      }
      if (requiresFollowUp && followUpDate) {
        update.follow_up_date = format(followUpDate, "yyyy-MM-dd");
        update.follow_up_notified = false;
      } else {
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
    setLeadTimeWeeks("");
    setShowAddReason(false);
    setNewReasonText("");
    onClose();
  }

  const showLostTo = reasonId && ["lost_price_competitor", "lost_price_expensive"].includes(reasonId);
  const isValid = outcomeCategory && (
    isFreeText
      ? otherReasonText.trim().length > 0
      : (reasonId && (!requiresFollowUp || (requiresFollowUp && followUpDate)) && (!requiresLeadTime || (requiresLeadTime && leadTimeWeeks)))
  );

  function handleAddReason() {
    if (!newReasonText.trim() || !outcomeCategory) return;
    addReasonMutation.mutate({
      outcome_category: outcomeCategory,
      reason_label: newReasonText.trim(),
    });
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
              ? "it will move to Deposit Received / Sale Won."
              : "record why this lead is closing. It will be archived off the active board."}
          </p>

          {/* Step 1: Outcome Category */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Outcome</Label>
            <Select
              value={outcomeCategory}
              onValueChange={(v) => { setOutcomeCategory(v); setReasonId(""); setFollowUpDate(null); setShowAddReason(false); }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select outcome…" />
              </SelectTrigger>
              <SelectContent>
                {OUTCOME_CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              <Label className="text-xs font-semibold">Reason</Label>
              <Select value={reasonId} onValueChange={(v) => { setReasonId(v); if (v !== "hold_follow_up") setFollowUpDate(null); if (v !== "lost_lead_time") setLeadTimeWeeks(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason…" />
                </SelectTrigger>
                <SelectContent>
                  {reasons.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Add custom reason */}
              {showAddReason ? (
                <div className="flex gap-2">
                  <Input
                    value={newReasonText}
                    onChange={e => setNewReasonText(e.target.value)}
                    placeholder="Enter new reason…"
                    className="text-sm"
                    autoFocus
                    onKeyDown={e => { if (e.key === "Enter" && newReasonText.trim()) handleAddReason(); }}
                  />
                  <Button size="sm" onClick={handleAddReason} disabled={!newReasonText.trim() || addReasonMutation.isPending}>
                    {addReasonMutation.isPending ? "Saving…" : "Add"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowAddReason(false); setNewReasonText(""); }}>Cancel</Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAddReason(true)}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Plus className="h-3 w-3" /> Add new reason
                </button>
              )}
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

          {/* Needed Lead Time (dependent on lost_lead_time reason) */}
          {requiresLeadTime && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Needed Lead Time <span className="text-destructive">*</span></Label>
              <Select value={leadTimeWeeks} onValueChange={setLeadTimeWeeks}>
                <SelectTrigger>
                  <SelectValue placeholder="Select lead time…" />
                </SelectTrigger>
                <SelectContent>
                  {["3 weeks", "4 weeks", "5 weeks", "6 weeks"].map(lt => (
                    <SelectItem key={lt} value={lt.replace(" weeks", "")}>{lt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Follow-Up Date */}
          {requiresFollowUp && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Follow-Up Date <span className="text-destructive">*</span></Label>
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
              <p className="text-[10px] text-muted-foreground">A reminder notification will be sent on this date so you can follow up with the client.</p>
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