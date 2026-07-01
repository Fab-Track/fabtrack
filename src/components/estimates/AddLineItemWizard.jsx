import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Check, PenLine } from "lucide-react";
import CostModelPricing from "./CostModelPricing";

const INSTALL_LOCATIONS = [
  "Interior — Main Staircase",
  "Interior — Secondary Staircase",
  "Interior — Loft / Mezzanine",
  "Interior — Balcony / Overlook",
  "Interior — Basement Staircase",
  "Interior — Other",
  "Exterior — Front Porch",
  "Exterior — Front Balcony",
  "Exterior — Back Deck",
  "Exterior — Back Porch",
  "Exterior — Side Yard",
  "Exterior — Pool Area",
  "Exterior — Driveway / Entry",
  "Exterior — Rooftop / Terrace",
  "Exterior — Staircase to Grade",
  "Exterior — Other",
  "Commercial — Staircase",
  "Commercial — Corridor / Hallway",
  "Commercial — Parking Structure",
  "Commercial — Exterior Entry",
  "Commercial — Other",
  "N/A",
];

// Step constants
const STEP_CATEGORY = 0;
const STEP_STYLE = 1;
const STEP_PRICING = 2;   // calculator OR manual price entry
const STEP_LOCATION = 3;

// Cost model detection — replaces old calculator type logic
function itemHasCostModel(item) {
  return !!(item?.cost_materials_per_unit || item?.cost_fab_hours_per_unit || item?.cost_powder_coat_per_unit || item?.cost_install_crew_size || item?.cost_install_hours_per_unit);
}

function StepDots({ step }) {
  return (
    <div className="flex items-center gap-1.5 justify-center py-1">
      {[0, 1, 2, 3].map(i => (
        <div
          key={i}
          className={`rounded-full transition-all ${i === step ? "w-5 h-2 bg-primary" : i < step ? "w-2 h-2 bg-primary/40" : "w-2 h-2 bg-muted"}`}
        />
      ))}
    </div>
  );
}

const STEP_TITLES = {
  [STEP_CATEGORY]: "Choose Category",
  [STEP_STYLE]: "Choose Service Type",
  [STEP_PRICING]: "Pricing",
  [STEP_LOCATION]: "Install Location",
};

