import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Download, PlusCircle, RefreshCw } from "lucide-react";
import { downloadCsv } from "@/lib/catalogImport";

const LABELS = { created: "Created", updated: "Updated", skipped: "Skipped", error: "Error" };

const PILL = {
  created: "bg-emerald-50 text-emerald-700 border-emerald-200",
  updated: "bg-blue-50 text-blue-700 border-blue-200",
  skipped: "bg-muted text-muted-foreground border-border",
  error: "bg-red-50 text-red-700 border-red-200",
};

const quote = (v) => {
  const t = v == null ? "" : String(v);
  return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

// Step 4: per-row result, summary, and a download of the rows that failed.
export default function ImportResultsStep({ results, fileName, headers, rows, onRestart }) {
  const counts = results.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] || 0) + 1 }), {});
  const errored = results.filter((r) => r.status === "error");

  function downloadErrors() {
    const lines = [[...headers, "Error"].map(quote).join(",")];
    errored.forEach((r) => lines.push([...(rows[r.index] || []), r.message || ""].map(quote).join(",")));
    downloadCsv("catalog-import-errors.csv", lines.join("\n"));
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Import finished</h2>
        <p className="text-sm text-muted-foreground">{fileName} · {results.length} rows processed</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { key: "created", icon: PlusCircle, label: "created" },
          { key: "updated", icon: RefreshCw, label: "updated" },
          { key: "skipped", icon: CheckCircle2, label: "skipped" },
          { key: "error", icon: AlertCircle, label: "errors" },
        ].map(({ key, icon: Icon, label }) => (
          <div key={key} className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Icon className="w-3.5 h-3.5" /> {label}
            </div>
            <p className="text-2xl font-bold mt-1">{counts[key] || 0}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="grid grid-cols-[72px_minmax(0,1fr)_110px_minmax(0,1.2fr)] gap-3 px-4 py-2 bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Row</span><span>Cost item</span><span>Status</span><span>Detail</span>
        </div>
        <div className="divide-y max-h-[420px] overflow-y-auto">
          {results.length === 0 && <p className="px-4 py-6 text-sm text-muted-foreground">No rows were imported.</p>}
          {results.map((r) => (
            <div key={r.index} className="grid grid-cols-[72px_minmax(0,1fr)_110px_minmax(0,1.2fr)] gap-3 px-4 py-2 text-sm items-center">
              <span className="text-muted-foreground font-mono">{r.index + 1}</span>
              <span className="truncate" title={r.name}>{r.name}</span>
              <span className={`justify-self-start rounded-full border px-2 py-0.5 text-[11px] font-semibold ${PILL[r.status]}`}>{LABELS[r.status]}</span>
              <span className="text-muted-foreground truncate" title={r.message || ""}>{r.message || "—"}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild><Link to="/catalog">Back to Catalog</Link></Button>
        {errored.length > 0 && (
          <Button variant="outline" className="gap-1.5" onClick={downloadErrors}>
            <Download className="w-4 h-4" /> Download errored rows
          </Button>
        )}
        <Button variant="ghost" onClick={onRestart}>Import another file</Button>
      </div>
    </div>
  );
}