import React from "react";
import { Trophy } from "lucide-react";

export default function CraftsmanScore() {
  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Craftsman Score</h1>
        <p className="text-sm text-muted-foreground">Shop gamification and performance tracking</p>
      </div>
      <div className="text-center py-16">
        <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground">Craftsman Score module coming soon.</p>
        <p className="text-sm text-muted-foreground mt-1">Quality scores, efficiency tracking, leaderboards, and tier badges.</p>
      </div>
    </div>
  );
}