import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["Labor", "Material", "Equipment", "Sub-contractor", "Other"];
const UNITS = ["ls", "ea", "lnft", "sqft", "hr", "day"];

const DEFAULT_PRODUCTS = [
  { name: "Columbia Railing", default_description: "Columbia style railing — fabrication & installation", default_category: "Labor", default_unit: "lnft", default_unit_cost: 0, is_railing: true, sort_order: 1 },
  { name: "Clearwater Railing", default_description: "Clearwater style railing — fabrication & installation", default_category: "Labor", default_unit: "lnft", default_unit_cost: 0, is_railing: true, sort_order: 2 },
  { name: "Uptown Railing", default_description: "Uptown style railing — fabrication & installation", default_category: "Labor", default_unit: "lnft", default_unit_cost: 0, is_railing: true, sort_order: 3 },
  { name: "Toppenish Railing", default_description: "Toppenish style railing — fabrication & installation", default_category: "Labor", default_unit: "lnft", default_unit_cost: 0, is_railing: true, sort_order: 4 },
  { name: "Hanford Railing", default_description: "Hanford style railing — fabrication & installation", default_category: "Labor", default_unit: "lnft", default_unit_cost: 0, is_railing: true, sort_order: 5 },
  { name: "Rainier Railing", default_description: "Rainier style railing — fabrication & installation", default_category: "Labor", default_unit: "lnft", default_unit_cost: 0, is_railing: true, sort_order: 6 },
  { name: "Bremerton Interior Railing", default_description: "Bremerton Interior style railing — fabrication & installation", default_category: "Labor", default_unit: "lnft", default_unit_cost: 0, is_railing: true, sort_order: 7 },
  { name: "Bremerton Exterior Railing", default_description: "Bremerton Exterior style railing — fabrication & installation", default_category: "Labor", default_unit: "lnft", default_unit_cost: 0, is_railing: true, sort_order: 8 },
  { name: "Richland Railing", default_description: "Richland style railing — fabrication & installation", default_category: "Labor", default_unit: "lnft", default_unit_cost: 0, is_railing: true, sort_order: 9 },
  { name: "Stephanie Railing", default_description: "Stephanie style railing — fabrication & installation", default_category: "Labor", default_unit: "lnft", default_unit_cost: 0, is_railing: true, sort_order: 10 },
  { name: "Kaizen Railing", default_description: "Kaizen style railing — fabrication & installation", default_category: "Labor", default_unit: "lnft", default_unit_cost: 0, is_railing: true, sort_order: 11 },
  { name: "Custom Railing", default_description: "Custom railing design — fabrication & installation", default_category: "Labor", default_unit: "lnft", default_unit_cost: 0, is_railing: true, sort_order: 12 },
  { name: "Mono Stringer Staircase", default_description: "Mono stringer staircase — fabrication & installation", default_category: "Labor", default_unit: "ls", default_unit_cost: 0, is_railing: false, sort_order: 13 },
  { name: "Double Stringer Staircase", default_description: "Double stringer staircase — fabrication & installation", default_category: "Labor", default_unit: "ls", default_unit_cost: 0, is_railing: false, sort_order: 14 },
  { name: "Spiral Staircase", default_description: "Spiral staircase — fabrication & installation", default_category: "Labor", default_unit: "ls", default_unit_cost: 0, is_railing: false, sort_order: 15 },
  { name: "Custom Gate", default_description: "Custom gate — fabrication & installation", default_category: "Labor", default_unit: "ls", default_unit_cost: 0, is_railing: false, sort_order: 16 },
  { name: "Fence", default_description: "Fence — fabrication & installation", default_category: "Labor", default_unit: "lnft", default_unit_cost: 0, is_railing: false, sort_order: 17 },
  { name: "Pergola", default_description: "Pergola — fabrication & installation", default_category: "Labor", default_unit: "ls", default_unit_cost: 0, is_railing: false, sort_order: 18 },
  { name: "Planter Box", default_description: "Metal planter box — fabrication & installation", default_category: "Labor", default_unit: "ea", default_unit_cost: 0, is_railing: false, sort_order: 19 },
  { name: "Chimney Cap", default_description: "Chimney cap — fabrication & installation", default_category: "Labor", default_unit: "ea", default_unit_cost: 0, is_railing: false, sort_order: 20 },
  { name: "Structural", default_description: "Structural steel work — fabrication & installation", default_category: "Labor", default_unit: "ls", default_unit_cost: 0, is_railing: false, sort_order: 21 },
  { name: "Powder Coat (subcontractor)", default_description: "Powder coat finish — subcontracted", default_category: "Sub-contractor", default_unit: "ls", default_unit_cost: 0, is_railing: false, sort_order: 22 },
  { name: "Demo / Disposal", default_description: "Demolition and disposal of existing structure", default_category: "Labor", default_unit: "ls", default_unit_cost: 0, is_railing: false, sort_order: 23 },
  { name: "Travel Fee", default_description: "Travel fee for job site distance", default_category: "Other", default_unit: "ls", default_unit_cost: 0, is_railing: false, sort_order: 24 },
  { name: "Miscellaneous", default_description: "Miscellaneous materials and labor", default_category: "Other", default_unit: "ls", default_unit_cost: 0, is_railing: false, sort_order: 25 },
];

