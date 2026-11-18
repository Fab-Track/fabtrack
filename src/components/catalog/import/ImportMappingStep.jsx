import React from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import { IMPORT_FIELDS, IGNORE, normHeader } from "@/lib/catalogImport";

const COLS = "grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.1fr)] gap-3 items-center px-4 py-2.5";

// Step 2: match each CSV column to a catalog field and check the row values.
export default function ImportMappingStep({
  headers, rows, mapping, onChange, rowIndex, onPrev, onSkip, onImportRow, onImportAll,
  onViewResults, resultCount, skipped, busy,
}) {
  const cells = rows[rowIndex] || [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Match your columns</h2>
        <p className="text-sm text-muted-foreground">
          {rows.length} rows. Pick where each column goes, then step through rows to check the values.
        </p>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className={`${COLS} bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground`}>
          <span>CSV column</span>
          <span>FabTrack field</span>
          <span>Row {rowIndex + 1} of {rows.length}</span>
        </div>
        <div className="divide-y">
          {headers.map((h, i) => {
            const current = mapping[normHeader(h)] || IGNORE;
            return (
              <div key={`${h}-${i}`} className={COLS}>
                <span className="text-sm font-semibold truncate" title={h}>{h || `Column ${i + 1}`}</span>
                <div className="flex items-center gap-1">
                  <Select
                    value={current}
                    onValueChange={(v) => onChange(normHeader(h), v === IGNORE ? "" : v)}
                  >
                    <SelectTrigger className="h-8 bg-card"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={IGNORE}>— Ignore —</SelectItem>
                      {IMPORT_FIELDS.map((f) => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {current !== IGNORE && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" title="Ignore this column"
                      onClick={() => onChange(normHeader(h), "")}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
                <span className="text-sm font-mono truncate" title={cells[i] || ""}>{cells[i] || <span className="text-muted-foreground">—</span>}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <div className="text-sm text-muted-foreground">
          Row {rowIndex + 1} of {rows.length} · {skipped.size} skipped{resultCount ? ` · ${resultCount} imported` : ""}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onPrev} disabled={rowIndex === 0 || busy}>Prev</Button>
          <Button variant="outline" onClick={onSkip} disabled={busy}>Skip</Button>
          {resultCount > 0 && <Button variant="ghost" onClick={onViewResults} disabled={busy}>View results</Button>}
          <Button variant="outline" onClick={onImportRow} disabled={busy}>Import this row</Button>
          <Button onClick={onImportAll} disabled={busy}>{busy ? "Importing…" : "Import All Remaining"}</Button>
        </div>
      </div>
    </div>
  );
}