import { base44 } from "@/api/base44Client";

// Numbers already issued before this scheme (EST-2026-001..003) are never renumbered;
// new numbering starts at EST-2026-004.
const FLOOR = { 2026: 3 };

export async function nextEstimateNumber(orgId) {
  const year = new Date().getFullYear();
  const res = await base44.entities.Estimate.aggregate({ query: { organization_id: orgId }, groupBy: "estimate_number", limit: 1000 });
  const used = new Set((res.rows || []).map((r) => r.estimate_number).filter(Boolean));
  let max = FLOOR[year] || 0;
  used.forEach((n) => {
    const m = /^EST-(\d{4})-(\d+)$/.exec(n);
    if (m && Number(m[1]) === year) max = Math.max(max, Number(m[2]));
  });
  let seq = max + 1;
  let num = `EST-${year}-${String(seq).padStart(3, "0")}`;
  while (used.has(num)) num = `EST-${year}-${String(++seq).padStart(3, "0")}`;
  return num;
}