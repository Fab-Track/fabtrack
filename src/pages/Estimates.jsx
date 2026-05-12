import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent,
} from "@/components/ui/dialog";
import { FileText, Plus, ChevronRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import EstimateEditor from "@/components/estimates/EstimateEditor";

const STATUS_STYLES = {
  Draft: "bg-muted text-muted-foreground",
  Sent: "bg-blue-100 text-blue-800",
  Approved: "bg-emerald-100 text-emerald-800",
  Rejected: "bg-red-100 text-red-800",
};

export default function Estimates() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [editorOpen, setEditorOpen] = useState(false);
  const [activeEstimate, setActiveEstimate] = useState(null);
  const [activeJob, setActiveJob] = useState(null);
  const [newJobSearch, setNewJobSearch] = useState("");
  const [pickJobOpen, setPickJobOpen] = useState(false);

  const { data: estimates = [], isLoading } = useQuery({
    queryKey: ["estimates"],
    queryFn: () => base44.entities.Estimate.list("-created_date", 200),
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs-for-estimate"],
    queryFn: () => base44.entities.Job.list("-created_date", 200),
  });

  function openEditor(est, job) {
    setActiveEstimate(est);
    setActiveJob(job);
    setEditorOpen(true);
  }

  function openNew() {
    setPickJobOpen(true);
  }

  const filteredEstimates = estimates.filter(e => {
    const matchStatus = statusFilter === "All" || e.status === statusFilter;
    const matchSearch = !search || e.job_number?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const filteredJobs = jobs.filter(j =>
    !newJobSearch ||
    j.job_name?.toLowerCase().includes(newJobSearch.toLowerCase()) ||
    j.job_number?.toLowerCase().includes(newJobSearch.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Estimates</h1>
          <p className="text-sm text-muted-foreground">{estimates.length} estimates</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" /> New Estimate</Button>
      </div>

      <div className="flex gap-3 mb-4">
        <Input placeholder="Search by job #…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["All", "Draft", "Sent", "Approved", "Rejected"].map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
      ) : filteredEstimates.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No estimates yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredEstimates.map(est => {
            const job = jobs.find(j => j.id === est.job_id) || { job_number: est.job_number, job_name: "—", id: est.job_id };
            return (
              <Card
                key={est.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => openEditor(est, job)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <FileText className="w-8 h-8 text-muted-foreground/40 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-mono text-muted-foreground">{est.job_number}</span>
                        <Badge className={`text-xs ${STATUS_STYLES[est.status] || ''}`}>{est.status}</Badge>
                      </div>
                      <p className="font-medium text-sm">{job.job_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {est.line_items?.length || 0} line items
                        {est.markup_percent ? ` · ${est.markup_percent}% markup` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-lg font-bold">${(est.total || 0).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        {est.created_date && format(parseISO(est.created_date), "MMM d, yyyy")}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Job picker for new estimate */}
      <Dialog open={pickJobOpen} onOpenChange={setPickJobOpen}>
        <DialogContent className="max-w-md">
          <h2 className="font-semibold mb-3">Select a Job</h2>
          <Input
            placeholder="Search jobs…"
            value={newJobSearch}
            onChange={e => setNewJobSearch(e.target.value)}
            className="mb-3"
          />
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {filteredJobs.map(j => (
              <button
                key={j.id}
                className="w-full text-left px-3 py-2 rounded-lg border hover:bg-muted transition-colors"
                onClick={() => { setPickJobOpen(false); openEditor(null, j); }}
              >
                <p className="text-sm font-medium">{j.job_name}</p>
                <p className="text-xs text-muted-foreground font-mono">{j.job_number}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Full-screen editor */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-5xl h-[90vh] p-0 flex flex-col overflow-hidden">
          {activeJob && (
            <EstimateEditor
              estimate={activeEstimate}
              job={activeJob}
              onClose={() => setEditorOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}