import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Search, X } from "lucide-react";
import { base44 } from "@/api/base44Client";

/**
 * Google Places address autocomplete with manual fallback.
 *
 * Props:
 *  - values: { street, city, state, zip, lat, lng }  (current values)
 *  - fieldPrefix: string (e.g. "address_", "location_", "site_")
 *  - onChange: (fieldName, value) => void  (fieldName includes prefix)
 *  - placeholder: string
 *  - label: string (optional)
 */
export default function AddressAutocomplete({
  values = {},
  fieldPrefix = "",
  onChange,
  placeholder = "Search for an address…",
  label,
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [focused, setFocused] = useState(false);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  const street = values.street || "";
  const city = values.city || "";
  const state = values.state || "";
  const zip = values.zip || "";

  const hasAddress = !!(street || city || state || zip);
  const composedAddress = [street, [city, state].filter(Boolean).join(", "), zip]
    .filter(Boolean).join(", ");

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Debounced autocomplete search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await base44.functions.invoke("googlePlacesAutocomplete", { input: query.trim() });
        setSuggestions(res.data?.suggestions || []);
      } catch {
        setSuggestions([]);
      }
      setLoading(false);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  async function handleSelect(placeId) {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("googlePlaceDetails", { placeId });
      const d = res.data || {};
      onChange(`${fieldPrefix}street`, d.street || "");
      onChange(`${fieldPrefix}city`, d.city || "");
      onChange(`${fieldPrefix}state`, d.state || "");
      onChange(`${fieldPrefix}zip`, d.zip || "");
      onChange(`${fieldPrefix}lat`, d.lat ?? null);
      onChange(`${fieldPrefix}lng`, d.lng ?? null);
    } catch {
      // ignore
    }
    setLoading(false);
    setQuery("");
    setSuggestions([]);
    setFocused(false);
  }

  // ── Manual entry mode ──
  if (manualMode) {
    return (
      <div className="space-y-2">
        {label && <Label className="text-xs">{label}</Label>}
        <Input
          value={street}
          onChange={e => onChange(`${fieldPrefix}street`, e.target.value)}
          placeholder="Street address"
        />
        <div className="grid grid-cols-3 gap-2">
          <Input value={city} onChange={e => onChange(`${fieldPrefix}city`, e.target.value)} placeholder="City" />
          <Input value={state} onChange={e => onChange(`${fieldPrefix}state`, e.target.value)} placeholder="State" />
          <Input value={zip} onChange={e => onChange(`${fieldPrefix}zip`, e.target.value)} placeholder="ZIP" />
        </div>
        <button type="button" onClick={() => setManualMode(false)} className="text-xs text-blue-600 hover:underline">
          ← Use address search
        </button>
      </div>
    );
  }

  // ── Autocomplete search mode ──
  return (
    <div className="space-y-1.5" ref={containerRef}>
      {label && <Label className="text-xs">{label}</Label>}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder={hasAddress ? composedAddress : placeholder}
          className="pl-8"
        />
        {loading && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
            <div className="w-3.5 h-3.5 border-2 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        )}
        {!loading && query && (
          <button type="button" onClick={() => { setQuery(""); setSuggestions([]); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        {focused && query.trim().length >= 3 && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-52 overflow-y-auto">
            {suggestions.length > 0 ? (
              suggestions.map(s => (
                <button
                  key={s.placeId}
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted/60 text-left"
                  onClick={() => handleSelect(s.placeId)}
                >
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{s.description}</span>
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                No addresses found.{" "}
                <button type="button" className="text-blue-600 underline" onClick={() => setManualMode(true)}>
                  Enter manually
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {hasAddress && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {composedAddress}
          </p>
          <button type="button" onClick={() => setManualMode(true)} className="text-xs text-blue-600 hover:underline shrink-0">
            Can't find address?
          </button>
        </div>
      )}
      {!hasAddress && (
        <button type="button" onClick={() => setManualMode(true)} className="text-xs text-blue-600 hover:underline">
          Can't find address?
        </button>
      )}
    </div>
  );
}