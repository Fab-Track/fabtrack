import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useOrgUsers } from "@/hooks/useOrgUsers";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AssignedRepSelector({ job }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { users: allUsers = [] } = useOrgUsers();

  const reps = allUsers
    .filter(u => {
      const role = (u.role || "").toLowerCase();
      return role === "estimator" || role === "owner" || role === "admin" || role === "sales";
    })
    .map(u => ({ id: u.id, name: u.displayName }))
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  const mutation = useMutation({
    mutationFn: async ({ repId }) => {
      const rep = reps.find(r => r.id === repId);
      await base44.entities.Job.update(job.id, {
        assigned_rep_id: repId || null,
        assigned_rep_name: rep?.name || null,
        assigned_estimator: repId || null,
        assigned_estimator_name: rep?.name || null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["job", job.id] });
    },
  });

  return (
    <Select
      value={job.assigned_rep_id || "none"}
      onValueChange={(val) => mutation.mutate({ repId: val === "none" ? null : val })}
      disabled={mutation.isPending}
    >
      <SelectTrigger className="h-7 w-auto min-w-[120px] text-xs gap-1 border-0 bg-muted/40 px-2 py-0.5">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">— Unassigned —</SelectItem>
        {reps.map(rep => (
          <SelectItem key={rep.id} value={rep.id}>
            {rep.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}