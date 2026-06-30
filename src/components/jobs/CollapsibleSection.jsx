import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

/**
 * Reusable collapsible card — matches the existing Job Details section style.
 */
export default function CollapsibleSection({ title, icon: Icon, defaultOpen = true, actions, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 flex-1 text-left"
        >
          {open
            ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
            : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
          {Icon && <Icon className="w-4 h-4 text-muted-foreground shrink-0" />}
          <span className="font-semibold text-sm">{title}</span>
        </button>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
      {open && <div className="border-t px-4 pb-4 pt-3">{children}</div>}
    </div>
  );
}