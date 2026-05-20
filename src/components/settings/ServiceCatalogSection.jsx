import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Check, X, EyeOff, Eye } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_SERVICE_CATALOG, CATALOG_CATEGORIES } from "@/lib/serviceCatalogData";

const UNITS = ["lnft", "sqft", "ea", "ls", "per tread", "per inch elevation", "hr", "other"];

function CatalogItemForm({ initial = {}, onSave, onCancel }) {
  const [name, setName] = useState(initial.name || "");
  const [category, setCategory] = useState(initial.category || "Other");
  const [unit, setUnit] = useState(initial.unit || "ls");
  const [unitPrice, setUnitPrice] = useState(initial.default_unit_price ?? 0);
  const [description, setDescription] = useState(initial.default_description || "");

  return (
    <div className="bg-muted/20 border rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          placeholder="Service name *"
          value={name}
          onChange={e => setName(e.target.value)}
          className="h-8 text-sm"
        />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATALOG_CATEGORIES.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2 items-center">
        <Select value={unit} onValueChange={setUnit}>
          <SelectTrigger className="h-8 text-sm w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground">$</span>
          <Input
            type="number"
            placeholder="Default price"
            value={unitPrice}
            onChange={e => setUnitPrice(e.target.value)}
            className="h-8 text-sm w-28"
          />
          <span className="text-xs text-muted-foreground shrink-0">/ {unit}</span>
        </div>
      </div>
      <Textarea
        placeholder="Default description (shown on invoice)…"
        value={description}
        onChange={e => setDescription(e.target.value)}
        className="text-sm min-h-[60px]"
      />
      <div className="flex gap-2 justify-end">
        <Button
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => onSave({ name, category, unit, default_unit_price: parseFloat(unitPrice) || 0, default_description: description })}
          disabled={!name.trim()}
        >
          <Check className="w-3 h-3" /> Save
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onCancel}>
          <X className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

export default function ServiceCatalogSection() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [seeded, setSeeded] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const { data: catalog = [], isLoading } = useQuery({
    queryKey: ["serviceCatalog"],
    queryFn: () => base44.entities.ServiceCatalog.list("sort_order"),
  });

  // Seed defaults if empty
  useEffect(() => {
    if (!isLoading && catalog.length === 0 && !seeded) {
      setSeeded(true);
      Promise.all(
        DEFAULT_SERVICE_CATALOG.map(item => base44.entities.ServiceCatalog.create({ ...item, is_active: true }))
      ).then(() => qc.invalidateQueries({ queryKey: ["serviceCatalog"] }));
    }
  }, [isLoading, catalog.length, seeded]);

  const createItem = useMutation({
    mutationFn: (data) => base44.entities.ServiceCatalog.create({ ...data, is_active: true, sort_order: catalog.length }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["serviceCatalog"] }); setShowAdd(false); toast.success("Service added"); },
  });

  const updateItem = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ServiceCatalog.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["serviceCatalog"] }); setEditingId(null); toast.success("Service updated"); },
  });

  const deleteItem = useMutation({
    mutationFn: (id) => base44.entities.ServiceCatalog.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["serviceCatalog"] }); toast.success("Service deleted"); },
  });

  const visibleItems = catalog.filter(i => showInactive ? true : i.is_active !== false);

  const grouped = CATALOG_CATEGORIES.reduce((acc, cat) => {
    const items = visibleItems.filter(i => i.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {});

  if (isLoading) return <p className="text-sm text-muted-foreground py-6">Loading catalog…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-semibold text-base">Service Catalog</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Master list of standard services with default pricing. Used to pre-fill new service items on jobs.
            Price changes here only affect new services — existing job services are not retroactively updated.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowInactive(p => !p)}>
            {showInactive ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {showInactive ? "Hide Inactive" : "Show Inactive"}
          </Button>
          <Button size="sm" className="h-7 text-xs gap-1" onClick={() => { setShowAdd(true); setEditingId(null); }}>
            <Plus className="w-3 h-3" /> Add Item
          </Button>
        </div>
      </div>

      {showAdd && (
        <CatalogItemForm
          onSave={(data) => createItem.mutate(data)}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {CATALOG_CATEGORIES.map(cat => {
        const items = grouped[cat];
        if (!items) return null;
        return (
          <div key={cat}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{cat}</h3>
            <div className="border rounded-lg overflow-hidden">
              {/* Table header */}
              <div className="grid px-4 py-2 bg-muted/40 border-b text-xs font-medium text-muted-foreground"
                style={{ gridTemplateColumns: "2fr 80px 90px 1fr 80px" }}>
                <span>Name</span>
                <span>Unit</span>
                <span>Default $</span>
                <span>Description</span>
                <span></span>
              </div>
              {items.map(item => (
                editingId === item.id ? (
                  <div key={item.id} className="p-3">
                    <CatalogItemForm
                      initial={item}
                      onSave={(data) => updateItem.mutate({ id: item.id, data })}
                      onCancel={() => setEditingId(null)}
                    />
                  </div>
                ) : (
                  <div
                    key={item.id}
                    className={`grid px-4 py-2.5 border-b last:border-0 items-center gap-2 group ${item.is_active === false ? "opacity-50" : ""}`}
                    style={{ gridTemplateColumns: "2fr 80px 90px 1fr 80px" }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium truncate">{item.name}</span>
                      {item.is_active === false && <Badge variant="outline" className="text-xs shrink-0">Inactive</Badge>}
                    </div>
                    <span className="text-xs text-muted-foreground">{item.unit}</span>
                    <span className={`text-sm font-semibold ${(!item.default_unit_price) ? "text-amber-600" : ""}`}>
                      {item.default_unit_price ? `$${item.default_unit_price.toLocaleString()}` : "$ TBD"}
                    </span>
                    <span className="text-xs text-muted-foreground line-clamp-1">{item.default_description}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(item.id)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => updateItem.mutate({ id: item.id, data: { is_active: item.is_active === false } })}
                        title={item.is_active === false ? "Activate" : "Deactivate"}
                      >
                        {item.is_active === false ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive"
                        onClick={() => { if (confirm(`Delete "${item.name}"?`)) deleteItem.mutate(item.id); }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}