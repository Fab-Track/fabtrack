import React, { useState } from "react";
import CostItemsTab from "@/components/catalog/CostItemsTab";
import CostGroupsTab from "@/components/catalog/CostGroupsTab";

const TABS = [
  { id: "items", label: "Cost Items" },
  { id: "groups", label: "Cost Groups" },
];

export default function Catalog() {
  const [tab, setTab] = useState("items");
  const [slot, setSlot] = useState(null);

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-3xl font-bold">Catalog</h1>
        <div ref={setSlot} />
      </div>
      <div className="flex gap-6 border-b">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`pb-2.5 -mb-px text-sm font-semibold border-b-2 ${tab === t.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "items" ? <CostItemsTab actionsSlot={slot} /> : <CostGroupsTab actionsSlot={slot} />}
    </div>
  );
}