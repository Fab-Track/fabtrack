import React from "react";
import { format, parseISO, differenceInCalendarDays, startOfDay } from "date-fns";
import { MapPin, Phone, Key, Package, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const TODAY = startOfDay(new Date());

export default function NextInstallCard({ employee, jobs }) {
  const myName = employee?.name || employee?.preferred_name;

  // Find next install assigned to this employee (today or future)
  const upcoming = (jobs || [])
    .filter(job => {
      const installDate = job.promised_install_date || job.expected_install_date;
      if (!installDate) return false;
      const d = startOfDay(parseISO(installDate));
      if (d < TODAY) return false;
      const crew = job.assigned_crew_names || [];
      return myName && crew.some(n => n === myName);
    })
    .sort((a, b) => {
      const da = a.promised_install_date || a.expected_install_date;
      const db = b.promised_install_date || b.expected_install_date;
      return da.localeCompare(db);
    });

  const next = upcoming[0];

  if (!next) {
    return (
      <div className="bg-card border rounded-xl p-6 flex items-center justify-center min-h-[120px]">
        <p className="text-muted-foreground text-sm">No upcoming installs assigned</p>
      </div>
    );
  }

  const installDateStr = next.promised_install_date || next.expected_install_date;
  const installDate = parseISO(installDateStr);
  const daysUntil = differenceInCalendarDays(startOfDay(installDate), TODAY);
  const jobData = next.job_level_data || {};
  const siteAccess = jobData.site_access || {};
  const materials = jobData.materials || {};
  const materialItems = Object.entries(materials).filter(([, v]) => v);

  let urgencyColor = "border-l-emerald-400";
  let daysLabel = daysUntil === 0 ? "Today!" : daysUntil === 1 ? "Tomorrow" : `In ${daysUntil} days`;
  if (daysUntil === 0) urgencyColor = "border-l-red-400";
  else if (daysUntil <= 2) urgencyColor = "border-l-amber-400";

  return (
    <div className={`bg-card border border-l-4 ${urgencyColor} rounded-xl p-6 space-y-4`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Next Install</p>
          <p className="text-lg font-bold leading-tight">{next.job_name}</p>
          <p className="text-sm text-muted-foreground font-mono">{next.job_number}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-black text-foreground">{format(installDate, "MMM d")}</p>
          <p className="text-xs font-semibold text-amber-600">{daysLabel}</p>
        </div>
      </div>

      {/* Site info */}
      <div className="space-y-2">
        {next.site_address && (
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(next.site_address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-2 text-sm text-blue-600 hover:underline"
          >
            <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{next.site_address}</span>
          </a>
        )}
        {siteAccess.contact_name && (
          <a
            href={`tel:${siteAccess.contact_phone || ""}`}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <Phone className="w-4 h-4 shrink-0" />
            <span>{siteAccess.contact_name}{siteAccess.contact_phone ? ` · ${siteAccess.contact_phone}` : ""}</span>
          </a>
        )}
        {siteAccess.access_code && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Key className="w-4 h-4 shrink-0" />
            <span className="font-mono">{siteAccess.access_code}</span>
          </div>
        )}
      </div>

      {/* Materials checklist preview */}
      {materialItems.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5" /> Materials Checklist
          </p>
          <div className="grid grid-cols-2 gap-1">
            {materialItems.slice(0, 6).map(([key]) => (
              <div key={key} className="flex items-center gap-1.5 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="capitalize">{key.replace(/_/g, " ")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Link
        to={`/jobs/${next.id}`}
        className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
      >
        View Job Details <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}