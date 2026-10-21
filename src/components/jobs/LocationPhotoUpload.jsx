import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { ImagePlus, X, Loader2, FileText } from "lucide-react";

/**
 * Uploads location photos/files for a product entry.
 * Files are stored privately via UploadPrivateFile.
 * onFileUploaded(fileUri, fileName, fileType) is called after each successful upload
 * so the parent can also create a JobAttachment record for the gallery.
 */
export default function LocationPhotoUpload({ files = [], onChange, onFileUploaded }) {
  const inputRef = useRef();
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (fileList) => {
    setUploading(true);
    const uploaded = [];
    for (const file of Array.from(fileList)) {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      uploaded.push({ url: file_uri, name: file.name, type: file.type });
      if (onFileUploaded) onFileUploaded(file_uri, file.name, file.type || "application/octet-stream");
    }
    onChange([...files, ...uploaded]);
    setUploading(false);
  };

  const remove = (url) => onChange(files.filter(f => f.url !== url));

  const isImage = (type) => type && type.startsWith("image/");

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {files.map(f => (
        <div key={f.url} className="relative group w-16 h-16 rounded-md overflow-hidden border bg-muted/30 flex items-center justify-center">
          {isImage(f.type) ? (
            <img src={f.url} alt={f.name} className="w-full h-full object-cover" />
          ) : (
            <FileText className="w-5 h-5 text-muted-foreground" />
          )}
          <button
            onClick={() => remove(f.url)}
            className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3 text-white" />
          </button>
        </div>
      ))}
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-16 h-16 rounded-md border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
      >
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
        <span className="text-[10px]">{uploading ? "..." : "Add"}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx"
        multiple
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />
    </div>
  );
}