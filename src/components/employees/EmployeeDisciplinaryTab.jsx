import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, ChevronDown, AlertTriangle, CheckCircle2 } from "lucide-react";
import { format, parseISO } from "date-fns";

const BUCKET_REASONS = {
  "Bucket 1 - Attendance & Time": ["Absenteeism","Tardiness","Unapproved Overtime","Not Taking Lunches","Misuse of Timeclock (lying)"],
  "Bucket 2 - Conduct": ["Language","Fighting","Unprofessionalism","Rudeness","Harassment"],
  "Bucket 3 - Work Standards": ["Failure to Follow Procedure","Policy Violation","Fabrication Standard Not Met","Other"],
};

const BUCKET_COLORS = {
  "Bucket 1 - Attendance & Time": "border-l-yellow-400 bg-yellow-50",
  "Bucket 2 - Conduct": "border-l-orange-400 bg-orange-50",
  "Bucket 3 - Work Standards": "border-l-red-400 bg-red-50",
};

const BUCKET_BADGE = {
  "Bucket 1 - Attendance & Time": "bg-yellow-100 text-yellow-800",
  "Bucket 2 - Conduct": "bg-orange-100 text-orange-800",
  "Bucket 3 - Work Standards": "bg-red-100 text-red-800",
};

const ACTIONS = ["Verbal Warning","Written Warning","Final Written Warning","Suspension","Termination"];
const PRIOR_WARNINGS = ["None","1 Prior","2 Prior","3+ Prior"];

