import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Check, ChevronDown } from "lucide-react";
import PaymentStatusBadge from "@/components/pipeline/PaymentStatusBadge";

const OPTIONS = [
  { value: "not_invoiced", label: "Not Invoiced" },
  { value: "50_percent",   label: "50% Paid" },
  { value: "100_percent",  label: "100% Paid" },
];

export default function PaymentStatusSelector({ job }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const current = job.manual_payment_status || "not_invoiced";

  const mutation = useMutation({
    mutationFn: (status) => base44.entities.Job.update(job.id, { manual_payment_status: status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["job", job.id] });
      toast.success("Payment status updated");
    },
    onError: (err) => toast.error(err?.message || "Failed to update"),
  });

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1 hover:opacity-80 transition-opacity">
          <PaymentStatusBadge status={current} className="text-xs px-2 py-0.5" />
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
            <PaymentStatusBadge status={opt.value} className="text-xs" />
            {current === opt.value && <Check className="w-3 h-3 ml-auto text-muted-foreground" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}