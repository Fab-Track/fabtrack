import React from "react";

const OUTCOME_CONFIGS = [
  { key: "Qualified — Won",           label: "Won",           color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  { key: "Qualified — Lost",          label: "Lost",          color: "text-red-700 bg-red-50 border-red-200" },
  { key: "Qualified — Not Interested", label: "Not Interested", color: "text-amber-700 bg-amber-50 border-amber-200" },
  { key: "Unqualified Lead",          label: "Unqualified",   color: "text-muted-foreground bg-muted border-border" },
];

export default function LeadOutcomesRow({ jobs }) {
  const closedLeads = (jobs || []).filter(j => j.is_lead_closed || j.lead_outcome);

  const counts = {};
  OUTCOME_CONFIGS.forEach(c => { counts[c.key] = 0; });
  closedLeads.forEach(j => {
    if (j.lead_outcome && counts[j.lead_outcome] !== undefined) {
      counts[j.lead_outcome]++;
    }
  });

  const won = counts["Qualified — Won"];
  const lost = counts["Qualified — Lost"];
  const notInterested = counts["Qualified — Not Interested"];
  const denom = won + lost + notInterested;
  const closeRate = denom > 0 ? ((won / denom) * 100).toFixed(0) : null;

  return (
    <div className="bg-card border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Lead Outcomes</h3>
        {closeRate !== null && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
            {closeRate}% Close Rate
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {OUTCOME_CONFIGS.map(({ key, label, color }) => (
          <div key={key} className={`rounded-lg border px-4 py-3 ${color}`}>
            <p className="text-xs font-medium opacity-80">{label}</p>
            <p className="text-2xl font-bold">{counts[key]}</p>
          </div>
        ))}
      </div>
      {closedLeads.length === 0 && (
        <p className="text-xs text-muted-foreground mt-3 text-center">No closed leads yet — close leads from the Sales Board to track outcomes.</p>
      )}
    </div>
  );
}