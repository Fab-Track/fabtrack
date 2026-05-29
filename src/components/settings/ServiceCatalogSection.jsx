import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Check, X, EyeOff, Eye, Camera, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_SERVICE_CATALOG, CATALOG_CATEGORIES as DEFAULT_CATEGORIES } from "@/lib/serviceCatalogData";

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
function ManageCategoriesModal({ open, onClose, categories, catalog, onRename, onDelete }) {
  const [renaming, setRenaming] = useState(null); // { cat, value }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Categories</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {categories.map(cat => {
            const count = catalog.filter(i => i.category === cat).length;
            const isRenaming = renaming?.cat === cat;
            return (
              <div key={cat} className="flex items-center gap-2 border rounded-lg px-3 py-2">
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
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setRenaming({ cat, value: cat })}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive"
                      onClick={() => {
                        if (count > 0) {
                          toast.error(`Reassign the ${count} item${count !== 1 ? "s" : ""} in "${cat}" to another category before deleting.`);
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
            );
          })}
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
function CatalogItemForm({ initial = {}, categories, onSave, onCancel }) {
  const [name, setName] = useState(initial.name || "");
  const [category, setCategory] = useState(initial.category || categories[0] || "Other");
  const [unit, setUnit] = useState(initial.unit || "ls");
  const [unitPrice, setUnitPrice] = useState(initial.default_unit_price ?? 0);
  const [description, setDescription] = useState(initial.default_description || "");
  const [photoUrl, setPhotoUrl] = useState(initial.photo_url || "");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

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
      <div className="flex gap-2 justify-end">
        <Button
          size="sm" className="h-7 text-xs gap-1"
          onClick={() => onSave({ name, category, unit, default_unit_price: parseFloat(unitPrice) || 0, default_description: description, photo_url: photoUrl || null })}
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

  const { data: catalog = [], isLoading } = useQuery({
    queryKey: ["serviceCatalog"],
    queryFn: () => base44.entities.ServiceCatalog.list("sort_order"),
  });

  // Derive categories from DB (unique) merged with defaults
  const dbCategories = [...new Set(catalog.map(i => i.category).filter(Boolean))];
  const categories = [...new Set([...DEFAULT_CATEGORIES, ...dbCategories])];

  // Seed defaults if empty
  useEffect(() => {
    if (!isLoading && catalog.length === 0 && !seeded) {
      setSeeded(true);
      Promise.all(DEFAULT_SERVICE_CATALOG.map(item => base44.entities.ServiceCatalog.create({ ...item, is_active: true })))
        .then(() => qc.invalidateQueries({ queryKey: ["serviceCatalog"] }));
    }
  }, [isLoading, catalog.length, seeded]);

  const createItem = useMutation({
    mutationFn: (data) => base44.entities.ServiceCatalog.create({ ...data, is_active: true, sort_order: catalog.length }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["serviceCatalog"] }); setShowAdd(false); toast.success("Service added"); },
  });

  const updateItem = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ServiceCatalog.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["serviceCatalog"] }); setEditingId(null); toast.success("Saved"); },
  });

  const deleteItem = useMutation({
    mutationFn: (id) => base44.entities.ServiceCatalog.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["serviceCatalog"] }); toast.success("Deleted"); },
  });

  // Rename category — update all items in that category
  async function handleRenameCategory(oldCat, newCat) {
    const items = catalog.filter(i => i.category === oldCat);
    await Promise.all(items.map(i => base44.entities.ServiceCatalog.update(i.id, { category: newCat })));
    qc.invalidateQueries({ queryKey: ["serviceCatalog"] });
    toast.success(`Category renamed to "${newCat}"`);
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
        onDelete={(cat) => toast.error(`Cannot delete "${cat}" — it is a built-in category.`)}
      />
    </div>
  );
}