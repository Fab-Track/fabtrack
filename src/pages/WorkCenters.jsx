import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CalendarDays, Clock, Paintbrush, Users } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import { getJobHealth, getHealthBorder } from "@/lib/jobHelpers";
import ClockWidget from "@/components/timetracking/ClockWidget";
import HoursStatsRow from "@/components/timetracking/HoursStatsRow";
import { useOrgFilter } from "@/lib/orgContext";

const WORK_CENTERS = ["Cut", "Fit", "Weld", "Grind", "Powder Coat", "Install"];

export default function WorkCenters() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("Cut");

  const orgFilter = useOrgFilter();

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", orgFilter],
    queryFn: () => base44.entities.Employee.filter(orgFilter, "-created_date", 100),
  });

  const myEmployee = employees.find(e => e.email === user?.email) || null;

  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs", orgFilter],
    queryFn: () => base44.entities.Job.filter(orgFilter, "-created_date", 200),
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ["timeEntries", "all", orgFilter],
    queryFn: () => base44.entities.TimeEntry.filter(orgFilter, "-clock_in", 500),
  });

  const { data: activeEntries = [] } = useQuery({
    queryKey: ["timeEntries", "active", orgFilter],
    queryFn: () => base44.entities.TimeEntry.filter({ ...orgFilter, is_active: true }),
    refetchInterval: 15000,
  });

  const myActiveEntry = myEmployee
    ? activeEntries.find(e => e.employee_id === myEmployee.id) || null
    : null;

  // For this simplified view, show jobs that are in fabrication-related statuses
  const fabJobs = jobs.filter(j => 
    ["Fab Queue", "In Fabrication", "Powder Coat", "Install Scheduled"].includes(j.status)
  );

  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Shop Floor</h1>
        <p className="text-sm text-muted-foreground">{fabJobs.length} jobs in production</p>
      </div>

      {/* Clock-in panel for shop employees */}
      {myEmployee && (
        <div className="mb-6 grid md:grid-cols-2 gap-4">
          <ClockWidget employee={myEmployee} activeEntry={myActiveEntry} />
          <HoursStatsRow employee={myEmployee} timeEntries={timeEntries} activeEntry={myActiveEntry} />
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4 flex-wrap h-auto">
          {WORK_CENTERS.map(wc => (
            <TabsTrigger key={wc} value={wc} className="text-xs">
              {wc}
            </TabsTrigger>
          ))}
        </TabsList>

        {WORK_CENTERS.map(wc => {
          // Get time entries for this work center
          const wcEntries = timeEntries.filter(te => te.work_center === wc);
          const activeEntries = wcEntries.filter(te => te.is_active);
          
          // Get unique jobs that have entries in this work center
          const wcJobIds = [...new Set(wcEntries.map(te => te.job_id))];
          const wcJobs = fabJobs.filter(j => wcJobIds.includes(j.id) || j.status === "Fab Queue");

          return (
            <TabsContent key={wc} value={wc}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <StatMini label="Queue" value={wcJobs.length} />
                <StatMini label="Active Now" value={activeEntries.length} />
                <StatMini label="Hours Today" value={
                  wcEntries.filter(te => {
                    if (!te.clock_in) return false;
                    return new Date(te.clock_in).toDateString() === new Date().toDateString();
                  }).reduce((s, te) => s + (te.duration_hours || 0), 0).toFixed(1)
                } />
                <StatMini label="Total Hours" value={wcEntries.reduce((s, te) => s + (te.duration_hours || 0), 0).toFixed(1)} />
              </div>

              <div className="space-y-2">
                {wcJobs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-12">No jobs in {wc} queue</p>
                ) : (
                  wcJobs.map(job => {
                    const health = getJobHealth(job);
                    const jobEntries = wcEntries.filter(te => te.job_id === job.id);
                    const hoursLogged = jobEntries.reduce((s, te) => s + (te.duration_hours || 0), 0);

                    return (
                      <Link key={job.id} to={`/jobs/${job.id}`}>
                        <Card className={`border-l-4 ${getHealthBorder(health)} hover:shadow-md transition-shadow`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-mono text-muted-foreground">{job.job_number}</span>
                                  <Badge variant="outline" className="text-xs">{job.status}</Badge>
                                </div>
                                <h3 className="text-sm font-semibold">{job.job_name}</h3>
                                <p className="text-xs text-muted-foreground">{job.customer_name}</p>
                              </div>
                              <div className="text-right">
                                {job.expected_install_date && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <CalendarDays className="w-3 h-3" />
                                    {format(parseISO(job.expected_install_date), "MMM d")}
                                  </div>
                                )}
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                  <Clock className="w-3 h-3" />
                                  {hoursLogged.toFixed(1)}h logged
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })
                )}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

function StatMini({ label, value }) {
  return (
    <div className="bg-card rounded-lg border px-3 py-2 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}