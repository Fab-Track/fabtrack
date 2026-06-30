import React, { forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { formatPhoneInput } from "@/lib/phoneFormat";

/**
 * A phone number input that auto-formats as the user types to 000-000-0000.
 * Strips non-digits and caps at 10 digits. Works with controlled components —
 * the parent's onChange receives the already-formatted string.
 *
 * Accepts all standard Input props (className, placeholder, disabled, etc.).
 */
const PhoneInput = forwardRef(({ value, onChange, ...props }, ref) => {
  return (
    <Input
      ref={ref}
      value={value}
      onChange={(e) => {
        const formatted = formatPhoneInput(e.target.value);
        onChange?.({ target: { value: formatted } });
      }}
      inputMode="numeric"
      {...props}
    />
  );
});
PhoneInput.displayName = "PhoneInput";

export { PhoneInput };