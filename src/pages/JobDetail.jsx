import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useEffectiveRole } from "@/lib/PreviewRoleContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { STATUS_COLORS, getJobHealth, getHealthDot } from "@/lib/jobHelpers";
import { getBoardForJob } from "@/lib/pipelineHelpers";
import { format, parseISO } from "date-fns";
import { ArrowLeft, CalendarDays, MapPin, Paintbrush, Send, MoreHorizontal, Trash2 } from "lucide-react";
import JobCustomerPanel from "@/components/jobs/JobCustomerPanel";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import DeleteJobModal from "@/components/jobs/DeleteJobModal";

import { Link, useSearchParams, useNavigate } from "react-router-dom";
import JobOverviewTab from "@/components/jobs/JobOverviewTab";
import JobShopLogTab from "@/components/jobs/JobShopLogTab";
import JobCostingTab from "@/components/jobs/JobCostingTab";
import JobAttachmentsTab from "@/components/jobs/JobAttachmentsTab.jsx";
import ProductionSchedule from "@/components/jobs/ProductionSchedule";
import JobDocumentsTab from "@/components/jobs/JobDocumentsTab";
import JobHistoryTab from "@/components/jobs/JobHistoryTab";
import ProjectDetailsTab from "@/components/jobs/ProjectDetailsTab";
import JobMessagesTab from "@/components/jobs/JobMessagesTab";
import JobCommunicationsTab from "@/components/jobs/JobCommunicationsTab";
import JobTodosTab from "@/components/jobs/JobTodosTab";
import JobEstimatesTab from "@/components/jobs/JobEstimatesTab";
import JobEventsList from "@/components/events/JobEventsList";
import QueuedMessageBanner from "@/components/comms/QueuedMessageBanner";
import MessageComposerModal from "@/components/comms/MessageComposerModal";

