import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useEffectiveRole } from "@/lib/PreviewRoleContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { STATUS_COLORS, getJobHealth, getHealthDot } from "@/lib/jobHelpers";
import { format, parseISO } from "date-fns";
import { ArrowLeft, CalendarDays, MapPin, Paintbrush } from "lucide-react";
import { Link } from "react-router-dom";
import JobOverviewTab from "@/components/jobs/JobOverviewTab";
import JobShopLogTab from "@/components/jobs/JobShopLogTab";
import JobCostingTab from "@/components/jobs/JobCostingTab";
import JobAttachmentsTab from "@/components/jobs/JobAttachmentsTab.jsx";
import ProductionSchedule from "@/components/jobs/ProductionSchedule";
import JobDocumentsTab from "@/components/jobs/JobDocumentsTab";
import JobHistoryTab from "@/components/jobs/JobHistoryTab";
import ProjectDetailsTab from "@/components/jobs/ProjectDetailsTab";

export default function JobDetail() {
  const { user } = useAuth();
  const effectiveRole = useEffectiveRole(user?.role || "admin");
  const isFabricator = effectiveRole.toLowerCase() === "fabricator";

  const jobId = new URLSearchParams(window.location.search).get("id") 
    || window.location.pathname.split("/jobs/")[1];

  const { data: job, isLoading } = useQuery({
    queryKey: ["job", jobId],
    queryFn: async () => {
      const jobs = await base44.entities.Job.filter({ id: jobId });
      return jobs[0];
    },
    enabled: !!jobId,
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ["timeEntries", jobId],
    queryFn: () => base44.entities.TimeEntry.filter({ job_id: jobId }),
    enabled: !!jobId,
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ["purchaseOrders", jobId],
    queryFn: () => base44.entities.PurchaseOrder.filter({ job_id: jobId }),
    enabled: !!jobId,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list("-created_date", 100),
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Job not found.</p>
        <Link to="/jobs" className="text-sm text-accent hover:underline">Back to Job Board</Link>
      </div>
    );
  }

  const health = getJobHealth(job);

  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto">
      {/* Back link */}
      <Link to="/jobs" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Job Board
      </Link>

      {/* Header */}
      <div className="bg-card rounded-xl border p-5 mb-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div>
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <div className={`w-2.5 h-2.5 rounded-full ${getHealthDot(health)}`} />
              <span className="text-sm font-mono text-muted-foreground">{job.job_number}</span>
              {job.pipeline_board && (
                <Badge variant="outline" className="text-xs">{job.pipeline_board} Board</Badge>
              )}
              {job.stage ? (
                <Badge className="text-xs bg-muted text-muted-foreground">{job.stage}</Badge>
              ) : (
                <Badge className={STATUS_COLORS[job.status]}>{job.status}</Badge>
              )}
            </div>
            <h1 className="text-xl font-bold">{job.job_name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{job.customer_name}</p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {job.expected_install_date && (
              <div className="flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4" />
                {format(parseISO(job.expected_install_date), "MMM d, yyyy")}
              </div>
            )}
            {job.site_address && !isFabricator && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                {job.site_address}
              </div>
            )}
            {job.powder_coat_color && (
              <div className="flex items-center gap-1.5">
                <Paintbrush className="w-4 h-4" />
                {job.powder_coat_color} {job.powder_coat_code && `(${job.powder_coat_code})`}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={isFabricator ? "shop-log" : "overview"}>
        <TabsList className="mb-4">
          {!isFabricator && <TabsTrigger value="overview">Overview</TabsTrigger>}
          {!isFabricator && <TabsTrigger value="documents">Documents</TabsTrigger>}
          <TabsTrigger value="schedule">
            Schedule
            {job.schedule_phases?.length > 0 && (
              <span className="ml-1.5 text-[10px] bg-accent text-accent-foreground rounded-full px-1.5">●</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="shop-log">Shop Log</TabsTrigger>
          {!isFabricator && <TabsTrigger value="costing">Costing</TabsTrigger>}
          <TabsTrigger value="attachments">Attachments</TabsTrigger>
          <TabsTrigger value="project-details">
            Project Details
            {job.product_instances?.length > 0 && (
              <span className="ml-1.5 text-[10px] bg-accent text-accent-foreground rounded-full px-1.5">{job.product_instances.length}</span>
            )}
          </TabsTrigger>
          {!isFabricator && (
            <TabsTrigger value="history">
              History
              {job.stage_history?.length > 0 && (
                <span className="ml-1.5 text-[10px] bg-muted text-muted-foreground rounded-full px-1.5">{job.stage_history.length}</span>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        {!isFabricator && (
          <TabsContent value="overview">
            <JobOverviewTab job={job} />
          </TabsContent>
        )}
        {!isFabricator && (
          <TabsContent value="documents">
            <JobDocumentsTab job={job} />
          </TabsContent>
        )}
        <TabsContent value="schedule">
          <ProductionSchedule job={job} readOnly={isFabricator} />
        </TabsContent>
        <TabsContent value="shop-log">
          <JobShopLogTab timeEntries={timeEntries} job={job} />
        </TabsContent>
        {!isFabricator && (
          <TabsContent value="costing">
            <JobCostingTab job={job} timeEntries={timeEntries} purchaseOrders={purchaseOrders} employees={employees} />
          </TabsContent>
        )}
        <TabsContent value="attachments">
          <JobAttachmentsTab job={job} />
        </TabsContent>
        <TabsContent value="project-details">
          <ProjectDetailsTab job={job} />
        </TabsContent>
        {!isFabricator && (
          <TabsContent value="history">
            <JobHistoryTab job={job} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}