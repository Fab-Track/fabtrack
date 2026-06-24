import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useOrgFilter } from "@/lib/orgContext";

/**
 * useCurrentEmployee — loads the Employee record linked to the logged-in User.
 *
 * Auto-linking: if no Employee has user_id matching the current user, the hook
 * calls the `linkEmployeeToUser` backend function which matches by email,
 * sets user_id, and syncs the Employee's role to the User's roles array.
 *
 * Returns: { employee, isLoading, refetch }
 */
export function useCurrentEmployee() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const orgFilter = useOrgFilter();

  return useQuery({
    queryKey: ["currentEmployee", user?.id],
    queryFn: async () => {
      if (!user) return null;

      // 1. Try to find Employee already linked by user_id
      const linked = await base44.entities.Employee.filter({ user_id: user.id });
      if (linked.length > 0) return linked[0];

      // 2. If not linked, call backend function to auto-link by email
      if (user.email) {
        try {
          const resp = await base44.functions.invoke("linkEmployeeToUser", {});
          if (resp?.data?.linked && resp?.data?.employee) {
            // Invalidate user query so roles update in the UI
            qc.invalidateQueries({ queryKey: ["user"] });
            return resp.data.employee;
          }
        } catch (e) {
          // Backend function may fail if no matching Employee — that's OK
        }
      }

      return null;
    },
    enabled: !!user,
    staleTime: 60000,
  });
}