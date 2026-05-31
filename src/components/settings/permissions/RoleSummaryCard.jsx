import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PERMISSION_GROUPS, ROLE_LABELS, ACCESS_BY_VALUE } from "@/lib/permissionsData";
import { FileText } from "lucide-react";
import { toast } from "sonner";

function getPermsByLevel(permissions, level) {
  return PERMISSION_GROUPS.flatMap(g =>
    g.rows.filter(r => (permissions[r.id] ?? 0) === level).map(r => r.label)
  );
}

export default function RoleSummaryCard({ role, permissions, userCount, open, onClose }) {
  const fullControl = getPermsByLevel(permissions, 3);
  const editAccess = getPermsByLevel(permissions, 2);
  const viewOnly = getPermsByLevel(permissions, 1);
  const noAccess = getPermsByLevel(permissions, 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{ROLE_LABELS[role]} — Permissions Summary</span>
            <span className="text-xs font-normal text-muted-foreground">{userCount} user{userCount !== 1 ? "s" : ""} in this role</span>
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
          <div>
            <p className="text-xs font-semibold text-emerald-700 mb-2">✦ Full Control ({fullControl.length})</p>
            <ul className="space-y-1">
              {fullControl.map(l => <li key={l} className="text-xs text-foreground">• {l}</li>)}
              {fullControl.length === 0 && <li className="text-xs text-muted-foreground italic">None</li>}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">👁 View Only ({viewOnly.length})</p>
            <ul className="space-y-1">
              {viewOnly.map(l => <li key={l} className="text-xs text-foreground">• {l}</li>)}
              {viewOnly.length === 0 && <li className="text-xs text-muted-foreground italic">None</li>}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-red-500 mb-2">— No Access ({noAccess.length})</p>
            <ul className="space-y-1">
              {noAccess.map(l => <li key={l} className="text-xs text-foreground">• {l}</li>)}
              {noAccess.length === 0 && <li className="text-xs text-muted-foreground italic">None</li>}
            </ul>
          </div>
        </div>
        <div className="flex gap-2 pt-4 border-t mt-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { window.print(); }}>
            <FileText className="w-3.5 h-3.5" /> Print / Export PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}