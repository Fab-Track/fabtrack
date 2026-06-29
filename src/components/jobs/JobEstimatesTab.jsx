import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FileText, DollarSign } from "lucide-react";
import { format, parseISO } from "date-fns";

const STATUS_STYLES = {
  Draft:    "bg-muted text-muted-foreground",
  Sent:     "bg-blue-100 text-blue-800",
  Approved: "bg-emerald-100 text-emerald-800",
  Rejected: "bg-red-100 text-red-800",
};

export default function JobEstimatesTab({ job }) {
  const navigate = useNavigate();

  const { data: estimates = [], isLoading } = useQuery({
    queryKey: ["estimates", job.id],
    queryFn: () => base44.entities.Estimate.filter({ job_id: job.id }, "-created_date", 50),
    enabled: !!job.id,
  });

  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          Estimates
        </CardTitle>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => navigate(`/jobs/${job.id}/estimates/new`)}
        >
          <Plus className="w-3.5 h-3.5" /> New Estimate
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading estimates...</p>
        ) : estimates.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No estimates yet for this job.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Click "New Estimate" to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {estimates.map((est) => (
              <button
                key={est.id}
                onClick={() => navigate(`/jobs/${job.id}/estimates/${est.id}`)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/40 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium font-mono">{est.estimate_number || "—"}</span>
                    <Badge className={`text-[10px] ${STATUS_STYLES[est.status] || STATUS_STYLES.Draft}`}>
                      {est.status || "Draft"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {est.estimate_date ? format(parseISO(est.estimate_date), "MMM d, yyyy") : "No date"}
                    {est.line_items ? ` · ${est.line_items.length} item(s)` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-sm font-semibold shrink-0">
                  <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                  {(est.total ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}