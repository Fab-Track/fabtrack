import React from "react";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Sparkles } from "lucide-react";

export default function ProjectBlueSection() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-sm flex items-center gap-1.5">
              Project Blue
              <Sparkles className="w-3 h-3 text-indigo-500" />
            </h3>
            <p className="text-xs text-muted-foreground">Phone & SMS — coming soon</p>
          </div>
        </div>
        <Badge variant="outline" className="gap-1 text-muted-foreground bg-indigo-50/50 border-indigo-200 text-indigo-600">
          Coming Soon
        </Badge>
      </div>

      <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-3 text-xs text-indigo-800">
        Project Blue is a streamlined phone and SMS provider designed as an alternative to Twilio.
        Integration is planned for a future release. Once available, you'll be able to connect your
        organization's Project Blue account here — just like Twilio.
      </div>
    </div>
  );
}