export default function ProductServiceLibrarySection() {
  const qc = useQueryClient();
  const [seeded, setSeeded] = useState(false);
  const [newItem, setNewItem] = useState(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["productServiceLibrary"],
    queryFn: () => base44.entities.ProductServiceLibrary.list("sort_order", 100),
  });

  // Seed defaults if empty
  useEffect(() => {
    if (!isLoading && items.length === 0 && !seeded) {
      setSeeded(true);
      Promise.all(DEFAULT_PRODUCTS.map(p => base44.entities.ProductServiceLibrary.create({ ...p, is_active: true })))
        .then(() => qc.invalidateQueries({ queryKey: ["productServiceLibrary"] }));
    }
  }, [isLoading, items.length, seeded]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProductServiceLibrary.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["productServiceLibrary"] }); toast.success("Saved"); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProductServiceLibrary.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["productServiceLibrary"] }); toast.success("Deleted"); },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ProductServiceLibrary.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["productServiceLibrary"] });
      setNewItem(null);
      toast.success("Product added");
    },
  });

  function EditableRow({ item }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(item);

    function save() {
      updateMutation.mutate({ id: item.id, data: draft });
      setEditing(false);
    }

    if (!editing) {
      return (
        <div className="grid gap-2 px-4 py-2.5 items-center border-b last:border-0 hover:bg-muted/30 text-sm"
          style={{ gridTemplateColumns: "1.5fr 2fr 0.8fr 0.6fr 0.7fr 0.5fr auto" }}>
          <span className="font-medium truncate">{item.name}</span>
          <span className="text-muted-foreground text-xs truncate">{item.default_description}</span>
          <span className="text-xs text-muted-foreground">{item.default_category}</span>
          <span className="text-xs text-muted-foreground">{item.default_unit}</span>
          <span className="text-xs">{item.default_unit_cost > 0 ? `$${item.default_unit_cost}` : "—"}</span>
          <div className="flex items-center gap-1">
            {item.is_railing && <Badge className="bg-blue-100 text-blue-700 text-[10px]">Railing</Badge>}
          </div>
          <div className="flex items-center gap-1">
            <button
              className={`text-muted-foreground hover:text-foreground ${!item.is_active ? "opacity-40" : ""}`}
              onClick={() => updateMutation.mutate({ id: item.id, data: { is_active: !item.is_active } })}
              title={item.is_active ? "Active — click to deactivate" : "Inactive — click to activate"}
            >
              {item.is_active ? <ToggleRight className="w-4 h-4 text-emerald-600" /> : <ToggleLeft className="w-4 h-4" />}
            </button>
            <button className="text-muted-foreground hover:text-foreground p-1" onClick={() => setEditing(true)}>
              <Save className="w-3.5 h-3.5" />
            </button>
            <button className="text-muted-foreground hover:text-destructive p-1" onClick={() => deleteMutation.mutate(item.id)}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="grid gap-1.5 px-4 py-2.5 items-center border-b last:border-0 bg-muted/20"
        style={{ gridTemplateColumns: "1.5fr 2fr 0.8fr 0.6fr 0.7fr 0.5fr auto" }}>
        <Input className="h-7 text-xs" value={draft.name} onChange={e => setDraft(p => ({ ...p, name: e.target.value }))} />
        <Input className="h-7 text-xs" value={draft.default_description || ""} onChange={e => setDraft(p => ({ ...p, default_description: e.target.value }))} />
        <Select value={draft.default_category} onValueChange={v => setDraft(p => ({ ...p, default_category: v }))}>
          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={draft.default_unit || "ls"} onValueChange={v => setDraft(p => ({ ...p, default_unit: v }))}>
          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u} className="text-xs">{u}</SelectItem>)}</SelectContent>
        </Select>
        <Input className="h-7 text-xs" type="number" value={draft.default_unit_cost} onChange={e => setDraft(p => ({ ...p, default_unit_cost: parseFloat(e.target.value) || 0 }))} />
        <span />
        <div className="flex items-center gap-1">
          <Button size="sm" className="h-7 text-xs px-2" onClick={save}>Save</Button>
          <button className="text-muted-foreground hover:text-foreground p-1 text-xs" onClick={() => setEditing(false)}>✕</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-base">Product & Service Library</h2>
          <p className="text-sm text-muted-foreground">Saved items that auto-fill into estimate line items when selected.</p>
        </div>
        <Button size="sm" className="gap-1" onClick={() => setNewItem({ name: "", default_description: "", default_category: "Labor", default_unit: "ls", default_unit_cost: 0, is_railing: false, is_active: true })}>
          <Plus className="w-3.5 h-3.5" /> Add Product
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-6">Loading library…</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="grid gap-2 px-4 py-2 bg-muted/40 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider"
            style={{ gridTemplateColumns: "1.5fr 2fr 0.8fr 0.6fr 0.7fr 0.5fr auto" }}>
            <span>Name</span>
            <span>Description</span>
            <span>Category</span>
            <span>Unit</span>
            <span>Default Cost</span>
            <span>Flags</span>
            <span>Actions</span>
          </div>
          {items.map(item => <EditableRow key={item.id} item={item} />)}

          {newItem && (
            <div className="grid gap-1.5 px-4 py-2.5 items-center border-t bg-emerald-50/40"
              style={{ gridTemplateColumns: "1.5fr 2fr 0.8fr 0.6fr 0.7fr 0.5fr auto" }}>
              <Input className="h-7 text-xs" placeholder="Name" value={newItem.name} onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))} />
              <Input className="h-7 text-xs" placeholder="Default description" value={newItem.default_description} onChange={e => setNewItem(p => ({ ...p, default_description: e.target.value }))} />
              <Select value={newItem.default_category} onValueChange={v => setNewItem(p => ({ ...p, default_category: v }))}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={newItem.default_unit} onValueChange={v => setNewItem(p => ({ ...p, default_unit: v }))}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u} className="text-xs">{u}</SelectItem>)}</SelectContent>
              </Select>
              <Input className="h-7 text-xs" type="number" value={newItem.default_unit_cost} onChange={e => setNewItem(p => ({ ...p, default_unit_cost: parseFloat(e.target.value) || 0 }))} />
              <span />
              <div className="flex items-center gap-1">
                <Button size="sm" className="h-7 text-xs px-2" onClick={() => createMutation.mutate(newItem)} disabled={!newItem.name}>Add</Button>
                <button className="text-muted-foreground hover:text-foreground p-1 text-xs" onClick={() => setNewItem(null)}>✕</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}