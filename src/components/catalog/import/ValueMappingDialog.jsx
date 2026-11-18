import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import ValuePicker from "./ValuePicker";
import { COST_TYPES } from "@/lib/costItems";
import { KEEP } from "@/lib/catalogImport";

const SECTIONS = [
  { key: "cost_code", title: "Incoming cost code", target: "Your cost code" },
  { key: "cost_type", title: "Incoming cost type", target: "Your cost type" },
  { key: "unit", title: "Incoming unit", target: "Your unit" },
];

const GRID = "grid grid-cols-[minmax(0,1fr)_16px_minmax(0,1fr)] items-center gap-3 px-3 py-2";
const HEAD = `${GRID} bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground`;

// Maps CSV values that don't exist in the org's settings onto values that do.
export default function ValueMappingDialog({ open, groups, costCodes = [], units = [], unitNumeric, onCancel, onContinue }) {
  const [picked, setPicked] = useState({});

  useEffect(() => { if (open) setPicked({}); }, [open, groups]);

  const total = SECTIONS.reduce((n, s) => n + (groups[s.key]?.length || 0), 0);
  const mapped = SECTIONS.reduce((n, s) => n + (groups[s.key] || []).filter((v) => picked[s.key]?.[v]).length, 0);
  const complete = total > 0 && mapped === total;

  const optionsFor = (key, incoming) => {
    if (key === "cost_code") return costCodes.map((c) => ({ value: c.id, label: c.name }));
    if (key === "cost_type") return COST_TYPES.map((t) => ({ value: t, label: t }));
    return [
      ...units.map((u) => ({ value: u, label: u })),
      { value: KEEP, label: `Keep "${incoming}"` },
    ];
  };

  function submit() {
    const out = { cost_code: {}, cost_type: {}, unit: {} };
    SECTIONS.forEach((s) => {
      (groups[s.key] || []).forEach((v) => { if (picked[s.key]?.[v]) out[s.key][v] = picked[s.key][v]; });
    });
    onContinue(out);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col gap-0 border-t-4 border-t-primary">
        <DialogHeader>
          <DialogTitle className="text-xl">Value mapping</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Some of the values being imported do not match your settings. Map them before continuing.{" "}
            <Link to="/settings" className="underline font-semibold text-foreground">Manage cost codes and cost types</Link>
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6 my-4 space-y-5">
          {SECTIONS.filter((s) => groups[s.key]?.length).map((s) => (
            <div key={s.key} className="space-y-2">
              <div>
                <h3 className="text-sm font-bold">{s.title} → {s.target}</h3>
                <p className="text-xs text-muted-foreground">One choice applies to every row with that value.</p>
              </div>
              {s.key === "unit" && unitNumeric && (
                <p className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  These look like numbers, not units — check your column mapping.
                </p>
              )}
              <div className="border rounded-lg overflow-hidden">
                <div className={HEAD}>
                  <span>{s.title}</span><span /><span>{s.target}</span>
                </div>
                <div className="divide-y">
                  {groups[s.key].map((v) => (
                    <div key={v} className={`${GRID} bg-card`}>
                      <span className="font-mono text-sm truncate" title={v}>{v}</span>
                      <span className="text-muted-foreground text-center">→</span>
                      <ValuePicker
                        value={picked[s.key]?.[v] || ""}
                        options={optionsFor(s.key, v)}
                        placeholder="Choose…"
                        onChange={(val) => setPicked((p) => ({ ...p, [s.key]: { ...(p[s.key] || {}), [v]: val } }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t pt-4">
          <p className="text-sm text-muted-foreground">{mapped} of {total} mapped</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button disabled={!complete} onClick={submit}>Continue</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}