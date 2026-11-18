import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { hasAnyRole } from "@/lib/roleHelpers";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { DEFAULT_MATERIALS } from "@/lib/railingData";
import { DEFAULT_SHAPES, RAILING_SLOTS } from "@/lib/costItems";
import { exportCostItems } from "@/lib/costItemsCsv";
import CostItemsToolbar from "./CostItemsToolbar";
import CostItemsTable from "./CostItemsTable";
import CostItemDialog from "./CostItemDialog";

const PAGE = 100;
const escapeRegex = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default function CostItemsTab({ actionsSlot }) {
  const { user } = useAuth();
  const orgId = user?.organization_id;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const canImport = hasAnyRole(user, ["owner", "admin"]);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [shape, setShape] = useState("all");
  const [used, setUsed] = useState("all");
  const [quick, setQuick] = useState("all");
  const [code, setCode] = useState(null);
  const [limit, setLimit] = useState(PAGE);
  const [dialog, setDialog] = useState({ open: false, item: null });
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => setLimit(PAGE), [debounced, shape, used, quick, code]);

  const query = { organization_id: orgId };
  if (shape !== "all") query.category = shape;
  if (used !== "all") query.component_type = used;
  else if (quick === "railing") query.component_type = { $in: RAILING_SLOTS };
  if (quick === "review") query.needs_review = true;
  if (code) query.cost_code_ids = code;
  if (debounced) {
    const rx = { $regex: escapeRegex(debounced), $options: "i" };
    query.$or = [{ name: rx }, { sku: rx }];
  }

  const { data: page, isLoading } = useQuery({
    queryKey: ["costItems", "list", query, limit],
    queryFn: () => base44.entities.MaterialPriceList.filter(query, { sort: "name", limit }),
    enabled: !!orgId,
  });
  const { data: total = 0 } = useQuery({
    queryKey: ["costItems", "total", query],
    queryFn: () => base44.entities.MaterialPriceList.count(query),
    enabled: !!orgId,
  });
  const { data: counts = {} } = useQuery({
    queryKey: ["costItems", "counts", orgId],
    queryFn: async () => ({
      all: await base44.entities.MaterialPriceList.count({ organization_id: orgId }),
      railing: await base44.entities.MaterialPriceList.count({ organization_id: orgId, component_type: { $in: RAILING_SLOTS } }),
      review: await base44.entities.MaterialPriceList.count({ organization_id: orgId, needs_review: true }),
    }),
    enabled: !!orgId,
  });
  const { data: shapeValues = [] } = useQuery({
    queryKey: ["costItems", "shapes", orgId],
    queryFn: async () => (await base44.entities.MaterialPriceList.filter({ organization_id: orgId }, { distinct: "category" })).items,
    enabled: !!orgId,
  });
  const { data: costCodes = [] } = useQuery({
    queryKey: ["costCodes", orgId],
    queryFn: async () => (await base44.entities.CostCode.filter({ organization_id: orgId, active: { $ne: false } }, { sort: "code_number", limit: 500 })).items,
    enabled: !!orgId,
  });

  const { data: codeCounts = {} } = useQuery({
    queryKey: ["costItems", "codeCounts", orgId, costCodes.map((c) => c.id).join(",")],
    queryFn: async () => Object.fromEntries(await Promise.all(
      costCodes.map(async (c) => [c.id, await base44.entities.MaterialPriceList.count({ organization_id: orgId, cost_code_ids: c.id })])
    )),
    enabled: !!orgId && costCodes.length > 0,
  });

  const pickQuick = (id) => { setQuick(id); setCode(null); };
  const pickCode = (id) => { setCode((c) => (c === id ? null : id)); setQuick("all"); };

  useEffect(() => {
    if (seeded || !orgId || counts.all !== 0) return;
    setSeeded(true);
    base44.entities.MaterialPriceList.bulkCreate(
      DEFAULT_MATERIALS.map((m) => ({ organization_id: orgId, name: m.name, category: m.category, component_type: ["Other"], cost_per_foot: m.costPerFoot, cost_method: "linear_foot", active: true }))
    ).then(refresh);
  }, [counts.all, orgId, seeded]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["costItems"] });
  const shapes = [...new Set([...DEFAULT_SHAPES, ...shapeValues.filter(Boolean)])];
  const items = page?.items || [];

  const actions = (
    <div className="flex gap-2">
      {canImport && <Button variant="outline" onClick={() => navigate("/catalog/import")}>Import</Button>}
      <Button variant="outline" onClick={() => exportCostItems(orgId, costCodes)}>Export</Button>
      <Button className="gap-1.5" onClick={() => setDialog({ open: true, item: null })}><Plus className="w-4 h-4" /> Cost Item</Button>
    </div>
  );

  return (
    <div className="space-y-4">
      {actionsSlot && createPortal(actions, actionsSlot)}
      <CostItemsToolbar
        search={search} setSearch={setSearch} shape={shape} setShape={setShape}
        used={used} setUsed={setUsed} quick={quick} onQuick={pickQuick} code={code} onCode={pickCode}
        shapes={shapes} counts={counts} costCodes={costCodes} codeCounts={codeCounts}
      />
      <CostItemsTable
        items={items} costCodes={costCodes} total={total} loading={isLoading}
        hasMore={!!page?.has_more} onMore={() => setLimit((l) => l + PAGE)}
        onEdit={(item) => setDialog({ open: true, item })}
      />
      <CostItemDialog
        open={dialog.open} onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))}
        item={dialog.item} shapes={shapes} costCodes={costCodes} orgId={orgId} onSaved={refresh}
      />
    </div>
  );
}