import React, { useState } from "react";
import { ChevronDown, ChevronRight, Copy, Trash2, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PRODUCT_FIELDS } from "@/lib/productConfigs";
import ProductSectionForm from "./ProductSectionForm";

const SECTION_ORDER = [
  "Project Scope",
  "Design Details",
  "Beam Callouts",
  "Column Callouts",
  "Finish",
  "Install Details",
];

function isComplete(instance) {
  const fields = PRODUCT_FIELDS[instance.product_type] || [];
  const required = fields.filter(f =>
    ["location","code_type","railing_style","gate_type","staircase_type","project_type","structure_type","cap_style","num_caps","num_boxes"].includes(f.key)
  );
  return required.every(f => instance.data?.[f.key]);
}

export default function ProductInstanceCard({
  instance,
  onChange,
  onDelete,
  onDuplicate,
  viewFilter, // 'all' | 'designer' | 'installer'
}) {
  const [expanded, setExpanded] = useState(true);
  const [activeSection, setActiveSection] = useState(null);

  const fields = PRODUCT_FIELDS[instance.product_type] || [];
  const sections = SECTION_ORDER.filter(s => fields.some(f => f.section === s));

  const filteredFields = (sectionFields) => {
    if (viewFilter === "all") return sectionFields;
    return sectionFields.filter(f =>
      viewFilter === "designer" ? (f.role === "designer" || f.role === "both") :
      viewFilter === "installer" ? (f.role === "installer" || f.role === "both") : true
    );
  };

  const complete = isComplete(instance);

  return (
    <div className={`rounded-xl border transition-all ${complete ? "border-emerald-400 bg-emerald-50/30" : "border-border bg-card"}`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => setExpanded(e => !e)} className="flex items-center gap-2 flex-1 text-left">
          {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
          <span className="font-semibold text-sm">{instance.label}</span>
          {complete
            ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            : <Circle className="w-4 h-4 text-muted-foreground/40 shrink-0" />}
          {complete && <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-300">Fully Spec'd</Badge>}
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDuplicate} title="Duplicate">
            <Copy className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete} title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="border-t px-4 pt-4 pb-5 space-y-5">
          {sections.map(section => {
            const sectionFields = filteredFields(fields.filter(f => f.section === section));
            if (sectionFields.length === 0) return null;
            const isOpen = activeSection === section || activeSection === null;

            // Role highlighting
            const isDesignerSection = sectionFields.every(f => f.role === "designer");
            const isInstallerSection = sectionFields.every(f => f.role === "installer");
            const sectionAccent =
              viewFilter === "designer" && (isDesignerSection || sectionFields.some(f => f.role === "both"))
                ? "border-l-blue-400"
                : viewFilter === "installer" && (isInstallerSection || sectionFields.some(f => f.role === "both"))
                ? "border-l-orange-400"
                : "border-l-border";

            return (
              <div key={section} className={`border-l-2 ${sectionAccent} pl-3`}>
                <button
                  onClick={() => setActiveSection(s => s === section ? null : section)}
                  className="flex items-center gap-2 mb-2 w-full text-left"
                >
                  {isOpen
                    ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{section}</span>
                </button>
                {isOpen && (
                  <ProductSectionForm
                    fields={sectionFields}
                    data={instance.data || {}}
                    onChange={(key, val) => onChange({ ...instance, data: { ...instance.data, [key]: val } })}
                    viewFilter={viewFilter}
                  />
                )}
              </div>
            );
          })}

        </div>
      )}
    </div>
  );
}