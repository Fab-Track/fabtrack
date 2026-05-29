import React, { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Plus, Check, X } from "lucide-react";

const BASE_CATEGORIES = ["All", "Labor", "Material", "Equipment", "Sub-contractor", "Other"];
const CUSTOM_CATEGORIES_KEY = ["lineItemCategories"];

export function useLineItemCategories() {
  const qc = useQueryClient();

  const { data: customCategories = [] } = useQuery({
    queryKey: CUSTOM_CATEGORIES_KEY,
    queryFn: async () => {
      const items = await base44.entities.LineItemCategory.list("sort_order", 100);
      return items.map(i => i.name);
    },
  });

  const allCategories = [
    ...BASE_CATEGORIES,
    ...customCategories.filter(c => !BASE_CATEGORIES.includes(c)),
  ];

  const addCategory = useMutation({
    mutationFn: async (name) => {
      await base44.entities.LineItemCategory.create({ name, sort_order: customCategories.length });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CUSTOM_CATEGORIES_KEY }),
  });

  return { allCategories, addCategory };
}

export default function LineItemCategorySelect({ value, onChange }) {
  const { allCategories, addCategory } = useLineItemCategories();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (adding) setTimeout(() => inputRef.current?.focus(), 50);
  }, [adding]);

  async function handleSave() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    await addCategory.mutateAsync(trimmed);
    onChange(trimmed);
    setAdding(false);
    setNewName("");
    setOpen(false);
  }

  function handleCancel() {
    setAdding(false);
    setNewName("");
  }

  // Display "All" as empty/dash visually
  const displayValue = value || "All";

  return (
    <Select
      value={displayValue}
      onValueChange={(v) => {
        if (v === "__add__") {
          setAdding(true);
          return;
        }
        onChange(v === "All" ? "All" : v);
      }}
      open={open}
      onOpenChange={(o) => {
        if (adding) return; // keep open while adding
        setOpen(o);
      }}
    >
      <SelectTrigger className="h-8 text-xs">
        <SelectValue placeholder="Category" />
      </SelectTrigger>
      <SelectContent>
        {allCategories.map(c => (
          <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
        ))}
        <Separator className="my-1" />
        {adding ? (
          <div className="px-2 py-1.5 space-y-1.5" onKeyDown={e => e.stopPropagation()}>
            <Input
              ref={inputRef}
              className="h-7 text-xs"
              placeholder="New category name..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") handleCancel();
              }}
            />
            <div className="flex gap-1">
              <Button size="sm" className="h-6 text-xs px-2 flex-1" onClick={handleSave} disabled={addCategory.isPending}>
                <Check className="w-3 h-3 mr-1" /> Save
              </Button>
              <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={handleCancel}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ) : (
          <SelectItem value="__add__" className="text-xs text-primary font-medium">
            <span className="flex items-center gap-1"><Plus className="w-3 h-3" /> Add Category</span>
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}