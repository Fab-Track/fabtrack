import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trophy, Plus, Star, Award, TrendingUp, ClipboardCheck } from "lucide-react";
import QCInspectionForm from "@/components/craftsman/QCInspectionForm";
import { useOrgFilter } from "@/lib/orgContext";

// Tier thresholds
function getTier(avg) {
  if (avg >= 90) return { label: "Master Craftsman", color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/30", icon: "🥇" };
  if (avg >= 75) return { label: "Senior Craftsman", color: "text-slate-400", bg: "bg-slate-400/10 border-slate-400/30", icon: "🥈" };
  if (avg >= 60) return { label: "Craftsman", color: "text-amber-700", bg: "bg-amber-700/10 border-amber-700/30", icon: "🥉" };
  return { label: "Apprentice", color: "text-muted-foreground", bg: "bg-muted border", icon: "🔧" };
}

export default function CraftsmanScore() {
  const [newOpen, setNewOpen] = useState(false);
  const [tab, setTab] = useState("leaderboard");

  const orgFilter = useOrgFilter();

  const { data: inspections = [] } = useQuery({
    queryKey: ["qcInspections", orgFilter],
    queryFn: () => base44.entities.QCInspection.filter(orgFilter, "-created_date", 500),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", orgFilter],
    queryFn: () => base44.entities.Employee.filter(orgFilter),
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs-qc", orgFilter],
    queryFn: () => base44.entities.Job.filter(orgFilter, "-created_date", 200),
  });

  // Build per-employee stats
  const empStats = employees
    .filter(e => e.is_active !== false)
    .map(emp => {
      const empInspections = inspections.filter(i => i.employee_id === emp.id);
      const avgScore = empInspections.length
        ? Math.round(empInspections.reduce((s, i) => s + (i.quality_score || 0), 0) / empInspections.length)
        : null;
      const firstPassRate = empInspections.length
        ? Math.round((empInspections.filter(i => i.passed_first_time).length / empInspections.length) * 100)
        : null;
      const reworkRate = empInspections.length
        ? Math.round((empInspections.filter(i => i.rework_required).length / empInspections.length) * 100)
        : null;

      // On-time install rate: jobs assigned to this employee that had an install date
      const assignedInstalls = jobs.filter(j => {
        const crew = j.assigned_crew_names || [];
        return crew.includes(emp.name) && (j.promised_install_date || j.expected_install_date);
      });
      const completedInstalls = assignedInstalls.filter(j =>
        j.stage === "Install Complete" || j.stage === "Invoiced" || j.status === "Install Complete" || j.status === "Invoiced"
      );
      let onTimeInstallRate = null;
      if (completedInstalls.length > 0) {
        const onTime = completedInstalls.filter(j => {
          const scheduledDate = j.promised_install_date || j.expected_install_date;
          if (!scheduledDate) return true;
          // Check stage_history for when "Install Complete" was reached
          const completedEntry = (j.stage_history || []).find(h =>
            h.to_stage === "Install Complete" || h.to_stage === "Invoiced"
          );
          if (!completedEntry) return true; // no data = assume on time
          const completedAt = new Date(completedEntry.timestamp);
          const scheduled = new Date(scheduledDate);
          scheduled.setHours(23, 59, 59);
          return completedAt <= scheduled;
        });
        onTimeInstallRate = Math.round((onTime.length / completedInstalls.length) * 100);
      }

      return { emp, avgScore, firstPassRate, reworkRate, count: empInspections.length, onTimeInstallRate, installCount: assignedInstalls.length };
    })
    .sort((a, b) => (b.avgScore || -1) - (a.avgScore || -1));

  const shopAvg = empStats.filter(e => e.avgScore !== null).length
    ? Math.round(empStats.filter(e => e.avgScore !== null).reduce((s, e) => s + e.avgScore, 0) / empStats.filter(e => e.avgScore !== null).length)
    : 0;

  const recentInspections = [...inspections].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 20);

  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Craftsman Score</h1>
          <p className="text-sm text-muted-foreground">QC inspections, quality scoring, and leaderboard</p>
        </div>
        <Button onClick={() => setNewOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> New Inspection
        </Button>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Trophy className="w-8 h-8 text-amber-500 shrink-0" />
            <div>
              <p className="text-2xl font-black">{shopAvg || "—"}</p>
              <p className="text-xs text-muted-foreground">Shop Avg Score</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <ClipboardCheck className="w-8 h-8 text-primary/40 shrink-0" />
            <div>
              <p className="text-2xl font-black">{inspections.length}</p>
              <p className="text-xs text-muted-foreground">Total Inspections</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Star className="w-8 h-8 text-emerald-500 shrink-0" />
            <div>
              <p className="text-2xl font-black">
                {inspections.length ? Math.round((inspections.filter(i => i.passed_first_time).length / inspections.length) * 100) : "—"}%
              </p>
              <p className="text-xs text-muted-foreground">First-Pass Rate</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Award className="w-8 h-8 text-amber-500 shrink-0" />
            <div>
              <p className="text-2xl font-black">
                {empStats.filter(e => e.avgScore !== null && e.avgScore >= 90).length}
              </p>
              <p className="text-xs text-muted-foreground">Master Craftsmen</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="recent">Recent Inspections</TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard">
          <div className="space-y-3">
            {empStats.map(({ emp, avgScore, firstPassRate, reworkRate, count, onTimeInstallRate, installCount }, idx) => {
              const tier = avgScore !== null ? getTier(avgScore) : getTier(-1);
              return (
                <Card key={emp.id} className={`border ${avgScore !== null ? tier.bg : ""}`}>
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Rank + name */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold shrink-0">
                        {avgScore !== null ? idx + 1 : "—"}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold">{emp.name}</p>
                          <Badge variant="outline" className="text-xs capitalize">{emp.role}</Badge>
                          {avgScore !== null && (
                            <span className="text-sm">{tier.icon}</span>
                          )}
                        </div>
                        <p className={`text-xs ${tier.color} font-medium`}>{tier.label}</p>
                      </div>
                    </div>

                    {/* Score bar */}
                    <div className="flex-1 min-w-0">
                      {avgScore !== null ? (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Avg Score</span>
                            <span className="font-bold text-foreground">{avgScore}</span>
                          </div>
                          <Progress value={avgScore} className="h-2" />
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No inspections yet</p>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex gap-4 text-xs shrink-0">
                      <div className="text-center">
                        <p className="font-bold">{count}</p>
                        <p className="text-muted-foreground">Inspections</p>
                      </div>
                      {firstPassRate !== null && (
                        <div className="text-center">
                          <p className={`font-bold ${firstPassRate >= 80 ? "text-emerald-600" : "text-amber-600"}`}>{firstPassRate}%</p>
                          <p className="text-muted-foreground">1st Pass</p>
                        </div>
                      )}
                      {reworkRate !== null && (
                        <div className="text-center">
                          <p className={`font-bold ${reworkRate > 20 ? "text-destructive" : "text-muted-foreground"}`}>{reworkRate}%</p>
                          <p className="text-muted-foreground">Rework</p>
                        </div>
                      )}
                      <div className="text-center">
                        <p className={`font-bold ${onTimeInstallRate === null ? "text-muted-foreground" : onTimeInstallRate >= 80 ? "text-emerald-600" : "text-amber-600"}`}>
                          {onTimeInstallRate !== null ? `${onTimeInstallRate}%` : "—"}
                        </p>
                        <p className="text-muted-foreground">On-Time Install</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {empStats.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">No employees found.</div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="recent">
          {recentInspections.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardCheck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No inspections logged yet.</p>
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {["Employee", "Job", "Work Center", "Score", "First Pass", "Rework"].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentInspections.map(ins => {
                    const score = ins.quality_score || 0;
                    const scoreColor = score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-600" : "text-destructive";
                    return (
                      <tr key={ins.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2.5 font-medium">{ins.employee_name}</td>
                        <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{ins.job_number}</td>
                        <td className="px-3 py-2.5"><Badge variant="outline" className="text-xs">{ins.work_center}</Badge></td>
                        <td className="px-3 py-2.5">
                          <span className={`font-bold ${scoreColor}`}>{score}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={ins.passed_first_time ? "text-emerald-600" : "text-destructive"}>
                            {ins.passed_first_time ? "✓ Yes" : "✗ No"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={ins.rework_required ? "text-destructive" : "text-muted-foreground"}>
                            {ins.rework_required ? "Required" : "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New QC Inspection</DialogTitle>
          </DialogHeader>
          <QCInspectionForm jobs={jobs} employees={employees} onClose={() => setNewOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}