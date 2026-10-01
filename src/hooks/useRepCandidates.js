import { useMemo } from "react";
import { useOrgUsers } from "@/hooks/useOrgUsers";

/**
 * Returns a deduplicated, filtered, sorted list of rep candidates
 * (Users who can be assigned as a sales rep / estimator).
 *
 * Pulls from the User entity (via useOrgUsers) so that the list is
 * consistent across NewJob, JobDetail, and anywhere else reps are assigned.
 * Deduplicates by user ID and by displayName to avoid showing the same
 * person twice (e.g. a User with full_name AND a linked Employee record).
 */
export function useRepCandidates() {
  const { users = [] } = useOrgUsers();

  return useMemo(() => {
    const seenIds = new Set();
    const seenNames = new Set();
    return users
      .filter(u => {
        const role = (u.role || "").toLowerCase();
        return (
          role === "estimator" ||
          role === "owner" ||
          role === "admin" ||
          role === "sales"
        );
      })
      .filter(u => {
        // Deduplicate by ID
        if (seenIds.has(u.id)) return false;
        seenIds.add(u.id);
        return true;
      })
      .map(u => ({
        id: u.id,
        name: u.displayName || u.full_name || u.email || "Unknown",
        role: u.role || "",
      }))
      .filter(r => {
        // Deduplicate by display name (case-insensitive) — keeps first occurrence
        const key = (r.name || "").toLowerCase().trim();
        if (seenNames.has(key)) return false;
        seenNames.add(key);
        return true;
      })
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [users]);
}