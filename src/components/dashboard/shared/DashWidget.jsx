import React from "react";
import { Link } from "react-router-dom";

export default function DashWidget({ title, action, actionTo, children, className = "" }) {
  return (
    <div className={`bg-card rounded-xl border p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {action && actionTo && (
          <Link to={actionTo} className="text-xs text-blue-600 hover:underline font-medium">{action}</Link>
        )}
        {action && !actionTo && (
          <span className="text-xs text-muted-foreground">{action}</span>
        )}
      </div>
      {children}
    </div>
  );
}