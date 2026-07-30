import React, { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Download, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { format, parseISO } from "date-fns";

// Carousel lightbox for browsing all image attachments in a category.
// Opens at a chosen starting index and lets the user flip through the set
// without re-opening a modal for each photo.
export default function AttachmentGalleryLightbox({ files, startIndex = 0, open, onOpenChange }) {
  const [index, setIndex] = useState(startIndex);

  useEffect(() => {
    if (open) setIndex(startIndex);
  }, [open, startIndex]);

  const images = (files || []).filter(f => f.file_type?.startsWith("image/") && f.file_url);
  const total = images.length;

  const goPrev = useCallback(() => {
    setIndex(i => (i - 1 + total) % total);
  }, [total]);

  const goNext = useCallback(() => {
    setIndex(i => (i + 1) % total);
  }, [total]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, goPrev, goNext, onOpenChange]);

  if (!open || total === 0) return null;

  const current = images[Math.min(index, total - 1)];
  const name = current.file_name || "Untitled file";

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = current.file_url;
    a.download = current.file_name;
    a.target = "_blank";
    a.rel = "noopener,noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const openExternal = () => {
    window.open(current.file_url, "_blank", "noopener,noreferrer");
  };

  const hasTzDesignator = current.created_date && /[Zz]|[+-]\d{2}:?\d{2}$/.test(current.created_date);
  const uploadedDate = current.created_date
    ? parseISO(hasTzDesignator ? current.created_date : `${current.created_date}Z`)
    : null;
  const uploadedLabel = uploadedDate ? format(uploadedDate, "MMM d, yyyy, h:mm a") : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-full p-0 gap-0 overflow-hidden bg-black/95">
        <DialogTitle className="sr-only">{name}</DialogTitle>

        {/* Header bar */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-white/10 shrink-0">
          <div className="min-w-0 text-white">
            <p className="text-sm font-medium truncate">{name}</p>
            <p className="text-xs text-white/60 truncate">
              {uploadedLabel ? `Uploaded ${uploadedLabel}` : ""}
              {current.notes ? ` · ${current.notes}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-white/60 mr-2 hidden sm:block">
              {index + 1} / {total}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/10" onClick={openExternal} title="Open in new tab">
              <ExternalLink className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/10" onClick={handleDownload} title="Download">
              <Download className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/10" onClick={() => onOpenChange(false)} title="Close">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Carousel body */}
        <div className="relative flex items-center justify-center bg-black" style={{ height: "75vh" }}>
          <img
            src={current.file_url}
            alt={name}
            className="max-w-full max-h-full object-contain"
          />

          {total > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20"
                onClick={goPrev}
                title="Previous"
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20"
                onClick={goNext}
                title="Next"
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            </>
          )}
        </div>

        {/* Thumbnail strip */}
        {total > 1 && (
          <div className="flex gap-2 px-4 py-3 overflow-x-auto border-t border-white/10 bg-black/80">
            {images.map((img, i) => (
              <button
                key={img.id || i}
                onClick={() => setIndex(i)}
                className={`shrink-0 rounded overflow-hidden border-2 transition-colors ${
                  i === index ? "border-accent" : "border-transparent opacity-60 hover:opacity-100"
                }`}
                title={img.file_name}
              >
                <img
                  src={img.file_url}
                  alt={img.file_name || "photo"}
                  className="w-14 h-14 object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}