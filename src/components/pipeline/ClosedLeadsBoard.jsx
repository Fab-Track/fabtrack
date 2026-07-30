import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, X, XCircle, RotateCcw } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { OUTCOME_REASONS } from "@/components/jobs/CloseLeadModal";
import { SALES_STAGES } from "@/lib/pipelineHelpers";

const CATEGORY_COLORS = {
  Won:        "bg-emerald-100 text-emerald-800 border-emerald-200",
  Lost:       "bg-red-100 text-red-800 border-red-200",
  Unqualified:"bg-slate-100 text-slate-700 border-slate-200",
  "On Hold":  "bg-amber-100 text-amber-800 border-amber-200",
  Testing:    "bg-blue-100 text-blue-800 border-blue-200",
  Other:      "bg-muted text-muted-foreground border-border",
};

// Build a flat lookup of reason id → label
const REASON_LABELS = Object.entries(OUTCOME_REASONS).reduce((acc, [_, reasons]) => {
  reasons.forEach(r => { acc[r.id] = r.label; });
  return acc;
}, {});

export default function ClosedLeadsBoard({ jobs = [] }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const reopenMutation = useMutation({
    mutationFn: (job) => {
      const now = new Date().toISOString();
      // Keep the existing stage if it's already a valid Sales stage; otherwise reset to "New Lead"
      const keepStage = job.stage && SALES_STAGES.includes(job.stage);
      const update = {
        is_lead_closed: false,
        pipeline_board: "Sales",
        stage: keepStage ? job.stage : "New Lead",
        stage_entered_at: now,
        last_activity_date: now,
        lead_closed_at: null,
      };
      return base44.entities.Job.update(job.id, update);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Lead reopened — moved back to Sales Pipeline.");
    },
    onError: () => toast.error("Could not reopen this lead. Try again."),
  });

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const sorted = [...jobs].sort((a, b) => {
      const da = a.lead_closed_at ? parseISO(a.lead_closed_at).getTime() : 0;
      const db = b.lead_closed_at ? parseISO(b.lead_closed_at).getTime() : 0;
      return db - da;
    });
    if (!query) return sorted;
    return sorted.filter(j =>
      (j.job_number || "").toLowerCase().includes(query) ||
      (j.customer_name || "").toLowerCase().includes(query) ||
      (j.job_name || "").toLowerCase().includes(query) ||
      (j.lead_outcome || "").toLowerCase().includes(query) ||
      (j.lead_close_reason || "").toLowerCase().includes(query)
    );
  }, [jobs, q]);

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Search closed leads…"
            value={q}
            onChange={e => setQ(e.target.value)}
            className="h-9 pl-8 pr-8 text-sm"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {filtered.length} closed {filtered.length === 1 ? "lead" : "leads"}
        </span>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <XCircle className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {q ? "No closed leads match your search." : "No closed leads yet."}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto border rounded-lg">
          <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-muted/40 border-b text-xs font-medium text-muted-foreground sticky top-0">
            <span className="col-span-2">Job #</span>
            <span className="col-span-2">Job Name</span>
            <span className="col-span-2">Customer</span>
            <span className="col-span-2">Outcome</span>
            <span className="col-span-1">Reason</span>
            <span className="col-span-2">Closed</span>
            <span className="col-span-1"></span>
          </div>
          {filtered.map(job => {
            const closedDate = job.lead_closed_at && isValid(parseISO(job.lead_closed_at))
              ? format(parseISO(job.lead_closed_at), "MMM d, yyyy")
              : "—";
            const reasonLabel = job.is_lead_closed === false ? null : (REASON_LABELS[job.lead_close_reason] || job.lead_outcome || "—");
            return (
              <div
                key={job.id}
                className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b last:border-0 items-center text-sm bg-card hover:bg-muted/20 transition-colors cursor-pointer"
                onClick={() => navigate(`/jobs/${job.id}?board=Sales`)}
              >
                <span className="col-span-2 font-mono text-xs text-muted-foreground truncate">{job.job_number || "—"}</span>
                <span className="col-span-2 font-medium truncate">{job.job_name || "—"}</span>
                <span className="col-span-2 text-muted-foreground truncate">{job.customer_name || "—"}</span>
                <span className="col-span-2">
                  {job.lead_outcome_category && (
                    <Badge variant="outline" className={`text-[10px] ${CATEGORY_COLORS[job.lead_outcome_category] || CATEGORY_COLORS.Other}`}>
                      {job.lead_outcome_category}
                    </Badge>
                  )}
                </span>
                <span className="col-span-1 text-xs text-muted-foreground truncate" title={reasonLabel}>
                  {reasonLabel}
                </span>
                <span className="col-span-2 text-xs text-muted-foreground">{closedDate}</span>
                <span className="col-span-1 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    disabled={reopenMutation.isPending}
                    onClick={(e) => {
                      e.stopPropagation();
                      reopenMutation.mutate(job);
                    }}
                    title="Reopen this lead back into the Sales Pipeline"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reopen
                  </Button>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}