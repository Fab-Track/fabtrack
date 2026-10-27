import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Check, X, Sparkles, Info } from "lucide-react";
import { toast } from "sonner";
import ServiceCatalogModal from "@/components/services/ServiceCatalogModal";
import {
  getRailingVolumeDiscount,
  getRailingVolumeTierLabel,
  getSuggestionsForProducts,
  CATALOG_CATEGORIES,
} from "@/lib/serviceCatalogData";

const STATUS_STYLE = {
  "Uninvoiced":         "bg-muted text-muted-foreground border-transparent",
  "Partially Invoiced": "bg-amber-100 text-amber-800 border-transparent",
  "Fully Invoiced":     "bg-emerald-100 text-emerald-800 border-transparent",
};

function ServiceRow({ svc, onEdit, onDelete }) {
  const canEdit = svc.status === "Uninvoiced";
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 group">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{svc.name}</p>
        {svc.description && (
          <p className="text-xs text-muted-foreground truncate">{svc.description}</p>
        )}
      </div>
      <div className="text-xs text-muted-foreground shrink-0">
        {svc.quantity} {svc.unit}
      </div>
      <div className="text-sm font-semibold shrink-0 w-24 text-right">
        ${(svc.total_price || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
      </div>
      {svc.status === "Partially Invoiced" && (
        <div className="text-xs text-amber-700 shrink-0 w-28 text-right">
          Rem: ${((svc.total_price || 0) - (svc.invoiced_amount || 0)).toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </div>
      )}
      {svc.status === "Uninvoiced" && <div className="w-28 shrink-0" />}
      <Badge className={`text-xs shrink-0 ${STATUS_STYLE[svc.status] || ""}`}>{svc.status}</Badge>
      {canEdit && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(svc)}>
            <Pencil className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => onDelete(svc)}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

function ServiceForm({ initial = {}, isRailing = false, basePrice = null, onSave, onCancel }) {
  const [name, setName] = useState(initial.name || "");
  const [description, setDescription] = useState(initial.description || "");
  const [quantity, setQuantity] = useState(initial.quantity ?? 1);
  const [unit, setUnit] = useState(initial.unit || "ls");
  const [unitPrice, setUnitPrice] = useState(initial.unit_price ?? 0);
  const [priceOverridden, setPriceOverridden] = useState(false);

  // Volume discount logic for railing
  const discount = isRailing && !priceOverridden ? getRailingVolumeDiscount(quantity) : 0;
  const effectiveBase = basePrice !== null ? basePrice : (initial._catalog_base_price || unitPrice);
  const autoPrice = isRailing && !priceOverridden && basePrice !== null
    ? Math.max(0, effectiveBase - discount)
    : parseFloat(unitPrice) || 0;

  const displayPrice = isRailing && !priceOverridden && basePrice !== null ? autoPrice : (parseFloat(unitPrice) || 0);
  const tierLabel = isRailing && !priceOverridden ? getRailingVolumeTierLabel(quantity) : null;
  const isZeroPrice = displayPrice === 0;

  const total = (parseFloat(quantity) || 0) * displayPrice;

  function handleQtyChange(val) {
    setQuantity(val);
    if (isRailing && !priceOverridden && basePrice !== null) {
      const disc = getRailingVolumeDiscount(val);
      setUnitPrice(Math.max(0, effectiveBase - disc));
    }
  }

  function handlePriceChange(val) {
    setUnitPrice(val);
    setPriceOverridden(true);
  }

  const finalPrice = isRailing && !priceOverridden && basePrice !== null ? autoPrice : (parseFloat(unitPrice) || 0);
  const finalTotal = (parseFloat(quantity) || 0) * finalPrice;

  return (
    <div className="px-4 py-3 bg-muted/20 border-t border-b space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Input
          placeholder="Service name *"
          value={name}
          onChange={e => setName(e.target.value)}
          className="h-8 text-sm"
        />
        <Input
          placeholder="Description (shown on invoice)"
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="h-8 text-sm"
        />
      </div>
      <div className="flex gap-2 items-start flex-wrap">
        <Input
          type="number"
          placeholder="Qty"
          value={quantity}
          onChange={e => handleQtyChange(e.target.value)}
          className="h-8 text-sm w-20"
        />
        <Input
          placeholder="Unit"
          value={unit}
          onChange={e => setUnit(e.target.value)}
          className="h-8 text-sm w-20"
        />
        <div className="flex flex-col gap-0.5">
          <Input
            type="number"
            placeholder="Unit Price"
            value={isRailing && !priceOverridden && basePrice !== null ? autoPrice : unitPrice}
            onChange={e => handlePriceChange(e.target.value)}
            className={`h-8 text-sm w-28 ${isZeroPrice ? "border-amber-400 bg-amber-50" : ""}`}
          />
          {tierLabel && (
            <p className="text-xs text-blue-600 flex items-center gap-1">
              <Info className="w-3 h-3" /> Volume discount: {tierLabel}
            </p>
          )}
          {isZeroPrice && (
            <p className="text-xs text-amber-600">⚠ Set price before invoicing</p>
          )}
        </div>
        <span className="text-sm font-semibold text-muted-foreground shrink-0 self-center">
          = ${finalTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
        <div className="flex gap-1 ml-auto self-start">
          <Button
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => onSave({
              name,
              description,
              quantity: parseFloat(quantity) || 1,
              unit,
              unit_price: finalPrice,
              total_price: finalTotal,
            })}
            disabled={!name.trim()}
          >
            <Check className="w-3 h-3" /> Save
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onCancel}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function JobServicesSection({ job, services = [], onServicesChange }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState(null); // item to pre-fill form with
  const [dismissedSuggestions, setDismissedSuggestions] = useState(false);
  const [suggestionOpen, setSuggestionOpen] = useState(false);

  // Fetch catalog items
  const { data: catalogItems = [] } = useQuery({
    queryKey: ["serviceCatalog"],
    queryFn: () => base44.entities.ServiceCatalog.list("sort_order"),
  });

  // Compute suggested service names from job products
  const rawSuggestions = getSuggestionsForProducts(
    job?.product_instances || [],
    job?.job_type || ""
  );

  // Expand __all_railing__ placeholder
  const allRailingNames = catalogItems.filter(i => i.category === "Railing").map(i => i.name);
  const suggestedNames = rawSuggestions.flatMap(s =>
    s === "__all_railing__" ? allRailingNames : [s]
  );

  // Show banner only when there are suggestions and at least one product exists
  const hasProducts =
    (job?.product_instances?.length > 0) ||
    (job?.job_type && job.job_type !== "Other");

  const showSuggestionBanner =
    hasProducts &&
    suggestedNames.length > 0 &&
    !dismissedSuggestions &&
    services.length === 0; // only show when no services added yet

  const totalValue = services.reduce((s, sv) => s + (sv.total_price || 0), 0);
  const totalInvoiced = services.reduce((s, sv) => s + (sv.invoiced_amount || 0), 0);
  const remaining = totalValue - totalInvoiced;

  const createSvc = useMutation({
    mutationFn: (data) => base44.entities.JobService.create({
      ...data,
      job_id: job.id,
      job_number: job.job_number,
      status: "Uninvoiced",
      invoiced_amount: 0,
      invoice_refs: [],
      source: "Manual",
      sort_order: services.length,
    }),
    onSuccess: () => {
      qc.invalidateQueries(["services", job.id]);
      setShowAdd(false);
      setSelectedCatalogItem(null);
      onServicesChange?.();
    },
  });

  const updateSvc = useMutation({
    mutationFn: ({ id, data }) => base44.entities.JobService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries(["services", job.id]);
      setEditingId(null);
      onServicesChange?.();
    },
  });

  const deleteSvc = useMutation({
    mutationFn: (id) => base44.entities.JobService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries(["services", job.id]);
      onServicesChange?.();
    },
  });

  function handleDelete(svc) {
    if (!confirm(`Delete service "${svc.name}"?`)) return;
    deleteSvc.mutate(svc.id);
  }

  function handleCatalogSelect(item) {
    // Pre-fill the add form with catalog item data
    setSelectedCatalogItem(item);
    setShowAdd(true);
    setEditingId(null);
  }

  function handleCustomService() {
    setSelectedCatalogItem(null);
    setShowAdd(true);
    setEditingId(null);
  }

  const formInitial = selectedCatalogItem ? {
    name: selectedCatalogItem.name,
    description: selectedCatalogItem.default_description || "",
    quantity: 1,
    unit: selectedCatalogItem.unit || "ls",
    unit_price: selectedCatalogItem.default_unit_price || 0,
    _catalog_base_price: selectedCatalogItem.default_unit_price || 0,
  } : {};

  const productNames = (job?.product_instances || []).map(p => p.label || p.product_type).join(", ") ||
    job?.job_type || "product";

  return (
    <div>
      {/* Suggestion Banner */}
      {showSuggestionBanner && (
        <div className="mb-3 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 flex-1">
            Based on your project details, we have suggested services ready to add.
          </p>
          <Button
            size="sm"
            className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white shrink-0"
            onClick={() => setSuggestionOpen(true)}
          >
            Review Suggestions
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-amber-700 shrink-0"
            onClick={() => setDismissedSuggestions(true)}
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between py-3 border-b">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">Services</span>
          <span className="text-xs text-muted-foreground">({services.length})</span>
          {totalValue > 0 && (
            <div className="flex items-center gap-3 ml-3 text-xs text-muted-foreground">
              <span>Total: <span className="font-semibold text-foreground">${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></span>
              <span>Invoiced: <span className="font-semibold text-emerald-600">${totalInvoiced.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></span>
              {remaining > 0 && <span>Remaining: <span className="font-semibold text-amber-600">${remaining.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></span>}
            </div>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          onClick={() => { setCatalogOpen(true); setShowAdd(false); }}
        >
          <Plus className="w-3 h-3" /> Add Service
        </Button>
      </div>

      {/* List */}
      {services.length === 0 && !showAdd ? (
        <div className="text-center py-6 text-muted-foreground bg-muted/20 rounded-lg mt-2 text-sm">
          No services yet. Add scope items here to invoice against.
        </div>
      ) : (
        <div className="divide-y border rounded-lg mt-2 overflow-hidden">
          {services.map(svc =>
            editingId === svc.id ? (
              <ServiceForm
                key={svc.id}
                initial={svc}
                isRailing={catalogItems.find(c => c.name === svc.name)?.is_railing || false}
                basePrice={catalogItems.find(c => c.name === svc.name)?.default_unit_price ?? null}
                onSave={(data) => updateSvc.mutate({ id: svc.id, data })}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <ServiceRow
                key={svc.id}
                svc={svc}
                onEdit={(s) => { setEditingId(s.id); setShowAdd(false); }}
                onDelete={handleDelete}
              />
            )
          )}
          {showAdd && (
            <ServiceForm
              initial={formInitial}
              isRailing={selectedCatalogItem?.is_railing || false}
              basePrice={selectedCatalogItem?.default_unit_price ?? null}
              onSave={(data) => createSvc.mutate(data)}
              onCancel={() => { setShowAdd(false); setSelectedCatalogItem(null); }}
            />
          )}
        </div>
      )}

      {/* If list has items but showAdd is true, form is inside the list above */}

      {/* Catalog Modal — normal add */}
      <ServiceCatalogModal
        open={catalogOpen && !suggestionOpen}
        onClose={() => setCatalogOpen(false)}
        catalogItems={catalogItems}
        onSelect={handleCatalogSelect}
        onCustom={handleCustomService}
      />

      {/* Catalog Modal — suggestions pre-filtered */}
      <ServiceCatalogModal
        open={suggestionOpen}
        onClose={() => setSuggestionOpen(false)}
        catalogItems={catalogItems}
        filterNames={suggestedNames}
        preCheckedNames={suggestedNames}
        onSelect={(item) => { setSuggestionOpen(false); handleCatalogSelect(item); }}
        onCustom={() => { setSuggestionOpen(false); handleCustomService(); }}
      />
    </div>
  );
}