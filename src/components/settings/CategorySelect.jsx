/**
 * CategorySelect — a category dropdown with an inline "Add New Category" option.
 * Used for MaterialPriceList's category field, which is a free-form string
 * (not a fixed enum) so orgs can define their own categories.
 */
import React, { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Check, X } from "lucide-react";

export default function CategorySelect({ categories, value, onChange, className = "" }) {
  const [adding, setAdding] = useState(false);
  const [newCat, setNewCat] = useState("");

  function confirmNew() {
    if (!newCat.trim()) return;
    onChange(newCat.trim());
    setAdding(false);
    setNewCat("");
  }

  if (adding) {
    return (
      <div className="flex items-center gap-1">
        <Input
          autoFocus
          className={`h-8 text-xs ${className}`}
          placeholder="New category name"
          value={newCat}
          onChange={e => setNewCat(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") confirmNew();
            if (e.key === "Escape") { setAdding(false); setNewCat(""); }
          }}
        />
        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" disabled={!newCat.trim()} onClick={confirmNew}>
          <Check className="w-3.5 h-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => { setAdding(false); setNewCat(""); }}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={v => (v === "__add_new__" ? setAdding(true) : onChange(v))}>
      <SelectTrigger className={`h-8 text-xs ${className}`}><SelectValue /></SelectTrigger>
      <SelectContent>
        {categories.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
        <SelectItem value="__add_new__" className="text-xs font-medium text-primary">
          <span className="flex items-center gap-1"><Plus className="w-3 h-3" /> Add New Category</span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}