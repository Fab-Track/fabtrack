import React, { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  RAILING_STYLES, getBasePricePerFoot, STYLE_ADDERS, LOCATION_FEES,
  STYLE_MATERIAL_CONFIGS, WOOD_TOPPERS, GLASS_OPTIONS, STEEL_TYPES,
} from "@/lib/railingData";
import RailingCalcOption1 from "./RailingCalcOption1";
import RailingCalcOption2 from "./RailingCalcOption2";

const LABOR_RATE = 27;
const POWDER_COAT_RATE = 10.50;

const defaultCalc = () => ({
  woodTopper: "None",
  steelType: "Mild Steel",
  glass: "None",
  demoFee: "",
  // Option 1 specific
  powderCoatRate: POWDER_COAT_RATE.toString(),
  fabLaborHrs: "",
  installLaborHrs: "0.05",
  multiplier: "2.0",
});

function buildMaterialRows(styleName, lnft) {
  const config = STYLE_MATERIAL_CONFIGS[styleName];
  if (!config) return [];
  const rows = [];
  const parts = [
    { label: "Top Rail", key: "topRail" },
    { label: "Bottom Rail", key: "bottomRail" },
    { label: "Posts", key: "posts" },
    { label: "Pickets", key: "pickets" },
  ];
  for (const { label, key } of parts) {
    const c = config[key];
    if (c) {
      rows.push({
        label,
        material: c.material || "",
        costPerFoot: c.costPerFoot ? c.costPerFoot.toString() : "",
        qtyMultiplier: c.qtyMultiplier || 1,
        linearFeet: ((c.qtyMultiplier || 1) * lnft).toFixed(2),
      });
    }
  }
  return rows;
}

