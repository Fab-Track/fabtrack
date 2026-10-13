import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const SLOTS = ["Top Rail", "Bottom Rail", "Post", "Picket"];

// Copies StyleComponentMap.components into ServiceCatalog.components (component_label -> slot).
// Non-railing labels (e.g. "Cap") become "Other" lines with zero quantity so nothing is silently counted.
// StyleComponentMap records are left untouched.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin" && user.role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: "No organization" }, { status: 400 });

    const svc = base44.asServiceRole.entities;
    const itemsPage = await svc.ServiceCatalog.filter({ organization_id: orgId }, { limit: 1000 });
    const items = itemsPage.items || itemsPage;
    const mapsPage = await svc.StyleComponentMap.filter({ organization_id: orgId }, { limit: 1000 });
    const maps = mapsPage.items || mapsPage;

    let migrated = 0;
    let skipped = 0;
    for (const item of items) {
      if (item.components && item.components.length > 0) { skipped++; continue; }
      const styleName = item.name?.replace(/\s+railing$/i, "").trim();
      const map = maps.find(m => m.service_catalog_id === item.id)
        || maps.find(m => !m.service_catalog_id && m.style_name && (m.style_name === styleName || m.style_name === item.name));
      if (!map || !(map.components || []).length) continue;

      const components = map.components.map(c => {
        const label = (c.component_label || "").trim();
        const slot = SLOTS.find(s => s.toLowerCase() === label.toLowerCase());
        const base = { material_id: c.material_id, material_name: c.material_name };
        if (slot) return { slot, ...base };
        return { slot: "Other", label: label && label.toLowerCase() !== "other" ? label : "", ...base, qty_per_unit: 0, fixed_qty: 0, waste_pct: 0 };
      });
      await svc.ServiceCatalog.update(item.id, { components });
      migrated++;
    }
    return Response.json({ success: true, migrated, skipped });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}