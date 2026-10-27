import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { ImagePlus, X, Loader2, FileText, Paperclip, Upload } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import AttachmentPickerModal from "@/components/jobs/AttachmentPickerModal";

/**
 * Compact attachment picker for job notes.
 * Files are stored privately via UploadPrivateFile.
 * Mirrors the Location Photos / Files pattern from Product Details.
 */
export default function NoteAttachments({ attachments = [], onChange, jobId }) {
  const inputRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleFiles = async (fileList) => {
    setUploading(true);
    const uploaded = [];
    for (const file of Array.from(fileList)) {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      uploaded.push({ url: file_uri, name: file.name, type: file.type || "application/octet-stream" });
    }
    onChange([...attachments, ...uploaded]);
    setUploading(false);
  };

  const handlePickFromAttachments = (chosen) => {
    onChange([...attachments, ...chosen]);
  };

  const remove = (url) => onChange(attachments.filter(f => f.url !== url));

  const isImage = (type) => type && type.startsWith("image/");
  const selectedUrls = attachments.map(f => f.url);

  if (attachments.length === 0 && !uploading) {
    return (
      <>
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 h-7 px-2 text-xs text-muted-foreground border border-dashed border-border rounded-md hover:border-primary hover:text-primary transition-colors"
            >
              <ImagePlus className="w-3.5 h-3.5" /> Attach photo
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-1" align="start">
            <button
              type="button"
              onClick={() => { setPopoverOpen(false); inputRef.current?.click(); }}
              className="w-full flex items-center gap-2 px-2 py-2 text-xs rounded-md hover:bg-muted transition-colors text-left"
            >
              <Upload className="w-3.5 h-3.5 text-muted-foreground" />
              Upload new file
            </button>
            {jobId && (
              <button
                type="button"
                onClick={() => { setPopoverOpen(false); setPickerOpen(true); }}
                className="w-full flex items-center gap-2 px-2 py-2 text-xs rounded-md hover:bg-muted transition-colors text-left"
              >
                <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
                Select from attachments
              </button>
            )}
          </PopoverContent>
        </Popover>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx"
          multiple
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
        <AttachmentPickerModal
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          jobId={jobId}
          selectedUrls={selectedUrls}
          onPick={handlePickFromAttachments}
        />
      </>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {attachments.map(f => (
        <div key={f.url} className="relative group w-14 h-14 rounded-md overflow-hidden border bg-muted/30 flex items-center justify-center">
          {isImage(f.type) ? (
            <img src={f.url} alt={f.name} className="w-full h-full object-cover" />
          ) : (
            <FileText className="w-5 h-5 text-muted-foreground" />
          )}
          <button
            type="button"
            onClick={() => remove(f.url)}
            className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3 text-white" />
          </button>
        </div>
      ))}
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={uploading}
            className="w-14 h-14 rounded-md border-2 border-dashed border-border flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
            <span className="text-[10px]">{uploading ? "..." : "Add"}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-1" align="start">
          <button
            type="button"
            onClick={() => { setPopoverOpen(false); inputRef.current?.click(); }}
            className="w-full flex items-center gap-2 px-2 py-2 text-xs rounded-md hover:bg-muted transition-colors text-left"
          >
            <Upload className="w-3.5 h-3.5 text-muted-foreground" />
            Upload new file
          </button>
          {jobId && (
            <button
              type="button"
              onClick={() => { setPopoverOpen(false); setPickerOpen(true); }}
              className="w-full flex items-center gap-2 px-2 py-2 text-xs rounded-md hover:bg-muted transition-colors text-left"
            >
              <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
              Select from attachments
            </button>
          )}
        </PopoverContent>
      </Popover>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx"
        multiple
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />
      <AttachmentPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        jobId={jobId}
        selectedUrls={selectedUrls}
        onPick={handlePickFromAttachments}
      />
    </div>
  );
}