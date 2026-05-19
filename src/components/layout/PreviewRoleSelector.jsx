import React, { useState, useRef, useEffect } from "react";
import { Eye, X, ChevronRight } from "lucide-react";
import { usePreviewRole, PREVIEW_ROLE_OPTIONS } from "@/lib/PreviewRoleContext";
import { cn } from "@/lib/utils";

export default function PreviewRoleSelector({ collapsed }) {
  const { isPreviewing, previewRole, startPreview, exitPreview, getRoleLabel } = usePreviewRole();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close panel on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSelect = (roleId) => {
    startPreview(roleId);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        title={collapsed ? "Preview Role" : undefined}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium w-full transition-colors",
          isPreviewing
            ? "bg-amber-400/20 text-amber-300 hover:bg-amber-400/30"
            : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        )}
      >
        <Eye className={cn("w-4 h-4 shrink-0", collapsed && "mx-auto")} />
        {!collapsed && (
          <>
            <span className="flex-1 text-left">
              {isPreviewing ? `As: ${getRoleLabel(previewRole)}` : "Preview Role"}
            </span>
            {isPreviewing && (
              <span
                onClick={(e) => { e.stopPropagation(); exitPreview(); }}
                className="text-amber-300/70 hover:text-amber-300"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            )}
          </>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className={cn(
          "absolute bottom-full mb-2 bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden w-52",
          collapsed ? "left-14" : "left-0"
        )}>
          <div className="px-3 py-2 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Preview as Role</p>
          </div>
          <div className="py-1">
            {PREVIEW_ROLE_OPTIONS.map(role => (
              <button
                key={role.id}
                onClick={() => handleSelect(role.id)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-muted",
                  previewRole === role.id && isPreviewing
                    ? "bg-amber-50 text-amber-700 font-semibold"
                    : "text-foreground"
                )}
              >
                {role.label}
                {previewRole === role.id && isPreviewing && (
                  <ChevronRight className="w-3.5 h-3.5 text-amber-600" />
                )}
              </button>
            ))}
          </div>
          {isPreviewing && (
            <div className="px-3 py-2 border-t border-border">
              <button
                onClick={() => { exitPreview(); setOpen(false); }}
                className="w-full text-xs text-destructive hover:text-destructive/80 font-semibold py-1 text-center transition-colors"
              >
                Exit Preview Mode
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}