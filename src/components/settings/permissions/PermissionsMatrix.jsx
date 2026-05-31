import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  ROLES, ROLE_LABELS, ACCESS_LEVELS, ACCESS_BY_VALUE,
  PERMISSION_GROUPS, DEFAULT_PERMISSIONS,
} from "@/lib/permissionsData";
import { RotateCcw, Save } from "lucide-react";

const STORAGE_KEY = "fabtrack_role_permissions";

function loadPermissions() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : { ...DEFAULT_PERMISSIONS };
  } catch {
    return { ...DEFAULT_PERMISSIONS };
  }
}

function nextLevel(current) {
  const idx = ACCESS_LEVELS.findIndex(a => a.value === current);
  return ACCESS_LEVELS[(idx + 1) % ACCESS_LEVELS.length].value;
}

export default function PermissionsMatrix() {
  const [permissions, setPermissions] = useState(loadPermissions);
  const [dirty, setDirty] = useState({}); // { "role.rowId": true }
  const [resetRole, setResetRole] = useState(null);

  function cycleCell(role, rowId) {
    const current = permissions[role]?.[rowId] ?? 0;
    const next = nextLevel(current);
    setPermissions(p => ({ ...p, [role]: { ...p[role], [rowId]: next } }));
    setDirty(d => ({ ...d, [`${role}.${rowId}`]: true }));
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(permissions));
    setDirty({});
    toast.success("Permissions saved");
    // TODO: persist to backend entity if desired
  }

  function resetToDefault(role) {
    setPermissions(p => ({ ...p, [role]: { ...DEFAULT_PERMISSIONS[role] } }));
    // Clear dirty markers for this role
    setDirty(d => {
      const nd = { ...d };
      Object.keys(nd).forEach(k => { if (k.startsWith(`${role}.`)) delete nd[k]; });
      return nd;
    });
    setResetRole(null);
    toast.success(`${ROLE_LABELS[role]} permissions reset to defaults`);
  }

  const hasDirty = Object.keys(dirty).length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-semibold text-sm">Permissions Matrix</h3>
          <p className="text-xs text-muted-foreground">Click a cell to cycle through access levels. Owner is always full control.</p>
        </div>
        {hasDirty && (
          <Button size="sm" onClick={save} className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white">
            <Save className="w-3.5 h-3.5" /> Save Changes
          </Button>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {ACCESS_LEVELS.map(a => (
          <span key={a.value} className={`text-xs px-2 py-0.5 rounded font-medium ${a.color}`}>
            {a.symbol} {a.label}
          </span>
        ))}
      </div>

      {/* Matrix table — sticky columns */}
      <div className="border rounded-xl overflow-auto max-h-[70vh]">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-20 bg-muted/95 border-b">
            <tr>
              <th className="text-left px-3 py-2 font-semibold text-muted-foreground sticky left-0 bg-muted/95 min-w-[220px] z-30">
                Feature
              </th>
              {/* Owner */}
              <th className="px-3 py-2 text-center min-w-[100px]">
                <div className="font-semibold">Owner</div>
                <div className="text-[10px] text-muted-foreground font-normal">Locked</div>
              </th>
              {ROLES.map(role => (
                <th key={role} className="px-3 py-2 text-center min-w-[120px]">
                  <div className="font-semibold">{ROLE_LABELS[role]}</div>
                  <button
                    onClick={() => setResetRole(role)}
                    className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 mx-auto mt-0.5"
                  >
                    <RotateCcw className="w-2.5 h-2.5" /> Reset
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_GROUPS.map(group => (
              <React.Fragment key={group.group}>
                <tr>
                  <td
                    colSpan={ROLES.length + 2}
                    className="px-3 py-1.5 bg-muted/50 font-semibold text-xs text-muted-foreground uppercase tracking-wide sticky left-0"
                  >
                    {group.group}
                  </td>
                </tr>
                {group.rows.map(row => (
                  <tr key={row.id} className="border-b hover:bg-muted/20">
                    <td className="px-3 py-1.5 sticky left-0 bg-background border-r font-medium">
                      {row.label}
                    </td>
                    {/* Owner — always full */}
                    <td className="px-2 py-1.5 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold cursor-not-allowed opacity-60 ${ACCESS_BY_VALUE[3].color}`}
                        title="Owner always has full access"
                      >
                        {ACCESS_BY_VALUE[3].symbol}
                      </span>
                    </td>
                    {ROLES.map(role => {
                      const val = permissions[role]?.[row.id] ?? 0;
                      const access = ACCESS_BY_VALUE[val];
                      const isDirtyCell = dirty[`${role}.${row.id}`];
                      return (
                        <td key={role} className="px-2 py-1.5 text-center">
                          <button
                            onClick={() => cycleCell(role, row.id)}
                            className={`px-2 py-0.5 rounded text-xs font-semibold transition-all hover:ring-2 hover:ring-offset-1 hover:ring-primary/50 ${access.color} ${isDirtyCell ? "ring-2 ring-amber-400" : ""}`}
                            title={`${ROLE_LABELS[role]} — ${access.label}. Click to change.`}
                          >
                            {access.symbol}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reset confirmation dialog */}
      <AlertDialog open={!!resetRole} onOpenChange={() => setResetRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset {resetRole ? ROLE_LABELS[resetRole] : ""} to Defaults?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset all permissions for {resetRole ? ROLE_LABELS[resetRole] : ""} to the FabTrack defaults. Any custom changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => resetToDefault(resetRole)}>Reset to Default</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}