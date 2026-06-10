import React from "react";
import { RefreshCw } from "lucide-react";

export default function PullToRefreshIndicator({ pullDistance, isPulling, threshold = 64 }) {
  if (pullDistance <= 4) return null;
  const progress = Math.min(pullDistance / threshold, 1);
  return (
    <div
      className="absolute top-0 left-0 right-0 flex items-center justify-center z-30 pointer-events-none transition-all"
      style={{ height: pullDistance, opacity: progress }}
    >
      <div className={`w-8 h-8 rounded-full bg-background border shadow flex items-center justify-center ${isPulling ? "text-primary" : "text-muted-foreground"}`}>
        <RefreshCw
          className="w-4 h-4 transition-transform"
          style={{ transform: `rotate(${progress * 360}deg)` }}
        />
      </div>
    </div>
  );
}