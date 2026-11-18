import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Check, ChevronDown } from "lucide-react";

const OPTIONS = [
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Not approved" },
];

function ApprovalPill({ value }) {
  const isApproved = value === "approved";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
      isApproved ? "bg-primary text-primary-foreground" : "bg-red-100 text-red-800"
    }`}>
      {isApproved ? "Approved" : "Not approved"}
    </span>
  );
}

export default function CustomerApprovalSelector({ job }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const current = job.customer_approval_status === "approved" ? "approved" : "rejected";

  const mutation = useMutation({
    mutationFn: (status) => base44.entities.Job.update(job.id, { customer_approval_status: status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["job", job.id] });
      toast.success("Customer approval updated");
    },
    onError: (err) => toast.error(err?.message || "Failed to update"),
  });

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1 hover:opacity-80 transition-opacity" disabled={mutation.isPending}>
          <ApprovalPill value={current} />
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {OPTIONS.map(opt => (
          <DropdownMenuItem
            key={opt.value}
            className="text-xs gap-2"
            onClick={() => { setOpen(false); mutation.mutate(opt.value); }}
          >
            <ApprovalPill value={opt.value} />
            {current === opt.value && <Check className="w-3 h-3 ml-auto text-muted-foreground" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}