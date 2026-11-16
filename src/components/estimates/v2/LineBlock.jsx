import React, { useMemo } from "react";
import { Input } from "@/components/ui/input";
import LineHeader from "@/components/estimates/v2/LineHeader";
import ComponentRow, { CostInput } from "@/components/estimates/v2/ComponentRow";
import LineItemPhotoUpload from "@/components/estimates/LineItemPhotoUpload";
import { money } from "@/lib/costGroups";
import { catalogCost, componentMargins, componentPrices, hasMargin, num, r2 } from "@/lib/estimateCalc";

const hrs = (v) => (v == null || v === "" ? "" : v);

// One cost-group line: everything that makes up its price, on a single aligned block.
export default function LineBlock({ line, idx, estMargin, frozen, ctx, item, colors, locations, fabRate, installRate, onChange, onRemove, onTakeoff }) {
  const set = (patch) => onChange(idx, patch);
  const bd = line.cost_breakdown || {};
  const ov = line.hours_override || {};
  const qty = num(line.quantity);
  const unit = line.unit || "unit";
  const margins = componentMargins(line, estMargin);
  const prices = componentPrices(bd, margins);
  // The lock is a stored line field now. A record saved before it existed carries the same flag
  // as a marker inside its takeoff snapshot, which is still read as a fallback.
  const locked = line._takeoff_locked === true || line._railing_takeoff?.overridden === true;
  // The catalog suggestion is only needed to describe a Reset, so only price it when one shows.
  const isModified = ov.fabrication != null || ov.install != null || ov.crew != null || hasMargin(line.material_margin_pct)
    || hasMargin(line.powder_coat_margin_pct) || hasMargin(line.fab_margin_pct) || hasMargin(line.install_margin_pct) || locked;
  const cat = useMemo(() => (isModified ? catalogCost(line, ctx) : null), [isModified, line, ctx]);
  const catalogCrew = num(item?.cost_install_crew_size);
  const crew = ov.crew != null ? num(ov.crew) : catalogCrew;
  const baseFab = line._fab_hours_base != null ? line._fab_hours_base : fabRate > 0 ? r2(num(bd.fabrication) / fabRate) : null;
  const baseInst = line._install_hours_base != null ? line._install_hours_base : line.install_hours;
  const fabHrs = ov.fabrication != null ? ov.fabrication : baseFab;
  const instHrs = ov.install != null ? ov.install : baseInst;
  const blended = num(line.total) > 0 ? r2((1 - num(line.hard_cost) / num(line.total)) * 100) : 0;

  const setHours = (key, raw) => {
    const next = { ...ov };
    if (raw === "" || isNaN(parseFloat(raw))) delete next[key];
    else next[key] = parseFloat(raw);
    set({ hours_override: Object.keys(next).length ? next : null });
  };
  // Overriding a cost freezes the line's costs on _takeoff_locked, now a stored field, so the
  // override survives a reload. The snapshot keeps the inputs the recompute gate reads; its old
  // overridden marker is no longer written (it is only read, for records saved before the field).
  const setCost = (key, raw) => set({
    cost_breakdown: { ...bd, [key]: num(raw) },
    _takeoff_locked: true,
    _railing_takeoff: line._railing_takeoff || { inputs: { length: qty, isResidential: line.building_type !== "Commercial" } },
  });
  // Clearing the lock lets the takeoff re-derive both shared costs on the next render.
  const unlock = (patch) => set({ ...patch, _takeoff_locked: false, _railing_takeoff: line._railing_takeoff ? { ...line._railing_takeoff, overridden: false } : null });

  const hint = (key, label) => (cat
    ? `Restore the catalog ${label} cost: ${money(cat.breakdown[key])} for ${qty} ${unit}.`
    : `Restore the catalog ${label} cost.`);
  const basis = (total) => `${money(qty > 0 ? num(total) / qty : 0)}/${unit} × ${qty} ${unit}`;
  const perTen = (v) => (v != null && num(v) > 0 ? `catalog ${v} hrs/10 ${unit}` : "from catalog");

  return (
    <div className="border-t first:border-t-0">
      <LineHeader line={line} frozen={frozen} colors={colors} locations={locations} blended={blended} onChange={set} onRemove={() => onRemove(idx)} />

      <ComponentRow
        label="Materials"
        note={line.components?.length ? `from takeoff · ${line.components.length} components` : "from takeoff"}
        detail={
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="font-mono">{basis(bd.materials)}</span>
            {line.components?.length > 0 && <button type="button" className="text-primary underline" onClick={() => onTakeoff(line)}>View takeoff</button>}
          </div>
        }
        cost={<CostInput value={bd.materials} frozen={frozen} onChange={(v) => setCost("materials", v)} />}
        margin={line.material_margin_pct}
        placeholder={String(margins.materials)}
        price={prices.materials}
        frozen={frozen}
        onMargin={(v) => set({ material_margin_pct: v === "" ? null : parseFloat(v) })}
        onReset={locked || hasMargin(line.material_margin_pct) ? () => unlock({ material_margin_pct: null }) : null}
        resetHint={hint("materials", "material")}
      />

      <ComponentRow
        label="Powder coat"
        note="from takeoff"
        detail={<span className="font-mono text-[11px] text-muted-foreground">{basis(bd.powder_coat)}</span>}
        cost={<CostInput value={bd.powder_coat} frozen={frozen} onChange={(v) => setCost("powder_coat", v)} />}
        margin={line.powder_coat_margin_pct}
        placeholder={String(margins.powder_coat)}
        price={prices.powder_coat}
        frozen={frozen}
        onMargin={(v) => set({ powder_coat_margin_pct: v === "" ? null : parseFloat(v) })}
        onReset={locked || hasMargin(line.powder_coat_margin_pct) ? () => unlock({ powder_coat_margin_pct: null }) : null}
        resetHint={hint("powder_coat", "powder coat")}
      />

      <ComponentRow
        label="Fabrication labor"
        note={perTen(item?.cost_fab_hours_per_unit)}
        detail={
          <div className="flex items-center gap-1">
            <Input type="number" step="any" min="0" disabled={frozen} className="h-7 w-16 bg-background text-right font-mono text-sm" value={hrs(fabHrs)} onChange={(e) => setHours("fabrication", e.target.value)} />
            <span className="whitespace-nowrap text-[11px] text-muted-foreground">hrs × {money(fabRate, 2)}/hr</span>
          </div>
        }
        cost={<span className="font-mono text-sm">{money(bd.fabrication || 0)}</span>}
        margin={line.fab_margin_pct}
        placeholder={String(margins.fabrication)}
        price={prices.fabrication}
        frozen={frozen}
        onMargin={(v) => set({ fab_margin_pct: v === "" ? null : parseFloat(v) })}
        onReset={ov.fabrication != null || hasMargin(line.fab_margin_pct) ? () => { const n = { ...ov }; delete n.fabrication; set({ hours_override: Object.keys(n).length ? n : null, fab_margin_pct: null }); } : null}
        resetHint={cat ? `Restore catalog hours: ${cat.fabHrs} hrs at ${money(fabRate, 2)}/hr = ${money(cat.breakdown.fabrication)}.` : "Restore catalog hours."}
      />

      <ComponentRow
        label="Install labor"
        note={perTen(item?.cost_install_hours_per_unit)}
        detail={
          <div className="flex items-center gap-1">
            <Input type="number" step="any" min="0" disabled={frozen} className="h-7 w-16 bg-background text-right font-mono text-sm" value={hrs(instHrs)} onChange={(e) => setHours("install", e.target.value)} />
            <span className="whitespace-nowrap text-[11px] text-muted-foreground">hrs ×</span>
            <Input type="number" step="1" min="1" disabled={frozen} className="h-7 w-12 bg-background text-center font-mono text-sm" value={crew ?? ""} onChange={(e) => setHours("crew", e.target.value)} />
            <span className="whitespace-nowrap text-[11px] text-muted-foreground">crew × {money(installRate, 2)}/hr</span>
          </div>
        }
        cost={<span className="font-mono text-sm">{money(bd.install || 0)}</span>}
        margin={line.install_margin_pct}
        placeholder={String(margins.install)}
        price={prices.install}
        frozen={frozen}
        onMargin={(v) => set({ install_margin_pct: v === "" ? null : parseFloat(v) })}
        onReset={ov.install != null || ov.crew != null || hasMargin(line.install_margin_pct) ? () => { const n = { ...ov }; delete n.install; delete n.crew; set({ hours_override: Object.keys(n).length ? n : null, install_margin_pct: null }); } : null}
        resetHint={cat ? `Restore catalog hours: ${cat.instHrs} hrs · crew ${cat.crew} = ${money(cat.breakdown.install)}.` : "Restore catalog hours and crew."}
      />

      <div className="px-4 pb-2">
        <LineItemPhotoUpload photoUrl={line.photo_url} showPhoto={line.show_photo} onChange={(url) => set({ photo_url: url })} onToggleShow={() => set({ show_photo: line.show_photo === false })} />
      </div>
    </div>
  );
}