export default function EmployeeDisciplinaryTab({ employee, currentUser, canManage, isOwnProfile }) {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: writeUps = [] } = useQuery({
    queryKey: ["writeups", employee.id],
    queryFn: () => base44.entities.WriteUp.filter({ employee_id: employee.id }, "-writeup_date", 100),
  });

  const saveWriteUp = useMutation({
    mutationFn: (d) => d.id ? base44.entities.WriteUp.update(d.id, d) : base44.entities.WriteUp.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["writeups", employee.id] }); setDialog(false); setEditing(null); },
  });

  const acknowledge = async (wu) => {
    await base44.entities.WriteUp.update(wu.id, { acknowledgment_status: "Acknowledged", acknowledged_at: new Date().toISOString() });
    qc.invalidateQueries({ queryKey: ["writeups", employee.id] });
  };

  const refuse = async (wu) => {
    await base44.entities.WriteUp.update(wu.id, { acknowledgment_status: "Refused to Sign", acknowledged_at: new Date().toISOString() });
    qc.invalidateQueries({ queryKey: ["writeups", employee.id] });
  };

  const b1 = writeUps.filter(w => w.warning_bucket === "Bucket 1 - Attendance & Time").length;
  const b2 = writeUps.filter(w => w.warning_bucket === "Bucket 2 - Conduct").length;
  const b3 = writeUps.filter(w => w.warning_bucket === "Bucket 3 - Work Standards").length;

  const visibleWriteUps = isOwnProfile && !canManage
    ? writeUps.filter(w => w.acknowledgment_status !== "Pending" || true) // employee sees all their own
    : writeUps;

  return (
    <div className="space-y-5">
      {/* Summary counters */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center border rounded-lg p-3 border-l-4 border-l-yellow-400 bg-yellow-50">
          <p className="text-2xl font-bold text-yellow-700">{b1}</p>
          <p className="text-xs text-yellow-700 mt-0.5">Attendance & Time</p>
        </div>
        <div className="text-center border rounded-lg p-3 border-l-4 border-l-orange-400 bg-orange-50">
          <p className="text-2xl font-bold text-orange-700">{b2}</p>
          <p className="text-xs text-orange-700 mt-0.5">Conduct</p>
        </div>
        <div className="text-center border rounded-lg p-3 border-l-4 border-l-red-400 bg-red-50">
          <p className="text-2xl font-bold text-red-700">{b3}</p>
          <p className="text-xs text-red-700 mt-0.5">Work Standards</p>
        </div>
      </div>

      {canManage && (
        <Button size="sm" variant="outline" onClick={() => { setEditing({ employee_id: employee.id, employee_name: employee.name, written_by: currentUser?.full_name || "", acknowledgment_status: "Pending" }); setDialog(true); }}>
          <Plus className="w-3.5 h-3.5 mr-1" />New Write-Up
        </Button>
      )}

      {visibleWriteUps.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No write-ups on record.</p>
      ) : (
        <div className="space-y-2">
          {visibleWriteUps.map(wu => (
            <Collapsible key={wu.id}>
              <CollapsibleTrigger className="w-full">
                <div className={`border border-l-4 rounded-lg p-3 flex items-center justify-between hover:opacity-90 transition-opacity text-left ${BUCKET_COLORS[wu.warning_bucket] || ""}`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="font-medium text-sm">{wu.specific_reason}</span>
                    <Badge className={`text-[10px] ${BUCKET_BADGE[wu.warning_bucket] || ""}`}>{wu.warning_bucket?.replace("Bucket ","B")}</Badge>
                    <Badge variant="outline" className="text-[10px]">{wu.action_taken}</Badge>
                    {wu.acknowledgment_status === "Pending" && <Badge className="text-[10px] bg-red-100 text-red-700">Pending Acknowledgment</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{wu.writeup_date ? format(parseISO(wu.writeup_date), "MMM d, yyyy") : ""}</span>
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border border-t-0 rounded-b-lg p-4 space-y-3 bg-white">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="font-semibold text-xs">Incident Date:</span> <span className="text-muted-foreground">{wu.incident_date ? format(parseISO(wu.incident_date), "MMM d, yyyy") : "—"}</span></div>
                    <div><span className="font-semibold text-xs">Written By:</span> <span className="text-muted-foreground">{wu.written_by}</span></div>
                    <div><span className="font-semibold text-xs">Prior Warnings:</span> <span className="text-muted-foreground">{wu.prior_warnings}</span></div>
                    <div><span className="font-semibold text-xs">Follow-Up Date:</span> <span className="text-muted-foreground">{wu.followup_date ? format(parseISO(wu.followup_date), "MMM d, yyyy") : "—"}</span></div>
                    {wu.witness_name && <div><span className="font-semibold text-xs">Witness:</span> <span className="text-muted-foreground">{wu.witness_name}</span></div>}
                    <div><span className="font-semibold text-xs">Acknowledgment:</span> <span className="text-muted-foreground">{wu.acknowledgment_status}</span></div>
                  </div>
                  {wu.incident_description && <div><p className="text-xs font-semibold">Incident Description</p><p className="text-sm mt-0.5 text-muted-foreground">{wu.incident_description}</p></div>}
                  {wu.improvement_plan && <div><p className="text-xs font-semibold">Improvement Plan</p><p className="text-sm mt-0.5 text-muted-foreground">{wu.improvement_plan}</p></div>}
                  {wu.employee_response && <div><p className="text-xs font-semibold">Employee Response</p><p className="text-sm mt-0.5">{wu.employee_response}</p></div>}
                  <div className="flex gap-2 flex-wrap">
                    {canManage && <Button size="sm" variant="outline" onClick={() => { setEditing(wu); setDialog(true); }}>Edit</Button>}
                    {canManage && wu.acknowledgment_status === "Pending" && (
                      <Button size="sm" variant="outline" className="text-destructive" onClick={() => refuse(wu)}>Mark Refused to Sign</Button>
                    )}
                    {isOwnProfile && !canManage && wu.acknowledgment_status === "Pending" && (
                      <Button size="sm" onClick={() => acknowledge(wu)}>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />I Acknowledge Receipt of This Write-Up
                      </Button>
                    )}
                    {wu.acknowledged_at && <span className="text-xs text-muted-foreground self-center">Acknowledged {format(parseISO(wu.acknowledged_at), "MMM d, yyyy")}</span>}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Write-Up" : "New Write-Up"}</DialogTitle></DialogHeader>
          {editing && <WriteUpForm wu={editing} onSave={d => saveWriteUp.mutate(d)} onCancel={() => setDialog(false)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WriteUpForm({ wu, onSave, onCancel }) {
  const [f, setF] = useState({ ...wu });
  const set = (k,v) => setF(p => ({...p,[k]:v}));
  const reasons = f.warning_bucket ? BUCKET_REASONS[f.warning_bucket] || [] : [];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label className="text-xs font-semibold">Write-Up Date</Label><Input type="date" value={f.writeup_date||""} onChange={e => set("writeup_date",e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs font-semibold">Incident Date</Label><Input type="date" value={f.incident_date||""} onChange={e => set("incident_date",e.target.value)} /></div>
        <div className="col-span-2 space-y-1"><Label className="text-xs font-semibold">Warning Bucket *</Label>
          <Select value={f.warning_bucket||""} onValueChange={v => set("warning_bucket",v)}>
            <SelectTrigger><SelectValue placeholder="Select bucket" /></SelectTrigger>
            <SelectContent>{Object.keys(BUCKET_REASONS).map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {reasons.length > 0 && (
          <div className="col-span-2 space-y-1"><Label className="text-xs font-semibold">Specific Reason *</Label>
            <Select value={f.specific_reason||""} onValueChange={v => set("specific_reason",v)}>
              <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
              <SelectContent>{reasons.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1"><Label className="text-xs font-semibold">Prior Warnings on This Issue</Label>
          <Select value={f.prior_warnings||"None"} onValueChange={v => set("prior_warnings",v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PRIOR_WARNINGS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1"><Label className="text-xs font-semibold">Action Taken</Label>
          <Select value={f.action_taken||""} onValueChange={v => set("action_taken",v)}>
            <SelectTrigger><SelectValue placeholder="Select action" /></SelectTrigger>
            <SelectContent>{ACTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1"><Label className="text-xs font-semibold">Follow-Up Date</Label><Input type="date" value={f.followup_date||""} onChange={e => set("followup_date",e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs font-semibold">Witness Name</Label><Input value={f.witness_name||""} onChange={e => set("witness_name",e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs font-semibold">Acknowledgment Status</Label>
          <Select value={f.acknowledgment_status||"Pending"} onValueChange={v => set("acknowledgment_status",v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Acknowledged">Acknowledged</SelectItem>
              <SelectItem value="Refused to Sign">Refused to Sign</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1"><Label className="text-xs font-semibold">Incident Description *</Label><Textarea rows={4} value={f.incident_description||""} onChange={e => set("incident_description",e.target.value)} /></div>
      <div className="space-y-1"><Label className="text-xs font-semibold">Improvement Plan</Label><Textarea rows={3} value={f.improvement_plan||""} onChange={e => set("improvement_plan",e.target.value)} /></div>
      <div className="space-y-1"><Label className="text-xs font-semibold">Employee Response</Label><Textarea rows={2} value={f.employee_response||""} onChange={e => set("employee_response",e.target.value)} /></div>
      <div className="flex gap-2">
        <Button onClick={() => onSave(f)} disabled={!f.warning_bucket || !f.specific_reason || !f.incident_description}>Save Write-Up</Button>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}