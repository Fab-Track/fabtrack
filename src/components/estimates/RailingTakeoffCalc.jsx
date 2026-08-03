import React, { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { computeRailingTakeoff, resolveSettings, findComponentMap } from "@/lib/railingTakeoff";

export default function RailingTakeoffCalc({ line, orgId, onPriceChange }) {
  // Initialize inputs from saved takeoff data (or line quantity if lnft)
  const [linearFeet, setLinearFeet] = useState(
    line._railing_takeoff?.inputs?.length?.toString()
    || (line.unit === "lnft" ? line.quantity?.toString() : "")
    || ""
  );
  const [isResidential, setIsResidential] = useState(line._railing_takeoff?.inputs?.isResidential ?? true);

  // Data fetches
  const { data: catalog = [], isLoading: catLoading } = useQuery({
    queryKey: ["serviceCatalog", orgId],
    queryFn: () => orgId ? base44.entities.ServiceCatalog.filter({ organization_id: orgId }) : [],
    enabled: !!orgId,
  });

  const { data: settingsRecords = [], isLoading: setLoading } = useQuery({
    queryKey: ["appSettings", orgId],
    queryFn: () => orgId ? base44.entities.AppSettings.filter({ organization_id: orgId }) : [],
    enabled: !!orgId,
  });

  const { data: maps = [], isLoading: mapLoading } = useQuery({
    queryKey: ["styleComponentMap", orgId],
    queryFn: () => orgId ? base44.entities.StyleComponentMap.filter({ organization_id: orgId }) : [],
    enabled: !!orgId,
  });

  const { data: materials = [], isLoading: matLoading } = useQuery({
    queryKey: ["materialPriceList", orgId],
    queryFn: () => orgId ? base44.entities.MaterialPriceList.filter({ organization_id: orgId }, undefined, 500) : [],
    enabled: !!orgId,
  });

  // Derived data
  const catalogItem = useMemo(
    () => catalog.find(c => c.name === line.service_name),
    [catalog, line.service_name]
  );
  const resolvedSettings = useMemo(() => resolveSettings(settingsRecords), [settingsRecords]);
  const componentMap = useMemo(() => catalogItem ? findComponentMap(maps, catalogItem) : null, [maps, catalogItem]);

  // Compute takeoff
  const takeoff = useMemo(() => {
    const len = parseFloat(linearFeet);
    if (!len || !catalogItem || !componentMap || !resolvedSettings) return null;
    return computeRailingTakeoff({ catalogItem, componentMap, materials, settings: resolvedSettings, length: len, isResidential });
  }, [linearFeet, isResidential, catalogItem, componentMap, materials, resolvedSettings]);

  // Call onPriceChange when takeoff changes (use ref to avoid stale closure / infinite loops)
  const onPriceChangeRef = useRef(onPriceChange);
  useEffect(() => { onPriceChangeRef.current = onPriceChange; });
  useEffect(() => {
    if (takeoff) {
      onPriceChangeRef.current(takeoff.totalPrice, takeoff.inputs.length, takeoff);
    }
  }, [takeoff]);

  const isLoading = catLoading || setLoading || mapLoading || matLoading;
  if (isLoading) {
    return <div className="text-xs text-muted-foreground py-2">Loading takeoff data…</div>;
  }

  // Data missing — fallback to manual pricing
  if (!catalogItem || !componentMap || !resolvedSettings) {
    return (
      <div className="border rounded-lg p-3 bg-muted/20 text-xs text-muted-foreground">
        Takeoff data incomplete — using manual pricing.
        {!catalogItem && " Catalog item not found."}
        {!componentMap && " No component map."}
        {!resolvedSettings && " Settings not configured."}
        {" Set up materials in Settings → Materials to enable takeoff pricing."}
      </div>
    );
  }

  // Computation failed (missing material weight/cost data) — fallback
  if (!takeoff && linearFeet && parseFloat(linearFeet) > 0) {
    return (
      <div className="border rounded-lg p-3 bg-muted/20 text-xs text-muted-foreground">
        Takeoff computation failed — missing material weight or pricing data. Using manual pricing.
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-3 bg-muted/10 space-y-3">
      {/* Header */}
      <p className="text-xs font-semibold">Railing Takeoff — {catalogItem.name}</p>

      {/* Inputs */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-[10px] uppercase text-muted-foreground">Linear Feet</Label>
          <Input
            type="number"
            className="h-8 text-sm w-24"
            value={linearFeet}
            onChange={e => setLinearFeet(e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <Label className="text-[10px] uppercase text-muted-foreground">Building Type</Label>
          <div className="flex border rounded-md overflow-hidden h-8">
            <button
              type="button"
              className={`px-3 text-xs transition-colors ${isResidential ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:bg-muted"}`}
              onClick={() => setIsResidential(true)}
            >
              Residential
            </button>
            <button
              type="button"
              className={`px-3 text-xs transition-colors ${!isResidential ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:bg-muted"}`}
              onClick={() => setIsResidential(false)}
            >
              Commercial
            </button>
          </div>
        </div>
      </div>

      {/* Breakdown */}
      {takeoff && (
        <div className="space-y-2 text-xs">
          {/* Takeoff steps */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-muted-foreground">
            <div>Net length: <span className="font-mono text-foreground">{takeoff.steps.netLength.toFixed(3)} ft</span></div>
            <div>Posts: <span className="font-mono text-foreground">{takeoff.steps.posts}</span></div>
            <div>Section length: <span className="font-mono text-foreground">{takeoff.steps.sectionLength.toFixed(3)} ft</span></div>
            <div>Pickets/section: <span className="font-mono text-foreground">{takeoff.steps.picketsPerSection}</span></div>
            <div>Total pickets: <span className="font-mono text-foreground">{takeoff.steps.totalPickets}</span></div>
            <div>Post height: <span className="font-mono text-foreground">{takeoff.steps.postHeight}"</span></div>
          </div>

          {/* Component breakdown */}
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left px-2 py-1 font-medium">Component</th>
                  <th className="text-right px-2 py-1 font-medium">Feet</th>
                  <th className="text-right px-2 py-1 font-medium">Lbs</th>
                  <th className="text-right px-2 py-1 font-medium">$/lb</th>
                  <th className="text-right px-2 py-1 font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {takeoff.components.map((c, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-2 py-1">{c.component_label}</td>
                    <td className="text-right px-2 py-1 font-mono">{c.feet.toFixed(2)}</td>
                    <td className="text-right px-2 py-1 font-mono">{c.pounds.toFixed(2)}</td>
                    <td className="text-right px-2 py-1 font-mono">${c.effective_per_lb.toFixed(4)}</td>
                    <td className="text-right px-2 py-1 font-mono">${c.cost.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cost summary */}
          <div className="space-y-0.5">
            <div className="flex justify-between"><span className="text-muted-foreground">Materials:</span><span className="font-mono">${takeoff.materialCost.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Fabrication:</span><span className="font-mono">${takeoff.fabCost.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Powder coat:</span><span className="font-mono">${takeoff.powderCost.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Install:</span><span className="font-mono">${takeoff.installCost.toFixed(2)}</span></div>
            <div className="flex justify-between border-t pt-0.5"><span className="text-muted-foreground">Hard cost:</span><span className="font-mono">${takeoff.hardCost.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Markup ({((takeoff.markupMultiplier - 1) * 100).toFixed(0)}%):</span><span className="font-mono">×{takeoff.markupMultiplier}</span></div>
            <div className="flex justify-between font-semibold pt-0.5"><span>Line total:</span><span className="font-mono">${takeoff.totalPrice.toFixed(2)}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}