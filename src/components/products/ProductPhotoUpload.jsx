import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ImagePlus, X, Loader2 } from "lucide-react";

export default function ProductPhotoUpload({ photos = [], onChange }) {
  const inputRef = useRef();
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files) => {
    setUploading(true);
    const uploaded = [];
    for (const file of Array.from(files)) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploaded.push(file_url);
    }
    onChange([...photos, ...uploaded]);
    setUploading(false);
  };

  const remove = (url) => onChange(photos.filter(p => p !== url));

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {photos.map(url => (
        <div key={url} className="relative group w-16 h-16 rounded-md overflow-hidden border">
          <img src={url} alt="" className="w-full h-full object-cover" />
          <button
            onClick={() => remove(url)}
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
        {uploading
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <ImagePlus className="w-4 h-4" />}
        <span className="text-[10px]">{uploading ? "..." : "Add"}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />
    </div>
  );
}