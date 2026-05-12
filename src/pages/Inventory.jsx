import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Package, Plus, AlertTriangle, Pencil, Trash2 } from "lucide-react";

const CATEGORIES = ["Steel", "Hardware", "Consumables", "Tools", "Other"];

const BLANK = {
  name: "", sku: "", category: "Steel", unit: "ft",
  quantity_on_hand: 0, reorder_point: 0, unit_cost: 0,
  vendor_name: "", location: "", notes: "",
};

export default function Inventory() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => base44.entities.InventoryItem.list("-created_date", 200),
  });

  const save = useMutation({
    mutationFn: () =>
      editId
        ? base44.entities.InventoryItem.update(editId, form)
        : base44.entities.InventoryItem.create(form),
    onSuccess: () => { qc.invalidateQueries(["inventory"]); setOpen(false); },
  });

  const del = useMutation({
    mutationFn: (id) => base44.entities.InventoryItem.delete(id),
    onSuccess: () => qc.invalidateQueries(["inventory"]),
  });

  const adjustQty = useMutation({
    mutationFn: ({ id, qty }) =>
      base44.entities.InventoryItem.update(id, { quantity_on_hand: qty }),
    onSuccess: () => qc.invalidateQueries(["inventory"]),
  });

  function openNew() { setForm(BLANK); setEditId(null); setOpen(true); }
  function openEdit(item) {
    setForm({ ...BLANK, ...item }); setEditId(item.id); setOpen(true);
  }

  const filtered = items.filter(i => {
    const matchCat = catFilter === "All" || i.category === catFilter;
    const matchSearch = !search || i.name?.toLowerCase().includes(search.toLowerCase()) ||
      i.sku?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const lowStock = items.filter(i => i.quantity_on_hand <= i.reorder_point && i.reorder_point > 0);

  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
          <p className="text-sm text-muted-foreground">{items.length} items tracked</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" /> Add Item</Button>
      </div>

      {lowStock.length > 0 && (
        <div className="mb-4 p-3 rounded-lg border border-warning/50 bg-warning/10 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
          <p className="text-sm text-warning-foreground font-medium">
            {lowStock.length} item{lowStock.length > 1 ? "s" : ""} below reorder point:&nbsp;
            <span className="font-normal">{lowStock.map(i => i.name).join(", ")}</span>
          </p>
        </div>
      )}

      <div className="flex gap-3 mb-4">
        <Input placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No inventory items yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["Name / SKU", "Category", "Unit", "On Hand", "Reorder", "Unit Cost", "Location", ""].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(item => {
                const low = item.quantity_on_hand <= item.reorder_point && item.reorder_point > 0;
                return (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2.5">
                      <p className="font-medium">{item.name}</p>
                      {item.sku && <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant="outline" className="text-xs">{item.category}</Badge>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{item.unit}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <button
                          className="w-5 h-5 rounded text-xs border hover:bg-muted flex items-center justify-center"
                          onClick={() => adjustQty.mutate({ id: item.id, qty: Math.max(0, item.quantity_on_hand - 1) })}
                        >-</button>
                        <span className={`w-8 text-center font-mono font-semibold text-sm ${low ? "text-destructive" : ""}`}>
                          {item.quantity_on_hand}
                        </span>
                        <button
                          className="w-5 h-5 rounded text-xs border hover:bg-muted flex items-center justify-center"
                          onClick={() => adjustQty.mutate({ id: item.id, qty: item.quantity_on_hand + 1 })}
                        >+</button>
                        {low && <AlertTriangle className="w-3.5 h-3.5 text-warning ml-1" />}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{item.reorder_point}</td>
                    <td className="px-3 py-2.5">${(item.unit_cost || 0).toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-muted-foreground text-xs">{item.location}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => del.mutate(item.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Item" : "Add Inventory Item"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2 space-y-1">
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>SKU</Label>
              <Input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Unit (ft, lbs, ea…)</Label>
              <Input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Unit Cost ($)</Label>
              <Input type="number" value={form.unit_cost} onChange={e => setForm({ ...form, unit_cost: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-1">
              <Label>Qty On Hand</Label>
              <Input type="number" value={form.quantity_on_hand} onChange={e => setForm({ ...form, quantity_on_hand: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-1">
              <Label>Reorder Point</Label>
              <Input type="number" value={form.reorder_point} onChange={e => setForm({ ...form, reorder_point: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-1">
              <Label>Vendor</Label>
              <Input value={form.vendor_name} onChange={e => setForm({ ...form, vendor_name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Location / Bin</Label>
              <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={!form.name || save.isPending}>
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}