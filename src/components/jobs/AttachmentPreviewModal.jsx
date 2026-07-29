import React from "react";
import { Download, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

// In-app scrollable attachment preview.
// Images render inline (zoomable via native scroll if oversized), PDFs embed
// in an <iframe>, and anything else shows a file summary with a download link.
export default function AttachmentPreviewModal({ file, open, onOpenChange }) {
  if (!file) return null;

  const isImage = file.file_type?.startsWith("image/");
  const isPdf = file.file_type?.includes("pdf");
  const name = file.file_name || "Untitled file";

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = file.file_url;
    a.download = file.file_name;
    a.target = "_blank";
    a.rel = "noopener,noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const openExternal = () => {
    window.open(file.file_url, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">{name}</DialogTitle>
        {/* Header bar */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b bg-card shrink-0">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{name}</p>
            {file.notes && (
              <p className="text-xs text-muted-foreground truncate">{file.notes}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={openExternal} title="Open in new tab">
              <ExternalLink className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDownload} title="Download">
              <Download className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenChange(false)} title="Close">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable preview body */}
        <div className="overflow-auto max-h-[80vh] bg-muted/30 flex items-start justify-center p-4">
          {isImage ? (
            <img
              src={file.file_url}
              alt={name}
              className="max-w-full h-auto rounded shadow-sm"
              style={{ maxHeight: "none" }}
            />
          ) : isPdf ? (
            <iframe
              src={file.file_url}
              title={name}
              className="w-full bg-white rounded"
              style={{ height: "75vh", minHeight: "500px", border: "none" }}
            />
          ) : (
            <div className="text-center py-16 px-4 max-w-md">
              <p className="text-sm text-muted-foreground mb-4">
                This file type can't be previewed inline.
              </p>
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-1" /> Download
                </Button>
                <Button variant="outline" size="sm" onClick={openExternal}>
                  <ExternalLink className="w-4 h-4 mr-1" /> Open in new tab
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}