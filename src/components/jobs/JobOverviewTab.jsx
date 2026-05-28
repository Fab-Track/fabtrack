import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench, FileText, CheckSquare } from "lucide-react";
import JobScopeSection from "@/components/jobs/JobScopeSection";
import { useAuth } from "@/lib/AuthContext";
import { useEffectiveRole } from "@/lib/PreviewRoleContext";

export default function JobOverviewTab({ job }) {
  const { user } = useAuth();
  const effectiveRole = useEffectiveRole(user?.role || "admin");
  const isFabricator = effectiveRole.toLowerCase() === "fabricator";

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            Job Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <DetailRow label="Job Type" value={job.job_type} />
          <DetailRow label="Site Address" value={job.site_address} />
          <DetailRow label="Customer Approval" value={
            <Badge variant={job.customer_approval_status === "approved" ? "default" : "outline"} className="text-xs">
              {job.customer_approval_status || "pending"}
            </Badge>
          } />
          {job.design_details && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Design Details</p>
              <p className="text-sm whitespace-pre-wrap">{job.design_details}</p>
            </div>
          )}
          {job.special_considerations && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Special Considerations</p>
              <p className="text-sm whitespace-pre-wrap">{job.special_considerations}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Wrench className="w-4 h-4 text-muted-foreground" />
            Crew & Tools
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Assigned Crew</p>
            {job.assigned_crew_names?.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {job.assigned_crew_names.map((name, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{name}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No crew assigned</p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Tools Needed</p>
            {job.tools_needed?.length > 0 ? (
              <div className="space-y-1">
                {job.tools_needed.map((tool, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <CheckSquare className="w-3.5 h-3.5 text-muted-foreground" />
                    {tool}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">None specified</p>
            )}
          </div>
        </CardContent>
      </Card>

      {job.internal_notes && !isFabricator && (
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Internal Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{job.internal_notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Scope — visible to all roles including fabricators */}
      <div className="md:col-span-2">
        <JobScopeSection job={job} isFabricator={isFabricator} />
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value || "—"}</span>
    </div>
  );
}