import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Briefcase, Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function JobContextPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: jobs = [] } = useQuery({
    queryKey: ["assistant-jobs"],
    queryFn: async () => {
      const page = await base44.entities.Job.filter({ is_archived: false }, { sort: "-created_date", limit: 300 });
      return page.items || [];
    },
    staleTime: 60 * 1000,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return jobs.slice(0, 40);
    return jobs
      .filter((j) =>
        [j.job_number, j.job_name, j.customer_name].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
      )
      .slice(0, 40);
  }, [jobs, search]);

  const selected = value ? jobs.find((j) => j.id === value.id) : null;
  const label = selected ? `${selected.job_number || ""} ${selected.job_name || ""}`.trim() : value?.label;

  return (
    <div className="flex items-center gap-1 min-w-0">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn("h-8 max-w-[15rem] justify-between gap-1.5 font-normal", !label && "text-muted-foreground")}
          >
            <Briefcase className="w-3.5 h-3.5 shrink-0 opacity-60" />
            <span className="truncate">{label || "No job selected"}</span>
            <ChevronsUpDown className="w-3 h-3 shrink-0 opacity-40" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-0">
          <div className="p-2 border-b border-border">
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search job #, name or customer…"
              className="h-8 text-sm"
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">No jobs match that search.</p>
            )}
            {filtered.map((j) => (
              <button
                key={j.id}
                onClick={() => { onChange({ id: j.id, label: `${j.job_number || ""} ${j.job_name || ""}`.trim() }); setOpen(false); }}
                className="w-full flex items-start gap-2 px-2 py-1.5 rounded-md text-left hover:bg-secondary transition-colors"
              >
                <Check className={cn("w-3.5 h-3.5 mt-0.5 shrink-0", value?.id === j.id ? "opacity-100" : "opacity-0")} />
                <span className="min-w-0">
                  <span className="block text-sm leading-tight truncate">{j.job_name || "Untitled job"}</span>
                  <span className="block text-[11px] text-muted-foreground truncate">
                    {[j.job_number, j.customer_name].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      {value?.id && (
        <button
          onClick={() => onChange(null)}
          className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0"
          aria-label="Clear job context"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}