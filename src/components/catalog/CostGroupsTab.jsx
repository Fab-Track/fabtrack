import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import useCostGroupData from "./costgroups/useCostGroupData";
import CategoryGrid from "./costgroups/CategoryGrid";
import CategoryPage from "./costgroups/CategoryPage";
import StyleDetail from "./costgroups/StyleDetail";
import NewCategoryDialog from "./costgroups/NewCategoryDialog";
import NewGroupDialog from "./costgroups/NewGroupDialog";

export default function CostGroupsTab({ actionsSlot }) {
  const data = useCostGroupData();
  const [nav, setNav] = useState({ catId: null, itemId: null });
  const [dlg, setDlg] = useState(null);
  const { categories, items, settings, materials, orgId, refresh, loading } = data;

  const category = categories.find((c) => c.id === nav.catId);
  const item = items.find((i) => i.id === nav.itemId);
  const catItems = items.filter((i) => i.category_id === nav.catId);
  const root = () => setNav({ catId: null, itemId: null });

  const actions = (
    <div className="flex gap-2">
      <Button variant="outline" onClick={() => setDlg("cat")}>+ Category</Button>
      <Button onClick={() => setDlg("group")}>+ Cost Group</Button>
    </div>
  );

  if (loading) return <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>;

  let body;
  if (category && item) {
    body = (
      <StyleDetail key={item.id} item={item} category={category} settings={settings} materials={materials} orgId={orgId} refresh={refresh}
        onBack={root} onBackToCategory={() => setNav({ catId: category.id, itemId: null })} onOpenItem={(id) => setNav({ catId: category.id, itemId: id })} />
    );
  } else if (category) {
    body = (
      <CategoryPage category={category} items={catItems} settings={settings} orgId={orgId} refresh={refresh} onBack={root}
        onOpenStyle={(id) => setNav({ catId: category.id, itemId: id })} onNewStyle={() => setDlg("group")} />
    );
  } else {
    body = <CategoryGrid categories={categories} items={items} onOpen={(id) => setNav({ catId: id, itemId: null })} />;
  }

  return (
    <>
      {!category && actionsSlot && createPortal(actions, actionsSlot)}
      {body}
      <NewCategoryDialog open={dlg === "cat"} onOpenChange={(o) => !o && setDlg(null)} orgId={orgId} count={categories.length}
        onCreated={(c) => { refresh(); setNav({ catId: c.id, itemId: null }); }} />
      <NewGroupDialog open={dlg === "group"} onOpenChange={(o) => !o && setDlg(null)} orgId={orgId} categories={categories} defaultCategoryId={nav.catId}
        onCreated={(rec) => { refresh(); setNav({ catId: rec.category_id, itemId: rec.id }); }} />
    </>
  );
}