import React from "react";
import { Button } from "@/components/ui/button";
import Crumbs from "./Crumbs";
import StandardsCards from "./StandardsCards";
import StylesTable from "./StylesTable";
import { isReady, unitChip } from "@/lib/costGroups";

export default function CategoryPage({ category, items, settings, orgId, refresh, onBack, onOpenStyle, onNewStyle }) {
  const ready = items.filter((i) => isReady(i, category)).length;
  const chip = "rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground";
  return (
    <div className="space-y-4">
      <Crumbs parts={[{ label: "Catalog", onClick: onBack }, { label: "Cost Groups", onClick: onBack }, { label: category.name }]} />
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold">{category.name}</h2>
          <div className="flex gap-2 flex-wrap">
            {unitChip(category) && <span className={chip}>{unitChip(category)}</span>}
            <span className={chip}>{items.length} {items.length === 1 ? "style" : "styles"}</span>
            <span className={chip}>{ready} ready to quote</span>
          </div>
        </div>
        <Button onClick={onNewStyle}>+ New style</Button>
      </div>
      {category.is_railing && <StandardsCards category={category} settings={settings} orgId={orgId} refresh={refresh} />}
      <StylesTable category={category} items={items} onOpen={onOpenStyle} />
    </div>
  );
}