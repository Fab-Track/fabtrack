/**
 * LineItemCostBreakdown — internal-only hard cost / margin display for estimate line items.
 * Shown in the EstimateEditor detail view, never on customer-facing views.
 *
 * Props:
 *   line: estimate line item with _hard_cost_per_unit, _markup_multiplier, unit_cost, quantity
 *   onMarkupChange: fn(value) — called when markup input changes
 *   disabled: boolean — disable the markup input (e.g. locked estimate)
 */
import React from "react";
import { Input } from "@/components/ui/input";

function round2(n) {
  return Math.round(n * 100) / 100;
}

export default function LineItemCostBreakdown({ line, onMarkupChange, disabled = false }) {
  if (!line._hard_cost_per_unit) return null;

  const hardCostPerUnit = line._hard_cost_per_unit;
  const qty = parseFloat(line.quantity) || 0;
  const unitCost = parseFloat(line.unit_cost) || 0;
  const hardCostTotal = round2(hardCostPerUnit * qty);
  const marginTotal = round2((unitCost - hardCostPerUnit) * qty);
  const marginPct = unitCost > 0 ? ((unitCost - hardCostPerUnit) / unitCost * 100) : 0;

  return (
    <div className="flex items-center gap-3 flex-wrap pl-1 py-0.5 text-[11px] text-muted-foreground">
      <div className="flex items-center gap-1">
        <span>Markup ×</span>
        <Input
          type="number"
          step="0.01"
          className="h-6 w-14 text-[11px]"
          value={line._markup_multiplier ?? 1.5}
          onChange={e => onMarkupChange?.(e.target.value)}
          disabled={disabled}
        />
      </div>
      <span>Hard cost: <strong className="text-foreground">${hardCostPerUnit.toFixed(2)}/unit</strong></span>
      <span>→ <strong className="text-foreground">${hardCostTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
      <span className={marginTotal >= 0 ? "text-emerald-600" : "text-destructive"}>
        Margin: ${marginTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({marginPct.toFixed(1)}%)
      </span>
    </div>
  );
}