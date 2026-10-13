import React from "react";
import { Input } from "@/components/ui/input";
import { money } from "@/lib/costGroups";

const Row = ({ label, value, bold }) => (
  <div className={`flex justify-between text-sm ${bold ? "font-bold" : ""}`}><span>{label}</span><span className="font-mono">{value}</span></div>
);
const cap = "text-[11px] font-bold uppercase tracking-wider text-muted-foreground";

export default function CostSummary({ qty, unit, parts, hard, margin, setMargin, jobMin }) {
  const m = parseFloat(margin) || 0;
  const price = m < 100 ? hard / (1 - m / 100) : 0;
  const per = (v) => (qty > 0 ? v / qty : 0);
  const under = price > 0 && jobMin > 0 && price < jobMin;
  return (
    <div className="space-y-4">
      <div className="bg-card border rounded-xl p-5 space-y-2">
        <h4 className={cap}>Hard cost at {qty} {unit}</h4>
        <p className="text-xs text-muted-foreground">Fuel is added per job on the estimate, from distance.</p>
        <Row label="Materials" value={money(parts.materials)} />
        <Row label="Fabrication" value={money(parts.fab)} />
        <Row label="Powder coat" value={money(parts.pc)} />
        <Row label="Install" value={money(parts.install)} />
        <div className="border-t pt-2"><Row label="Hard cost" value={money(hard)} bold /></div>
        <div className="flex justify-between text-xs text-muted-foreground"><span>Per {unit}</span><span className="font-mono">{money(per(hard))}</span></div>
      </div>
      <div className="bg-card border rounded-xl p-5 space-y-2">
        <div className="flex items-center justify-between">
          <span className={cap}>Target margin</span>
          <span className="flex items-center gap-1"><Input type="number" step="any" className="w-20 h-9 text-right" value={margin} onChange={(e) => setMargin(e.target.value)} />%</span>
        </div>
        <div className="flex justify-between items-baseline"><span className="font-bold">Price</span><span className="font-mono text-2xl font-bold text-primary">{money(price)}</span></div>
        <div className="flex justify-between text-xs text-muted-foreground"><span>Per {unit}</span><span className="font-mono">{money(per(price))}</span></div>
        <div className="flex justify-between text-xs text-muted-foreground"><span>Profit</span><span className="font-mono">{money(price - hard)}</span></div>
        <p className="text-xs text-muted-foreground border-t pt-2">Preview only. The real margin is set on each estimate.</p>
        {under && <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">Under the <b>{money(jobMin, 0)} job minimum</b> on its own.</p>}
      </div>
    </div>
  );
}