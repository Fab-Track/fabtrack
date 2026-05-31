import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function DashKpiCard({
  label, value, sub, trend, trendLabel,
  icon: Icon, iconColor = "bg-muted text-muted-foreground",
  valueColor, navigateTo, onClick, highlight
}) {
  const navigate = useNavigate();
  const handleClick = () => {
    if (onClick) onClick();
    else if (navigateTo) navigate(navigateTo);
  };
  const clickable = !!(onClick || navigateTo);

  return (
    <div
      className={`bg-card rounded-xl border p-4 flex items-start justify-between
        ${clickable ? "cursor-pointer hover:shadow-md transition-shadow" : ""}
        ${highlight === "red" ? "border-red-300 bg-red-50" : ""}
        ${highlight === "orange" ? "border-orange-300 bg-orange-50" : ""}
        ${highlight === "green" ? "border-emerald-300 bg-emerald-50" : ""}
      `}
      onClick={clickable ? handleClick : undefined}
    >
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">{label}</p>
        <p className={`text-2xl font-bold mt-1 truncate ${valueColor || ""}`}>{value ?? "—"}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</p>}
        {trendLabel && (
          <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${trend > 0 ? "text-emerald-600" : trend < 0 ? "text-red-500" : "text-muted-foreground"}`}>
            {trend > 0 ? <TrendingUp className="w-3 h-3" /> : trend < 0 ? <TrendingDown className="w-3 h-3" /> : null}
            {trendLabel}
          </div>
        )}
      </div>
      {Icon && (
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ml-2 ${iconColor}`}>
          <Icon className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}