/**
 * AdminPayroll — admin-only time management & payroll report page.
 * - Real-time live status of all clocked-in employees
 * - View / edit any time entry with full audit trail
 * - Regular vs OT hours per employee per workweek and pay period
 * - Export payroll CSV
 */
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { hasPayrollAccess } from "@/lib/roleHelpers";
import {
  getCurrentPayPeriod, getPreviousPayPeriod,
  groupByWorkweek, formatHours, getNetHours,
  payPeriodLabel, getWorkweekStart
} from "@/lib/timeTrackingHelpers";
import { format, parseISO, differenceInSeconds, endOfDay, startOfWeek, endOfWeek } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Users, Clock, Pencil, Plus, AlertTriangle, CheckCircle, ChevronDown, ChevronRight, MessageSquare, FileEdit } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import LiveStatusTable from "@/components/timetracking/LiveStatusTable";
import AdminTimeEntryEdit from "@/components/timetracking/AdminTimeEntryEdit";
import AdminCorrectionsPanel from "@/components/timetracking/AdminCorrectionsPanel";
import { useOrgFilter } from "@/lib/orgContext";

const PP_OPTIONS = [
  { value: "current", label: () => `Current: ${getCurrentPayPeriod().label}` },
  { value: "previous", label: () => `Previous: ${getPreviousPayPeriod().label}` },
];

