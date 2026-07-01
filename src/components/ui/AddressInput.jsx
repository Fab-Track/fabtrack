import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { US_STATES } from "@/lib/addressFormat";

export default function AddressInput({ values, onChange, disabled, prefix = "" }) {
  const street = values?.[`${prefix}street`] || "";
  const city = values?.[`${prefix}city`] || "";
  const state = values?.[`${prefix}state`] || "";
  const zip = values?.[`${prefix}zip`] || "";

  const update = (field, val) => onChange({ [`${prefix}${field}`]: val });

  return (
    <div className="space-y-2">
      <div>
        <Label className="text-xs">Street</Label>
        <Input
          value={street}
          onChange={(e) => update("street", e.target.value)}
          disabled={disabled}
          placeholder="123 Main St"
        />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <div>
          <Label className="text-xs">City</Label>
          <Input
            value={city}
            onChange={(e) => update("city", e.target.value)}
            disabled={disabled}
            placeholder="City"
          />
        </div>
        <div>
          <Label className="text-xs">State</Label>
          <Select value={state} onValueChange={(v) => update("state", v)} disabled={disabled}>
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {US_STATES.map((s) => (
                <SelectItem key={s.code} value={s.code}>
                  {s.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Zip</Label>
          <Input
            value={zip}
            onChange={(e) => update("zip", e.target.value)}
            disabled={disabled}
            placeholder="00000"
          />
        </div>
      </div>
    </div>
  );
}