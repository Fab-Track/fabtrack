import React from "react";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";

function downloadCSV(data, filename) {
  if (!data || data.length === 0) { toast.error("No data to export"); return; }
  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(h => {
    const val = row[h] ?? "";
    return typeof val === "string" && val.includes(",") ? `"${val}"` : val;
  }).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  toast.success("CSV downloaded");
}

export default function ReportExportButtons({ getData, filename = "report" }) {
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => downloadCSV(getData?.(), `${filename}.csv`)}>
        <Download className="w-3.5 h-3.5" /> CSV
      </Button>
      <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => { window.print(); }}>
        <FileText className="w-3.5 h-3.5" /> PDF
      </Button>
    </div>
  );
}