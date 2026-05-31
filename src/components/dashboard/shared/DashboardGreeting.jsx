import React, { useState, useEffect } from "react";
import { format } from "date-fns";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardGreeting({ user, subtitle }) {
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setLastUpdated(new Date()), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const firstName = user?.full_name?.split(" ")[0] || "there";
  const minutesAgo = Math.round((new Date() - lastUpdated) / 60000);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {getGreeting()}, {firstName} 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {subtitle || format(new Date(), "EEEE, MMMM d, yyyy")}
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        {minutesAgo === 0 ? "Just updated" : `Last updated ${minutesAgo}m ago`}
      </p>
    </div>
  );
}