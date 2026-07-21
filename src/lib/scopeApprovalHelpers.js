import { base44 } from "@/api/base44Client";
import { hasAnyRole } from "@/lib/roleHelpers";

/** Roles allowed to approve/deny scope line items and sign off scope */
export const SCOPE_APPROVER_ROLES = ["owner", "admin", "manager", "shop_manager", "super_admin"];

export function canApproveScope(user) {
  return hasAnyRole(user, SCOPE_APPROVER_ROLES);
}

/**
 * Set (or clear, with status = null) the manager review on a line item
 * of an Estimate or ChangeOrder record.
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
  return base44.entities[entityType].update(record.id, { line_items: lines });
}