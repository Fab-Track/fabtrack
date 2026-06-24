import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useOrgFilter } from "@/lib/orgContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Download, AlertTriangle, CheckCircle2, Clock, Coffee } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

function formatHours(h) {
  if (!h && h !== 0) return "—";
  return `${Number(h).toFixed(2)}h`;
}
function formatBreak(mins) {
  if (!mins) return "0m";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
function getEntryStatus(e) {
  if (e.is_flagged && !e.is_resolved) return "Flagged";
  if (e.is_resolved) return "Admin Corrected";
  if (e.is_active) return "Active";
  if (e.clock_out) return "Complete";
  return "Incomplete";
}

export default function PayrollReport() {
  const orgFilter = useOrgFilter();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [resolvingEntry, setResolvingEntry] = useState(null);
  const [resolveClockOut, setResolveClockOut] = useState("");
  const [resolveNotes, setResolveNotes] = useState("");

  const { data: resp, isLoading } = useQuery({
    queryKey: ["payrollEntries", orgFilter],
    queryFn: () => base44.functions.invoke("getPayrollEntries", orgFilter),
    refetchInterval: 30000,
  });

  const entries = resp?.data?.entries || [];

  const employeeNames = useMemo(() => {
    const set = new Set(entries.map(e => e.employee_name).filter(Boolean));
    return [...set].sort();
  }, [entries]);

  const filtered = useMemo(() => {
    return entries.filter(e => {
      // Date range filter
      if (e.clock_in) {
        const d = parseISO(e.clock_in);
        if (isValid(d)) {
          if (dateFrom && d < parseISO(dateFrom + "T00:00:00")) return false;
          if (dateTo && d > parseISO(dateTo + "T23:59:59")) return false;
        }
      }
      // Employee filter
      if (employeeFilter !== "all" && e.employee_name !== employeeFilter) return false;
      return true;
    });
  }, [entries, dateFrom, dateTo, employeeFilter]);

  const resolveMutation = useMutation({
    mutationFn: () => base44.functions.invoke("resolveFlaggedEntry", {
      entry_id: resolvingEntry.id,
      clock_out: resolveClockOut,
      resolution_notes: resolveNotes,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payrollEntries"] });
      toast({ title: "Entry resolved", description: "The flagged entry has been corrected." });
      setResolvingEntry(null);
      setResolveClockOut("");
      setResolveNotes("");
    },
    onError: (err) => {
      toast({ title: "Error", description: err?.response?.data?.error || err?.message, variant: "destructive" });
    },
  });

  function openResolveDialog(entry) {
    setResolvingEntry(entry);
    // Pre-fill with the auto-flagged clock_out time
    if (entry.clock_out) {
      const d = new Date(entry.clock_out);
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
      setResolveClockOut(local.toISOString().slice(0, 16));
    }
    setResolveNotes("");
  }

  function exportCSV() {
    const rows = [["Employee", "Date", "Job / Task", "Clock In", "Clock Out", "Break Time", "Total Hours", "Status"]];
    filtered.forEach(e => {
      const ci = e.clock_in ? format(parseISO(e.clock_in), "MMM d, yyyy h:mm a") : "";
      const co = e.clock_out ? format(parseISO(e.clock_out), "MMM d, yyyy h:mm a") : "";
      const dateStr = e.clock_in ? format(parseISO(e.clock_in), "MMM d, yyyy") : "";
      const jobTask = [e.job_number, e.work_center].filter(Boolean).join(" — ");
      rows.push([
        e.employee_name || "",
        dateStr,
        jobTask,
        ci,
        co,
        formatBreak(e.break_minutes),
        formatHours(e.net_hours ?? e.duration_hours),
        getEntryStatus(e),
      ]);
    });
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll_report_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalHours = filtered.reduce((s, e) => s + (e.net_hours ?? e.duration_hours ?? 0), 0);
  const flaggedCount = filtered.filter(e => e.is_flagged && !e.is_resolved).length;

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="border rounded-lg p-3 bg-card">
          <p className="text-xs text-muted-foreground">Total Entries</p>
          <p className="text-xl font-bold">{filtered.length}</p>
        </div>
        <div className="border rounded-lg p-3 bg-card">
          <p className="text-xs text-muted-foreground">Total Hours</p>
          <p className="text-xl font-bold">{formatHours(totalHours)}</p>
        </div>
        <div className="border rounded-lg p-3 bg-card">
          <p className="text-xs text-muted-foreground">Employees</p>
          <p className="text-xl font-bold">{employeeNames.length}</p>
        </div>
        <div className={`border rounded-lg p-3 ${flaggedCount > 0 ? "bg-red-50 border-red-200" : "bg-card"}`}>
          <p className="text-xs text-muted-foreground">Flagged</p>
          <p className={`text-xl font-bold ${flaggedCount > 0 ? "text-red-600" : ""}`}>{flaggedCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Employee</Label>
          <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {employeeNames.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>No time entries found</p>
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-3 py-2 font-medium">Employee</th>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Job / Task</th>
                <th className="px-3 py-2 font-medium">Clock In</th>
                <th className="px-3 py-2 font-medium">Clock Out</th>
                <th className="px-3 py-2 font-medium">Break</th>
                <th className="px-3 py-2 font-medium">Hours</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(e => {
                const status = getEntryStatus(e);
                const isFlagged = e.is_flagged && !e.is_resolved;
                return (
                  <tr
                    key={e.id}
                    className={`hover:bg-muted/20 ${isFlagged ? "bg-red-50" : ""} ${isFlagged ? "cursor-pointer" : ""}`}
                    onClick={isFlagged ? () => openResolveDialog(e) : undefined}
                  >
                    <td className="px-3 py-2 font-medium">{e.employee_name}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {e.clock_in && isValid(parseISO(e.clock_in)) ? format(parseISO(e.clock_in), "MMM d, yyyy") : "—"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {[e.job_number, e.work_center].filter(Boolean).join(" — ") || "—"}
                    </td>
                    <td className="px-3 py-2">
                      {e.clock_in && isValid(parseISO(e.clock_in)) ? format(parseISO(e.clock_in), "h:mm a") : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {e.clock_out && isValid(parseISO(e.clock_out)) ? format(parseISO(e.clock_out), "h:mm a") : "—"}
                    </td>
                    <td className="px-3 py-2">{formatBreak(e.break_minutes)}</td>
                    <td className="px-3 py-2 font-semibold">{formatHours(e.net_hours ?? e.duration_hours)}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Resolve Flagged Entry Dialog */}
      <Dialog open={!!resolvingEntry} onOpenChange={open => !open && setResolvingEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Resolve Flagged Time Entry
            </DialogTitle>
          </DialogHeader>
          {resolvingEntry && (
            <div className="space-y-4">
              <div className="text-sm space-y-1 bg-muted/30 rounded-lg p-3">
                <p><strong>Employee:</strong> {resolvingEntry.employee_name}</p>
                <p><strong>Original Clock In:</strong> {resolvingEntry.clock_in && format(parseISO(resolvingEntry.clock_in), "MMM d, yyyy h:mm a")}</p>
                <p><strong>Auto Clock Out:</strong> {resolvingEntry.clock_out && format(parseISO(resolvingEntry.clock_out), "MMM d, yyyy h:mm a")}</p>
                <p className="text-red-600"><strong>Reason:</strong> {resolvingEntry.flagged_reason}</p>
              </div>
              <div className="space-y-2">
                <Label>Corrected Clock-Out Time</Label>
                <Input
                  type="datetime-local"
                  value={resolveClockOut}
                  onChange={e => setResolveClockOut(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Resolution Notes</Label>
                <Textarea
                  value={resolveNotes}
                  onChange={e => setResolveNotes(e.target.value)}
                  placeholder="Explain the correction (e.g., employee forgot to clock out, actual end time was...)"
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setResolvingEntry(null)}>Cancel</Button>
                <Button
                  onClick={() => resolveMutation.mutate()}
                  disabled={!resolveClockOut || resolveMutation.isPending}
                >
                  {resolveMutation.isPending ? "Resolving..." : "Resolve Entry"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }) {
  if (status === "Flagged") return <Badge className="bg-red-100 text-red-700 border-red-200 gap-1"><AlertTriangle className="w-3 h-3" /> Flagged</Badge>;
  if (status === "Admin Corrected") return <Badge className="bg-blue-100 text-blue-700 border-blue-200 gap-1"><CheckCircle2 className="w-3 h-3" /> Corrected</Badge>;
  if (status === "Active") return <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1"><Clock className="w-3 h-3" /> Active</Badge>;
  if (status === "Complete") return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1"><CheckCircle2 className="w-3 h-3" /> Complete</Badge>;
  return <Badge variant="outline">Incomplete</Badge>;
}