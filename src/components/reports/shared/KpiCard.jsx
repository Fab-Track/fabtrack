import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function KpiCard({ label, value, comparison, compLabel, color = "default", onClick }) {
  const hasComparison = comparison !== null && comparison !== undefined && comparison !== 0;
  const isPositive = comparison > 0;

  const colorMap = {
    default: "bg-card border",
    orange: "bg-orange-50 border-orange-200",
    red: "bg-red-50 border-red-200",
    green: "bg-emerald-50 border-emerald-200",
  };

  return (
    <div
      className={`rounded-xl p-4 border ${colorMap[color]} ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
      onClick={onClick}
    >
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold text-foreground">{value ?? "—"}</p>
      {hasComparison && compLabel ? (
        <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${isPositive ? "text-emerald-600" : "text-red-500"}`}>
          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {compLabel}
        </div>
      ) : compLabel ? (
        <p className="text-xs text-muted-foreground mt-1">{compLabel}</p>
      ) : null}
    </div>
  );
}