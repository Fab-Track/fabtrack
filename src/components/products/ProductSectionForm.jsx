import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const ROLE_BADGE = {
  designer: "bg-blue-100 text-blue-700",
  installer: "bg-orange-100 text-orange-700",
  both: "",
};

export default function ProductSectionForm({ fields, data, onChange, viewFilter }) {
  const checkboxFields = fields.filter(f => f.type === "checkbox");
  const otherFields = fields.filter(f => f.type !== "checkbox");

  return (
    <div className="space-y-3">
      {/* Non-checkbox fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {otherFields.map(field => {
          const showBadge = viewFilter === "all" && field.role !== "both";
          return (
            <div key={field.key} className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs text-muted-foreground">{field.label}</Label>
                {showBadge && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${ROLE_BADGE[field.role]}`}>
                    {field.role === "designer" ? "Design" : "Install"}
                  </span>
                )}
              </div>
              {field.type === "select" && (
                <Select
                  value={data[field.key] || ""}
                  onValueChange={val => onChange(field.key, val)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options.map(o => (
                      <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {field.type === "text" && (
                <Input
                  className="h-8 text-xs"
                  value={data[field.key] || ""}
                  onChange={e => onChange(field.key, e.target.value)}
                  placeholder={field.label}
                />
              )}
              {field.type === "number" && (
                <Input
                  type="number"
                  className="h-8 text-xs"
                  value={data[field.key] || ""}
                  onChange={e => onChange(field.key, e.target.value)}
                  placeholder="0"
                />
              )}
              {field.type === "textarea" && (
                <textarea
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring col-span-full"
                  value={data[field.key] || ""}
                  onChange={e => onChange(field.key, e.target.value)}
                  placeholder={field.label}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Checkbox fields as compact grid */}
      {checkboxFields.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
          {checkboxFields.map(field => (
            <div key={field.key} className="flex items-center gap-2">
              <Checkbox
                id={field.key}
                checked={!!data[field.key]}
                onCheckedChange={val => onChange(field.key, val)}
              />
              <Label htmlFor={field.key} className="text-xs font-normal leading-tight cursor-pointer">
                {field.label}
              </Label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}