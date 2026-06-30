import React from "react";
import { Wrench, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CollapsibleSection from "@/components/jobs/CollapsibleSection";
import { CONDITIONAL_PRODUCT_KEYS as C } from "@/lib/jobDetailDefaults";

function FieldRow({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function OptionSelect({ value, onChange, options, placeholder = "Select..." }) {
  return (
    <Select value={value || ""} onValueChange={onChange}>
      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {options.map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function SurfaceMultiSelect({ selected = [], options, onChange }) {
  const toggle = (item) => {
    onChange(selected.includes(item) ? selected.filter(s => s !== item) : [...selected, item]);
  };
  const remove = (item) => onChange(selected.filter(s => s !== item));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="min-h-8 w-full flex flex-wrap items-center gap-1 rounded-md border border-input bg-transparent px-2 py-1 text-xs text-left hover:bg-accent/50 focus:outline-none focus:ring-1 focus:ring-ring">
          {selected.length === 0 ? (
            <span className="text-muted-foreground">Select surfaces...</span>
          ) : (
            selected.map(s => (
              <span key={s} className="inline-flex items-center gap-0.5 rounded bg-accent/20 px-1.5 py-0.5 text-xs">
                {s}
                <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={(e) => { e.stopPropagation(); remove(s); }} />
              </span>
            ))
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="max-h-52 overflow-y-auto space-y-1">
          {options.map(o => (
            <div key={o} className="flex items-center gap-2 rounded px-1 py-0.5 hover:bg-accent/30 cursor-pointer" onClick={() => toggle(o)}>
              <Checkbox checked={selected.includes(o)} onCheckedChange={() => toggle(o)} />
              <span className="text-xs">{o}</span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function InstallDetailsSection({ data = {}, config, onChange }) {
  const set = (key, val) => onChange({ ...data, [key]: val });

  return (
    <CollapsibleSection title="Install Details" icon={Wrench}>
      <div className="space-y-3">
        <FieldRow label="Surface">
          <SurfaceMultiSelect selected={data.surfaces || []} options={config.surfaces} onChange={v => set("surfaces", v)} />
        </FieldRow>
        {(data.surfaces || []).includes(C.OTHER) && (
          <FieldRow label="Other Surface Notes">
            <Input className="h-8 text-xs" value={data.surface_notes || ""} onChange={e => set("surface_notes", e.target.value)} placeholder="Describe surface..." />
          </FieldRow>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <FieldRow label="Backing">
            <OptionSelect
              value={data.backing}
              onChange={v => set("backing", v)}
              options={["Yes", "No", "Contractor is Providing", "HCMW is Providing", "Unknown", "N/A"]}
            />
          </FieldRow>
        </div>
        <FieldRow label="Backing Notes">
          <Input className="h-8 text-xs" value={data.backing_notes || ""} onChange={e => set("backing_notes", e.target.value)} placeholder="Notes..." />
        </FieldRow>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <FieldRow label="Demo">
            <OptionSelect value={data.demo} onChange={v => set("demo", v)} options={["Yes", "No"]} />
          </FieldRow>
          <FieldRow label="OSHA Required PPE">
            <OptionSelect value={data.osha_required_ppe} onChange={v => set("osha_required_ppe", v)} options={["Yes", "No"]} />
          </FieldRow>
        </div>
        {data.demo === "No" && (
          <FieldRow label="Demo Notes">
            <Input className="h-8 text-xs" value={data.demo_notes || ""} onChange={e => set("demo_notes", e.target.value)} placeholder="Why no demo..." />
          </FieldRow>
        )}
      </div>
    </CollapsibleSection>
  );
}