import React from "react";
import { Input } from "@/components/ui/input";

const QUICK = [10, 20, 42, 75, 120];

export default function TestBar({ length, setLength, unit, railing, isResidential, setResidential }) {
  const n = parseFloat(length);
  const seg = (active) => `px-4 py-2 text-sm font-semibold ${active ? "bg-foreground text-background" : "bg-card"}`;
  return (
    <div className="bg-card border rounded-xl p-4 flex flex-wrap items-center gap-3">
      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Test {railing ? "length" : "quantity"}</span>
      <Input type="number" min="0" className="w-28 h-11 text-lg font-semibold" value={length} onChange={(e) => setLength(e.target.value)} />
      <span className="font-bold">{unit}</span>
      <div className="flex gap-2 flex-wrap">
        {QUICK.map((q) => (
          <button key={q} type="button" onClick={() => setLength(String(q))} className={`rounded-md border px-3 py-1.5 font-mono text-xs ${n === q ? "bg-foreground text-background" : "bg-card"}`}>
            {q} {unit}
          </button>
        ))}
      </div>
      {railing && (
        <div className="flex border rounded-md overflow-hidden ml-auto">
          <button type="button" className={seg(isResidential)} onClick={() => setResidential(true)}>Residential</button>
          <button type="button" className={seg(!isResidential)} onClick={() => setResidential(false)}>Commercial</button>
        </div>
      )}
    </div>
  );
}