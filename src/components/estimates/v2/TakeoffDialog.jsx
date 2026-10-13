import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { money } from "@/lib/costGroups";

export default function TakeoffDialog({ line, onClose }) {
  const t = line?._railing_takeoff;
  const s = t?.steps;
  const cells = s ? [["Posts", s.posts], ["Section length", `${s.sectionLength.toFixed(2)} ft`], ["Pickets / section", s.picketsPerSection], ["Total pickets", s.totalPickets], ["Post height", `${s.postHeight}"`], ["Rail runs", t.params?.rail_runs]] : [];
  const th = "px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground";
  return (
    <Dialog open={!!line} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Takeoff · {line?.service_name} · {line?.quantity} {line?.unit}</DialogTitle></DialogHeader>
        {cells.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {cells.map(([l, v]) => (
              <div key={l} className="bg-muted/40 rounded-lg p-2"><p className="text-[11px] text-muted-foreground">{l}</p><p className="font-mono font-bold">{v}</p></div>
            ))}
          </div>
        )}
        <table className="w-full text-sm">
          <thead><tr className="text-left"><th className={th}>Slot</th><th className={th}>Material</th><th className={`${th} text-right`}>Feet / Qty</th><th className={`${th} text-right`}>Cost / ft</th><th className={`${th} text-right`}>Cost</th></tr></thead>
          <tbody>
            {(line?.components || []).map((c, i) => (
              <tr key={i} className="border-t">
                <td className="px-2 py-1.5">{c.slot}</td><td className="px-2 py-1.5">{c.material}</td>
                <td className="px-2 py-1.5 text-right font-mono">{Math.round((c.qty || 0) * 100) / 100} {c.qty_unit}</td>
                <td className="px-2 py-1.5 text-right font-mono">{money(c.unit_cost || 0)}</td>
                <td className="px-2 py-1.5 text-right font-mono font-semibold">{money(c.cost || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DialogContent>
    </Dialog>
  );
}