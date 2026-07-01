import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Check, X, EyeOff, Eye, Camera, Settings2, Calculator } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_SERVICE_CATALOG, CATALOG_CATEGORIES as DEFAULT_CATEGORIES } from "@/lib/serviceCatalogData";
import CostModelEditor from "@/components/settings/CostModelEditor";

const UNITS = ["lnft", "sqft", "ea", "ls", "per tread", "per inch elevation", "hr", "other"];

// ── Category dropdown with "Add New" inline ──────────────────────────────────
function CategorySelect({ value, onChange, categories }) {
  const [addingNew, setAddingNew] = useState(false);
  const [newCat, setNewCat] = useState("");
  const inputRef = useRef(null);

  function saveNew() {
    const cat = newCat.trim();
    if (!cat) return;
    onChange(cat);
    setAddingNew(false);
    setNewCat("");
  }

  if (addingNew) {
    return (
      <div className="flex items-center gap-1 h-8">
        <Input
          ref={inputRef}
          autoFocus
          className="h-8 text-sm flex-1"
          placeholder="New category name…"
          value={newCat}
          onChange={e => setNewCat(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") saveNew(); if (e.key === "Escape") setAddingNew(false); }}
        />
        <Button size="sm" className="h-7 px-2" onClick={saveNew}><Check className="w-3 h-3" /></Button>
        <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => setAddingNew(false)}><X className="w-3 h-3" /></Button>
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={v => { if (v === "__add_new__") setAddingNew(true); else onChange(v); }}>
      <SelectTrigger className="h-8 text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {categories.map(c => (
          <SelectItem key={c} value={c}>{c}</SelectItem>
        ))}
        <SelectItem value="__add_new__" className="text-primary font-medium border-t mt-1">
          + Add New Category
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

// ── Manage Categories modal ──────────────────────────────────────────────────
function ManageCategoriesModal({ open, onClose, categories, catalog, onRename, onDelete, onMoveItem, onCreateCategory }) {
  const [renaming, setRenaming] = useState(null); // { cat, value }
  const [expandedCat, setExpandedCat] = useState(null);
  const [addingNew, setAddingNew] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  function saveNewCategory() {
    const name = newCatName.trim();
    if (!name) return;
    onCreateCategory(name);
    setNewCatName("");
    setAddingNew(false);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Categories</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
          {categories.map(cat => {
            const items = catalog.filter(i => i.category === cat);
            const count = items.length;
            const isRenaming = renaming?.cat === cat;
            const isExpanded = expandedCat === cat;
            return (
              <div key={cat} className="border rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2">
                  {isRenaming ? (
                    <>
                      <Input
                        autoFocus
                        className="h-7 text-sm flex-1"
                        value={renaming.value}
                        onChange={e => setRenaming(r => ({ ...r, value: e.target.value }))}
                        onKeyDown={e => {
                          if (e.key === "Enter") { onRename(cat, renaming.value); setRenaming(null); }
                          if (e.key === "Escape") setRenaming(null);
                        }}
                      />
                      <Button size="sm" className="h-7 px-2" onClick={() => { onRename(cat, renaming.value); setRenaming(null); }}><Check className="w-3 h-3" /></Button>
                      <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => setRenaming(null)}><X className="w-3 h-3" /></Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm font-medium">{cat}</span>
                      <span className="text-xs text-muted-foreground">{count} item{count !== 1 ? "s" : ""}</span>
                      {count > 0 && (
                        <Button
                          size="sm" variant="outline" className="h-7 text-xs px-2"
                          onClick={() => setExpandedCat(isExpanded ? null : cat)}
                        >
                          {isExpanded ? "Hide Items" : "Manage Items"}
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setRenaming({ cat, value: cat })}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive"
                        onClick={() => {
                          if (count > 0) {
                            toast.error("Move or remove all items in this category before deleting it.");
                          } else {
                            onDelete(cat);
                          }
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>

                {/* Expanded items list */}
                {isExpanded && (
                  <div className="border-t bg-muted/20 divide-y">
                    {items.map(item => (
                      <div key={item.id} className="flex items-center gap-2 px-3 py-2">
                        <span className="flex-1 text-sm truncate">{item.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">Move to:</span>
                        <Select
                          value=""
                          onValueChange={newCat => {
                            if (newCat) onMoveItem(item.id, newCat);
                          }}
                        >
                          <SelectTrigger className="h-7 text-xs w-44">
                            <SelectValue placeholder="Select category…" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.filter(c => c !== cat).map(c => (
                              <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add new category row */}
          {addingNew ? (
            <div className="flex items-center gap-2 border rounded-lg px-3 py-2 border-primary/40 bg-primary/5">
              <Input
                autoFocus
                className="h-7 text-sm flex-1"
                placeholder="New category name…"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") saveNewCategory(); if (e.key === "Escape") { setAddingNew(false); setNewCatName(""); } }}
              />
              <Button size="sm" className="h-7 px-2" onClick={saveNewCategory}><Check className="w-3 h-3" /></Button>
              <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => { setAddingNew(false); setNewCatName(""); }}><X className="w-3 h-3" /></Button>
            </div>
          ) : (
            <button
              className="w-full text-left px-3 py-2 text-sm text-primary font-medium border border-dashed border-primary/40 rounded-lg hover:bg-primary/5 transition-colors"
              onClick={() => setAddingNew(true)}
            >
              + New Category
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Photo upload cell ─────────────────────────────────────────────────────────
function PhotoCell({ photoUrl, onUpload, onRemove }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    onUpload(file_url);
    setUploading(false);
  }

  return (
    <div className="flex items-center gap-1">
      <button
        className="relative w-10 h-10 rounded border border-dashed border-muted-foreground/40 flex items-center justify-center hover:border-primary/60 overflow-hidden bg-muted/20 shrink-0 group"
        onClick={() => inputRef.current?.click()}
        title={photoUrl ? "Replace photo" : "Upload photo"}
        type="button"
      >
        {uploading ? (
          <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        ) : photoUrl ? (
          <img src={photoUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <Camera className="w-4 h-4 text-muted-foreground/60 group-hover:text-primary/60" />
        )}
      </button>
      {photoUrl && (
        <button
          className="text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          title="Remove photo"
          type="button"
        >
          <X className="w-3 h-3" />
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
    </div>
  );
}

// ── Item form ─────────────────────────────────────────────────────────────────
function CatalogItemForm({ initial = {}, categories, onSave, onCancel, fabRate = 0, installRate = 0 }) {
  const [name, setName] = useState(initial.name || "");
  const [category, setCategory] = useState(initial.category || categories[0] || "Other");
  const [unit, setUnit] = useState(initial.unit || "ls");
  const [unitPrice, setUnitPrice] = useState(initial.default_unit_price ?? 0);
  const [description, setDescription] = useState(initial.default_description || "");
  const [photoUrl, setPhotoUrl] = useState(initial.photo_url || "");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const costModelRef = useRef({});
  const [showCostModel, setShowCostModel] = useState(false);

  // Initialize cost model ref from the item
  useEffect(() => {
    costModelRef.current = {
      cost_primary_unit: initial.cost_primary_unit || "Linear Foot",
      cost_materials_per_unit: initial.cost_materials_per_unit ?? 0,
      cost_fab_hours_per_unit: initial.cost_fab_hours_per_unit ?? 0,
      cost_powder_coat_per_unit: initial.cost_powder_coat_per_unit ?? 0,
      cost_install_crew_size: initial.cost_install_crew_size ?? 0,
      cost_install_hours_per_unit: initial.cost_install_hours_per_unit ?? 0,
      cost_markup_multiplier: initial.cost_markup_multiplier ?? 1.5,
    };
    // Auto-expand cost model if item already has cost data
    if (initial.cost_materials_per_unit || initial.cost_fab_hours_per_unit || initial.cost_markup_multiplier) {
      setShowCostModel(true);
    }
  }, [initial]);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setPhotoUrl(file_url);
    setUploading(false);
  }

  return (
    <div className="bg-muted/20 border rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          placeholder="Service name *"
          value={name}
          onChange={e => setName(e.target.value)}
          className="h-8 text-sm"
        />
        <CategorySelect value={category} onChange={setCategory} categories={categories} />
      </div>
      <div className="flex gap-2 items-center">
        <Select value={unit} onValueChange={setUnit}>
          <SelectTrigger className="h-8 text-sm w-40"><SelectValue /></SelectTrigger>
          <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground">$</span>
          <Input type="number" placeholder="Default price" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} className="h-8 text-sm w-28" />
          <span className="text-xs text-muted-foreground shrink-0">/ {unit}</span>
        </div>
      </div>
      <Textarea
        placeholder="Default description (shown on invoice)…"
        value={description}
        onChange={e => setDescription(e.target.value)}
        className="text-sm min-h-[60px]"
      />
      {/* Photo */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground shrink-0">Photo:</span>
        {photoUrl ? (
          <div className="flex items-center gap-2">
            <img src={photoUrl} alt="" className="h-14 w-20 object-cover rounded border" />
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setPhotoUrl("")}>Remove</Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Camera className="w-3 h-3" /> {uploading ? "Uploading…" : "Upload Photo"}
          </Button>
        )}
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
      </div>

      {/* Cost Model toggle + editor */}
      <div>
        <button
          type="button"
          onClick={() => setShowCostModel(p => !p)}
          className="text-xs font-medium text-blue-700 hover:text-blue-800 flex items-center gap-1"
        >
          <Calculator className="w-3.5 h-3.5" />
          {showCostModel ? "Hide Cost Model" : "Configure Cost Model"}
        </button>
        {showCostModel && (
          <div className="mt-2">
            <CostModelEditor
              initial={initial}
              fabRate={fabRate}
              installRate={installRate}
              onChange={(cm) => { costModelRef.current = cm; }}
            />
          </div>
        )}
      </div>

      <div className="flex gap-2 justify-end">
        <Button
          size="sm" className="h-7 text-xs gap-1"
          onClick={() => onSave({
            name, category, unit,
            default_unit_price: parseFloat(unitPrice) || 0,
            default_description: description,
            photo_url: photoUrl || null,
            ...costModelRef.current,
          })}
          disabled={!name.trim()}
        >
          <Check className="w-3 h-3" /> Save
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onCancel}><X className="w-3 h-3" /></Button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ServiceCatalogSection() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [seeded, setSeeded] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [manageCatsOpen, setManageCatsOpen] = useState(false);
  const [customCategories, setCustomCategories] = useState([]);

  const [orgId, setOrgId] = useState(null);
  useEffect(() => {
    base44.auth.me().then(u => setOrgId(u?.organization_id || null)).catch(() => {});
  }, []);

  const { data: catalog = [], isLoading } = useQuery({
    queryKey: ["serviceCatalog", orgId],
    queryFn: () => orgId ? base44.entities.ServiceCatalog.filter({ organization_id: orgId }, "sort_order") : [],
    enabled: !!orgId,
  });

  // Fetch global labor rates for the cost model live preview
  const { data: settingsArr = [] } = useQuery({
    queryKey: ["appSettings", "main", orgId],
    queryFn: () => orgId ? base44.entities.AppSettings.filter({ setting_key: "main", organization_id: orgId }) : [],
    enabled: !!orgId,
  });
  const fabRate = settingsArr[0]?.labor_fab_rate ?? 0;
  const installRate = settingsArr[0]?.labor_install_rate ?? 0;

  // Derive categories from DB (unique) merged with defaults and any newly created ones
  const dbCategories = [...new Set(catalog.map(i => i.category).filter(Boolean))];
  const categories = [...new Set([...DEFAULT_CATEGORIES, ...dbCategories, ...customCategories])];

  // Seed defaults if empty
  useEffect(() => {
    if (!isLoading && catalog.length === 0 && !seeded && orgId) {
      setSeeded(true);
      Promise.all(DEFAULT_SERVICE_CATALOG.map(item => base44.entities.ServiceCatalog.create({ ...item, is_active: true, organization_id: orgId })))
        .then(() => qc.invalidateQueries({ queryKey: ["serviceCatalog"] }));
    }
  }, [isLoading, catalog.length, seeded, orgId]);

  const createItem = useMutation({
    mutationFn: (data) => base44.entities.ServiceCatalog.create({ ...data, is_active: true, sort_order: catalog.length, organization_id: orgId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["serviceCatalog"] }); setShowAdd(false); toast.success("Service added"); },
    onError: (err) => toast.error(err?.message || "Failed to save"),
  });

  const updateItem = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ServiceCatalog.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["serviceCatalog"] }); setEditingId(null); toast.success("Saved"); },
    onError: (err) => toast.error(err?.message || "Failed to save"),
  });

  const deleteItem = useMutation({
    mutationFn: (id) => base44.entities.ServiceCatalog.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["serviceCatalog"] }); toast.success("Deleted"); },
  });

  // Rename category — update all items in that category
  async function handleRenameCategory(oldCat, newCat) {
    const trimmed = newCat.trim();
    if (!trimmed || trimmed === oldCat) return;
    const items = catalog.filter(i => i.category === oldCat);
    await Promise.all(items.map(i => base44.entities.ServiceCatalog.update(i.id, { category: trimmed })));
    qc.invalidateQueries({ queryKey: ["serviceCatalog"] });
    toast.success(`Category renamed to "${trimmed}"`);
  }

  // Move a single item to a new category
  async function handleMoveItem(itemId, newCat) {
    await base44.entities.ServiceCatalog.update(itemId, { category: newCat });
    qc.invalidateQueries({ queryKey: ["serviceCatalog"] });
    toast.success(`Item moved to "${newCat}"`);
  }

  function handleCreateCategory(name) {
    const trimmed = name.trim();
    if (!trimmed || categories.includes(trimmed)) {
      if (categories.includes(trimmed)) toast.error(`"${trimmed}" already exists.`);
      return;
    }
    setCustomCategories(prev => [...prev, trimmed]);
    toast.success(`Category "${trimmed}" created — assign items to it to make it permanent.`);
  }

  const visibleItems = catalog.filter(i => showInactive ? true : i.is_active !== false);

  // Group by category, preserving order
  const orderedCats = [...new Set(visibleItems.map(i => i.category || "Other"))];
  const grouped = {};
  orderedCats.forEach(cat => {
    grouped[cat] = visibleItems.filter(i => (i.category || "Other") === cat);
  });

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
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setManageCatsOpen(true)}>
            <Settings2 className="w-3 h-3" /> Categories
          </Button>
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
          categories={categories}
          fabRate={fabRate}
          installRate={installRate}
          onSave={(data) => createItem.mutate(data)}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {orderedCats.map(cat => {
        const items = grouped[cat];
        if (!items?.length) return null;
        return (
          <div key={cat}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{cat}</h3>
            <div className="border rounded-lg overflow-hidden">
              <div className="grid px-4 py-2 bg-muted/40 border-b text-xs font-medium text-muted-foreground"
                style={{ gridTemplateColumns: "44px 2fr 80px 90px 1fr 80px" }}>
                <span>Photo</span>
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
                      categories={categories}
                      fabRate={fabRate}
                      installRate={installRate}
                      onSave={(data) => updateItem.mutate({ id: item.id, data })}
                      onCancel={() => setEditingId(null)}
                    />
                  </div>
                ) : (
                  <div
                    key={item.id}
                    className={`grid px-4 py-2.5 border-b last:border-0 items-center gap-2 group ${item.is_active === false ? "opacity-50" : ""}`}
                    style={{ gridTemplateColumns: "44px 2fr 80px 90px 1fr 80px" }}
                  >
                    <PhotoCell
                      photoUrl={item.photo_url}
                      onUpload={url => updateItem.mutate({ id: item.id, data: { photo_url: url } })}
                      onRemove={() => updateItem.mutate({ id: item.id, data: { photo_url: null } })}
                    />
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

      <ManageCategoriesModal
        open={manageCatsOpen}
        onClose={() => setManageCatsOpen(false)}
        categories={categories}
        catalog={catalog}
        onRename={handleRenameCategory}
        onDelete={(cat) => {
          setCustomCategories(prev => prev.filter(c => c !== cat));
          toast.success(`Category "${cat}" deleted.`);
        }}
        onMoveItem={handleMoveItem}
        onCreateCategory={handleCreateCategory}
      />
    </div>
  );
}