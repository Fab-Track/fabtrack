import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AddressAutocomplete from "@/components/ui/AddressAutocomplete";

/** Composes a saved location's single-line address from its parts. */
export function composeLocationAddress(values = {}) {
  return [values.street, [values.city, values.state].filter(Boolean).join(", "), values.zip]
    .filter(Boolean)
    .join(", ");
}

/**
 * The shared named-location editor used wherever customer locations are created
 * or changed: a location name plus its structured address.
 *
 * Props:
 *  - values: { label, street, city, state, zip, lat, lng }
 *  - onChange: (fieldName, value) => void
 *  - showAddress: set false when only the name is being edited
 */
export default function LocationFields({
  values = {},
  onChange,
  showAddress = true,
  nameLabel = "Location Name",
  addressLabel = "Location Address",
  namePlaceholder = "Main Office, Riverside Job Site",
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">{nameLabel}</Label>
        <Input
          value={values.label || ""}
          onChange={(e) => onChange("label", e.target.value)}
          placeholder={namePlaceholder}
        />
      </div>
      {showAddress && (
        <AddressAutocomplete
          values={values}
          fieldPrefix=""
          onChange={onChange}
          placeholder="Search for the location address…"
          label={addressLabel}
        />
      )}
    </div>
  );
}