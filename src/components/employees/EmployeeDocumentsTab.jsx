import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Upload, FileText, ExternalLink, Trash2, Plus } from "lucide-react";
import { format, parseISO } from "date-fns";

const DOC_TYPES = ["Offer Letter","Certification","ID","Signed Policy","Review","Write-Up","Other"];

export default function EmployeeDocumentsTab({ employee, currentUser, canManage, isOwnProfile }) {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newDoc, setNewDoc] = useState({ document_type: "Other", shared_with_employee: false });

  const { data: docs = [] } = useQuery({
    queryKey: ["empDocs", employee.id],
    queryFn: () => base44.entities.EmployeeDocument.filter({ employee_id: employee.id }, "-created_date", 100),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.EmployeeDocument.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["empDocs", employee.id] }),
  });

  const toggleShare = async (doc) => {
    await base44.entities.EmployeeDocument.update(doc.id, { shared_with_employee: !doc.shared_with_employee });
    qc.invalidateQueries({ queryKey: ["empDocs", employee.id] });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const payload = {
      employee_id: employee.id,
      employee_name: employee.name,
      file_url,
      file_name: file.name,
      document_type: newDoc.document_type,
      shared_with_employee: newDoc.shared_with_employee,
      uploaded_by: currentUser?.full_name || "Unknown",
    };
    await base44.entities.EmployeeDocument.create(payload);
    qc.invalidateQueries({ queryKey: ["empDocs", employee.id] });
    setUploading(false);
    setDialog(false);
    setNewDoc({ document_type: "Other", shared_with_employee: false });
  };

  // Employees see only docs shared with them
  const visibleDocs = isOwnProfile && !canManage ? docs.filter(d => d.shared_with_employee) : docs;

  return (
    <div className="space-y-4">
      {canManage && (
        <Button size="sm" variant="outline" onClick={() => setDialog(true)}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />Upload Document
        </Button>
      )}

      {visibleDocs.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No documents on file.</p>
      ) : (
        <div className="space-y-2">
          {visibleDocs.map(doc => (
            <div key={doc.id} className="border rounded-lg p-3 flex items-center gap-3">
              <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm truncate">{doc.file_name}</span>
                  <Badge variant="outline" className="text-[10px]">{doc.document_type}</Badge>
                  {canManage && doc.shared_with_employee && <Badge className="text-[10px] bg-green-100 text-green-700">Shared with Employee</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Uploaded by {doc.uploaded_by} · {doc.created_date ? format(parseISO(doc.created_date), "MMM d, yyyy") : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {canManage && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>Share</span>
                    <Switch checked={doc.shared_with_employee} onCheckedChange={() => toggleShare(doc)} />
                  </div>
                )}
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                  <Button size="icon" variant="ghost" className="h-8 w-8"><ExternalLink className="w-3.5 h-3.5" /></Button>
                </a>
                {canManage && (
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteMut.mutate(doc.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Document Type</Label>
              <Select value={newDoc.document_type} onValueChange={v => setNewDoc({...newDoc, document_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2.5">
              <Label className="text-sm">Share with Employee</Label>
              <Switch checked={newDoc.shared_with_employee} onCheckedChange={v => setNewDoc({...newDoc, shared_with_employee: v})} />
            </div>
            <label className="cursor-pointer block">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">{uploading ? "Uploading..." : "Click to select file"}</p>
                <p className="text-xs text-muted-foreground mt-1">Any file type accepted</p>
              </div>
              <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
            </label>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}