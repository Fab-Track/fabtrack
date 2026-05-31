import React from "react";
import ReportDateFilter from "@/components/reports/ReportDateFilter";
import ReportExportButtons from "@/components/reports/ReportExportButtons";

export default function ReportHeader({ onRangeChange, exportData, exportFilename }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <ReportDateFilter onChange={onRangeChange} />
      {exportData && (
        <ReportExportButtons getData={exportData} filename={exportFilename || "report"} />
      )}
    </div>
  );
}