import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { differenceInDays, parseISO, format, isToday, isTomorrow, addDays } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Clock, ChevronDown, ChevronUp, Calendar, CheckSquare, Square } from "lucide-react";
import DashWidget from "@/components/dashboard/shared/DashWidget";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function InstallerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const today = new Date();
  const twoWeeksOut = addDays(today, 14);

  const [expandedJob, setExpandedJob] = useState(null);
  const [checkedItems, setCheckedItems] = useState({});

  const { data: employees = [] } = useQuery({ queryKey: ["employees"], queryFn: () => base44.entities.Employee.list("-created_date", 100) });
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => base44.entities.Job.list("-created_date", 300),
    refetchInterval: 5 * 60 * 1000,
  });

  const me = employees.find(e => e.email === user?.email);

  const myJobs = me
    ? jobs.filter(j => (j.assigned_crew || []).includes(me.id))
    : jobs.filter(j => j.stage === "Install Scheduled" || j.status === "Install Scheduled");

  const upcomingInstalls = myJobs
    .filter(j => {
      const d = j.expected_install_date || j.promised_install_date;
      if (!d) return false;
      try {
        const date = parseISO(d);
        return date >= today && date <= twoWeeksOut;
      } catch { return false; }
    })
    .sort((a, b) => {
      const da = parseISO(a.expected_install_date || a.promised_install_date);
      const db = parseISO(b.expected_install_date || b.promised_install_date);
      return da - db;
    });

  const nextInstall = upcomingInstalls[0] || null;

  const recentCompleted = myJobs
    .filter(j => j.status === "Install Complete" && j.updated_date)
    .sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date))
    .slice(0, 3);

  // Materials for next install
  const nextInstallMaterials = nextInstall?.job_level_data?.materials?.items || [];

  const toggleCheck = (key) => {
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (isLoading) return (
    <div className="space-y-6">
      <Skeleton className="h-52 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Next install — hero card */}
      <div className="bg-card border-2 border-primary/20 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Next Install</h3>
        </div>
        {nextInstall ? (
          <>
            <h2 className="text-xl font-bold mb-1">{nextInstall.job_name}</h2>
            <p className="text-sm text-muted-foreground font-mono mb-4">{nextInstall.job_number}</p>
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">
                  {format(parseISO(nextInstall.expected_install_date || nextInstall.promised_install_date), "EEEE, MMMM d")}
                </span>
              </div>
              {nextInstall.site_address && (
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(nextInstall.site_address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                >
                  <MapPin className="w-4 h-4" />
                  {nextInstall.site_address}
                </a>
              )}
              {nextInstall.special_considerations && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                  🔑 {nextInstall.special_considerations}
                </div>
              )}
            </div>
            <Button className="w-full" onClick={() => navigate(`/jobs/${nextInstall.id}`)}>
              View Full Install Details
            </Button>
          </>
        ) : (
          <div className="text-center py-6">
            <Calendar className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No upcoming installs in the next 14 days.</p>
          </div>
        )}
      </div>

      {/* Upcoming installs */}
      <DashWidget title="My Upcoming Installs (Next 14 Days)" action="View Schedule" actionTo="/schedule">
        {upcomingInstalls.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No installs scheduled in the next 14 days.</p>
        ) : (
          <div className="space-y-2">
            {upcomingInstalls.map(j => {
              const dateStr = j.expected_install_date || j.promised_install_date;
              const date = parseISO(dateStr);
              const isExpanded = expandedJob === j.id;
              const highlight = isToday(date)
                ? "bg-primary/10 border-primary/30"
                : isTomorrow(date)
                ? "bg-blue-50 border-blue-200"
                : "";
              return (
                <div key={j.id} className={`border rounded-lg overflow-hidden ${highlight}`}>
                  <button
                    className="w-full flex items-center justify-between px-3 py-2 text-left"
                    onClick={() => setExpandedJob(isExpanded ? null : j.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="text-center shrink-0">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{format(date, "EEE")}</p>
                        <p className="text-lg font-bold leading-tight">{format(date, "d")}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{j.job_name}</p>
                        {j.site_address && <p className="text-[10px] text-muted-foreground truncate">{j.site_address}</p>}
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                  </button>
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 border-t bg-white/50 space-y-2 text-xs text-muted-foreground">
                      {j.site_address && (
                        <a href={`https://maps.google.com/?q=${encodeURIComponent(j.site_address)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
                          <MapPin className="w-3 h-3" /> {j.site_address}
                        </a>
                      )}
                      {j.special_considerations && <p className="font-medium text-foreground">🔑 {j.special_considerations}</p>}
                      {j.design_details && <p>{j.design_details}</p>}
                      <Link to={`/jobs/${j.id}`} className="text-blue-600 hover:underline">View full job →</Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DashWidget>

      {/* Materials checklist for next install */}
      {nextInstall && (
        <DashWidget title={`Materials Checklist — ${nextInstall.job_name}`}>
          {nextInstallMaterials.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No materials list on this job yet. Check with your shop manager.</p>
          ) : (
            <div className="space-y-2">
              {nextInstallMaterials.map((item, i) => {
                const key = `${nextInstall.id}-${i}`;
                const checked = !!checkedItems[key];
                return (
                  <button key={key} onClick={() => toggleCheck(key)} className="w-full flex items-center gap-3 text-left p-2 rounded-lg hover:bg-muted/40 transition-colors">
                    {checked ? <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" /> : <Square className="w-4 h-4 text-muted-foreground shrink-0" />}
                    <span className={`text-sm ${checked ? "line-through text-muted-foreground" : ""}`}>{item.name || item}</span>
                  </button>
                );
              })}
            </div>
          )}
        </DashWidget>
      )}

      {/* Recent completions */}
      <DashWidget title="Recent Completions">
        {recentCompleted.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No completed installs yet.</p>
        ) : (
          <div className="space-y-1.5">
            {recentCompleted.map(j => (
              <div key={j.id} className="flex items-center justify-between text-xs py-1.5 border-b last:border-0">
                <div>
                  <p className="font-medium">{j.job_name}</p>
                  <p className="text-muted-foreground">{j.updated_date ? format(parseISO(j.updated_date), "MMM d, yyyy") : "—"}</p>
                </div>
                <Link to={`/jobs/${j.id}`} className="text-blue-600 hover:underline">View →</Link>
              </div>
            ))}
          </div>
        )}
      </DashWidget>
    </div>
  );
}