import React from "react";
import { format, isToday, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import { MapPin, User, Calendar } from "lucide-react";

export default function TodaysInstalls({ jobs }) {
  const todaysJobs = (jobs || []).filter(j => {
    const d = j.expected_install_date || j.promised_install_date;
    if (!d) return false;
    try { return isToday(parseISO(d)); } catch { return false; }
  });

  if (todaysJobs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">No installs scheduled today.</p>
    );
  }

  return (
    <div className="space-y-2">
      {todaysJobs.map(j => {
        const statusColor = j.status === "Install Complete" ? "bg-emerald-100 text-emerald-700" :
          j.status === "Install Scheduled" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600";
        return (
          <Link key={j.id} to={`/jobs/${j.id}`}
            className="block p-3 rounded-lg border hover:bg-muted/40 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">{j.job_name}</p>
                {j.site_address && (
                  <div className="flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                    <p className="text-[10px] text-muted-foreground truncate">{j.site_address}</p>
                  </div>
                )}
                {(j.assigned_crew_names || []).length > 0 && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <User className="w-3 h-3 text-muted-foreground shrink-0" />
                    <p className="text-[10px] text-muted-foreground">{j.assigned_crew_names.join(", ")}</p>
                  </div>
                )}
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${statusColor}`}>
                {j.status === "Install Complete" ? "Complete" : "Scheduled"}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}