export default function AddLineItemWizard({ open, onClose, onAdd }) {
  const [step, setStep] = useState(STEP_CATEGORY);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isCustom, setIsCustom] = useState(false);
  const [description, setDescription] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [calcPrice, setCalcPrice] = useState(null);
  const [calcQty, setCalcQty] = useState(null);
  const [calcBreakdown, setCalcBreakdown] = useState(null);
  const [installLocation, setInstallLocation] = useState("");

  const { data: catalog = [] } = useQuery({
    queryKey: ["serviceCatalog", "active"],
    queryFn: () => base44.entities.ServiceCatalog.filter({ is_active: true }),
  });

  // Fetch global labor rates for cost model pricing
  const { data: settings = [] } = useQuery({
    queryKey: ["appSettings", "main"],
    queryFn: () => base44.entities.AppSettings.filter({ setting_key: "main" }),
  });
  const fabRate = settings[0]?.labor_fab_rate ?? 0;
  const installRate = settings[0]?.labor_install_rate ?? 0;

  // Unique categories sorted by sort_order
  const categories = [...new Set(
    catalog
      .slice()
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map(i => i.category)
      .filter(Boolean)
  )];

  const itemsForCategory = catalog
    .filter(i => i.category === selectedCategory)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const hasCostModel = itemHasCostModel(selectedItem);

  function reset() {
    setStep(STEP_CATEGORY);
    setSelectedCategory(null);
    setSelectedItem(null);
    setIsCustom(false);
    setDescription("");
    setUnitCost("");
    setQuantity("1");
    setCalcPrice(null);
    setCalcQty(null);
    setCalcBreakdown(null);
    setInstallLocation("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSelectCategory(cat) {
    setSelectedCategory(cat);
    setSelectedItem(null);
    setIsCustom(false);
    setStep(STEP_STYLE);
  }

  function handleSelectItem(item) {
    setSelectedItem(item);
    setIsCustom(false);
    setDescription(item.default_description || item.name || "");
    setUnitCost(item.default_unit_price ? String(item.default_unit_price) : "");
    setQuantity("1");
    setCalcPrice(null);
    setCalcQty(null);
    setCalcBreakdown(null);
    setStep(STEP_PRICING);
  }

  function handleSelectCustom() {
    setSelectedItem(null);
    setIsCustom(true);
    setDescription("");
    setUnitCost("");
    setQuantity("1");
    setStep(STEP_PRICING);
  }

  function handleCalcPriceChange(pricePerUnit, qty, breakdown) {
    setCalcPrice(pricePerUnit);
    setCalcQty(qty);
    setCalcBreakdown(breakdown);
  }

  function handleFinish() {
    const finalUnitCost = hasCostModel ? (calcPrice || 0) : (parseFloat(unitCost) || 0);
    const finalQty = hasCostModel ? (calcQty || 1) : (parseFloat(quantity) || 1);

    onAdd({
      _id: Math.random().toString(36).slice(2),
      category: selectedCategory || "Other",
      description: description || selectedItem?.name || "",
      install_location: installLocation || "N/A",
      color: "",
      quantity: finalQty,
      unit: selectedItem?.unit || "ls",
      unit_cost: finalUnitCost,
      total: finalQty * finalUnitCost,
      photo_url: selectedItem?.photo_url || null,
      show_photo: true,
      // Cost model snapshot (if applicable)
      ...(hasCostModel && calcBreakdown ? {
        _hard_cost_per_unit: calcBreakdown.hardCostPerUnit,
        _cost_components: calcBreakdown.costComponents,
        _markup_multiplier: calcBreakdown.markup,
      } : {}),
      // Material projection flags — required by projectMaterials()
      ...((selectedItem?.is_railing || selectedCategory === "Railing") ? {
        _is_railing: true,
        _railing_style: selectedItem?.name || null,
      } : {}),
      ...(selectedCategory === "Staircase" ? {
        _is_staircase: true,
        _staircase_type: (selectedItem?.name || "").toLowerCase().includes("spiral") ? "spiral" : "mono",
      } : {}),
    });
    handleClose();
  }

  const canProceedFromPricing = hasCostModel
    ? calcPrice != null && calcPrice > 0
    : (parseFloat(unitCost) || 0) > 0 || isCustom; // allow $0 custom items if description filled

  const canFinish = installLocation.length > 0 &&
    (isCustom ? description.trim().length > 0 : true);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            Add Line Item — {STEP_TITLES[step]}
          </DialogTitle>
        </DialogHeader>

        <StepDots step={step} />

        {/* ── Step 0: Category ── */}
        {step === STEP_CATEGORY && (
          <div className="space-y-2 py-2">
            {categories.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                No categories found. Add items in Settings → Service Catalog.
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => handleSelectCategory(cat)}
                  className="text-left px-4 py-3 rounded-lg border-2 border-border hover:border-primary hover:bg-primary/5 transition-all group"
                >
                  <p className="font-semibold text-sm group-hover:text-primary">{cat}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {catalog.filter(i => i.category === cat).length} service types
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 1: Service Type ── */}
        {step === STEP_STYLE && (
          <div className="space-y-2 py-2">
            <p className="text-xs text-muted-foreground mb-3">
              Category: <strong>{selectedCategory}</strong>
            </p>
            <div className="space-y-1.5">
              {itemsForCategory.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleSelectItem(item)}
                  className="w-full text-left px-4 py-3 rounded-lg border hover:border-primary hover:bg-primary/5 transition-all group flex items-start gap-3"
                >
                  {item.photo_url && (
                    <img src={item.photo_url} alt="" className="w-12 h-10 object-cover rounded shrink-0 border" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm group-hover:text-primary">{item.name}</p>
                    {item.default_unit_price > 0 && (
                      <p className="text-xs text-muted-foreground">
                        ${item.default_unit_price.toLocaleString()} / {item.unit || "ls"}
                        {item.is_railing && <span className="ml-1 text-blue-600">· Railing calc</span>}
                      </p>
                    )}
                    {item.default_description && (
                      <p className="text-xs text-muted-foreground italic truncate">{item.default_description}</p>
                    )}
                  </div>
                </button>
              ))}

              <button
                onClick={handleSelectCustom}
                className="w-full text-left px-4 py-3 rounded-lg border border-dashed border-muted-foreground/40 hover:border-primary hover:bg-primary/5 transition-all flex items-center gap-2 text-muted-foreground hover:text-primary"
              >
                <PenLine className="w-4 h-4 shrink-0" />
                <span className="text-sm font-medium">Custom — enter manually</span>
              </button>
            </div>

            <div className="pt-2">
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={() => setStep(STEP_CATEGORY)}>
                <ChevronLeft className="w-3.5 h-3.5" /> Back
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Pricing ── */}
        {step === STEP_PRICING && (
          <div className="space-y-3 py-2">
            {/* Description field — always shown, editable */}
            <div>
              <Label className="text-xs font-medium">
                Description {isCustom && <span className="text-destructive">*</span>}
              </Label>
              <Input
                className="h-8 text-sm mt-1"
                placeholder={isCustom ? "Enter line item description…" : "Auto-filled from service type"}
                value={description}
                onChange={e => setDescription(e.target.value)}
                autoFocus={isCustom}
              />
            </div>

            {/* Cost model calculator */}
            {hasCostModel && (
              <>
                <CostModelPricing
                  catalogItem={selectedItem}
                  fabRate={fabRate}
                  installRate={installRate}
                  onPriceChange={handleCalcPriceChange}
                />
                {calcPrice != null && calcPrice > 0 && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm text-emerald-800 font-semibold">
                    Price: ${calcPrice.toLocaleString("en-US", { maximumFractionDigits: 2 })}/unit
                  </div>
                )}
              </>
            )}

            {/* Manual price entry for non-calculator items */}
            {!hasCostModel && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium">Unit Cost ($)</Label>
                  <Input
                    className="h-8 text-sm mt-1"
                    type="number"
                    placeholder="0.00"
                    value={unitCost}
                    onChange={e => setUnitCost(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium">Quantity</Label>
                  <Input
                    className="h-8 text-sm mt-1"
                    type="number"
                    placeholder="1"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                  />
                </div>
                {(parseFloat(unitCost) || 0) > 0 && (parseFloat(quantity) || 0) > 0 && (
                  <div className="col-span-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm text-emerald-800 font-semibold">
                    Line total: ${((parseFloat(unitCost) || 0) * (parseFloat(quantity) || 1)).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={() => setStep(STEP_STYLE)}>
                <ChevronLeft className="w-3.5 h-3.5" /> Back
              </Button>
              <Button
                size="sm"
                className="gap-1"
                onClick={() => setStep(STEP_LOCATION)}
                disabled={hasCostModel ? !canProceedFromPricing : (!description.trim() && isCustom)}
              >
                Next — Install Location <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Install Location ── */}
        {step === STEP_LOCATION && (
          <div className="space-y-4 py-2">
            {/* Summary of what's being added */}
            <div className="bg-muted/40 rounded-lg px-3 py-2.5 space-y-0.5">
              <p className="text-xs text-muted-foreground">Adding to estimate</p>
              <p className="text-sm font-semibold">{description || selectedItem?.name || "Custom item"}</p>
              <p className="text-xs text-muted-foreground">
                {selectedCategory}{selectedItem ? ` — ${selectedItem.name}` : ""}
                {hasCostModel && calcPrice
                  ? ` · ${calcQty} ${selectedItem?.cost_primary_unit || selectedItem?.unit || "unit"} @ $${calcPrice.toLocaleString("en-US", { maximumFractionDigits: 2 })}/unit`
                  : unitCost
                    ? ` · $${(parseFloat(unitCost) * parseFloat(quantity || 1)).toLocaleString("en-US", { maximumFractionDigits: 0 })}`
                    : ""}
              </p>
            </div>

            <div>
              <Label className="text-sm font-semibold">
                Install Location <span className="text-destructive">*</span>
              </Label>
              <p className="text-xs text-muted-foreground mb-2">Where on the property will this be installed?</p>
              <Select value={installLocation} onValueChange={setInstallLocation}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select install location…" />
                </SelectTrigger>
                <SelectContent>
                  {INSTALL_LOCATIONS.map(l => (
                    <SelectItem key={l} value={l} className="text-sm">{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between pt-1">
              <Button
                variant="ghost" size="sm" className="gap-1 text-muted-foreground"
                onClick={() => setStep(STEP_PRICING)}
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Back
              </Button>
              <Button
                size="sm"
                className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleFinish}
                disabled={!canFinish}
              >
                <Check className="w-3.5 h-3.5" /> Add to Estimate
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}