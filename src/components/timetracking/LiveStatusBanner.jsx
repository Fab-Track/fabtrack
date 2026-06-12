import React, { useEffect, useState } from "react";
import { parseISO, format } from "date-fns";
import { getLiveElapsedSeconds, formatHMS } from "@/lib/timeTrackingHelpers";
import { Badge } from "@/components/ui/badge";
import { Clock, Coffee, UtensilsCrossed, XCircle } from "lucide-react";

export default function LiveStatusBanner({ masterEntry }) {
  const [elapsed, setElapsed] = useState(0);
  const [breakElapsed, setBreakElapsed] = useState(0);

  useEffect(() => {
    if (!masterEntry?.clock_in) { setElapsed(0); return; }
    const tick = () => setElapsed(getLiveElapsedSeconds(masterEntry));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [masterEntry?.clock_in, masterEntry?.is_on_break, masterEntry?.break_start]);

  useEffect(() => {
    if (!masterEntry?.is_on_break || !masterEntry?.break_start) { setBreakElapsed(0); return; }
    const tick = () => {
      const secs = Math.max(0, (Date.now() - parseISO(masterEntry.break_start).getTime()) / 1000);
      setBreakElapsed(Math.floor(secs));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [masterEntry?.is_on_break, masterEntry?.break_start]);

  if (!masterEntry) {
    return (
      <div className="bg-muted/50 border rounded-xl p-4 flex items-center gap-3">
        <XCircle className="w-5 h-5 text-muted-foreground shrink-0" />
        <p className="text-sm font-medium text-muted-foreground">Not currently clocked in</p>
      </div>
    );
  }

  const isOnBreak = masterEntry.is_on_break;
  const breakType = masterEntry.break_type;
  const clockInStr = masterEntry.clock_in ? format(parseISO(masterEntry.clock_in), "h:mm a") : "—";

  if (isOnBreak) {
    return (
      <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center shrink-0">
          {breakType === "lunch" ? <UtensilsCrossed className="w-5 h-5 text-amber-700" /> : <Coffee className="w-5 h-5 text-amber-700" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-800">
            On {breakType === "lunch" ? "Lunch" : "Break"} — {formatHMS(breakElapsed)} elapsed
          </p>
          <p className="text-xs text-amber-600">Clocked in at {clockInStr}</p>
        </div>
        <Badge className="bg-amber-200 text-amber-800 border-amber-300 shrink-0">On Break</Badge>
      </div>
    );
  }

  return (
    <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-emerald-200 flex items-center justify-center shrink-0 animate-pulse">
        <Clock className="w-5 h-5 text-emerald-700" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-emerald-800">
          Clocked In since {clockInStr} — <span className="tabular-nums font-mono">{formatHMS(elapsed)}</span> elapsed
        </p>
      </div>
      <Badge className="bg-emerald-200 text-emerald-800 border-emerald-300 shrink-0">Clocked In</Badge>
    </div>
  );
}