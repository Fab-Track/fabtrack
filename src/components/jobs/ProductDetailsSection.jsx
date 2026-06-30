import React, { useState } from "react";
import { Plus, Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CollapsibleSection from "@/components/jobs/CollapsibleSection";
import { CONDITIONAL_PRODUCT_KEYS as C } from "@/lib/jobDetailDefaults";

// ─── Small field helpers ───────────────────────────────────────────────────
function FieldRow({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function OptionSelect({ value, onChange, options, placeholder = "Select..." }) {
  return (
    <Select value={value || ""} onValueChange={onChange}>
      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {options.map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

// ─── Single product entry card ─────────────────────────────────────────────
function ProductEntry({ entry, index, config, onChange, onRemove }) {
  const isRailing = entry.product === C.RAILING;
  const isStaircase = entry.product === C.STAIRCASE;
  const isOther = entry.product === C.OTHER;
  const hasProduct = !!entry.product;
  const powdercoatYes = entry.powdercoat === "Yes";

  return (
    <div className="rounded-lg border bg-muted/10 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm">Product {index + 1}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onRemove} title="Remove">
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <FieldRow label="Product">
          <OptionSelect value={entry.product} onChange={v => onChange({ ...entry, product: v })} options={config.products} />
        </FieldRow>
      </div>

      {/* Other product notes */}
      {isOther && (
        <FieldRow label="Other Product Notes">
          <Input className="h-8 text-xs" value={entry.other_notes || ""} onChange={e => onChange({ ...entry, other_notes: e.target.value })} placeholder="Describe the product..." />
        </FieldRow>
      )}

      {/* Railing-specific fields */}
      {isRailing && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <FieldRow label="Railing Style">
              <OptionSelect value={entry.railing_style} onChange={v => onChange({ ...entry, railing_style: v })} options={config.railing_styles} />
            </FieldRow>
          </div>
          {entry.railing_style === C.CUSTOM && (
            <FieldRow label="Custom Railing Style Notes">
              <Input className="h-8 text-xs" value={entry.railing_style_notes || ""} onChange={e => onChange({ ...entry, railing_style_notes: e.target.value })} placeholder="Describe custom style..." />
            </FieldRow>
          )}
        </>
      )}

      {/* Staircase-specific fields */}
      {isStaircase && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <FieldRow label="Stair Style">
            <OptionSelect value={entry.stair_style} onChange={v => onChange({ ...entry, stair_style: v })} options={config.stair_styles} />
          </FieldRow>
          <FieldRow label="Stair Material">
            <OptionSelect value={entry.stair_material} onChange={v => onChange({ ...entry, stair_material: v })} options={config.stair_materials} />
          </FieldRow>
          <FieldRow label="Stair Tread Material">
            <OptionSelect value={entry.stair_tread_material} onChange={v => onChange({ ...entry, stair_tread_material: v })} options={config.stair_tread_materials} />
          </FieldRow>
        </div>
      )}
      {isStaircase && entry.stair_style === C.OTHER && (
        <FieldRow label="Other Stair Style Notes">
          <Input className="h-8 text-xs" value={entry.stair_style_notes || ""} onChange={e => onChange({ ...entry, stair_style_notes: e.target.value })} placeholder="Describe stair style..." />
        </FieldRow>
      )}
      {isStaircase && entry.stair_material === C.OTHER && (
        <FieldRow label="Other Stair Material Notes">
          <Input className="h-8 text-xs" value={entry.stair_material_notes || ""} onChange={e => onChange({ ...entry, stair_material_notes: e.target.value })} placeholder="Describe stair material..." />
        </FieldRow>
      )}
      {isStaircase && entry.stair_tread_material === C.OTHER && (
        <FieldRow label="Other Stair Tread Material Notes">
          <Input className="h-8 text-xs" value={entry.stair_tread_material_notes || ""} onChange={e => onChange({ ...entry, stair_tread_material_notes: e.target.value })} placeholder="Describe tread material..." />
        </FieldRow>
      )}

      {/* Powdercoat — shown for all products */}
      {hasProduct && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <FieldRow label="Powdercoat">
            <OptionSelect value={entry.powdercoat || ""} onChange={v => onChange({ ...entry, powdercoat: v })} options={["Yes", "No"]} placeholder="Select..." />
          </FieldRow>
          {powdercoatYes && (
            <FieldRow label="Powdercoat Color">
              <OptionSelect value={entry.powdercoat_color} onChange={v => onChange({ ...entry, powdercoat_color: v })} options={config.powdercoat_colors} />
            </FieldRow>
          )}
        </div>
      )}
      {powdercoatYes && entry.powdercoat_color === C.OTHER && (
        <FieldRow label="Other Powdercoat Color Notes">
          <Input className="h-8 text-xs" value={entry.powdercoat_color_notes || ""} onChange={e => onChange({ ...entry, powdercoat_color_notes: e.target.value })} placeholder="Describe color..." />
        </FieldRow>
      )}
    </div>
  );
}

// ─── Main section ───────────────────────────────────────────────────────────
export default function ProductDetailsSection({ entries = [], config, onChange }) {
  const addProduct = () => {
    onChange([...entries, { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, product: "", powdercoat: "" }]);
  };

  const updateEntry = (idx, updated) => {
    onChange(entries.map((e, i) => i === idx ? updated : e));
  };

  const removeEntry = (idx) => {
    onChange(entries.filter((_, i) => i !== idx));
  };

  return (
    <CollapsibleSection
      title="Product Details"
      icon={Package}
      actions={
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addProduct}>
          <Plus className="w-3.5 h-3.5" /> Add Product
        </Button>
      }
    >
      {entries.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground mb-3">No products added yet</p>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addProduct}>
            <Plus className="w-3.5 h-3.5" /> Add Product
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, i) => (
            <ProductEntry
              key={entry.id || i}
              entry={entry}
              index={i}
              config={config}
              onChange={(updated) => updateEntry(i, updated)}
              onRemove={() => removeEntry(i)}
            />
          ))}
        </div>
      )}
    </CollapsibleSection>
  );
}