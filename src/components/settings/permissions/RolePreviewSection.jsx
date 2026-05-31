import React from "react";
import { usePreviewRole, PREVIEW_ROLE_OPTIONS } from "@/lib/PreviewRoleContext";
import { ROLE_SUMMARIES, ROLE_LABELS } from "@/lib/permissionsData";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

const NON_OWNER_ROLES = PREVIEW_ROLE_OPTIONS.filter(r => r.id !== "owner");

export default function RolePreviewSection() {
  const { startPreview, isPreviewing } = usePreviewRole();

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-sm">Preview Role</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Experience FabTrack exactly as each role sees it. All actions are disabled in preview mode — nothing can be changed.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {NON_OWNER_ROLES.map(role => (
          <div key={role.id} className="border rounded-xl p-4 flex flex-col gap-3 hover:shadow-sm transition-shadow">
            <div>
              <p className="font-semibold text-sm">{role.label}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {ROLE_SUMMARIES[role.id] || "Custom role access"}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 w-full"
              onClick={() => startPreview(role.id)}
            >
              <Eye className="w-3.5 h-3.5" />
              Preview as {role.label}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}