export default function AdminPayroll() {
  const { user } = useAuth();
  const isAdmin = hasPayrollAccess(user);
  const { toast } = useToast();
  const qc = useQueryClient();

  const [ppView, setPpView] = useState("current");
  const [tab, setTab] = useState("live");
  const [editingEntry, setEditingEntry] = useState(null);
  const [addEntryEmployee, setAddEntryEmployee] = useState(null);
  const [expandedEmployees, setExpandedEmployees] = useState({});

  const orgFilter = useOrgFilter();

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", orgFilter],
    queryFn: () => base44.entities.Employee.filter(orgFilter, "-created_date", 100),
  });

  const { data: payrollResp, isLoading } = useQuery({
    queryKey: ["payrollEntries", orgFilter],
    queryFn: () => base44.functions.invoke('getPayrollEntries', orgFilter),
    refetchInterval: 30000,
  });
  const allEntries = payrollResp?.data?.entries || [];
  const activeEntries = allEntries.filter(e => e.is_active);

  const { data: auditLogs = [] } = useQuery({
    queryKey: ["timeAuditLogs", orgFilter],
    queryFn: () => base44.entities.TimeAuditLog.filter(orgFilter, "-changed_at", 500),
  });

  const { data: correctionRequests = [] } = useQuery({
    queryKey: ["correctionRequests", orgFilter],
    queryFn: () => base44.entities.CorrectionRequest.filter(orgFilter, "-created_date", 200),
    refetchInterval: 30000,
  });

  const approveMutation = useMutation({
    mutationFn: ({ requestId, response }) =>
      base44.entities.CorrectionRequest.update(requestId, {
        status: "approved",
        admin_response: response || null,
        approved_by_id: user?.id,
        approved_by_name: user?.full_name,
        resolved_at: new Date().toISOString(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["correctionRequests"] });
      toast({ title: "Approved", description: "Correction request approved." });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ requestId, response }) =>
      base44.entities.CorrectionRequest.update(requestId, {
        status: "rejected",
        admin_response: response || null,
        approved_by_id: user?.id,
        approved_by_name: user?.full_name,
        resolved_at: new Date().toISOString(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["correctionRequests"] });
      toast({ title: "Rejected", description: "Correction request rejected." });
    },
  });

  if (!isAdmin) return (
    <div className="p-8 text-center text-muted-foreground">
      <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-500" />
      <p>Admin or Owner access required.</p>
    </div>
  );

  const pp = ppView === "current" ? getCurrentPayPeriod() : getPreviousPayPeriod();

  // Period entries — completed shifts only
  const periodEntries = allEntries.filter(e => {
    if (e.is_active) return false;
    if (e.entry_type && e.entry_type !== "shift") return false;
    if (!e.clock_in) return false;
    const d = parseISO(e.clock_in);
    return d >= pp.start && d <= endOfDay(pp.end);
  });

  // Per-employee summaries
  const activeEmployees = employees.filter(e => e.is_active !== false);

  const employeeSummaries = activeEmployees.map(emp => {
    const myEntries = periodEntries.filter(e => e.employee_id === emp.id);
    const weeks = groupByWorkweek(myEntries, emp.id, pp.start, pp.end);
    const totalHours = myEntries.reduce((s, e) => s + getNetHours(e), 0);
    const overtimeHours = weeks.reduce((s, w) => s + w.overtimeHours, 0);
    const regularHours = totalHours - overtimeHours;
    const activeNow = activeEntries.find(e => e.employee_id === emp.id);

    return {
      employee: emp,
      totalHours,
      regularHours: Math.max(0, regularHours),
      overtimeHours,
      weeks,
      entries: myEntries,
      activeNow,
    };
  }).filter(s => s.totalHours > 0 || s.activeNow);

  // Export payroll CSV
  const exportCSV = () => {
    const rows = [["Employee","Period","Week Of","Regular Hours","Overtime Hours","Total Hours"]];
    employeeSummaries.forEach(s => {
      s.weeks.forEach(w => {
        rows.push([
          s.employee.name,
          pp.label,
          format(w.weekStart, "MMM d yyyy"),
          w.regularHours.toFixed(2),
          w.overtimeHours.toFixed(2),
          w.totalHours.toFixed(2),
        ]);
      });
      // Period total row
      rows.push([s.employee.name, pp.label, "PERIOD TOTAL", s.regularHours.toFixed(2), s.overtimeHours.toFixed(2), s.totalHours.toFixed(2)]);
    });
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll_${pp.key}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleEmployee = (id) => setExpandedEmployees(p => ({ ...p, [id]: !p[id] }));

  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Time & Payroll</h1>
          <p className="text-sm text-muted-foreground">{activeEntries.length} employees clocked in right now</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={ppView} onValueChange={setPpView}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PP_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label()}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="live" className="gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Live Status
          </TabsTrigger>
          <TabsTrigger value="payroll" className="gap-2">
            <Clock className="w-3.5 h-3.5" /> Payroll Report
          </TabsTrigger>
          <TabsTrigger value="entries" className="gap-2">
            <Pencil className="w-3.5 h-3.5" /> Edit Entries
          </TabsTrigger>
          <TabsTrigger value="corrections" className="gap-2">
            <FileEdit className="w-3.5 h-3.5" /> Corrections
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <CheckCircle className="w-3.5 h-3.5" /> Audit Log
          </TabsTrigger>
        </TabsList>

        {/* ── LIVE STATUS ─────────────────────────────────────────────────── */}
        <TabsContent value="live" className="mt-4">
          <LiveStatusTable
            employees={activeEmployees}
            activeEntries={activeEntries}
            allEntries={allEntries}
          />
        </TabsContent>

        {/* ── PAYROLL REPORT ───────────────────────────────────────────────── */}
        <TabsContent value="payroll" className="mt-4">
          {isLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>
          ) : (
            <div className="space-y-3">
              {/* Summary totals row */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="border rounded-xl p-4 bg-card">
                  <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Total Employees</p>
                  <p className="text-2xl font-bold">{employeeSummaries.length}</p>
                </div>
                <div className="border rounded-xl p-4 bg-card">
                  <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Regular Hours</p>
                  <p className="text-2xl font-bold">{formatHours(employeeSummaries.reduce((s, e) => s + e.regularHours, 0))}</p>
                </div>
                <div className="border rounded-xl p-4 bg-card">
                  <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Overtime Hours</p>
                  <p className={`text-2xl font-bold ${employeeSummaries.reduce((s,e) => s+e.overtimeHours, 0) > 0 ? "text-amber-600" : ""}`}>
                    {formatHours(employeeSummaries.reduce((s, e) => s + e.overtimeHours, 0))}
                  </p>
                </div>
              </div>

              {employeeSummaries.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>No time entries for this period</p>
                </div>
              ) : (
                employeeSummaries.map(s => {
                  const expanded = expandedEmployees[s.employee.id] !== false;
                  return (
                    <div key={s.employee.id} className="border rounded-xl overflow-hidden bg-card">
                      <button
                        className="w-full flex items-center justify-between p-4 hover:bg-muted/20 text-left"
                        onClick={() => toggleEmployee(s.employee.id)}
                      >
                        <div className="flex items-center gap-3">
                          {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                          <div>
                            <p className="font-semibold">{s.employee.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{s.employee.role}</p>
                          </div>
                          {s.activeNow && (
                            <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Clocked In</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-6 text-right">
                          <div>
                            <p className="text-xs text-muted-foreground">Regular</p>
                            <p className="font-semibold">{formatHours(s.regularHours)}</p>
                          </div>
                          {s.overtimeHours > 0 && (
                            <div>
                              <p className="text-xs text-amber-600">Overtime</p>
                              <p className="font-semibold text-amber-600">{formatHours(s.overtimeHours)}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-xs text-muted-foreground">Total</p>
                            <p className="text-lg font-bold">{formatHours(s.totalHours)}</p>
                          </div>
                        </div>
                      </button>
                      {expanded && s.weeks.length > 0 && (
                        <div className="border-t divide-y bg-muted/10">
                          {s.weeks.map(w => (
                            <div key={format(w.weekStart, "yyyy-MM-dd")} className="flex items-center justify-between px-6 py-3 text-sm">
                              <p className="text-muted-foreground">
                                Week of {format(w.weekStart, "MMM d")} – {format(w.weekEnd, "MMM d")}
                                {w.overtimeHours > 0 && <Badge className="ml-2 bg-amber-100 text-amber-700 border-amber-200 text-xs">OT</Badge>}
                              </p>
                              <div className="flex gap-6">
                                <span className="text-muted-foreground">Reg: <strong>{formatHours(w.regularHours)}</strong></span>
                                {w.overtimeHours > 0 && <span className="text-amber-600">OT: <strong>{formatHours(w.overtimeHours)}</strong></span>}
                                <strong>{formatHours(w.totalHours)}</strong>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </TabsContent>

        {/* ── EDIT ENTRIES ─────────────────────────────────────────────────── */}
        <TabsContent value="entries" className="mt-4">
          <AdminTimeEntryEdit
            employees={activeEmployees}
            allEntries={allEntries}
            activeEntries={activeEntries}
            pp={pp}
            currentUser={user}
            onRefresh={() => qc.invalidateQueries({ queryKey: ["timeEntries"] })}
          />
        </TabsContent>

        {/* ── CORRECTIONS ─────────────────────────────────────────────────── */}
        <TabsContent value="corrections" className="mt-4">
          <AdminCorrectionsPanel
            requests={correctionRequests}
            employees={activeEmployees}
            allEntries={allEntries}
            auditLogs={auditLogs}
            currentUser={user}
            onApprove={(id, resp) => approveMutation.mutate({ requestId: id, response: resp })}
            onReject={(id, resp) => rejectMutation.mutate({ requestId: id, response: resp })}
            onRefresh={() => qc.invalidateQueries({ queryKey: ["timeEntries"] })}
          />
        </TabsContent>

        {/* ── AUDIT LOG ────────────────────────────────────────────────────── */}
        <TabsContent value="audit" className="mt-4">
          <div className="space-y-2">
            {auditLogs.length === 0 ? (
              <p className="text-center py-12 text-muted-foreground">No audit entries yet</p>
            ) : (
              auditLogs.map(log => (
                <div key={log.id} className="flex items-start justify-between border rounded-lg p-3 bg-card text-sm gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{log.employee_name || "Unknown"}</span>
                      <Badge variant="outline" className="text-xs">{log.action?.replace(/_/g," ")}</Badge>
                      {log.field_changed && <span className="text-muted-foreground text-xs">{log.field_changed}</span>}
                    </div>
                    {log.old_value && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <span className="text-red-600">{log.old_value}</span> → <span className="text-green-600">{log.new_value}</span>
                      </p>
                    )}
                    {log.reason && <p className="text-xs text-muted-foreground mt-0.5 italic">"{log.reason}"</p>}
                    <p className="text-xs text-muted-foreground mt-0.5">by {log.changed_by_name}</p>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    {log.changed_at ? format(parseISO(log.changed_at), "MMM d, h:mm a") : ""}
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}