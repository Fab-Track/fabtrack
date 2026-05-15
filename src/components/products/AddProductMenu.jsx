import React, { useRef, useEffect, useState } from "react";
import { PRODUCT_TYPES } from "@/lib/productConfigs";
import { ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const TYPE_ICONS = {
  Railing: "🔩",
  Staircase: "🪜",
  Gate: "🚪",
  Structural: "🏗️",
  Pergola: "⛱️",
  "Planter Box": "🌿",
  "Chimney Cap": "🏠",
};

export default function AddProductMenu({ onAdd }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(o => !o)}
        className="gap-1.5"
      >
        <Plus className="w-4 h-4" />
        Add Product
        <ChevronDown className="w-3.5 h-3.5 opacity-60" />
      </Button>
      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 bg-card border rounded-xl shadow-lg p-1.5 w-52">
          {PRODUCT_TYPES.map(type => (
            <button
              key={type}
              onClick={() => { onAdd(type); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors text-left"
            >
              <span>{TYPE_ICONS[type]}</span>
              {type}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}