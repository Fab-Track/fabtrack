import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, FileText, Check } from "lucide-react";

/**
 * Modal picker that lets the user select existing JobAttachment files
 * to attach to a product entry. Returns selected file objects.
 */
export default function AttachmentPickerModal({ open, onClose, jobId, selectedUrls = [], onPick }) {
  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ["attachments", jobId],
    queryFn: () => base44.entities.JobAttachment.filter({ job_id: jobId }),
    enabled: open && !!jobId,
  });

  const [picked, setPicked] = useState(new Set());

  const toggle = (att) => {
    const next = new Set(picked);
    if (next.has(att.file_url)) {
      next.delete(att.file_url);
    } else {
      next.add(att.file_url);
    }
    setPicked(next);
  };

  const handleConfirm = () => {
    const chosen = attachments.filter(a => picked.has(a.file_url));
    onPick(chosen.map(a => ({ url: a.file_url, name: a.file_name, type: a.file_type || "application/octet-stream" })));
    setPicked(new Set());
    onClose();
  };

  const isImage = (type) => type && type.startsWith("image/");
  const alreadySelected = (url) => selectedUrls.includes(url);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setPicked(new Set()); onClose(); } }}>
      <DialogContent className="max-w-2xl max-h-[70vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Select from Attachments</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : attachments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">No attachments found for this job yet.</p>
        ) : (
          <>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 overflow-y-auto flex-1 pr-1">
              {attachments.map(att => {
                const isSelected = picked.has(att.file_url);
                const alreadyAdded = alreadySelected(att.file_url);
                return (
                  <button
                    key={att.id}
                    type="button"
                    onClick={() => !alreadyAdded && toggle(att)}
                    disabled={alreadyAdded}
                    className={`relative aspect-square rounded-md border-2 overflow-hidden flex items-center justify-center bg-muted/30 transition-all ${
                      isSelected ? "border-primary ring-2 ring-primary/30" : "border-border"
                    } ${alreadyAdded ? "opacity-40 cursor-not-allowed" : "hover:border-primary"}`}
                    title={att.file_name}
                  >
                    {isImage(att.file_type) ? (
                      <img src={att.file_url} alt={att.file_name} className="w-full h-full object-cover" />
                    ) : (
                      <FileText className="w-6 h-6 text-muted-foreground" />
                    )}
                    {isSelected && (
                      <div className="absolute top-1 right-1 bg-primary rounded-full p-0.5">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                    {alreadyAdded && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <span className="text-[9px] text-white font-medium">Added</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t mt-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={picked.size === 0}
                className="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Add {picked.size > 0 ? `(${picked.size})` : ""}
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}