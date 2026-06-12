import React, { useState } from "react";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle2, XCircle, FileEdit, Clock } from "lucide-react";

function AdminCorrectionDialog({ open, onClose, request, employee, dayEntries, onApprove, onReject }) {
  const [response, setResponse] = useState("");
  const [clockOutTime, setClockOutTime] = useState("");

  const handleApprove = () => {
    onApprove(request.id, response);
    onClose();
  };

  const handleReject = () => {
    onReject(request.id, response);
    onClose();
  };

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileEdit className="w-5 h-5 text-amber-500" />
            Correction Request
          </DialogTitle>
          <DialogDescription>
            {employee?.name || request.employee_name} · {request.date ? format(parseISO(request.date), "EEEE, MMM d") : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
            <p className="font-medium text-amber-800">{request.employee_name}</p>
            <p className="text-amber-700 mt-1">{request.description || request.requested_action}</p>
          </div>

          {dayEntries && dayEntries.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1">
              <p className="font-medium text-muted-foreground mb-1">Current entries:</p>
              {dayEntries.map(e => (
                <div key={e.id} className="flex justify-between font-mono">
                  <span>
                    {e.clock_in ? format(parseISO(e.clock_in), "h:mm a") : "—"} →{" "}
                    {e.clock_out ? format(parseISO(e.clock_out), "h:mm a") : <span className="text-red-500">missing</span>}
                  </span>
                  <span className="text-muted-foreground">{e.work_center || ""}</span>
                </div>
              ))}
            </div>
          )}

          <Textarea
            placeholder="Response note for employee (optional)..."
            value={response}
            onChange={e => setResponse(e.target.value)}
            className="h-20"
          />

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleReject}>
              <XCircle className="w-4 h-4 mr-1" /> Reject
            </Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleApprove}>
              <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Approve to acknowledge the correction (then use Edit Entries tab to apply the actual time change). Reject to decline with a reason.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminCorrectionsPanel({ requests, employees, allEntries, currentUser, onApprove, onReject, onRefresh }) {
  const [selectedRequest, setSelectedRequest] = useState(null);

  const pending = requests.filter(r => r.status === "pending");
  const resolved = requests.filter(r => r.status !== "pending");

  const empMap = {};
  employees.forEach(e => { empMap[e.id] = e; });

  const getDayEntries = (request) => {
    if (!request.date || !request.employee_id) return [];
    return allEntries.filter(e => {
      if (e.employee_id !== request.employee_id) return false;
      if (!e.clock_in) return false;
      return format(parseISO(e.clock_in), "yyyy-MM-dd") === request.date;
    });
  };

  return (
    <div className="space-y-4">
      {/* Pending */}
      <div>
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Pending Requests ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No pending correction requests.</p>
        ) : (
          <div className="space-y-2">
            {pending.map(req => {
              const emp = empMap[req.employee_id];
              return (
                <div key={req.id} className="flex items-center justify-between border rounded-lg p-3 bg-amber-50/50 gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{req.employee_name}</span>
                      {emp && <Badge variant="outline" className="text-xs capitalize">{emp.role}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {req.date ? format(parseISO(req.date), "MMM d, yyyy") : ""} — {req.description || req.requested_action}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {req.created_date ? `Submitted ${format(parseISO(req.created_date), "MMM d, h:mm a")}` : ""}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0" onClick={() => setSelectedRequest(req)}>
                    Review
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Resolved */}
      {resolved.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
            Resolved ({resolved.length})
          </h3>
          <div className="space-y-1">
            {resolved.map(req => (
              <div key={req.id} className={`flex items-center justify-between border rounded-lg p-3 gap-3 text-sm ${
                req.status === "approved" ? "bg-emerald-50/50" : "bg-red-50/50"
              }`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{req.employee_name}</span>
                    <Badge className={req.status === "approved" ? "bg-emerald-100 text-emerald-700 border-emerald-200 text-xs" : "bg-red-100 text-red-700 border-red-200 text-xs"}>
                      {req.status === "approved" ? "Approved" : "Rejected"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{req.description || req.requested_action}</p>
                </div>
                <div className="text-xs text-muted-foreground text-right shrink-0">
                  {req.resolved_at && <p>{format(parseISO(req.resolved_at), "MMM d")}</p>}
                  {req.approved_by_name && <p>by {req.approved_by_name}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedRequest && (
        <AdminCorrectionDialog
          open={!!selectedRequest}
          onClose={() => setSelectedRequest(null)}
          request={selectedRequest}
          employee={empMap[selectedRequest.employee_id]}
          dayEntries={getDayEntries(selectedRequest)}
          onApprove={onApprove}
          onReject={onReject}
        />
      )}
    </div>
  );
}