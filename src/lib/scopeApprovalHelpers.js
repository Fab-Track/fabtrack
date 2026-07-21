import { base44 } from "@/api/base44Client";
import { hasAnyRole } from "@/lib/roleHelpers";

/** Roles allowed to approve/deny scope line items and sign off scope */
export const SCOPE_APPROVER_ROLES = ["owner", "admin", "manager", "shop_manager", "super_admin"];

export function canApproveScope(user) {
  return hasAnyRole(user, SCOPE_APPROVER_ROLES);
}

/**
 * Set (or clear, with status = null) the manager review on a line item
 * of an Estimate or ChangeOrder record. Also propagates the same review
 * onto any matching line items already copied onto Invoices for the same
 * job, so a review done after an invoice was created (e.g. at the
 * On Deck for Fabrication step) still shows up on the Overview Scope tab.
 */
export async function setLineApproval({ entityType, record, lineIdx, status, user }) {
  const lines = [...(record.line_items || [])];
  const line = { ...lines[lineIdx] };
  if (!status) {
    delete line.mgr_approval;
  } else {
    line.mgr_approval = {
      status,
      at: new Date().toISOString(),
      by_id: user?.id || "",
      by_name: user?.full_name || "",
    };
  }
  lines[lineIdx] = line;
  const result = await base44.entities[entityType].update(record.id, { line_items: lines });

  if (record.job_id) {
    const matchKey = (l) => (l.description || l.service_name || "").trim();
    const key = matchKey(line);
    if (key) {
      const invoices = await base44.entities.Invoice.filter({ job_id: record.job_id });
      for (const inv of invoices) {
        let changed = false;
        const invLines = (inv.line_items || []).map((l) => {
          if (matchKey(l) === key) {
            changed = true;
            return line.mgr_approval ? { ...l, mgr_approval: line.mgr_approval } : { ...l, mgr_approval: undefined };
          }
          return l;
        });
        if (changed) {
          await base44.entities.Invoice.update(inv.id, { line_items: invLines });
        }
      }
    }
  }

  return result;
}