import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const RAILING_DEFAULTS = {
  post_spacing_in: 72,
  post_width_in: 1.5,
  picket_clear_gap_in: 4,
  picket_width_in: 0.5,
  rail_runs: 2,
};
const RAILING_FIELDS = ["post_spacing_in", "post_width_in", "picket_clear_gap_in", "picket_width_in", "rail_runs"];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin" && user.role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });

    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: "No organization" }, { status: 400 });

    const svc = base44.asServiceRole.entities;

    // ── 1. Seed CatalogCategory from distinct ServiceCatalog.category names ──
    const catPage = await svc.ServiceCatalog.filter({ organization_id: orgId }, { limit: 1000 });
    const items = catPage.items || catPage;
    const catNames = [...new Set(items.map(i => i.category).filter(Boolean))];

    const existingCats = await svc.CatalogCategory.filter({ organization_id: orgId }, { limit: 500 });
    const existingCatList = existingCats.items || existingCats;
    const catByName = {};
    existingCatList.forEach(c => { catByName[c.name] = c; });

    let catsCreated = 0;
    for (const name of catNames) {
      if (!catByName[name]) {
        // Determine if this category has railing items
        const hasRailing = items.some(i => i.category === name && i.is_railing);
        const created = await svc.CatalogCategory.create({
          organization_id: orgId,
          name,
          is_railing: hasRailing,
          is_fixed_price: false,
          sort_order: 0,
          ...RAILING_DEFAULTS,
        });
        catByName[name] = created;
        catsCreated++;
      }
    }

    // ── 2. Link every ServiceCatalog record to its category_id ──
    let linked = 0;
    for (const item of items) {
      const cat = item.category ? catByName[item.category] : null;
      if (cat && item.category_id !== cat.id) {
        await svc.ServiceCatalog.update(item.id, { category_id: cat.id });
        linked++;
      }
    }

    // ── 3. Migrate railing override fields ──
    let nulledDefaults = 0;
    let nulledNonRailing = 0;
    for (const item of items) {
      const update = {};
      if (item.is_railing) {
        for (const f of RAILING_FIELDS) {
          const val = item[f];
          if (val != null && val === RAILING_DEFAULTS[f]) {
            update[f] = null;
            nulledDefaults++;
          }
        }
      } else {
        for (const f of RAILING_FIELDS) {
          if (item[f] != null) {
            update[f] = null;
            nulledNonRailing++;
          }
        }
      }
      if (Object.keys(update).length > 0) {
        await svc.ServiceCatalog.update(item.id, update);
      }
    }

    // ── 4. Merge RailingStyleLibrary into ServiceCatalog ──
    let photosCopied = 0;
    let overridesCopied = 0;
    const libPage = await svc.RailingStyleLibrary.filter({ organization_id: orgId }, { limit: 500 });
    const libItems = libPage.items || libPage;

    // Re-fetch ServiceCatalog to get current state after updates
    const refreshedPage = await svc.ServiceCatalog.filter({ organization_id: orgId }, { limit: 1000 });
    const refreshedItems = refreshedPage.items || refreshedPage;

    for (const lib of libItems) {
      // Find ServiceCatalog record whose style_id matches this library record
      const sc = refreshedItems.find(i => i.style_id === lib.id);
      if (!sc) continue;

      const update = {};
      // Copy photo if SC has none
      if (!sc.photo_url && lib.photo_url) {
        update.photo_url = lib.photo_url;
        photosCopied++;
      }
      // Copy layout values as overrides if they differ from category defaults and SC value is null
      const cat = sc.category ? catByName[sc.category] : null;
      for (const f of RAILING_FIELDS) {
        if (sc[f] == null && lib[f] != null) {
          const catDefault = cat ? cat[f] : RAILING_DEFAULTS[f];
          if (lib[f] !== catDefault) {
            update[f] = lib[f];
            overridesCopied++;
          }
        }
      }
      if (Object.keys(update).length > 0) {
        await svc.ServiceCatalog.update(sc.id, update);
      }
    }

    return Response.json({
      success: true,
      categoriesCreated: catsCreated,
      itemsLinked: linked,
      defaultsNulled: nulledDefaults,
      nonRailingNulled: nulledNonRailing,
      photosCopied,
      overridesCopied,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}