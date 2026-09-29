import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, User, QrCode, Plus, Pencil, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import ShopLogQrModal from "./ShopLogQrModal";
import ShopLogEstimateModal from "./ShopLogEstimateModal";
import ShopLogEntryModal from "./ShopLogEntryModal";

const WORK_CENTERS = ["Cut", "Fit", "Weld", "Grind", "Powder Coat", "Install", "Demo", "Design"];

const EST_FIELDS = ["est_shop_labor_hours", "est_install_labor_hours", "est_draw_measure_hours"];

function generateToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function JobShopLogTab({ timeEntries, job }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [qrOpen, setQrOpen] = useState(false);
  const [estOpen, setEstOpen] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);

  const canEdit = ["owner", "admin", "estimator"].includes((user?.role || "").toLowerCase());

  // Fetch shop log entries for this job
  const { data: shopLogEntries = [] } = useQuery({
    queryKey: ["shopLogEntries", job.id],
    queryFn: () => base44.entities.ShopLogEntry.filter({ job_id: job.id }),
    enabled: !!job?.id
  });

  // Group time entries by work center (existing functionality, preserved)
  const byCenter = {};
  WORK_CENTERS.forEach(wc => { byCenter[wc] = []; });
  timeEntries.forEach(te => {
    if (byCenter[te.work_center]) byCenter[te.work_center].push(te);
  });
  const timeEntryHours = timeEntries.reduce((s, te) => s + (te.duration_hours || 0), 0);

  // Shop log totals
  const shopHours = shopLogEntries.reduce(
    (s, e) => s + (e.shop_labor_hours || 0) + (e.install_labor_hours || 0) + (e.draw_measure_hours || 0),
    0
  );
  const estHours = EST_FIELDS.reduce((s, k) => s + (job[k] || 0), 0);
  const totalLogged = shopHours + timeEntryHours;
  const remaining = Math.max(0, estHours - totalLogged);

  // Sort entries newest first
  const sortedEntries = [...shopLogEntries].sort((a, b) =>
    (b.entry_date || "").localeCompare(a.entry_date || "")
  );

  const handleGenerateToken = async () => {
    const token = generateToken();
    await base44.entities.Job.update(job.id, { shop_log_share_token: token });
    qc.invalidateQueries({ queryKey: ["job", job.id] });
  };

  const handleSaveEstimate = async (values) => {
    await base44.entities.Job.update(job.id, values);
    qc.invalidateQueries({ queryKey: ["job", job.id] });
  };

  const handleCreateEntry = async (payload) => {
    await base44.entities.ShopLogEntry.create({
      organization_id: job.organization_id,
      job_id: job.id,
      job_number: job.job_number || "",
      ...payload
    });
    await base44.functions.invoke("recalcShopLogTotals", { job_id: job.id });
    qc.invalidateQueries({ queryKey: ["shopLogEntries", job.id] });
    qc.invalidateQueries({ queryKey: ["job", job.id] });
  };

  const handleDeleteEntry = async (entryId) => {
    if (!window.confirm("Delete this entry?")) return;
    await base44.entities.ShopLogEntry.delete(entryId);
    await base44.functions.invoke("recalcShopLogTotals", { job_id: job.id });
    qc.invalidateQueries({ queryKey: ["shopLogEntries", job.id] });
    qc.invalidateQueries({ queryKey: ["job", job.id] });
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Total Logged" value={`${totalLogged.toFixed(1)}h`} />
        <SummaryCard label="Estimated" value={`${estHours.toFixed(1)}h`} />
        <SummaryCard label="Remaining" value={`${remaining.toFixed(1)}h`} />
        <SummaryCard label="Entries" value={shopLogEntries.length} />
      </div>

      {/* Action buttons */}
      {canEdit && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setEntryOpen(true)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Log Entry
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEstOpen(true)} className="gap-1.5">
            <Pencil className="w-3.5 h-3.5" /> Edit Estimate
          </Button>
          <Button size="sm" variant="outline" onClick={() => setQrOpen(true)} className="gap-1.5">
            <QrCode className="w-3.5 h-3.5" /> Show QR Code
          </Button>
        </div>
      )}

      {/* Shop Log Entries */}
      {shopLogEntries.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Manual Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {sortedEntries.map(entry => {
                const entryHours = (entry.shop_labor_hours || 0) + (entry.install_labor_hours || 0) + (entry.draw_measure_hours || 0);
                const entryCost = (entry.materials_cost || 0) + (entry.powder_coat_cost || 0) + (entry.fuel_cost || 0);
                return (
                  <div key={entry.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <span className="text-sm block truncate">
                          {entry.submitted_by_name || "Unknown"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {entry.entry_date ? format(parseISO(entry.entry_date), "MMM d, yyyy") : ""}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        {entryHours > 0 && (
                          <span className="text-sm font-medium block">{entryHours.toFixed(1)}h</span>
                        )}
                        {entryCost > 0 && (
                          <span className="text-xs text-muted-foreground block">${entryCost.toFixed(0)}</span>
                        )}
                      </div>
                      {canEdit && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteEntry(entry.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Time Clock Entries by work center (existing) */}
      {WORK_CENTERS.map(wc => {
        const entries = byCenter[wc];
        if (entries.length === 0) return null;
        const wcHours = entries.reduce((s, e) => s + (e.duration_hours || 0), 0);
        return (
          <Card key={wc}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">{wc}</CardTitle>
                <Badge variant="outline" className="text-xs">{wcHours.toFixed(1)}h</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {entries.map(entry => (
                  <div key={entry.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm">{entry.employee_name}</span>
                      {entry.is_active && (
                        <Badge className="text-xs bg-emerald-100 text-emerald-700">Active</Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium">
                        {entry.duration_hours ? `${entry.duration_hours.toFixed(1)}h` : "—"}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {entry.clock_in && format(parseISO(entry.clock_in), "MMM d")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {shopLogEntries.length === 0 && timeEntries.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No time entries logged for this job yet.</p>
      )}

      {/* Modals */}
      <ShopLogQrModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        job={job}
        onGenerateToken={handleGenerateToken}
      />
      <ShopLogEstimateModal
        open={estOpen}
        onClose={() => setEstOpen(false)}
        job={job}
        onSave={handleSaveEstimate}
      />
      <ShopLogEntryModal
        open={entryOpen}
        onClose={() => setEntryOpen(false)}
        onSubmit={handleCreateEntry}
      />
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="bg-card rounded-lg border px-3 py-2.5 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold mt-0.5">{value}</p>
    </div>
  );
}