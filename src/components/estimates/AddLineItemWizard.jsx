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
import RailingInlineCalc from "./RailingInlineCalc";
import StaircaseInlineCalc from "./StaircaseInlineCalc";

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

// Determine which calculator to show based on category/item
function getCalculatorType(category, item) {
  const cat = (category || "").toLowerCase();
  const name = (item?.name || "").toLowerCase();
  if (cat === "railing" || item?.is_railing) return "railing";
  if (cat === "staircase") {
    if (name.includes("spiral")) return "staircase_spiral";
    return "staircase";
  }
  return null;
}

// Step indicator
function StepDots({ step, total }) {
  return (
    <div className="flex items-center gap-1.5 justify-center py-1">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all ${i === step ? "w-5 h-2 bg-primary" : i < step ? "w-2 h-2 bg-primary/40" : "w-2 h-2 bg-muted"}`}
        />
      ))}
    </div>
  );
}

export default function AddLineItemWizard({ open, onClose, onAdd }) {
  const [step, setStep] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [customDescription, setCustomDescription] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [calcPrice, setCalcPrice] = useState(null);
  const [calcQty, setCalcQty] = useState(null);
  const [installLocation, setInstallLocation] = useState("");

  const { data: catalog = [] } = useQuery({
    queryKey: ["serviceCatalog", "active"],
    queryFn: () => base44.entities.ServiceCatalog.filter({ is_active: true }),
  });

  // Derive unique categories in sort_order
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

  const calcType = getCalculatorType(selectedCategory, selectedItem);
  const hasCalculator = !!calcType;

  function reset() {
    setStep(0);
    setSelectedCategory(null);
    setSelectedItem(null);
    setCustomDescription("");
    setIsCustom(false);
    setCalcPrice(null);
    setCalcQty(null);
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
    setStep(1);
  }

  function handleSelectItem(item) {
    setSelectedItem(item);
    setIsCustom(false);
    setCustomDescription(item.default_description || item.name);
    setCalcPrice(null);
    setCalcQty(null);
    // If has calculator → go to step 2 (calc), else jump to step 3 (install location)
    setStep(getCalculatorType(selectedCategory, item) ? 2 : 3);
  }

  function handleSelectCustom() {
    setSelectedItem(null);
    setIsCustom(true);
    setCustomDescription("");
    setStep(3); // No calculator for custom items
  }

  function handleCalcPriceChange(price, qty) {
    setCalcPrice(price);
    setCalcQty(qty);
  }

  function handleFinish() {
    const description = isCustom ? customDescription : (selectedItem?.default_description || selectedItem?.name || customDescription);
    const unitCost = calcPrice || selectedItem?.default_unit_price || 0;
    const qty = calcQty || 1;
    const unit = selectedItem?.unit || "ls";

    onAdd({
      _id: Math.random().toString(36).slice(2),
      category: selectedCategory || "Other",
      description,
      install_location: installLocation || "N/A",
      quantity: qty,
      unit,
      unit_cost: unitCost,
      total: qty * unitCost,
      photo_url: selectedItem?.photo_url || null,
      show_photo: true,
    });
    handleClose();
  }

  const totalSteps = hasCalculator || (selectedItem && getCalculatorType(selectedCategory, selectedItem)) ? 4 : 3;
  // Effective total steps: 0=category, 1=style, 2=calc (if applicable), 3=location
  // We always show 4 dots when a calculator is involved, 3 otherwise
  const effectiveTotalSteps = step <= 1 ? 4 : (hasCalculator ? 4 : 3);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            {step === 0 && "Add Line Item — Choose Category"}
            {step === 1 && `Add Line Item — Choose Style`}
            {step === 2 && `Add Line Item — Calculator`}
            {step === 3 && "Add Line Item — Install Location"}
          </DialogTitle>
        </DialogHeader>

        <StepDots step={step} total={4} />

        {/* ── Step 0: Category ── */}
        {step === 0 && (
          <div className="space-y-2 py-2">
            {categories.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No categories found. Add items in Settings → Service Catalog.</p>
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
                    {catalog.filter(i => i.category === cat).length} styles
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 1: Style/Description ── */}
        {step === 1 && (
          <div className="space-y-2 py-2">
            <p className="text-xs text-muted-foreground mb-3">Category: <strong>{selectedCategory}</strong></p>
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
                        ${item.default_unit_price.toLocaleString()} / {item.unit}
                        {item.is_railing && <span className="ml-1 text-blue-600">· Railing calc</span>}
                      </p>
                    )}
                  </div>
                </button>
              ))}

              {/* Custom option */}
              <button
                onClick={handleSelectCustom}
                className="w-full text-left px-4 py-3 rounded-lg border border-dashed border-muted-foreground/40 hover:border-primary hover:bg-primary/5 transition-all flex items-center gap-2 text-muted-foreground hover:text-primary"
              >
                <PenLine className="w-4 h-4 shrink-0" />
                <span className="text-sm font-medium">Custom — enter description manually</span>
              </button>
            </div>

            <div className="pt-2">
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={() => setStep(0)}>
                <ChevronLeft className="w-3.5 h-3.5" /> Back
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Calculator ── */}
        {step === 2 && (
          <div className="space-y-3 py-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Style: <strong>{selectedItem?.name}</strong></p>
              {(customDescription || selectedItem?.name) && (
                <div className="mb-3">
                  <Label className="text-xs text-muted-foreground">Description (pre-filled, editable)</Label>
                  <Input
                    className="h-8 text-xs mt-1"
                    value={customDescription}
                    onChange={e => setCustomDescription(e.target.value)}
                  />
                </div>
              )}
            </div>

            {calcType === "railing" && (
              <RailingInlineCalc
                styleName={selectedItem?.name}
                onPriceChange={handleCalcPriceChange}
                defaultExpanded={true}
              />
            )}
            {(calcType === "staircase" || calcType === "staircase_spiral") && (
              <StaircaseInlineCalc
                staircaseType={calcType === "staircase_spiral" ? "spiral" : "mono"}
                onPriceChange={handleCalcPriceChange}
                defaultExpanded={true}
              />
            )}

            {calcPrice != null && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm text-emerald-800 font-semibold">
                Calculated total: ${calcPrice.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={() => setStep(1)}>
                <ChevronLeft className="w-3.5 h-3.5" /> Back
              </Button>
              <Button size="sm" className="gap-1" onClick={() => setStep(3)} disabled={!calcPrice}>
                Next — Install Location <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Install Location ── */}
        {step === 3 && (
          <div className="space-y-4 py-2">
            {isCustom && (
              <div>
                <Label className="text-xs font-medium">Description <span className="text-destructive">*</span></Label>
                <Input
                  className="mt-1 text-sm"
                  placeholder="Enter line item description…"
                  value={customDescription}
                  onChange={e => setCustomDescription(e.target.value)}
                  autoFocus
                />
              </div>
            )}

            {!isCustom && selectedItem && (
              <div className="bg-muted/40 rounded-lg px-3 py-2 text-sm">
                <span className="text-muted-foreground text-xs">Item:</span>{" "}
                <span className="font-medium">{selectedItem.name}</span>
                {calcPrice != null && (
                  <span className="ml-2 text-xs text-muted-foreground">· ${calcPrice.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
                )}
              </div>
            )}

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
                onClick={() => setStep(hasCalculator ? 2 : 1)}
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Back
              </Button>
              <Button
                size="sm"
                className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleFinish}
                disabled={!installLocation || (isCustom && !customDescription.trim())}
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