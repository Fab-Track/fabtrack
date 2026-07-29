import React, { useState } from "react";
import { Plus, Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CollapsibleSection from "@/components/jobs/CollapsibleSection";
import { CONDITIONAL_PRODUCT_KEYS as C } from "@/lib/jobDetailDefaults";

// ─── Custom railing component options ──────────────────────────────────────
const TOP_RAIL_OPTIONS = ['1.5"x1.5', '2"x2"', '2"x1"', '3"x1"', '2"x.5"', "C-channel", "Molded Cap", "other"];
const BOTTOM_RAIL_OPTIONS = ['1.5"x1.5', '2"x2"', '2"x1"', '3"x1"', '2"x.5"', "C-channel", "other"];
const POST_OPTIONS = ['1.5"x1.5', '2"x2"', '2"x1"', '3"x1"', '2"x.5"', "C-channel", "other"];
const PICKET_OPTIONS = [
  '.5"x.5', '3/4"x 3/4"', '1"x1', '2"x.5"', '1.5"x.5"',
  '2"x 1/4" flat bar', '1.5"x1/4" flat bar', ".5\" round rod",
  '1" round rod', "cable raw", "cable powder coated", "custom picket", "other",
];
const BASE_PLATE_OPTIONS = ['4"x4" square', '4" round'];
const PICKET_DIRECTION_OPTIONS = ["Vertical", "Horizontal", "Custom"];

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

// Custom railing detail field — supports an "other" free-text option and an
// optional link/attachment input that appears when a specific value is chosen
// (e.g. "Molded Cap" for top rail, "custom picket" for pickets).
function CustomDetailField({ label, value, onChange, options, linkTriggerValue, linkValue, onLinkChange, otherNotes, onOtherNotesChange, otherPlaceholder = "Describe...", otherTriggerValue = "other" }) {
  const isOther = value === otherTriggerValue;
  const showLink = linkTriggerValue && value === linkTriggerValue;
  return (
    <FieldRow label={label}>
      <OptionSelect value={value || ""} onChange={onChange} options={options} />
      {isOther && (
        <Input className="h-8 text-xs" value={otherNotes || ""} onChange={e => onOtherNotesChange(e.target.value)} placeholder={otherPlaceholder} />
      )}
      {showLink && (
        <Input className="h-8 text-xs" value={linkValue || ""} onChange={e => onLinkChange(e.target.value)} placeholder="Paste link or attachment URL..." />
      )}
    </FieldRow>
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
            <>
              <FieldRow label="Custom Railing Style Notes">
                <Input className="h-8 text-xs" value={entry.railing_style_notes || ""} onChange={e => onChange({ ...entry, railing_style_notes: e.target.value })} placeholder="Describe custom style..." />
              </FieldRow>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <CustomDetailField label="Top Rail" value={entry.custom_top_rail} onChange={v => onChange({ ...entry, custom_top_rail: v })} options={TOP_RAIL_OPTIONS} linkTriggerValue="Molded Cap" linkValue={entry.custom_top_rail_link} onLinkChange={v => onChange({ ...entry, custom_top_rail_link: v })} otherNotes={entry.custom_top_rail_notes} onOtherNotesChange={v => onChange({ ...entry, custom_top_rail_notes: v })} otherPlaceholder="Describe top rail..." />
                <CustomDetailField label="Bottom Rail" value={entry.custom_bottom_rail} onChange={v => onChange({ ...entry, custom_bottom_rail: v })} options={BOTTOM_RAIL_OPTIONS} otherNotes={entry.custom_bottom_rail_notes} onOtherNotesChange={v => onChange({ ...entry, custom_bottom_rail_notes: v })} otherPlaceholder="Describe bottom rail..." />
                <CustomDetailField label="Post" value={entry.custom_post} onChange={v => onChange({ ...entry, custom_post: v })} options={POST_OPTIONS} otherNotes={entry.custom_post_notes} onOtherNotesChange={v => onChange({ ...entry, custom_post_notes: v })} otherPlaceholder="Describe post..." />
                <CustomDetailField label="Pickets" value={entry.custom_pickets} onChange={v => onChange({ ...entry, custom_pickets: v })} options={PICKET_OPTIONS} linkTriggerValue="custom picket" linkValue={entry.custom_pickets_link} onLinkChange={v => onChange({ ...entry, custom_pickets_link: v })} otherNotes={entry.custom_pickets_notes} onOtherNotesChange={v => onChange({ ...entry, custom_pickets_notes: v })} otherPlaceholder="Describe pickets..." />
                <CustomDetailField label="Base Plate Size" value={entry.custom_base_plate} onChange={v => onChange({ ...entry, custom_base_plate: v })} options={BASE_PLATE_OPTIONS} />
                <CustomDetailField label="Picket Direction" value={entry.custom_picket_direction} onChange={v => onChange({ ...entry, custom_picket_direction: v })} options={PICKET_DIRECTION_OPTIONS} otherTriggerValue="Custom" otherNotes={entry.custom_picket_direction_notes} onOtherNotesChange={v => onChange({ ...entry, custom_picket_direction_notes: v })} otherPlaceholder="Describe picket direction..." />
              </div>
            </>
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