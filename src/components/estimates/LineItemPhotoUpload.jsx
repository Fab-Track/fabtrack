import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { ImagePlus, Loader2, X, Image, ImageOff } from "lucide-react";

// Upload / replace / remove a single reference photo for an estimate line item.
// The photo is shown to the customer on their estimate so they can see what
// service item they are being priced for.
export default function LineItemPhotoUpload({ photoUrl, showPhoto = true, onChange, onToggleShow, disabled }) {
  const inputRef = useRef();
  const [uploading, setUploading] = useState(false);

  async function handleFile(file) {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange(file_url);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  if (!photoUrl) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => handleFile(e.target.files?.[0])}
        />
        <button
          type="button"
          disabled={uploading || disabled}
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border border-dashed border-border bg-muted/40 text-muted-foreground hover:text-primary hover:border-primary transition-colors disabled:opacity-50"
          title="Upload a reference photo for this line item"
        >
          {uploading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <ImagePlus className="w-2.5 h-2.5" />}
          {uploading ? "Uploading…" : "Add Photo"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <img src={photoUrl} alt="" className="h-10 w-16 object-cover rounded border" />
        {!disabled && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute -top-1.5 -right-1.5 bg-black/60 rounded-full p-0.5 hover:bg-black/80"
            title="Remove photo"
          >
            <X className="w-3 h-3 text-white" />
          </button>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={uploading || disabled}
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border border-border bg-muted/40 text-muted-foreground hover:text-primary hover:border-primary transition-colors disabled:opacity-50"
          title="Replace photo"
        >
          {uploading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <ImagePlus className="w-2.5 h-2.5" />}
          {uploading ? "…" : "Replace"}
        </button>
        <button
          type="button"
          onClick={onToggleShow}
          className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border transition-colors ${showPhoto !== false ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border"}`}
          title="Toggle photo visibility on customer estimate"
        >
          {showPhoto !== false ? <Image className="w-2.5 h-2.5" /> : <ImageOff className="w-2.5 h-2.5" />}
          {showPhoto !== false ? "Show" : "Hide"}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}