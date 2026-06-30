import React from "react";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CollapsibleSection from "@/components/jobs/CollapsibleSection";

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

function MultiCheck({ label, checked, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={label} checked={!!checked} onCheckedChange={val => onChange(val)} />
      <Label htmlFor={label} className="text-xs font-normal leading-tight cursor-pointer">{label}</Label>
    </div>
  );
}

export default function SiteAccessSection({ data = {}, onChange }) {
  const set = (key, val) => onChange({ ...data, [key]: val });

  const toggleArray = (key, item, checked) => {
    const arr = data[key] || [];
    set(key, checked ? [...arr, item] : arr.filter(i => i !== item));
  };

  return (
    <CollapsibleSection title="Site Access" icon={MapPin}>
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <FieldRow label="Entry Code">
            <Input className="h-8 text-xs" value={data.entry_code || ""} onChange={e => set("entry_code", e.target.value)} placeholder="e.g. #1234" />
          </FieldRow>
          <FieldRow label="Site Hours">
            <Input className="h-8 text-xs" value={data.site_hours || ""} onChange={e => set("site_hours", e.target.value)} placeholder="e.g. 7am–5pm" />
          </FieldRow>
          <FieldRow label="On-Site Contact Name">
            <Input className="h-8 text-xs" value={data.onsite_contact_name || ""} onChange={e => set("onsite_contact_name", e.target.value)} placeholder="Name" />
          </FieldRow>
          <FieldRow label="On-Site Contact Phone">
            <PhoneInput className="h-8 text-xs" value={data.onsite_contact_phone || ""} onChange={e => set("onsite_contact_phone", e.target.value)} placeholder="000-000-0000" />
          </FieldRow>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-medium">Work Location</p>
            <div className="grid grid-cols-2 gap-2">
              {["Interior", "Exterior"].map(item => (
                <MultiCheck key={item} label={item} checked={(data.work_location || []).includes(item)} onChange={v => toggleArray("work_location", item, v)} />
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-medium">Equipment Needed</p>
            <div className="grid grid-cols-2 gap-2">
              {["Forklift", "Spider Crane", "Call In Crane", "Winch", "Ladder"].map(item => (
                <MultiCheck key={item} label={item} checked={(data.equipment_needed || []).includes(item)} onChange={v => toggleArray("equipment_needed", item, v)} />
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          <FieldRow label="Build Type">
            <OptionSelect value={data.build_type} onChange={v => set("build_type", v)} options={["Remodel", "New Build"]} />
          </FieldRow>
          <FieldRow label="Site Power">
            <OptionSelect value={data.site_power} onChange={v => set("site_power", v)} options={["Yes", "No", "Unknown"]} />
          </FieldRow>
        </div>
      </div>
    </CollapsibleSection>
  );
}