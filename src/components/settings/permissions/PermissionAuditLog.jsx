import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format, parseISO } from "date-fns";
import { Download, Info } from "lucide-react";
import { toast } from "sonner";

// In a real app this would come from a backend entity.
// We seed a few demo entries to show the UI.
const DEMO_LOG = [
  { id: "1", ts: "2026-05-30T14:22:00Z", by: "Cole VanValkenburg", type: "Role Permission Changed", detail: "Estimator — Invoices: View → Edit" },
  { id: "2", ts: "2026-05-28T09:10:00Z", by: "Cole VanValkenburg", type: "User Override Added", detail: "Carlos M. (Fabricator) — Inventory: No Access → View Only" },
  { id: "3", ts: "2026-05-25T17:05:00Z", by: "Cole VanValkenburg", type: "Role Reset to Default", detail: "Shop Manager — all permissions reset" },
  { id: "4", ts: "2026-05-22T11:40:00Z", by: "Cole VanValkenburg", type: "Role Permission Changed", detail: "Installer — Schedule (own): No Access → View Only" },
  { id: "5", ts: "2026-05-20T08:30:00Z", by: "Cole VanValkenburg", type: "Role Permission Changed", detail: "Accountant — Reports Financial: View → Full Control" },
];

function downloadCSV(data) {
  const headers = ["Date & Time", "Changed By", "Change Type", "Details"];
  const rows = data.map(e => [
    format(parseISO(e.ts), "MMM d, yyyy HH:mm"),
    e.by, e.type, e.detail,
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "permission-audit-log.csv"; a.click();
  URL.revokeObjectURL(url);
  toast.success("CSV exported");
}

const TYPE_COLORS = {
  "Role Permission Changed": "bg-blue-100 text-blue-700",
  "User Override Added": "bg-purple-100 text-purple-700",
  "Role Reset to Default": "bg-orange-100 text-orange-700",
};

export default function PermissionAuditLog() {
  const [search, setSearch] = useState("");

  const filtered = DEMO_LOG.filter(e =>
    !search || e.detail.toLowerCase().includes(search.toLowerCase()) ||
    e.by.toLowerCase().includes(search.toLowerCase()) ||
    e.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
        <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">
          The audit log records all changes to roles and permissions. Entries cannot be edited or deleted.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Input
          placeholder="Search by role, user, or change type…"
          className="h-8 text-xs max-w-xs"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => downloadCSV(filtered)}>
          <Download className="w-3.5 h-3.5" /> Export CSV
        </Button>
      </div>

      <div className="border rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 border-b">
            <tr>
              {["Date & Time", "Changed By", "Change Type", "Details"].map(h => (
                <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map(entry => (
              <tr key={entry.id} className="hover:bg-muted/20">
                <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                  {format(parseISO(entry.ts), "MMM d, yyyy · h:mm a")}
                </td>
                <td className="px-3 py-2 font-medium">{entry.by}</td>
                <td className="px-3 py-2">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${TYPE_COLORS[entry.type] || "bg-gray-100 text-gray-600"}`}>
                    {entry.type}
                  </span>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{entry.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-sm text-center text-muted-foreground py-8">No entries found.</p>
        )}
      </div>
    </div>
  );
}