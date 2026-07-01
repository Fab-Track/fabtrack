/**
 * CostModelPricing — inline cost-model-driven pricing for estimate line items.
 * Replaces the old RailingInlineCalc / StaircaseInlineCalc.
 *
 * Props:
 *   catalogItem: ServiceCatalog item with cost_* fields
 *   fabRate: number — global fabrication $/hr (from AppSettings)
 *   installRate: number — global install $/hr (from AppSettings)
 *   onPriceChange: fn(pricePerUnit, qty, breakdown)
 */
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator } from "lucide-react";

function round2(n) {
  return Math.round(n * 100) / 100;
}

export default function CostModelPricing({ catalogItem, fabRate = 0, installRate = 0, onPriceChange }) {
  const primaryUnit = catalogItem?.cost_primary_unit || catalogItem?.unit || "unit";
  const [quantity, setQuantity] = useState("");
  const [markup, setMarkup] = useState(catalogItem?.cost_markup_multiplier ?? 1.5);

  const m = catalogItem?.cost_materials_per_unit || 0;
  const fh = catalogItem?.cost_fab_hours_per_unit || 0;
  const pc = catalogItem?.cost_powder_coat_per_unit || 0;
  const cs = catalogItem?.cost_install_crew_size || 0;
  const ih = catalogItem?.cost_install_hours_per_unit || 0;
  const mk = parseFloat(markup) || 1;
  const qty = parseFloat(quantity) || 0;

  const materialsCost = round2(m);
  const fabCost = round2(fh * fabRate);
  const powderCoatCost = round2(pc);
  const installCost = round2(cs * ih * installRate);
  const hardCost = round2(materialsCost + fabCost + powderCoatCost + installCost);
  const pricePerUnit = round2(hardCost * mk);
  const total = round2(qty * pricePerUnit);

  useEffect(() => {
    if (qty > 0) {
      onPriceChange?.(pricePerUnit, qty, {
        hardCostPerUnit: hardCost,
        costComponents: { materials: materialsCost, fabrication: fabCost, powder_coat: powderCoatCost, install: installCost },
        markup: mk,
      });
    }
  }, [pricePerUnit, qty, hardCost, materialsCost, fabCost, powderCoatCost, installCost, mk]);

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-800">
        <Calculator className="w-3.5 h-3.5" />
        Cost Model Pricing
        {qty > 0 && (
          <span className="ml-auto font-bold">
            ${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wide text-blue-700">Quantity ({primaryUnit})</Label>
          <Input
            type="number"
            className="h-7 text-xs bg-white"
            placeholder="0"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            autoFocus
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wide text-blue-700">Markup ×</Label>
          <Input
            type="number"
            step="0.01"
            className="h-7 text-xs bg-white"
            placeholder="1.50"
            value={markup}
            onChange={e => setMarkup(e.target.value)}
          />
        </div>
      </div>

      {qty > 0 && (
        <div className="bg-white rounded border border-blue-200 px-3 py-2 space-y-0.5 text-[11px]">
          <div className="flex justify-between text-muted-foreground">
            <span>Materials</span><span>${materialsCost.toFixed(2)}/unit</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Fab ({fh}h × ${fabRate.toFixed(2)}/h)</span><span>${fabCost.toFixed(2)}/unit</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Powder coat</span><span>${powderCoatCost.toFixed(2)}/unit</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Install ({cs}×{ih}h × ${installRate.toFixed(2)}/h)</span><span>${installCost.toFixed(2)}/unit</span>
          </div>
          <div className="border-t my-0.5" />
          <div className="flex justify-between font-semibold">
            <span>Hard cost</span><span>${hardCost.toFixed(2)}/unit</span>
          </div>
          <div className="flex justify-between font-bold text-blue-800">
            <span>Price (×{mk.toFixed(2)})</span><span>${pricePerUnit.toFixed(2)}/unit</span>
          </div>
          <div className="flex justify-between font-bold text-blue-900 border-t pt-0.5">
            <span>Total ({qty} {primaryUnit})</span>
            <span>${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      )}

      {fabRate === 0 && fh > 0 && (
        <p className="text-[10px] text-amber-600">⚠ Set Fabrication rate in Settings → Payroll</p>
      )}
      {installRate === 0 && cs * ih > 0 && (
        <p className="text-[10px] text-amber-600">⚠ Set Install rate in Settings → Payroll</p>
      )}
    </div>
  );
}