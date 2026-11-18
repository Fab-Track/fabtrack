import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import CostItemsImportRow from "./CostItemsImportRow";
import { applyCostItemImport } from "@/lib/costItemsCsv";

const HEAD = "grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_120px] gap-3 px-3 py-2 bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";

// Review step for a cost item import: confirm which existing item each row updates,
// or leave it as "Add as new item", then apply.
export default function CostItemsImportDialog({ open, onOpenChange, fileName, rows: incoming, existing, orgId, onApplied }) {
  const [rows, setRows] = useState(incoming);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) { setRows(incoming); setError(""); }
  }, [open, incoming]);

  const stats = useMemo(() => {
    const usable = rows.filter((r) => !r.invalid);
    const updates = usable.filter((r) => r.matchId);
    const adds = usable.filter((r) => !r.matchId);
    const seen = new Map();
    updates.forEach((r) => seen.set(r.matchId, (seen.get(r.matchId) || 0) + 1));
    const conflicts = [...seen.entries()].filter(([, n]) => n > 1).map(([id]) => existing.find((m) => m.id === id)?.name || "an item");
    return { usable, updates, adds, skipped: rows.length - usable.length, conflicts };
  }, [rows, existing]);

  const usedIds = (key) => new Set(rows.filter((r) => r.key !== key && r.matchId).map((r) => r.matchId));

  async function apply() {
    setBusy(true);
    setError("");
    try {
      const res = await applyCostItemImport(rows, { orgId, existing });
      toast.success(`Import complete — ${res.updated} updated, ${res.created} added`);
      onApplied();
      onOpenChange(false);
    } catch (e) {
      setError(e?.message || "The import could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col gap-0 border-t-4 border-t-primary">
        <DialogHeader>
          <DialogTitle className="text-xl">Review import</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {fileName} · {rows.length} rows. Each row updates the item shown, or is added as a new item.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6 my-4 space-y-3">
          <div className="border rounded-lg overflow-hidden">
            <div className={HEAD}><span>Incoming item</span><span>Match to catalog item</span><span>Result</span></div>
            <div className="divide-y">
              {rows.map((r) => (
                <CostItemsImportRow
                  key={r.key} row={r} existing={existing} usedIds={usedIds(r.key)}
                  onChange={(key, id) => setRows((prev) => prev.map((x) => (x.key === key ? { ...x, matchId: id } : x)))}
                />
              ))}
            </div>
          </div>
          {stats.skipped > 0 && (
            <p className="text-xs text-amber-700">{stats.skipped} row{stats.skipped > 1 ? "s" : ""} skipped — no item name in the CSV.</p>
          )}
          {stats.conflicts.length > 0 && (
            <p className="text-sm text-destructive">
              More than one row is matched to {stats.conflicts.join(", ")}. Pick a different item or add one of them as new.
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className="flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t pt-4">
          <p className="text-sm text-muted-foreground">{stats.updates.length} update · {stats.adds.length} new</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
            <Button onClick={apply} disabled={busy || stats.conflicts.length > 0 || stats.usable.length === 0}>
              {busy ? "Importing…" : "Apply import"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}