import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import AttachmentFileCard from "./AttachmentFileCard";

export default function AttachmentCategoryGroup({ categoryName, files, usesVersioning, jobId }) {
  const [collapsed, setCollapsed] = useState(false);

  if (!files || files.length === 0) return null;

  let displayFiles = files;

  if (usesVersioning) {
    // Group by version_group, show newest first
    const versionMap = {};
    files.forEach(f => {
      const group = f.version_group || f.file_name;
      if (!versionMap[group]) versionMap[group] = [];
      versionMap[group].push(f);
    });

    // Build display list: one card per version group (newest version shown, rest in history)
    displayFiles = Object.values(versionMap).map(group => {
      // Sort by version descending (v2 > v1)
      const sorted = [...group].sort((a, b) => {
        const vA = parseInt(String(a.version).replace(/\D/g, "")) || 1;
        const vB = parseInt(String(b.version).replace(/\D/g, "")) || 1;
        return vB - vA;
      });
      return sorted;
    });
  }

  return (
    <div>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 mb-2 group w-full text-left"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {categoryName} ({files.length})
        </h4>
      </button>

      {!collapsed && (
        <div className="space-y-1.5 ml-2">
          {usesVersioning
            ? displayFiles.map((versionGroup, idx) => (
                <AttachmentFileCard
                  key={versionGroup[0].id}
                  file={versionGroup[0]}
                  versionHistory={versionGroup.length > 1 ? versionGroup.slice(1) : []}
                  categories={null}
                  jobId={jobId}
                />
              ))
            : files.map(f => (
                <AttachmentFileCard
                  key={f.id}
                  file={f}
                  versionHistory={[]}
                  categories={null}
                  jobId={jobId}
                />
              ))
          }
        </div>
      )}
    </div>
  );
}