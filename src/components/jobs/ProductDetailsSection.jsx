import React, { useState } from "react";
import { Plus, Trash2, Package, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import CollapsibleSection from "@/components/jobs/CollapsibleSection";
import LocationPhotoUpload from "@/components/jobs/LocationPhotoUpload";
import { useMaterialOptions } from "@/hooks/useMaterialOptions";
import { CONDITIONAL_PRODUCT_KEYS as C } from "@/lib/jobDetailDefaults";

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

function SubSection({ label, children }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b pb-1">{label}</div>
      {children}
    </div>
  );
}

// ─── Single product entry card ─────────────────────────────────────────────
function ProductEntry({ entry, index, config, materials, costCodes, onChange, onRemove, onSurfaceSync, onFileUploaded, jobId }) {
  const [open, setOpen] = useState(!entry.product);
  const isRailing = entry.product === C.RAILING;
  const isStaircase = entry.product === C.STAIRCASE;
  const isOther = entry.product === C.OTHER;
  const hasProduct = !!entry.product;
  const powdercoatYes = entry.powdercoat === "Yes";

  const handleSurfaceChange = (v) => {
    onChange({ ...entry, surface_type: v });
    if (v && onSurfaceSync) onSurfaceSync(v);
  };

  // Materials whose cost_code_ids include a CostCode whose name exactly matches the product type
  const productCostCodeIds = (costCodes || [])
    .filter(cc => cc.name === entry.product)
    .map(cc => cc.id);
  const productMaterialNames = (materials || [])
    .filter(m => entry.product && productCostCodeIds.length > 0 &&
      Array.isArray(m.cost_code_ids) && m.cost_code_ids.some(id => productCostCodeIds.includes(id)))
    .map(m => m.name);

  // Summary chips for the collapsed header
  const summaryParts = [
    entry.product && entry.product !== C.OTHER ? entry.product : entry.product === C.OTHER ? (entry.other_notes || "Other") : null,
    entry.install_area,
    entry.surface_type,
  ].filter(Boolean);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border bg-muted/10">
      <div className="flex items-center justify-between p-3">
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-2 text-left flex-1 min-w-0">
            {open ? <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />}
            <span className="font-semibold text-sm shrink-0">Product {index + 1}</span>
            {summaryParts.length > 0 && (
              <span className="text-xs text-muted-foreground truncate">
                {summaryParts.join(" · ")}
              </span>
            )}
          </button>
        </CollapsibleTrigger>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive shrink-0" onClick={onRemove} title="Remove">
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
      <CollapsibleContent>
      <div className="px-4 pb-4 space-y-4">

      {/* ─── Product Type ─── */}
      <SubSection label="Product Type">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <FieldRow label="Product">
            <OptionSelect value={entry.product} onChange={v => onChange({ ...entry, product: v })} options={config.products} />
          </FieldRow>
          {isRailing && (
            <FieldRow label="Railing Style">
              <OptionSelect value={entry.railing_style} onChange={v => onChange({ ...entry, railing_style: v })} options={config.railing_styles} />
            </FieldRow>
          )}
        </div>
      </SubSection>

      {isOther && (
        <FieldRow label="Other Product Notes">
          <Input className="h-8 text-xs" value={entry.other_notes || ""} onChange={e => onChange({ ...entry, other_notes: e.target.value })} placeholder="Describe the product..." />
        </FieldRow>
      )}

      {isRailing && entry.railing_style === C.CUSTOM && (
        <FieldRow label="Custom Railing Style Notes">
          <Input className="h-8 text-xs" value={entry.railing_style_notes || ""} onChange={e => onChange({ ...entry, railing_style_notes: e.target.value })} placeholder="Describe custom style..." />
        </FieldRow>
      )}

      {/* ─── Staircase fields ─── */}
      {isStaircase && (
        <SubSection label="Staircase Details">
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
        </SubSection>
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

      {/* ─── Location ─── */}
      {hasProduct && (
        <SubSection label="Location">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <FieldRow label="Install Area">
              <OptionSelect
                value={entry.install_area || ""}
                onChange={v => onChange({ ...entry, install_area: v })}
                options={config.install_areas}
                placeholder="Select..."
              />
            </FieldRow>
            <FieldRow label="Install Location">
              <OptionSelect
                value={entry.install_location || ""}
                onChange={v => onChange({ ...entry, install_location: v })}
                options={config.install_locations}
              />
              {entry.install_location === "other" && (
                <Input
                  className="h-8 text-xs"
                  value={entry.install_location_notes || ""}
                  onChange={e => onChange({ ...entry, install_location_notes: e.target.value })}
                  placeholder="Describe location..."
                />
              )}
            </FieldRow>
          </div>
        </SubSection>
      )}

      {/* ─── Notes ─── */}
      {hasProduct && (
        <SubSection label="Notes">
          <FieldRow label="Special Note">
            <Textarea
              className="text-xs min-h-[60px]"
              value={entry.special_note || ""}
              onChange={e => onChange({ ...entry, special_note: e.target.value })}
              placeholder="Add any special notes about this product for the job..."
            />
          </FieldRow>
        </SubSection>
      )}

      {/* ─── Materials (railing only) ─── */}
      {isRailing && (
        <SubSection label="Materials">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <CustomDetailField label="Top Rail" value={entry.custom_top_rail} onChange={v => onChange({ ...entry, custom_top_rail: v })} options={[...productMaterialNames, "other"]} linkTriggerValue="Molded Cap" linkValue={entry.custom_top_rail_link} onLinkChange={v => onChange({ ...entry, custom_top_rail_link: v })} otherNotes={entry.custom_top_rail_notes} onOtherNotesChange={v => onChange({ ...entry, custom_top_rail_notes: v })} otherPlaceholder="Describe top rail..." />
            <CustomDetailField label="Bottom Rail" value={entry.custom_bottom_rail} onChange={v => onChange({ ...entry, custom_bottom_rail: v })} options={[...productMaterialNames, "other"]} otherNotes={entry.custom_bottom_rail_notes} onOtherNotesChange={v => onChange({ ...entry, custom_bottom_rail_notes: v })} otherPlaceholder="Describe bottom rail..." />
            <CustomDetailField label="Post" value={entry.custom_post} onChange={v => onChange({ ...entry, custom_post: v })} options={[...productMaterialNames, "other"]} otherNotes={entry.custom_post_notes} onOtherNotesChange={v => onChange({ ...entry, custom_post_notes: v })} otherPlaceholder="Describe post..." />
            <CustomDetailField label="Pickets" value={entry.custom_pickets} onChange={v => onChange({ ...entry, custom_pickets: v })} options={[...productMaterialNames, "other"]} linkTriggerValue="custom picket" linkValue={entry.custom_pickets_link} onLinkChange={v => onChange({ ...entry, custom_pickets_link: v })} otherNotes={entry.custom_pickets_notes} onOtherNotesChange={v => onChange({ ...entry, custom_pickets_notes: v })} otherPlaceholder="Describe pickets..." />
            <CustomDetailField label="Base Plate Size" value={entry.custom_base_plate} onChange={v => onChange({ ...entry, custom_base_plate: v })} options={[...productMaterialNames, "other"]} otherNotes={entry.custom_base_plate_notes} onOtherNotesChange={v => onChange({ ...entry, custom_base_plate_notes: v })} otherPlaceholder="Describe base plate..." />
            <CustomDetailField label="Picket Direction" value={entry.custom_picket_direction} onChange={v => onChange({ ...entry, custom_picket_direction: v })} options={PICKET_DIRECTION_OPTIONS} otherTriggerValue="Custom" otherNotes={entry.custom_picket_direction_notes} onOtherNotesChange={v => onChange({ ...entry, custom_picket_direction_notes: v })} otherPlaceholder="Describe picket direction..." />
          </div>
        </SubSection>
      )}

      {/* ─── Powder coat ─── */}
      {hasProduct && (
        <SubSection label="Powder coat">
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
          {powdercoatYes && entry.powdercoat_color === C.OTHER && (
            <Input className="h-8 text-xs" value={entry.powdercoat_color_notes || ""} onChange={e => onChange({ ...entry, powdercoat_color_notes: e.target.value })} placeholder="Describe color..." />
          )}
        </SubSection>
      )}

      {/* ─── Install details ─── */}
      {hasProduct && (
        <SubSection label="Install details">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <FieldRow label="Mounting Type">
              <OptionSelect value={entry.mounting_type || ""} onChange={v => onChange({ ...entry, mounting_type: v })} options={config.mounting_types} placeholder="Select..." />
            </FieldRow>
            <FieldRow label="Surface Type">
              <OptionSelect
                value={entry.surface_type || ""}
                onChange={handleSurfaceChange}
                options={config.surfaces}
                placeholder="Select surface..."
              />
            </FieldRow>
          </div>
        </SubSection>
      )}

      {/* ─── Location Photos / Files ─── */}
      {hasProduct && (
        <SubSection label="Location Photos / Files">
          <LocationPhotoUpload
            files={entry.location_photos || []}
            onChange={v => onChange({ ...entry, location_photos: v })}
            onFileUploaded={onFileUploaded}
            jobId={jobId}
          />
        </SubSection>
      )}

      </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── Main section ───────────────────────────────────────────────────────────
export default function ProductDetailsSection({ entries = [], config, onChange, onSurfaceSync, onFileUploaded, jobId }) {
  const { materials, costCodes } = useMaterialOptions();

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
              materials={materials}
              costCodes={costCodes}
              onChange={(updated) => updateEntry(i, updated)}
              onRemove={() => removeEntry(i)}
              onSurfaceSync={onSurfaceSync}
              onFileUploaded={onFileUploaded}
              jobId={jobId}
            />
          ))}
        </div>
      )}
    </CollapsibleSection>
  );
}