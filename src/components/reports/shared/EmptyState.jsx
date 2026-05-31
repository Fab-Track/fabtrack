import React from "react";
import { BarChart2 } from "lucide-react";

export default function EmptyState({ message = "No data for this period — try expanding your date range." }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <BarChart2 className="w-10 h-10 text-muted-foreground/30 mb-3" />
      <p className="text-sm text-muted-foreground max-w-xs">{message}</p>
    </div>
  );
}