export default function JobDetail() {
  const { user } = useAuth();
  const effectiveRole = useEffectiveRole(user?.role || "admin");
  const isFabricator = effectiveRole.toLowerCase() === "fabricator";
  const isAccountant = effectiveRole.toLowerCase() === "accountant";
  const isOwner = effectiveRole.toLowerCase() === "owner";
  const isEstimator = effectiveRole.toLowerCase() === "estimator";
  const [activeTab, setActiveTab] = useState("overview");
  const [composerOpen, setComposerOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const fromParam = searchParams.get("from");
  const fromSchedule = fromParam === "schedule";
  const boardParam = searchParams.get("board");

  const jobId = window.location.pathname.split("/jobs/")[1]?.split("?")[0];

  const { data: job, isLoading, refetch: refetchJob } = useQuery({
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
  const canDeleteJob = isOwner || (isEstimator && job?.stage && ["New Lead", "Estimate In Progress"].includes(job?.stage));

  // Determine which board tab to return to
  const returnBoard = boardParam || getBoardForJob(job);
  const backTo = fromSchedule ? "/schedule" : `/jobs?board=${returnBoard}`;

  const isShopRole = ["fabricator", "design_specialist"].includes(effectiveRole.toLowerCase());

  // Fabricator / Design Specialist see only these tabs in this order
  const SHOP_TABS = ["overview", "estimate", "schedule", "project-details", "attachments", "messages", "shop-log", "appointments", "todos"];
  // All other roles see all tabs in this order
  const ALL_TABS = ["overview", "estimate", "schedule", "project-details", "attachments", "messages", "shop-log", "appointments", "todos", "documents", "costing", "communications", "history"];

  const visibleTabs = isShopRole ? SHOP_TABS : ALL_TABS;

  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto">
      {/* Back link */}
      <Link
        to={backTo}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        {fromSchedule ? "Back to Schedule" : "Back to Job Board"}
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
              {job.is_lead_closed && (
                <Badge variant="outline" className="text-xs border-muted-foreground/40 text-muted-foreground">Closed</Badge>
              )}
            </div>
            <h1 className="text-xl font-bold">{job.job_name}</h1>
            <JobCustomerPanel job={job} onJobUpdated={refetchJob} />
          </div>
          <div className="flex flex-col items-end gap-3">
            {/* Action buttons row */}
            <div className="flex items-center gap-2">
              {!isFabricator && !isAccountant && (
                <Button size="sm" onClick={() => setComposerOpen(true)} className="gap-1.5 shrink-0">
                  <Send className="w-3.5 h-3.5" /> Send Message
                </Button>
              )}
              {canDeleteJob && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setDeleteOpen(true)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Delete Job
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
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
      </div>

      {/* Queued message banner */}
      {!isFabricator && !isAccountant && (
        <QueuedMessageBanner job={job} />
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4 h-auto gap-1 flex flex-nowrap overflow-x-auto w-full justify-start"
          style={{ scrollbarWidth: "none" }}
        >
          {visibleTabs.includes("overview") && <TabsTrigger value="overview" className="shrink-0">Overview</TabsTrigger>}
          {visibleTabs.includes("estimate") && (
            <TabsTrigger value="estimate" className="shrink-0">
              Estimate
            </TabsTrigger>
          )}
          {visibleTabs.includes("schedule") && (
            <TabsTrigger value="schedule" className="shrink-0">
              Schedule
              {job.schedule_phases?.length > 0 && (
                <span className="ml-1.5 text-[10px] bg-accent text-accent-foreground rounded-full px-1.5">●</span>
              )}
            </TabsTrigger>
          )}
          {visibleTabs.includes("project-details") && (
            <TabsTrigger value="project-details" className="shrink-0">
              Details
            </TabsTrigger>
          )}
          {visibleTabs.includes("attachments") && <TabsTrigger value="attachments" className="shrink-0">Attachments</TabsTrigger>}
          {visibleTabs.includes("messages") && <TabsTrigger value="messages" className="shrink-0">Messages</TabsTrigger>}
          {visibleTabs.includes("shop-log") && <TabsTrigger value="shop-log" className="shrink-0">Shop Log</TabsTrigger>}
          {visibleTabs.includes("documents") && <TabsTrigger value="documents" className="shrink-0">Documents</TabsTrigger>}
          {visibleTabs.includes("costing") && <TabsTrigger value="costing" className="shrink-0">Costing</TabsTrigger>}
          {visibleTabs.includes("appointments") && (
            <TabsTrigger value="appointments" className="shrink-0">Appointments</TabsTrigger>
          )}
          {visibleTabs.includes("todos") && (
            <TabsTrigger value="todos" className="shrink-0">
              Todos
            </TabsTrigger>
          )}
          {visibleTabs.includes("communications") && <TabsTrigger value="communications" className="shrink-0">Comms</TabsTrigger>}
          {visibleTabs.includes("history") && (
            <TabsTrigger value="history" className="shrink-0">
              History
              {job.stage_history?.length > 0 && (
                <span className="ml-1.5 text-[10px] bg-muted text-muted-foreground rounded-full px-1.5">{job.stage_history.length}</span>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview"><JobOverviewTab job={job} /></TabsContent>
        <TabsContent value="estimate"><JobEstimatesTab job={job} /></TabsContent>
        <TabsContent value="schedule"><ProductionSchedule job={job} /></TabsContent>
        <TabsContent value="project-details"><ProjectDetailsTab job={job} userRole={effectiveRole} /></TabsContent>
        <TabsContent value="attachments"><JobAttachmentsTab job={job} /></TabsContent>
        <TabsContent value="messages"><JobMessagesTab job={job} /></TabsContent>
        <TabsContent value="shop-log"><JobShopLogTab timeEntries={timeEntries} job={job} /></TabsContent>
        <TabsContent value="documents"><JobDocumentsTab job={job} /></TabsContent>
        <TabsContent value="costing"><JobCostingTab job={job} timeEntries={timeEntries} purchaseOrders={purchaseOrders} employees={employees} /></TabsContent>
        <TabsContent value="appointments"><JobEventsList job={job} /></TabsContent>
        <TabsContent value="todos"><JobTodosTab job={job} /></TabsContent>
        <TabsContent value="communications"><JobCommunicationsTab job={job} /></TabsContent>
        <TabsContent value="history"><JobHistoryTab job={job} /></TabsContent>
      </Tabs>

      <MessageComposerModal
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        job={job}
      />

      <DeleteJobModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        job={job}
        onDeleted={() => navigate(`/jobs?board=${returnBoard}`)}
      />
    </div>
  );
}