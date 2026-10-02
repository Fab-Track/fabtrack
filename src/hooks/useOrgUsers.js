import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Loads org Users and Employees, and returns Users enriched with a `displayName`
 * that prefers full_name, falls back to the linked Employee's name, then email.
 *
 * This ensures internal employee dropdowns always show the person's real name
 * (e.g. "Dawson Hone") instead of their login email when full_name is empty.
 */
export function useOrgUsers() {
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list("full_name", 200),
  });
  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list("name", 200),
  });

  const empByUserId = {};
  for (const emp of employees) {
    if (emp.user_id) empByUserId[emp.user_id] = emp.name;
  }

  const enriched = users.map(u => ({
    ...u,
    displayName: empByUserId[u.id] || u.full_name || u.email,
  }));

  return { users: enriched, employees };
}

/**
 * Resolves a single user's display name from the enriched users list.
 */
export function resolveUserDisplayName(userId, users) {
  const u = users.find(x => x.id === userId);
  return u?.displayName || u?.full_name || u?.email || "Unassigned";
}