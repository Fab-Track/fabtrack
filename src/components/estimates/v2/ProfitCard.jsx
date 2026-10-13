import React from "react";
import { money } from "@/lib/costGroups";

export default function ProfitCard({ hard, price }) {
  const profit = price - hard;
  const pct = price > 0 ? (profit / price) * 100 : 0;
  return (
    <div className="bg-card border rounded-xl p-5">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Internal — job profit</p>
      <div className="flex justify-between py-1"><span>Hard cost</span><span className="font-mono">{money(hard)}</span></div>
      <div className="flex justify-between py-1"><span>Profit</span><span className="font-mono">{money(profit)}</span></div>
      <div className="flex justify-between items-baseline py-1"><span className="font-bold">Margin on calculated lines</span><span className="font-mono text-2xl font-bold text-primary">{pct.toFixed(1)}%</span></div>
      <p className="text-xs text-muted-foreground mt-2">Railing and fuel only; fixed-price add-ons are excluded. Costs are saved onto the estimate when sent, so later catalog changes won't alter it.</p>
    </div>
  );
}