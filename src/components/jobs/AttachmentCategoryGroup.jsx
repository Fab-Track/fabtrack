import React, { useState } from "react";
import { ChevronDown, ChevronRight, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import AttachmentFileCard from "./AttachmentFileCard";
import AttachmentGalleryLightbox from "./AttachmentGalleryLightbox";

export default function AttachmentCategoryGroup({ categoryName, files, jobId }) {
  const [collapsed, setCollapsed] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryStart, setGalleryStart] = useState(0);

  if (!files || files.length === 0) return null;

  // Every upload is its own entry — sort newest first, no version merging.
  const sortedFiles = [...files].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  // Only the single newest upload in this category is badged "Latest".
  const latestFileId = sortedFiles[0]?.id;

  // Images that can be browsed in the carousel.
  const imageFiles = sortedFiles.filter(f => f.file_type?.startsWith("image/") && f.file_url);
  const hasImages = imageFiles.length > 0;

  const openGallery = () => {
    setGalleryStart(0);
    setGalleryOpen(true);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 group text-left"
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

        {hasImages && (
          <Button
            variant="outline"
            size="sm"
            className="h-6 px-2 text-xs ml-auto"
            onClick={openGallery}
            title="Browse all photos in this category"
          >
            <Images className="w-3.5 h-3.5 mr-1" />
            View {imageFiles.length} photo{imageFiles.length !== 1 ? "s" : ""}
          </Button>
        )}
      </div>

      {!collapsed && (
        <div className="space-y-1.5 ml-2">
          {sortedFiles.map(f => (
            <AttachmentFileCard
              key={f.id}
              file={f}
              isLatest={f.id === latestFileId}
              jobId={jobId}
              onImageOpen={(idx) => {
                setGalleryStart(idx);
                setGalleryOpen(true);
              }}
              allImages={imageFiles}
            />
          ))}
        </div>
      )}

      {hasImages && (
        <AttachmentGalleryLightbox
          files={imageFiles}
          startIndex={galleryStart}
          open={galleryOpen}
          onOpenChange={setGalleryOpen}
        />
      )}
    </div>
  );
}