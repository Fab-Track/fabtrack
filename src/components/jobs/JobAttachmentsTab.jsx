import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Image, ExternalLink } from "lucide-react";

export default function JobAttachmentsTab({ job }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    // For now, store as internal notes appendix since attachments need a dedicated entity
    // In v2, this would go to a JobAttachment entity
    setUploading(false);
    alert("File uploaded: " + file_url);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Job Attachments</CardTitle>
            <Button size="sm" variant="outline" disabled={uploading} asChild>
              <label className="cursor-pointer">
                <Upload className="w-4 h-4 mr-1.5" />
                {uploading ? "Uploading..." : "Upload File"}
                <input type="file" className="hidden" onChange={handleUpload} />
              </label>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Upload drawings, cut lists, weld notes, photos, and other documents.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Supports PDF, images, and document files.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}