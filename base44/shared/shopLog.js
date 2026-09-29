// Shared shop-log roll-up logic used by submitShopLogEntry (public) and recalcShopLogTotals (authenticated).
// Accepts any base44 client (user-scoped or service-role).
export async function recalcShopLogTotals(client, jobId) {
  const entries = await client.entities.ShopLogEntry.filter({ job_id: jobId });
  const totalHours = entries.reduce(
    (s, e) => s + (e.shop_labor_hours || 0) + (e.install_labor_hours || 0) + (e.draw_measure_hours || 0),
    0
  );
  const totalCost = entries.reduce(
    (s, e) => s + (e.materials_cost || 0) + (e.powder_coat_cost || 0) + (e.fuel_cost || 0),
    0
  );
  await client.entities.Job.update(jobId, {
    actual_labor_hours: parseFloat(totalHours.toFixed(2)),
    actual_cost: parseFloat(totalCost.toFixed(2))
  });
  return { totalHours, totalCost, entryCount: entries.length };
}