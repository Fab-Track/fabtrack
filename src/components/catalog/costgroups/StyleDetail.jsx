import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Crumbs from "./Crumbs";
import Pill from "./Pill";
import TestBar from "./TestBar";
import LayoutCard from "./LayoutCard";
import ComponentsCard from "./ComponentsCard";
import LaborCard from "./LaborCard";
import CostSummary from "./CostSummary";
import EditStyleDialog from "./EditStyleDialog";
import { computeLayout, costComponent, resolveSettings } from "@/lib/railingTakeoff";
import { overridesOf, statusOf, unitChip, unitLabel } from "@/lib/costGroups";

const FIELD = { fab: "cost_fab_hours_per_unit", pc: "cost_powder_coat_per_unit", crew: "cost_install_crew_size", inst: "cost_install_hours_per_unit" };
const num = (v) => parseFloat(v) || 0;
const toRules = (it) => ({ fab: it.cost_fab_hours_per_unit ?? 0, pc: it.cost_powder_coat_per_unit ?? 0, crew: it.cost_install_crew_size ?? 0, inst: it.cost_install_hours_per_unit ?? 0 });

export default function StyleDetail({ item, category, settings, materials, orgId, refresh, onBack, onBackToCategory, onOpenItem }) {
  const [length, setLength] = useState("20");
  const [isResidential, setResidential] = useState(true);
  const [rows, setRows] = useState(item.components || []);
  const [rules, setRules] = useState(toRules(item));
  const [margin, setMargin] = useState(String(settings?.default_target_margin_pct ?? 33.3));
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => { setRows(item.components || []); setRules(toRules(item)); }, [item.id, item.updated_date]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (settings?.default_target_margin_pct != null) setMargin(String(settings.default_target_margin_pct)); }, [settings?.default_target_margin_pct]);

  const railing = !!(category?.is_railing || item.is_railing);
  const unit = unitLabel(category);
  const qty = num(length);
  const s = settings || {};
  const layout = useMemo(
    () => (railing ? computeLayout({ catalogItem: item, settings: resolveSettings(settings ? [settings] : []), length: qty, isResidential, category }) : null),
    [railing, item, settings, qty, isResidential, category]
  );
  const results = rows.map((r) => costComponent(r, materials.find((m) => m.id === r.material_id), layout, qty));
  const rates = { fab: s.labor_fab_rate || 0, install: s.labor_install_rate || 0 };
  const hoursPerDay = s.install_hours_per_day || 8;
  const fabHrs = num(rules.fab) / 10 * qty;
  const instHrs = num(rules.inst) / 10 * qty;
  const calc = {
    qty, fabHrs, instHrs,
    fab: fabHrs * rates.fab,
    pc: num(rules.pc) * qty,
    install: instHrs * num(rules.crew) * rates.install,
    days: instHrs > 0 ? Math.ceil(instHrs / hoursPerDay) : 0,
  };
  const parts = { materials: results.reduce((a, r) => a + (r?.cost || 0), 0), fab: calc.fab, pc: calc.pc, install: calc.install };
  const hard = parts.materials + parts.fab + parts.pc + parts.install;

  const st = statusOf({ ...item, components: rows }, category);
  const ov = overridesOf(item, category);
  const dirty = JSON.stringify(rows.filter((r) => r.material_id)) !== JSON.stringify(item.components || []);

  async function saveComponents() {
    setSaving(true);
    await base44.entities.ServiceCatalog.update(item.id, { components: rows.filter((r) => r.material_id) });
    setSaving(false);
    toast.success("Components saved");
    refresh();
  }
  async function commitRule(field) {
    const v = num(rules[field]);
    if (v === (item[FIELD[field]] ?? 0)) return;
    await base44.entities.ServiceCatalog.update(item.id, { [FIELD[field]]: v });
    refresh();
  }
  async function duplicate() {
    const { id, created_date, updated_date, created_by_id, created_by, ...rest } = item;
    const rec = await base44.entities.ServiceCatalog.create({ ...rest, name: `${item.name} (copy)`, qbo_item_id: "", qbo_item_name: "" });
    refresh();
    onOpenItem(rec.id);
  }

  const chip = "rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground";
  return (
    <div className="space-y-4">
      <Crumbs parts={[{ label: "Catalog", onClick: onBack }, { label: "Cost Groups", onClick: onBack }, { label: category?.name, onClick: onBackToCategory }, { label: item.name }]} />
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold">{item.name}</h2>
          <div className="flex gap-2 flex-wrap">
            <Pill tone={st.tone}>{st.label}</Pill>
            {unitChip(category) && <span className={chip}>Priced {unitChip(category)}</span>}
            {ov.length > 0 && <span className={chip}>Override: {ov.map((o) => `${o.short.toLowerCase()} ${o.value}`).join(", ")}</span>}
            {item.qbo_item_name && <span className={chip}>QuickBooks: {item.qbo_item_name}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={duplicate}>Duplicate</Button>
          <Button variant="outline" onClick={() => setEditOpen(true)}>Edit style</Button>
        </div>
      </div>
      <TestBar length={length} setLength={setLength} unit={unit} railing={railing} isResidential={isResidential} setResidential={setResidential} />
      <div className="grid gap-4 lg:grid-cols-[1fr_300px] items-start">
        <div className="space-y-4 min-w-0">
          {railing && <LayoutCard layout={layout} />}
          <ComponentsCard rows={rows} setRows={setRows} results={results} materials={materials} layout={layout} length={qty} railing={railing}
            dirty={dirty} saving={saving} onSave={saveComponents} orgId={orgId} refresh={refresh} />
          <LaborCard rules={rules} setRule={(f, v) => setRules((p) => ({ ...p, [f]: v }))} commit={commitRule} calc={calc} unit={unit} rates={rates} hoursPerDay={hoursPerDay} />
        </div>
        <CostSummary qty={qty} unit={unit} parts={parts} hard={hard} margin={margin} setMargin={setMargin} jobMin={s.job_minimum || 0} />
      </div>
      <EditStyleDialog open={editOpen} onOpenChange={setEditOpen} item={item} category={category} onSaved={refresh} />
    </div>
  );
}