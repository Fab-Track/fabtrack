import React from "react";
import { Users, UserPlus, Repeat } from "lucide-react";

export default function CustomerMixCard({ jobs, customers }) {
  const customerLookup = {};
  (customers || []).forEach(c => { customerLookup[c.id] = c; });

  const wonJobs = (jobs || []).filter(j => j.lead_outcome === "Qualified — Won");
  const recurringCount = wonJobs.filter(j => {
    const c = customerLookup[j.customer_id];
    return c?.customer_status === "recurring";
  }).length;
  const newCount = wonJobs.filter(j => {
    const c = customerLookup[j.customer_id];
    return c?.customer_status === "new";
  }).length;
  const totalWonCustomers = new Set(wonJobs.map(j => j.customer_id)).size;

  const newPct = totalWonCustomers > 0 ? Math.round((newCount / totalWonCustomers) * 100) : 0;

  return (
    <div className="bg-card rounded-xl border p-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Customer Mix</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <p className="text-2xl font-bold">{newCount}</p>
            <p className="text-xs text-muted-foreground">New ({newPct}%)</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
            <Repeat className="w-5 h-5 text-violet-700" />
          </div>
          <div>
            <p className="text-2xl font-bold">{recurringCount}</p>
            <p className="text-xs text-muted-foreground">Recurring</p>
          </div>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
        <span>{totalWonCustomers} unique customers won</span>
        <span>{wonJobs.length} total jobs won</span>
      </div>
    </div>
  );
}