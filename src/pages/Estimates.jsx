import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, DollarSign } from "lucide-react";
import { format, parseISO } from "date-fns";

const STATUS_STYLES = {
  Draft: "bg-muted text-muted-foreground",
  Sent: "bg-blue-100 text-blue-800",
  Approved: "bg-emerald-100 text-emerald-800",
  Rejected: "bg-red-100 text-red-800",
};

export default function Estimates() {
  const { data: estimates = [], isLoading } = useQuery({
    queryKey: ["estimates"],
    queryFn: () => base44.entities.Estimate.list("-created_date", 100),
  });

  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Estimates</h1>
        <p className="text-sm text-muted-foreground">{estimates.length} estimates</p>
      </div>

      {estimates.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No estimates yet.</p>
          <p className="text-sm text-muted-foreground">Estimates are created from within a Job record.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {estimates.map(est => (
            <Card key={est.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-muted-foreground">{est.job_number}</span>
                    <Badge className={`text-xs ${STATUS_STYLES[est.status] || ''}`}>{est.status}</Badge>
                  </div>
                  <p className="text-sm">{est.line_items?.length || 0} line items</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">${(est.total || 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    {est.created_date && format(parseISO(est.created_date), "MMM d, yyyy")}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}