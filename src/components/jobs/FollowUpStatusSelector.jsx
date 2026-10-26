import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const OPTIONS = ["Waiting on customer", "Waiting on us"];

export default function FollowUpStatusSelector({ job }) {
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: (status) => base44.entities.Job.update(job.id, { follow_up_status: status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["job", job.id] });
    },
  });

  return (
    <Select
      value={job.follow_up_status || "none"}
      onValueChange={(val) => mutation.mutate(val === "none" ? null : val)}
      disabled={mutation.isPending}
    >
      <SelectTrigger className="h-7 w-auto min-w-[140px] text-xs gap-1 border-0 bg-muted/40 px-2 py-0.5">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">— None —</SelectItem>
        {OPTIONS.map((opt) => (
          <SelectItem key={opt} value={opt}>
            {opt}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}