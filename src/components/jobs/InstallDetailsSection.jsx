import React from "react";
import { Wrench } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export default function InstallDetailsSection({ data = {}, config, onChange }) {
  const set = (key, val) => onChange({ ...data, [key]: val });

  return (
    <CollapsibleSection title="Install Details" icon={Wrench}>
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <FieldRow label="Surface">
            <OptionSelect value={data.surface} onChange={v => set("surface", v)} options={config.surfaces} />
          </FieldRow>
        </div>
        {data.surface === C.OTHER && (
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