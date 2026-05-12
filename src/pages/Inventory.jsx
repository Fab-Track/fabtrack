import React from "react";
import { Package } from "lucide-react";

export default function Inventory() {
  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
        <p className="text-sm text-muted-foreground">Lightweight material tracking</p>
      </div>
      <div className="text-center py-16">
        <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground">Inventory module coming soon.</p>
        <p className="text-sm text-muted-foreground mt-1">Track materials, allocations, and reorder points.</p>
      </div>
    </div>
  );
}