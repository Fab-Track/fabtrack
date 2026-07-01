/**
 * CostModelEditor — structured per-item cost model with live math preview.
 *
 * Props:
 *   initial: object with cost_* fields from a ServiceCatalog item
 *   fabRate: number — global fabrication $/hr (from AppSettings)
 *   installRate: number — global install $/hr (from AppSettings)
 *   onChange: fn(costModel) — called with the full cost model object on every change
 */
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator } from "lucide-react";

const PRIMARY_UNIT_OPTIONS = ["Linear Foot", "Riser", "sqft", "ea", "ls", "per tread", "per inch elevation"];

function num(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

export default function CostModelEditor({ initial = {}, fabRate = 0, installRate = 0, onChange }) {
  const [primaryUnit, setPrimaryUnit] = useState(initial.cost_primary_unit || "Linear Foot");
  const [materials, setMaterials] = useState(initial.cost_materials_per_unit ?? "");
  const [fabHours, setFabHours] = useState(initial.cost_fab_hours_per_unit ?? "");
  const [powderCoat, setPowderCoat] = useState(initial.cost_powder_coat_per_unit ?? "");
  const [crewSize, setCrewSize] = useState(initial.cost_install_crew_size ?? "");
  const [installHours, setInstallHours] = useState(initial.cost_install_hours_per_unit ?? "");
  const [markup, setMarkup] = useState(initial.cost_markup_multiplier ?? 1.5);
  const [sampleQty, setSampleQty] = useState("20");

  const m = num(materials);
  const fh = num(fabHours);
  const pc = num(powderCoat);
  const cs = num(crewSize);
  const ih = num(installHours);
  const mk = num(markup) || 1;
  const sq = num(sampleQty);

  const fabCost = round2(fh * fabRate);
  const installCost = round2(cs * ih * installRate);
  const hardCost = round2(m + fabCost + pc + installCost);
  const pricePerUnit = round2(hardCost * mk);

  const sampleHardCost = round2(hardCost * sq);
  const samplePrice = round2(pricePerUnit * sq);

  // Notify parent on every change
  useEffect(() => {
    onChange?.({
      cost_primary_unit: primaryUnit,
      cost_materials_per_unit: m,
      cost_fab_hours_per_unit: fh,
      cost_powder_coat_per_unit: pc,
      cost_install_crew_size: cs,
      cost_install_hours_per_unit: ih,
      cost_markup_multiplier: mk,
    });
  }, [primaryUnit, m, fh, pc, cs, ih, mk]);

  return (
    <div className="border rounded-lg p-4 bg-blue-50/30 space-y-4">
      <div className="flex items-center gap-1.5 text-sm font-semibold text-blue-800">
        <Calculator className="w-4 h-4" />
        Cost Model
      </div>

      {/* Primary unit selector */}
      <div>
        <Label className="text-xs font-medium">Primary Unit</Label>
        <p className="text-xs text-muted-foreground mb-1.5">The quantity unit this product is priced by.</p>
        <div className="flex flex-wrap gap-1.5">
          {PRIMARY_UNIT_OPTIONS.map(u => (
            <button
              key={u}
              type="button"
              onClick={() => setPrimaryUnit(u)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                primaryUnit === u
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-white text-muted-foreground border-border hover:border-primary/40"
              }`}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {/* Cost inputs grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Materials $/unit</Label>
          <Input type="number" step="0.01" className="h-8 text-sm" placeholder="0.00" value={materials} onChange={e => setMaterials(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Fab hrs/unit</Label>
          <Input type="number" step="0.01" className="h-8 text-sm" placeholder="0.00" value={fabHours} onChange={e => setFabHours(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Powder coat $/unit</Label>
          <Input type="number" step="0.01" className="h-8 text-sm" placeholder="0.00" value={powderCoat} onChange={e => setPowderCoat(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Install crew size</Label>
          <Input type="number" step="1" className="h-8 text-sm" placeholder="0" value={crewSize} onChange={e => setCrewSize(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Install hrs/unit</Label>
          <Input type="number" step="0.01" className="h-8 text-sm" placeholder="0.00" value={installHours} onChange={e => setInstallHours(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Markup multiplier</Label>
          <Input type="number" step="0.01" className="h-8 text-sm" placeholder="1.50" value={markup} onChange={e => setMarkup(e.target.value)} />
        </div>
      </div>

      {/* Live breakdown */}
      <div className="bg-white border border-blue-200 rounded-lg p-3 space-y-1 text-xs">
        <div className="flex justify-between text-muted-foreground">
          <span>Materials cost/unit</span>
          <span>${m.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Fab cost/unit <span className="text-[10px] opacity-70">({fh} hrs × ${fabRate.toFixed(2)}/hr)</span></span>
          <span>${fabCost.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Powder coat/unit</span>
          <span>${pc.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Install cost/unit <span className="text-[10px] opacity-70">({cs} crew × {ih} hrs × ${installRate.toFixed(2)}/hr)</span></span>
          <span>${installCost.toFixed(2)}</span>
        </div>
        <div className="border-t my-1" />
        <div className="flex justify-between font-semibold text-foreground">
          <span>Hard cost/unit</span>
          <span>${hardCost.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold text-blue-800">
          <span>Price/unit <span className="text-[10px] font-normal opacity-70">(× {mk.toFixed(2)} markup)</span></span>
          <span>${pricePerUnit.toFixed(2)}</span>
        </div>
      </div>

      {/* Sample calculation */}
      <div className="bg-white border border-blue-200 rounded-lg p-3 space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <Label className="text-xs font-medium whitespace-nowrap">Sample quantity</Label>
          <Input type="number" step="1" className="h-7 text-sm w-24" value={sampleQty} onChange={e => setSampleQty(e.target.value)} />
          <span className="text-xs text-muted-foreground">{primaryUnit}</span>
        </div>
        {sq > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-muted-foreground">
              <span>Hard cost at {sq} {primaryUnit}</span>
              <span>${sampleHardCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between font-bold text-blue-800">
              <span>Price at {sq} {primaryUnit}</span>
              <span>${samplePrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}