export default function RailingCalculatorModal({ open, onClose, job, onGenerateEstimate }) {
  const [tab, setTab] = useState("opt2");
  const [style, setStyle] = useState("Columbia");
  const [lnft, setLnft] = useState(20);
  const [location, setLocation] = useState("Utah County");
  const [customPricePerFoot, setCustomPricePerFoot] = useState(0);
  const [calc, setCalc] = useState(defaultCalc());

  // Option 1 material rows
  const [materialRows, setMaterialRows] = useState(() => buildMaterialRows("Columbia", 20));

  // Style photo from library
  const { data: styleLibrary = [] } = useQuery({
    queryKey: ["railingStyleLibrary"],
    queryFn: () => base44.entities.RailingStyleLibrary.list(),
  });
  const stylePhoto = styleLibrary.find(s => s.style_name === style)?.photo_url;

  // When style changes, rebuild material rows and update labor hours
  useEffect(() => {
    const config = STYLE_MATERIAL_CONFIGS[style];
    setMaterialRows(buildMaterialRows(style, lnft));
    if (config) {
      setCalc(p => ({
        ...p,
        fabLaborHrs: config.fabLaborHrs?.toString() || "",
        installLaborHrs: config.installLaborHrs?.toString() || "0.05",
      }));
    }
  }, [style]);

  // When lnft changes, recalculate linear feet in material rows
  useEffect(() => {
    setMaterialRows(prev => prev.map(r => ({
      ...r,
      linearFeet: ((r.qtyMultiplier || 1) * lnft).toFixed(2),
    })));
  }, [lnft]);

  // Derived Option 2 values
  const basePrice = getBasePricePerFoot(lnft);
  const styleAdder = STYLE_ADDERS[style] ?? 0;

  function computeOption2Total() {
    const effectiveAdder = style === "Custom" ? (customPricePerFoot || 0) : (styleAdder || 0);
    const baseTotal = basePrice * lnft;
    const styleTotal = effectiveAdder * lnft;
    const woodAdder = (WOOD_TOPPERS[calc.woodTopper] || 0) * lnft;
    const steelAdder = (STEEL_TYPES[calc.steelType] || 0) * lnft;
    const glassAdder = (GLASS_OPTIONS[calc.glass] || 0) * lnft;
    const locationFee = LOCATION_FEES[location] || 0;
    const demoFee = parseFloat(calc.demoFee) || 0;
    return baseTotal + styleTotal + woodAdder + steelAdder + glassAdder + locationFee + demoFee;
  }

  function computeOption1Total() {
    const materialCost = materialRows.reduce((sum, r) => sum + (parseFloat(r.linearFeet) || 0) * (parseFloat(r.costPerFoot) || 0), 0);
    const powderCoat = (parseFloat(calc.powderCoatRate) || POWDER_COAT_RATE) * lnft;
    const fabLabor = (parseFloat(calc.fabLaborHrs) || 0) * lnft * LABOR_RATE;
    const installLabor = (parseFloat(calc.installLaborHrs) || 0) * lnft * LABOR_RATE;
    const totalHardCost = materialCost + powderCoat + fabLabor + installLabor;
    const multiplier = parseFloat(calc.multiplier) || 2.0;
    const intermediateBid = totalHardCost * multiplier;
    const woodAdder = (WOOD_TOPPERS[calc.woodTopper] || 0) * lnft;
    const steelAdder = (STEEL_TYPES[calc.steelType] || 0) * lnft;
    const glassAdder = (GLASS_OPTIONS[calc.glass] || 0) * lnft;
    const locationFee = LOCATION_FEES[location] || 0;
    const demoFee = parseFloat(calc.demoFee) || 0;
    return intermediateBid + woodAdder + steelAdder + glassAdder + locationFee + demoFee;
  }

  function handleGenerate() {
    const total = tab === "opt2" ? computeOption2Total() : computeOption1Total();
    const lineItems = buildLineItems();
    onGenerateEstimate({
      style,
      lnft,
      location,
      option: tab,
      total,
      lineItems,
      stylePhotoUrl: stylePhoto,
      notes: "Pricing includes materials, fabrication, powder coat, and installation.",
    });
  }

  function buildLineItems() {
    const locationFee = LOCATION_FEES[location] || 0;
    const demoFee = parseFloat(calc.demoFee) || 0;

    if (tab === "opt2") {
      const effectiveAdder = style === "Custom" ? (customPricePerFoot || 0) : (styleAdder || 0);
      const ratePerFoot = basePrice + effectiveAdder;
      const woodAdder = WOOD_TOPPERS[calc.woodTopper] || 0;
      const steelAdder = STEEL_TYPES[calc.steelType] || 0;
      const glassAdder = GLASS_OPTIONS[calc.glass] || 0;

      const lines = [
        { category: "Material", description: `Railing — ${style} — ${lnft} linear feet @ $${ratePerFoot.toFixed(2)}/lnft`, quantity: lnft, unit: "lnft", unit_cost: ratePerFoot, phase: "Fabrication", total: ratePerFoot * lnft },
      ];
      if (woodAdder > 0) lines.push({ category: "Material", description: `Wood Topper — ${calc.woodTopper}`, quantity: lnft, unit: "lnft", unit_cost: woodAdder, phase: "Fabrication", total: woodAdder * lnft });
      if (steelAdder > 0) lines.push({ category: "Material", description: `Steel Upgrade — ${calc.steelType}`, quantity: lnft, unit: "lnft", unit_cost: steelAdder, phase: "Fabrication", total: steelAdder * lnft });
      if (glassAdder > 0) lines.push({ category: "Material", description: `Glass — ${calc.glass}`, quantity: lnft, unit: "lnft", unit_cost: glassAdder, phase: "Fabrication", total: glassAdder * lnft });
      if (locationFee > 0) lines.push({ category: "Other", description: `Location Fee — ${location}`, quantity: 1, unit: "ls", unit_cost: locationFee, phase: "Install", total: locationFee });
      if (demoFee > 0) lines.push({ category: "Other", description: "Demo / Disposal Fee", quantity: 1, unit: "ls", unit_cost: demoFee, phase: "Install", total: demoFee });
      return lines;
    }

    // Option 1
    const materialCost = materialRows.reduce((sum, r) => sum + (parseFloat(r.linearFeet) || 0) * (parseFloat(r.costPerFoot) || 0), 0);
    const powderCoat = (parseFloat(calc.powderCoatRate) || POWDER_COAT_RATE) * lnft;
    const fabLabor = (parseFloat(calc.fabLaborHrs) || 0) * lnft * LABOR_RATE;
    const installLabor = (parseFloat(calc.installLaborHrs) || 0) * lnft * LABOR_RATE;
    const totalHardCost = materialCost + powderCoat + fabLabor + installLabor;
    const multiplier = parseFloat(calc.multiplier) || 2.0;
    const intermediateBid = totalHardCost * multiplier;
    const markupAmount = intermediateBid - totalHardCost;

    const lines = [
      ...materialRows.map(r => ({
        category: "Material",
        description: `${r.label} — ${r.material}`,
        quantity: parseFloat(r.linearFeet) || 0,
        unit: "lnft",
        unit_cost: parseFloat(r.costPerFoot) || 0,
        phase: "Fabrication",
        total: (parseFloat(r.linearFeet) || 0) * (parseFloat(r.costPerFoot) || 0),
      })),
      { category: "Material", description: "Powder Coat", quantity: lnft, unit: "lnft", unit_cost: parseFloat(calc.powderCoatRate) || POWDER_COAT_RATE, phase: "Powder Coat", total: powderCoat },
      { category: "Labor", description: `Fabrication Labor — ${calc.fabLaborHrs} hrs/lnft × ${lnft} lnft`, quantity: (parseFloat(calc.fabLaborHrs) || 0) * lnft, unit: "hrs", unit_cost: LABOR_RATE, phase: "Fabrication", total: fabLabor },
      { category: "Labor", description: `Installation Labor — ${calc.installLaborHrs} hrs/lnft × ${lnft} lnft`, quantity: (parseFloat(calc.installLaborHrs) || 0) * lnft, unit: "hrs", unit_cost: LABOR_RATE, phase: "Install", total: installLabor },
      { category: "Other", description: `Markup (${(multiplier * 100).toFixed(0)}%) — Cost × ${multiplier.toFixed(1)}`, quantity: 1, unit: "ls", unit_cost: markupAmount, phase: "Other", total: markupAmount },
    ];

    const woodAdder = (WOOD_TOPPERS[calc.woodTopper] || 0) * lnft;
    const steelAdder = (STEEL_TYPES[calc.steelType] || 0) * lnft;
    const glassAdder = (GLASS_OPTIONS[calc.glass] || 0) * lnft;
    if (woodAdder > 0) lines.push({ category: "Material", description: `Wood Topper — ${calc.woodTopper}`, quantity: lnft, unit: "lnft", unit_cost: WOOD_TOPPERS[calc.woodTopper], phase: "Fabrication", total: woodAdder });
    if (steelAdder > 0) lines.push({ category: "Material", description: `Steel Upgrade — ${calc.steelType}`, quantity: lnft, unit: "lnft", unit_cost: STEEL_TYPES[calc.steelType], phase: "Fabrication", total: steelAdder });
    if (glassAdder > 0) lines.push({ category: "Material", description: `Glass — ${calc.glass}`, quantity: lnft, unit: "lnft", unit_cost: GLASS_OPTIONS[calc.glass], phase: "Fabrication", total: glassAdder });
    if (locationFee > 0) lines.push({ category: "Other", description: `Location Fee — ${location}`, quantity: 1, unit: "ls", unit_cost: locationFee, phase: "Install", total: locationFee });
    if (demoFee > 0) lines.push({ category: "Other", description: "Demo / Disposal Fee", quantity: 1, unit: "ls", unit_cost: demoFee, phase: "Install", total: demoFee });

    return lines;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] p-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b bg-muted/30 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-mono">{job?.job_number}</p>
              <h2 className="font-semibold text-sm">Railing Estimate Calculator — {job?.job_name}</h2>
            </div>
            <p className="text-xs text-muted-foreground">{job?.customer_name}</p>
          </div>
        </div>

        {/* Shared header fields */}
        <div className="px-5 py-3 border-b bg-background shrink-0">
          <div className="flex items-end gap-4 flex-wrap">
            <div className="space-y-1">
              <Label className="text-xs">Railing Style</Label>
              <div className="flex items-center gap-2">
                <Select value={style} onValueChange={setStyle}>
                  <SelectTrigger className="h-8 text-xs w-52"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RAILING_STYLES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                {stylePhoto && (
                  <img src={stylePhoto} alt={style} className="w-10 h-10 rounded object-cover border shrink-0" />
                )}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Linear Feet</Label>
              <Input
                type="number"
                className="h-8 text-xs w-28"
                value={lnft}
                onChange={e => setLnft(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Location</Label>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger className="h-8 text-xs w-52"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LOCATION_FEES).map(([loc, fee]) => (
                    <SelectItem key={loc} value={loc} className="text-xs">
                      {loc}{fee > 0 ? ` (+$${fee})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="ml-auto">
              <Badge variant="outline" className="text-xs">
                {lnft} lnft · Base ${getBasePricePerFoot(lnft)}/ft
              </Badge>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <Tabs value={tab} onValueChange={setTab} className="flex flex-col h-full">
            <TabsList className="mx-5 mt-3 mb-0 shrink-0 w-fit">
              <TabsTrigger value="opt2" className="text-xs">Option 2 — Linear Foot Pricing</TabsTrigger>
              <TabsTrigger value="opt1" className="text-xs">Option 1 — Cost Breakdown</TabsTrigger>
            </TabsList>

            <TabsContent value="opt2" className="flex-1 overflow-hidden px-5 pt-4 pb-0">
              <RailingCalcOption2
                calc={calc}
                setCalc={setCalc}
                lnft={lnft}
                location={location}
                styleAdder={styleAdder}
                customPricePerFoot={customPricePerFoot}
                setCustomPricePerFoot={setCustomPricePerFoot}
                basePrice={basePrice}
                styleName={style}
              />
            </TabsContent>

            <TabsContent value="opt1" className="flex-1 overflow-hidden px-5 pt-4 pb-0">
              <RailingCalcOption1
                rows={materialRows}
                setRows={setMaterialRows}
                lnft={lnft}
                location={location}
                calc={calc}
                setCalc={setCalc}
                styleName={style}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t bg-muted/20 flex items-center justify-between shrink-0">
          <p className="text-xs text-muted-foreground">
            Total: <span className="font-semibold text-foreground">
              ${(tab === "opt2" ? computeOption2Total() : computeOption1Total()).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleGenerate}>Preview Estimate</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}