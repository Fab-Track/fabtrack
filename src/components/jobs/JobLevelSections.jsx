import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Printer, ChevronDown, ChevronRight } from "lucide-react";
import { JOB_MATERIALS_CHECKLIST } from "@/lib/productConfigs";

// ─── Site Access ─────────────────────────────────────────────────────────────
function SiteAccessSection({ data, onChange }) {
  const [open, setOpen] = useState(true);
  const field = (key, label, type = "text", options = []) => (
    <div key={key} className="flex flex-col gap-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {type === "select" ? (
        <Select value={data[key] || ""} onValueChange={v => onChange(key, v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
          <SelectContent>{options.map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}</SelectContent>
        </Select>
      ) : (
        <Input className="h-8 text-xs" value={data[key] || ""} onChange={e => onChange(key, e.target.value)} placeholder={label} />
      )}
    </div>
  );

  return (
    <div className="rounded-xl border border-border bg-card">
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 px-4 py-3 w-full text-left">
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        <span className="font-semibold text-sm">Site Access</span>
        <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200 font-medium">Job-Level</span>
      </button>
      {open && (
        <div className="border-t px-4 pb-4 pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {field("someone_on_site", "Someone On Site", "select", ["Yes","No","Unknown"])}
            {field("entry_code", "Entry Code")}
            {field("onsite_contact_name", "On-Site Contact Name")}
            {field("onsite_contact_phone", "On-Site Contact Phone")}
            {field("backup_contact_name", "Backup Contact Name")}
            {field("backup_contact_phone", "Backup Contact Phone")}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Materials Checklist ──────────────────────────────────────────────────────
function MaterialsChecklistSection({ job, data, onChange }) {
  const [open, setOpen] = useState(true);

  const handlePrint = () => {
    const installDate = job.expected_install_date
      ? new Date(job.expected_install_date).toLocaleDateString()
      : "—";
    const rows = [
      ...JOB_MATERIALS_CHECKLIST.map(item => ({
        label: item.label,
        checked: !!data[item.key],
        isText: false,
      })),
      { label: "Custom Item 1", value: data.mat_custom_1 || "", isText: true },
      { label: "Custom Item 2", value: data.mat_custom_2 || "", isText: true },
    ];
    const html = `<html><head><title>Materials Checklist</title>
      <style>
        body{font-family:sans-serif;padding:24px;max-width:640px;margin:0 auto}
        h1{font-size:18px;margin-bottom:4px}
        .meta{color:#666;font-size:12px;margin-bottom:16px}
        .item{display:flex;align-items:flex-start;gap:8px;padding:5px 0;border-bottom:1px solid #eee;font-size:13px}
        .box{width:16px;height:16px;border:1.5px solid #333;display:inline-block;flex-shrink:0;margin-top:1px}
        .checked{background:#333}
        @media print{body{padding:12px}}
      </style></head><body>
      <h1>Materials Checklist</h1>
      <div class="meta">
        <div><strong>${job.job_name || ""}</strong> &nbsp;·&nbsp; ${job.job_number || ""}</div>
        <div>Customer: ${job.customer_name || "—"} &nbsp;·&nbsp; Install Date: ${installDate}</div>
      </div>
      ${rows.map(r => r.isText
        ? `<div class="item"><span class="box"></span>${r.label}: ${r.value || "_________________________"}</div>`
        : `<div class="item"><span class="box${r.checked ? " checked" : ""}"></span>${r.label}</div>`
      ).join("")}
      </body></html>`;
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    w.print();
  };

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 px-4 py-3">
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 flex-1 text-left">
          {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          <span className="font-semibold text-sm">Materials Checklist</span>
          <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200 font-medium">Job-Level</span>
        </button>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handlePrint} title="Print checklist">
          <Printer className="w-3.5 h-3.5" />
        </Button>
      </div>
      {open && (
        <div className="border-t px-4 pb-4 pt-3 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {JOB_MATERIALS_CHECKLIST.map(item => (
              <div key={item.key} className="flex items-center gap-2">
                <Checkbox
                  id={item.key}
                  checked={!!data[item.key]}
                  onCheckedChange={v => onChange(item.key, v)}
                />
                <Label htmlFor={item.key} className="text-xs font-normal leading-tight cursor-pointer">
                  {item.label}
                </Label>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Custom Item 1</Label>
              <Input className="h-8 text-xs" value={data.mat_custom_1 || ""} onChange={e => onChange("mat_custom_1", e.target.value)} placeholder="e.g., Wire brushes" />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Custom Item 2</Label>
              <Input className="h-8 text-xs" value={data.mat_custom_2 || ""} onChange={e => onChange("mat_custom_2", e.target.value)} placeholder="e.g., Knee pads" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────
export default function JobLevelSections({ job, data, onChangeField, viewFilter }) {
  const showSiteAccess = viewFilter === "all" || viewFilter === "installer";
  const showMaterials = viewFilter === "all" || viewFilter === "installer";

  const siteAccessData = data.site_access || {};
  const materialsData = data.materials || {};

  const handleSiteAccess = (key, val) => onChangeField("site_access", { ...siteAccessData, [key]: val });
  const handleMaterials = (key, val) => onChangeField("materials", { ...materialsData, [key]: val });

  return (
    <div className="space-y-3 mt-2">
      <div className="border-t pt-4">
        <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wider">Job-Level Information</p>
        <div className="space-y-3">
          {showSiteAccess && (
            <SiteAccessSection data={siteAccessData} onChange={handleSiteAccess} />
          )}
          {showMaterials && (
            <MaterialsChecklistSection job={job} data={materialsData} onChange={handleMaterials} />
          )}
        </div>
      </div>
    </div>
  );
}