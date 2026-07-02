import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import AttachmentFileCard from "./AttachmentFileCard";

export default function AttachmentCategoryGroup({ categoryName, files, jobId }) {
  const [collapsed, setCollapsed] = useState(false);

  if (!files || files.length === 0) return null;

  // Every upload is its own entry — sort newest first, no version merging.
  const sortedFiles = [...files].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  // The most recent upload per same-named file group is badged "Latest".
  const latestIdByName = {};
  sortedFiles.forEach(f => {
    if (!(f.file_name in latestIdByName)) latestIdByName[f.file_name] = f.id;
  });

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
          {sortedFiles.map(f => (
            <AttachmentFileCard
              key={f.id}
              file={f}
              isLatest={latestIdByName[f.file_name] === f.id}
              jobId={jobId}
            />
          ))}
        </div>
      )}
    </div>
  );
}