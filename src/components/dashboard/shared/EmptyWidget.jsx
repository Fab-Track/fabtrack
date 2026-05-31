import React from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function EmptyWidget({ icon: Icon, message, actionLabel, actionTo }) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
      {Icon && <Icon className="w-8 h-8 text-muted-foreground/30" />}
      <p className="text-sm text-muted-foreground max-w-[220px]">{message}</p>
      {actionLabel && actionTo && (
        <Button size="sm" variant="outline" className="mt-1 text-xs" onClick={() => navigate(actionTo)}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}