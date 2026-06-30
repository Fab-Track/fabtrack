// Phone formatting utilities — applied app-wide for consistent 000-000-0000 display

/**
 * Strips all non-digit characters, caps at 10 digits, and formats as 000-000-0000.
 * Used as the user types (live) and on paste.
 */
export function formatPhoneInput(value) {
  if (!value) return "";
  const digits = String(value).replace(/\D/g, "").slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/**
 * Formats any stored phone value for display.
 * - 10-digit US numbers → 000-000-0000
 * - 11-digit numbers starting with 1 → strips the 1, formats as 000-000-0000
 * - Anything else (international, partial, etc.) → returned as-is (no data loss)
 */
export function formatPhoneDisplay(value) {
  if (!value) return "";
  const raw = String(value).trim();
  const digits = raw.replace(/\D/g, "");
  // Standard 10-digit US number
  if (digits.length === 10) {
    return formatPhoneInput(digits);
  }
  // 11-digit with leading country code 1
  if (digits.length === 11 && digits.startsWith("1")) {
    return formatPhoneInput(digits.slice(1));
  }
  // Non-standard (international, partial, etc.) — return original so we don't lose data
  return raw;
}