import React from "react";
import { Eye, X } from "lucide-react";
import { usePreviewRole } from "@/lib/PreviewRoleContext";

export default function PreviewBanner() {
  const { isPreviewing, previewRole, getRoleLabel, exitPreview } = usePreviewRole();

  if (!isPreviewing) return null;

  return (
    <div className="fixed top-14 md:top-0 left-0 right-0 md:left-56 z-[90] bg-amber-400 text-amber-950 flex items-center justify-between px-4 py-2 shadow-md">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Eye className="w-4 h-4" />
        <span>Previewing as: {getRoleLabel(previewRole)}</span>
        <span className="text-amber-700 font-normal text-xs ml-1">— Actions are disabled in preview mode</span>
      </div>
      <button
        onClick={exitPreview}
        className="flex items-center gap-1.5 bg-amber-950/10 hover:bg-amber-950/20 text-amber-950 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
      >
        <X className="w-3.5 h-3.5" />
        Exit Preview
      </button>
    </div>
  );
}