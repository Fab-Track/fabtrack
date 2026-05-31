import React from "react";
import { format, parseISO, addDays, isAfter, isBefore, startOfDay } from "date-fns";
import { MapPin, Phone, CalendarCheck, Package, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const TODAY = startOfDay(new Date());
const HORIZON = addDays(TODAY, 14);

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = startOfDay(parseISO(dateStr));
  const diff = Math.round((d - TODAY) / 86400000);
  return diff;
}

function urgencyBadge(days) {
  if (days === 0) return <Badge className="bg-red-100 text-red-700 text-[10px]">Today</Badge>;
  if (days === 1) return <Badge className="bg-orange-100 text-orange-700 text-[10px]">Tomorrow</Badge>;
  if (days <= 3) return <Badge className="bg-amber-100 text-amber-700 text-[10px]">In {days} days</Badge>;
  return <Badge variant="outline" className="text-[10px]">In {days} days</Badge>;
}

export default function MyUpcomingInstalls({ employee, jobs }) {
  const myName = employee?.name || employee?.preferred_name;

  const myInstalls = (jobs || []).filter(job => {
    const installDate = job.promised_install_date || job.expected_install_date;
    if (!installDate) return false;
    const d = startOfDay(parseISO(installDate));
    if (isBefore(d, TODAY) || isAfter(d, HORIZON)) return false;
    const crew = job.assigned_crew_names || [];
    return myName && crew.some(n => n === myName);
  }).sort((a, b) => {
    const da = a.promised_install_date || a.expected_install_date;
    const db = b.promised_install_date || b.expected_install_date;
    return da.localeCompare(db);
  });

  if (myInstalls.length === 0) {
    return (
      <div className="bg-card border rounded-xl p-6">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">My Upcoming Installs</h3>
        <p className="text-muted-foreground text-sm text-center py-4">No installs in the next 14 days</p>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-xl p-6">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
        My Upcoming Installs <span className="text-muted-foreground font-normal normal-case">(next 14 days)</span>
      </h3>
      <div className="space-y-3">
        {myInstalls.map(job => {
          const installDate = job.promised_install_date || job.expected_install_date;
          const days = daysUntil(installDate);
          const jobData = job.job_level_data || {};
          const siteAccess = jobData.site_access || {};

          return (
            <Link
              key={job.id}
              to={`/jobs/${job.id}`}
              className="block border rounded-lg p-3 hover:bg-muted/40 transition-colors group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-sm truncate">{job.job_name}</span>
                    {urgencyBadge(days)}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarCheck className="w-3 h-3 shrink-0" />
                    <span>{format(parseISO(installDate), "EEEE, MMM d")}</span>
                  </div>
                  {job.site_address && (
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(job.site_address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
                    >
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{job.site_address}</span>
                    </a>
                  )}
                  {siteAccess.contact_name && (
                    <a
                      href={`tel:${siteAccess.contact_phone || ""}`}
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-1"
                    >
                      <Phone className="w-3 h-3 shrink-0" />
                      <span>{siteAccess.contact_name}{siteAccess.contact_phone ? ` · ${siteAccess.contact_phone}` : ""}</span>
                    </a>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-foreground mt-0.5" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}