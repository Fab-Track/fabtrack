import React from "react";
import { Input } from "@/components/ui/input";
import { Clock } from "lucide-react";
import { money } from "@/lib/costGroups";
import { priceFromHard } from "@/lib/estimateCalc";

const num = (v) => parseFloat(v) || 0;

export default function LineLaborHours({ line, crew, fabRate, installRate, frozen, margin, estMargin, onChange, onMarginChange }) {
  const ov = line.hours_override || {};
  const r2 = (n) => Math.round((n || 0) * 100) / 100;
  // Frozen lines keep their stored snapshot, so read the hours back from the cost when needed.
  const baseFab = line._fab_hours_base ?? (fabRate > 0 ? r2((line.cost_breakdown?.fabrication || 0) / fabRate) : null);
  const baseInst = line._install_hours_base ?? line.install_hours ?? null;
  const fabHrs = ov.fabrication != null ? ov.fabrication : baseFab;
  const instHrs = ov.install != null ? ov.install : baseInst;
  // Crew assigned to the install: the estimator's number, else the catalog default.
  const catalogCrew = num(crew);
  const crewCount = ov.crew != null ? ov.crew : catalogCrew;
  const edited = ov.fabrication != null || ov.install != null || ov.crew != null;
  // Labor can carry its own margin; blank means it follows the line margin.
  const laborMargin = margin != null && margin !== "" ? margin : estMargin;
  const laborPriced = r2(num(line.cost_breakdown?.fabrication) + num(line.cost_breakdown?.install));

  const setOverride = (key, raw) => {
    const next = { ...ov };
    if (raw === "" || isNaN(parseFloat(raw))) delete next[key];
    else next[key] = parseFloat(raw);
    onChange(Object.keys(next).length ? next : null);
  };

  return (
    <div className="border-t bg-muted/20 px-4 py-2.5">
      <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
        <div className="space-y-0.5 pb-1.5">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <Clock className="h-3 w-3" /> Labor hours
          </p>
          {frozen ? (
            <p className="text-[11px] text-muted-foreground">Locked on a sent estimate</p>
          ) : edited ? (
            <button type="button" className="text-[11px] text-primary underline" onClick={() => onChange(null)}>
              Reset to catalog
            </button>
          ) : (
            <p className="text-[11px] text-muted-foreground">From catalog</p>
          )}
        </div>

        {/* Fabrication */}
        <div className="flex items-end gap-2.5">
          <div className="space-y-1">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Fabrication</label>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                step="any"
                min="0"
                disabled={frozen}
                className="h-9 w-24 bg-background text-right font-mono text-sm"
                value={fabHrs ?? ""}
                onChange={(e) => setOverride("fabrication", e.target.value)}
              />
              <span className="text-[11px] text-muted-foreground">hrs</span>
            </div>
          </div>
          <div className="flex items-center gap-1 whitespace-nowrap pb-1.5 text-[11px] text-muted-foreground">
            <span>×</span>
            <span className="font-mono">{money(fabRate, 2)}/hr</span>
            <span>=</span>
            <b className="font-mono text-sm font-semibold text-foreground">{money(line.cost_breakdown?.fabrication || 0)}</b>
          </div>
        </div>

        {/* Install */}
        <div className="flex items-end gap-2.5">
          <div className="space-y-1">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Install</label>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                step="any"
                min="0"
                disabled={frozen}
                className="h-9 w-24 bg-background text-right font-mono text-sm"
                value={instHrs ?? ""}
                onChange={(e) => setOverride("install", e.target.value)}
              />
              <span className="text-[11px] text-muted-foreground">hrs</span>
            </div>
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Crew on site</label>
            <Input
              type="number"
              step="1"
              min="1"
              disabled={frozen}
              className="h-9 w-16 bg-background text-center font-mono text-sm"
              value={crewCount ?? ""}
              onChange={(e) => setOverride("crew", e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1 whitespace-nowrap pb-1.5 text-[11px] text-muted-foreground">
            <span>×</span>
            <span className="font-mono">{money(installRate, 2)}/hr</span>
            <span>=</span>
            <b className="font-mono text-sm font-semibold text-foreground">{money(line.cost_breakdown?.install || 0)}</b>
          </div>
        </div>

        {/* Labor margin — blank follows the line margin */}
        <div className="space-y-1">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Labor margin</label>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              step="any"
              disabled={frozen}
              className="h-9 w-20 bg-background text-right font-mono text-sm"
              placeholder={estMargin != null ? String(estMargin) : ""}
              value={margin ?? ""}
              onChange={(e) => onMarginChange(e.target.value)}
            />
            <span className="text-[11px] text-muted-foreground">%</span>
          </div>
        </div>
        <div className="flex items-center gap-1 whitespace-nowrap pb-1.5 text-[11px] text-muted-foreground">
          <span className="font-mono">{money(laborPriced, 2)}</span>
          <span>labor priced at</span>
          <b className="font-mono text-sm font-semibold text-foreground">{money(priceFromHard(laborPriced, laborMargin))}</b>
        </div>

        <p className="ml-auto pb-2 text-[11px] text-muted-foreground">Rates are set in Settings › Job costing</p>
      </div>
    </div>
  );
}