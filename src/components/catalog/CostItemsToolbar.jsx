import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { USED_AS_OPTIONS } from "@/lib/costItems";

const QUICK = [
  { id: "all", label: "All" },
  { id: "railing", label: "Railing components" },
  { id: "review", label: "Needs review" },
];

export default function CostItemsToolbar({ search, setSearch, shape, setShape, used, setUsed, quick, setQuick, shapes, counts }) {
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
      <div className="flex flex-wrap gap-2">
        {QUICK.map((q) => (
          <button
            key={q.id}
            onClick={() => setQuick(q.id)}
            className={`rounded-md border px-3 py-1.5 text-sm font-semibold ${quick === q.id ? "bg-foreground text-background border-foreground" : "bg-card hover:bg-muted"}`}
          >
            {q.label} · {counts[q.id] ?? 0}
          </button>
        ))}
      </div>
    </div>
  );
}