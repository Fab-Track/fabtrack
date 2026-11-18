import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Upload } from "lucide-react";
import { IMPORT_FIELDS, buildTemplateCsv, downloadCsv } from "@/lib/catalogImport";

// Step 1: download the template, then drop a CSV into the box.
export default function ImportUploadStep({ onFile, reading }) {
  const fileRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  function pick(file) {
    if (!file) return;
    onFile(file);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">Importing Catalog Items</h2>
          <p className="text-sm text-muted-foreground">
            Upload a CSV of cost items. You'll map the columns on the next step, and nothing is written until you import.
          </p>
        </div>
        <Button variant="outline" className="gap-1.5" onClick={() => downloadCsv("catalog-import-template.csv", buildTemplateCsv())}>
          <Download className="w-4 h-4" /> Download Import Template
        </Button>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Supported columns</p>
          <dl className="space-y-1.5">
            {IMPORT_FIELDS.map((f) => (
              <div key={f.key} className="text-sm">
                <dt className="font-semibold inline">{f.label}</dt>
                <dd className="inline text-muted-foreground"> — {f.hint}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileRef.current?.click()}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileRef.current?.click(); }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files?.[0]); }}
          className={`h-full min-h-[320px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 p-8 text-center cursor-pointer transition-colors ${dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/60 hover:bg-muted/40"}`}
        >
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Upload className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="font-semibold">{reading ? "Reading file…" : "Upload Catalog CSV"}</p>
          <p className="text-sm text-muted-foreground">Drag and drop, or click to choose a .csv file</p>
        </div>
      </div>
    </div>
  );
}