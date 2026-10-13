import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus } from "lucide-react";
import CostCodeDialog from "./CostCodeDialog";

const DEFAULT_CODES = [
  ["1000", "Railing Materials"], ["1100", "Stair Materials"], ["1200", "Structural Steel"],
  ["1300", "Gate Materials"], ["1400", "Planter Materials"], ["1900", "Misc Materials"],
  ["2000", "Shop Labor"], ["2100", "Install Labor"], ["3000", "Finishing / Powder Coat"], ["4000", "Fuel & Travel"],
];

export default function CostCodesCard() {
  const { user } = useAuth();
  const orgId = user?.organization_id;
  const qc = useQueryClient();
  const [showArchived, setShowArchived] = useState(false);
  const [dialog, setDialog] = useState({ open: false, code: null });

  const { data: codes = [], isLoading } = useQuery({
    queryKey: ["costCodes", orgId],
    queryFn: async () => {
      let res = await base44.entities.CostCode.filter({ organization_id: orgId }, "code_number", 500);
      res = Array.isArray(res) ? res : res.items || [];
      if (res.length === 0) {
        // New org: seed the default cost codes once
        await base44.entities.CostCode.bulkCreate(DEFAULT_CODES.map(([code_number, name]) => ({ organization_id: orgId, code_number, name, active: true })));
        res = await base44.entities.CostCode.filter({ organization_id: orgId }, "code_number", 500);
        res = Array.isArray(res) ? res : res.items || [];
      }
      return res;
    },
    enabled: !!orgId,
  });

  const visible = codes.filter((c) => showArchived || c.active !== false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["costCodes"] });

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className="font-bold text-base">Cost codes</h3>
          <p className="text-xs text-muted-foreground">Accounting categories for cost items. Link each to its QuickBooks item.</p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={showArchived} onCheckedChange={setShowArchived} /> Show archived
          </label>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setDialog({ open: true, code: null })}>
            <Plus className="w-3.5 h-3.5" /> Cost code
          </Button>
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-[80px_1fr_1fr_70px] px-4 py-2.5 bg-muted/40 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          <span>Code</span><span>Name</span><span>QuickBooks item</span><span />
        </div>
        {isLoading ? (
          <p className="p-4 text-sm text-muted-foreground">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No cost codes yet.</p>
        ) : visible.map((c) => (
          <div key={c.id} className="grid grid-cols-[80px_1fr_1fr_70px] items-center px-4 py-2.5 border-t text-sm">
            <span className="font-mono text-muted-foreground">{c.code_number}</span>
            <span className={`font-medium ${c.active === false ? "text-muted-foreground line-through" : ""}`}>
              {c.name}{c.active === false && <span className="ml-2 text-[10px] no-underline">(archived)</span>}
            </span>
            <span className="text-muted-foreground">{c.qbo_item_name || "Not linked"}</span>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setDialog({ open: true, code: c })}>Edit</Button>
          </div>
        ))}
      </div>

      <CostCodeDialog
        open={dialog.open}
        onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))}
        code={dialog.code}
        allCodes={codes}
        orgId={orgId}
        onSaved={refresh}
      />
    </div>
  );
}