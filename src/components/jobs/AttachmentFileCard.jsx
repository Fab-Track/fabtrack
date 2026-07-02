import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ExternalLink, Download, Trash2, Image, FileText, File, MoreVertical, FolderOpen
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function FileIcon({ type }) {
  if (type?.startsWith("image/")) return <Image className="w-5 h-5 text-purple-400 shrink-0" />;
  if (type?.includes("pdf")) return <FileText className="w-5 h-5 text-red-400 shrink-0" />;
  return <File className="w-5 h-5 text-muted-foreground shrink-0" />;
}

// Some older records were saved with the storage file's raw UUID as file_name
// instead of the original uploaded filename (the original name was never captured).
// Detect that pattern and show a clean fallback instead of the raw UUID.
const UUID_NAME_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\.[a-zA-Z0-9]+)?$/i;

function getDisplayName(file) {
  const name = file.file_name || "";
  if (UUID_NAME_RE.test(name)) {
    const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
    return `Untitled file${ext}`;
  }
  return name || "Untitled file";
}

export default function AttachmentFileCard({ file, isLatest = false, jobId }) {
  const qc = useQueryClient();
  const [showRecategorize, setShowRecategorize] = useState(false);
  const [newCategory, setNewCategory] = useState(file.category || "");
  const [deleting, setDeleting] = useState(false);
  const [catList, setCatList] = useState([]);

  const handleDelete = async () => {
    setDeleting(true);
    await base44.entities.JobAttachment.delete(file.id);
    qc.invalidateQueries({ queryKey: ["attachments", jobId] });
    setDeleting(false);
  };

  const handleRecategorize = async () => {
    if (!newCategory || newCategory === file.category) {
      setShowRecategorize(false);
      return;
    }
    await base44.entities.JobAttachment.update(file.id, { category: newCategory });
    qc.invalidateQueries({ queryKey: ["attachments", jobId] });
    setShowRecategorize(false);
  };

  const openRecategorize = async () => {
    if (!catList.length) {
      const cats = await base44.entities.AttachmentCategory.filter({ is_active: true }, "sort_order", 50);
      setCatList(cats);
      setNewCategory(file.category || "");
    }
    setShowRecategorize(true);
  };

  const handleView = () => {
    window.open(file.file_url, "_blank", "noopener,noreferrer");
  };

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

  const isImage = file.file_type?.startsWith("image/");
  const uploadedLabel = file.created_date
    ? `Uploaded ${format(parseISO(file.created_date), "MMM d, yyyy, h:mm a")}`
    : null;

  return (
    <>
      <div className="flex items-start gap-3 p-2.5 rounded-lg border bg-card hover:bg-muted/20 transition-colors group">
        {/* Thumbnail or icon */}
        {isImage ? (
          <img
            src={file.file_url}
            alt={file.file_name}
            className="w-10 h-10 rounded object-cover shrink-0 bg-muted"
            loading="lazy"
          />
        ) : (
          <FileIcon type={file.file_type} />
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium truncate">{getDisplayName(file)}</p>
            {isLatest && (
              <Badge className="text-[10px] shrink-0 bg-success text-success-foreground">Latest</Badge>
            )}
          </div>
          {uploadedLabel && (
            <p className="text-xs text-muted-foreground mt-0.5">{uploadedLabel}</p>
          )}
          {file.notes && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{file.notes}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Mobile: dropdown menu; desktop: inline buttons */}
          <div className="hidden sm:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleView} title="View">
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDownload} title="Download">
              <Download className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={openRecategorize} title="Move to another category">
              <FolderOpen className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={handleDelete}
              disabled={deleting}
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Mobile dropdown */}
          <div className="sm:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleView}>
                  <ExternalLink className="w-4 h-4 mr-2" /> View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-2" /> Download
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openRecategorize}>
                  <FolderOpen className="w-4 h-4 mr-2" /> Re-categorize
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Re-categorize dialog */}
      <Dialog open={showRecategorize} onOpenChange={setShowRecategorize}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Move File</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Move <strong>{file.file_name}</strong> from <strong>{file.category}</strong> to:
            </p>
            <Select value={newCategory} onValueChange={setNewCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {catList.map(c => (
                  <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecategorize(false)}>Cancel</Button>
            <Button onClick={handleRecategorize} disabled={!newCategory || newCategory === file.category}>
              Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}