import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { USED_AS_OPTIONS } from "@/lib/costItems";

const QUICK = [
  { id: "all", label: "All" },
  { id: "railing", label: "Railing components" },
  { id: "review", label: "Needs review" },
];

const pill = (active) =>
  `rounded-md border px-3 py-1.5 text-sm font-semibold ${active ? "bg-foreground text-background border-foreground" : "bg-card hover:bg-muted"}`;

export default function CostItemsToolbar({ search, setSearch, shape, setShape, used, setUsed, quick, onQuick, code, onCode, shapes, counts, costCodes = [], codeCounts = {} }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <Input className="flex-1 bg-card" placeholder="Search name or SKU" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={shape} onValueChange={setShape}>
          <SelectTrigger className="sm:w-44 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All shapes</SelectItem>
            {shapes.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={used} onValueChange={setUsed}>
          <SelectTrigger className="sm:w-44 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any component</SelectItem>
            {USED_AS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {QUICK.map((q) => (
          <button key={q.id} onClick={() => onQuick(q.id)} className={pill(quick === q.id && !code)}>
            {q.label} · {counts[q.id] ?? 0}
          </button>
        ))}
        {costCodes.length > 0 && <span className="w-px h-6 bg-border mx-1" />}
        {costCodes.map((c) => (
          <button key={c.id} onClick={() => onCode(c.id)} className={pill(code === c.id)}
            title={`Cost code ${c.code_number ? `${c.code_number} · ` : ""}${c.name}`}>
            {c.name} · {codeCounts[c.id] ?? 0}
          </button>
        ))}
      </div>
    </div>
  );
}