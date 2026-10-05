import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import { Clock, User, QrCode, Plus, Pencil, Trash2, DollarSign } from "lucide-react";
import { format, parseISO } from "date-fns";
import ShopLogQrModal from "./ShopLogQrModal";
import ShopLogEstimateModal from "./ShopLogEstimateModal";
import ShopLogEntryModal from "./ShopLogEntryModal";

const WORK_CENTERS = ["Cut", "Fit", "Weld", "Grind", "Powder Coat", "Install", "Demo", "Design"];

const HOUR_CATEGORIES = [
  { key: "shop_labor_hours", estKey: "est_shop_labor_hours", label: "Shop Labor", unit: "hrs" },
  { key: "install_labor_hours", estKey: "est_install_labor_hours", label: "Install Labor", unit: "hrs" },
  { key: "draw_measure_hours", estKey: "est_draw_measure_hours", label: "Draw / Measure", unit: "hrs" },
];

const COST_CATEGORIES = [
  { key: "materials_cost", estKey: "est_materials_cost", label: "Materials", unit: "$" },
  { key: "powder_coat_cost", estKey: "est_powder_coat_cost", label: "Powder Coat", unit: "$" },
  { key: "fuel_cost", estKey: "est_fuel_cost", label: "Fuel", unit: "$" },
];

function generateToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function JobShopLogTab({ timeEntries, job, purchaseOrders = [] }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [qrOpen, setQrOpen] = useState(false);
  const [estOpen, setEstOpen] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [inlineEdit, setInlineEdit] = useState(null); // { estKey, value }

  const canEdit = ["owner", "admin", "estimator"].includes((user?.role || "").toLowerCase());

  const { data: shopLogEntries = [] } = useQuery({
    queryKey: ["shopLogEntries", job.id],
    queryFn: () => base44.entities.ShopLogEntry.filter({ job_id: job.id }),
    enabled: !!job?.id
  });

  // Per-category totals from shop log entries
  const catTotals = {};
  [...HOUR_CATEGORIES, ...COST_CATEGORIES].forEach(c => {
    catTotals[c.key] = shopLogEntries.reduce((s, e) => s + (e[c.key] || 0), 0);
  });

  // Time clock hours (separate from shop log entries)
  const timeEntryHours = timeEntries.reduce((s, te) => s + (te.duration_hours || 0), 0);

  // Grand totals
  const totalLoggedHours = HOUR_CATEGORIES.reduce((s, c) => s + catTotals[c.key], 0) + timeEntryHours;
  const totalEstimatedHours = HOUR_CATEGORIES.reduce((s, c) => s + (job[c.estKey] || 0), 0);
  const totalLoggedCosts = COST_CATEGORIES.reduce((s, c) => s + catTotals[c.key], 0);
  const totalEstimatedCosts = COST_CATEGORIES.reduce((s, c) => s + (job[c.estKey] || 0), 0);

  // Costing tab data (merged)
  const estimateTotal = job.estimate_total || 0;
  const actualCost = job.actual_cost || 0;
  const poTotal = purchaseOrders.reduce((s, po) => s + (po.total || 0), 0);
  const margin = estimateTotal > 0 ? ((estimateTotal - actualCost) / estimateTotal * 100) : 0;
  const costPercent = estimateTotal > 0 ? (actualCost / estimateTotal * 100) : 0;

  // Sort entries newest first
  const sortedEntries = [...shopLogEntries].sort((a, b) =>
    (b.entry_date || "").localeCompare(a.entry_date || "")
  );

  // Group time entries by work center
  const byCenter = {};
  WORK_CENTERS.forEach(wc => { byCenter[wc] = []; });
  timeEntries.forEach(te => {
    if (byCenter[te.work_center]) byCenter[te.work_center].push(te);
  });

  const handleGenerateToken = async () => {
    const token = generateToken();
    await base44.entities.Job.update(job.id, { shop_log_share_token: token });
    qc.invalidateQueries({ queryKey: ["job", job.id] });
  };

  const handleSaveEstimate = async (values) => {
    await base44.entities.Job.update(job.id, values);
    qc.invalidateQueries({ queryKey: ["job", job.id] });
  };

  const handleInlineSave = async (estKey, value) => {
    const numVal = Number(value) || 0;
    setInlineEdit(null);
    if ((job[estKey] || 0) === numVal) return;
    await base44.entities.Job.update(job.id, { [estKey]: numVal });
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

  const handleUpdateEntry = async (entryId, payload) => {
    await base44.entities.ShopLogEntry.update(entryId, payload);
    await base44.functions.invoke("recalcShopLogTotals", { job_id: job.id });
    qc.invalidateQueries({ queryKey: ["shopLogEntries", job.id] });
    qc.invalidateQueries({ queryKey: ["job", job.id] });
  };

  const handleEditEntry = (entry) => {
    setEditingEntry(entry);
    setEntryOpen(true);
  };

  const handleDeleteEntry = async (entryId) => {
    if (!window.confirm("Delete this entry?")) return;
    await base44.entities.ShopLogEntry.delete(entryId);
    await base44.functions.invoke("recalcShopLogTotals", { job_id: job.id });
    qc.invalidateQueries({ queryKey: ["shopLogEntries", job.id] });
    qc.invalidateQueries({ queryKey: ["job", job.id] });
  };

  const fmtHrs = (v) => `${(v || 0).toFixed(1)}h`;
  const fmtUSD = (v) => `$${(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  const renderCategoryRow = (cat, isHours) => {
    const actual = catTotals[cat.key] || 0;
    const estimated = job[cat.estKey] || 0;
    const variance = actual - estimated;
    const fmt = isHours ? fmtHrs : fmtUSD;
    const pct = estimated > 0 ? Math.min((actual / estimated) * 100, 100) : (actual > 0 ? 100 : 0);
    const overBudget = estimated > 0 && actual > estimated;
    const isEditing = inlineEdit?.estKey === cat.estKey;
    return (
      <React.Fragment key={cat.key}>
        <tr className="border-b last:border-0">
          <td className="py-2 text-sm font-medium">{cat.label}</td>
          <td className="py-2 text-sm text-right text-muted-foreground">
            {canEdit ? (
              isEditing ? (
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  autoFocus
                  defaultValue={estimated}
                  onBlur={(e) => handleInlineSave(cat.estKey, e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") setInlineEdit(null); }}
                  className="w-20 text-right border rounded px-1 py-0.5 text-sm bg-background"
                />
              ) : (
                <button
                  onClick={() => setInlineEdit({ estKey: cat.estKey, value: estimated })}
                  className="hover:text-foreground hover:underline underline-offset-2 cursor-text"
                  title="Click to edit estimated value"
                >
                  {fmt(estimated)}
                </button>
              )
            ) : (
              fmt(estimated)
            )}
          </td>
          <td className="py-2 text-sm text-right font-semibold">{fmt(actual)}</td>
          <td className={`py-2 text-sm text-right ${variance > 0 ? "text-amber-600" : "text-emerald-600"}`}>
            {variance > 0 ? "+" : ""}{fmt(variance)}
          </td>
        </tr>
        <tr className="border-b last:border-0">
          <td colSpan={4} className="pb-2 pt-0">
            <Progress
              value={pct}
              className={`h-2 ${overBudget ? '[&>div]:bg-red-500' : pct >= 90 ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500'}`}
            />
          </td>
        </tr>
      </React.Fragment>
    );
  };

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Total Logged Hours" value={fmtHrs(totalLoggedHours)} />
        <SummaryCard label="Estimated Hours" value={fmtHrs(totalEstimatedHours)} />
        <SummaryCard label="Total Logged Costs" value={fmtUSD(totalLoggedCosts)} />
        <SummaryCard label="Estimated Costs" value={fmtUSD(totalEstimatedCosts)} />
      </div>

      {/* Category breakdown table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Category Breakdown</CardTitle>
            {canEdit && (
              <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => setEstOpen(true)}>
                <Pencil className="w-3 h-3" /> Edit Estimates
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <table className="w-full">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-1.5 text-xs text-muted-foreground font-medium">Category</th>
                <th className="pb-1.5 text-xs text-muted-foreground font-medium text-right">Estimated</th>
                <th className="pb-1.5 text-xs text-muted-foreground font-medium text-right">Actual Logged</th>
                <th className="pb-1.5 text-xs text-muted-foreground font-medium text-right">Variance</th>
              </tr>
            </thead>
            <tbody>
              {HOUR_CATEGORIES.map(c => renderCategoryRow(c, true))}
              <tr className="bg-muted/40 border-y">
                <td className="py-1.5 text-xs font-bold">Total Hours</td>
                <td className="py-1.5 text-xs text-right font-bold text-muted-foreground">{fmtHrs(totalEstimatedHours)}</td>
                <td className="py-1.5 text-xs text-right font-bold">{fmtHrs(totalLoggedHours)}</td>
                <td className="py-1.5 text-xs text-right font-bold text-muted-foreground">{fmtHrs(totalLoggedHours - totalEstimatedHours)}</td>
              </tr>
              {COST_CATEGORIES.map(c => renderCategoryRow(c, false))}
              <tr className="bg-muted/40 border-y">
                <td className="py-1.5 text-xs font-bold">Total Costs</td>
                <td className="py-1.5 text-xs text-right font-bold text-muted-foreground">{fmtUSD(totalEstimatedCosts)}</td>
                <td className="py-1.5 text-xs text-right font-bold">{fmtUSD(totalLoggedCosts)}</td>
                <td className="py-1.5 text-xs text-right font-bold text-muted-foreground">{fmtUSD(totalLoggedCosts - totalEstimatedCosts)}</td>
              </tr>
            </tbody>
          </table>
          {canEdit && (
            <p className="text-xs text-muted-foreground mt-2">
              Click any estimated value above to edit it inline.
            </p>
          )}
          {timeEntryHours > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              Includes {timeEntryHours.toFixed(1)}h from clock-in entries (see breakdown below).
            </p>
          )}
        </CardContent>
      </Card>

      {/* Budget utilization (merged from Costing) */}
      {estimateTotal > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              Budget Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 mb-2">
              <div className="flex justify-between text-sm">
                <span>Actual vs Estimate</span>
                <span className="font-semibold">{costPercent.toFixed(0)}%</span>
              </div>
              <Progress
                value={Math.min(costPercent, 100)}
                className={`h-3 ${costPercent >= 80 ? '[&>div]:bg-red-500' : '[&>div]:bg-emerald-500'}`}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {fmtUSD(actualCost)} spent of {fmtUSD(estimateTotal)} estimated
              {margin < 20 ? <span className="text-amber-600 ml-1">(margin {margin.toFixed(0)}%)</span> : null}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setEntryOpen(true)} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Log Entry
        </Button>
        {canEdit && (
          <Button size="sm" variant="secondary" onClick={() => setEstOpen(true)} className="gap-1.5">
            <Pencil className="w-3.5 h-3.5" /> Edit All Estimates
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => setQrOpen(true)} className="gap-1.5">
          <QrCode className="w-3.5 h-3.5" /> Show QR Code
        </Button>
      </div>

      {/* Manual shop log entries */}
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
                        <div className="flex items-center gap-0.5">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => handleEditEntry(entry)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteEntry(entry.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Purchase orders (merged from Costing) */}
      {purchaseOrders.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Purchase Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {purchaseOrders.map(po => (
                <div key={po.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <span className="text-sm font-medium">{po.po_number}</span>
                    <span className="text-xs text-muted-foreground ml-2">{po.vendor_name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold">${(po.total || 0).toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground ml-2">{po.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Time clock entries by work center (existing) */}
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
        onClose={() => { setEntryOpen(false); setEditingEntry(null); }}
        onSubmit={handleCreateEntry}
        entry={editingEntry}
        onUpdate={handleUpdateEntry}
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