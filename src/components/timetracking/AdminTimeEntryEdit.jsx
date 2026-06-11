/**
 * AdminTimeEntryEdit — admins can view, correct, and create time entries.
 * Every change is written to TimeAuditLog.
 */
import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, parseISO } from "date-fns";
import { getNetHours, formatHours, payPeriodLabel, getWorkweekStart } from "@/lib/timeTrackingHelpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Pencil, Plus, Trash2, AlertTriangle, Clock } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const WORK_CENTERS = ["Cut","Fit","Weld","Grind","Powder Coat","Install","Demo","Design","General"];

async function writeAuditLog({ entryId, employeeId, employeeName, userId, userName, action, field, oldVal, newVal, reason }) {
  await base44.entities.TimeAuditLog.create({
    time_entry_id: entryId,
    employee_id: employeeId,
    employee_name: employeeName,
    changed_by_id: userId,
    changed_by_name: userName,
    changed_at: new Date().toISOString(),
    action,
    field_changed: field,
    old_value: oldVal != null ? String(oldVal) : undefined,
    new_value: newVal != null ? String(newVal) : undefined,
    reason,
  });
}

export default function AdminTimeEntryEdit({ employees, allEntries, activeEntries, pp, currentUser, onRefresh }) {
  const { toast } = useToast();
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [editModal, setEditModal] = useState(null); // entry being edited
  const [addModal, setAddModal] = useState(false);
  const [form, setForm] = useState({});
  const [reason, setReason] = useState("");

  const empEntries = allEntries.filter(e => {
    if (e.is_active) return false;
    if (e.entry_type && e.entry_type !== "shift") return false;
    if (!e.clock_in) return false;
    const d = parseISO(e.clock_in);
    if (d < pp.start || d > pp.end) return false;
    if (selectedEmployee !== "all" && e.employee_id !== selectedEmployee) return false;
    return true;
  }).sort((a, b) => b.clock_in?.localeCompare(a.clock_in));

  // Also show active entries for selected employee
  const activeShown = activeEntries.filter(e => {
    if (selectedEmployee !== "all" && e.employee_id !== selectedEmployee) return false;
    return true;
  });

  const openEdit = (entry) => {
    setEditModal(entry);
    setForm({
      clock_in: entry.clock_in ? format(parseISO(entry.clock_in), "yyyy-MM-dd'T'HH:mm") : "",
      clock_out: entry.clock_out ? format(parseISO(entry.clock_out), "yyyy-MM-dd'T'HH:mm") : "",
      work_center: entry.work_center || "General",
      break_minutes: entry.break_minutes || 0,
      notes: entry.notes || "",
    });
    setReason("");
  };

  const openAdd = () => {
    setForm({
      employee_id: selectedEmployee !== "all" ? selectedEmployee : "",
      clock_in: format(new Date(), "yyyy-MM-dd'T'08:00"),
      clock_out: format(new Date(), "yyyy-MM-dd'T'17:00"),
      work_center: "General",
      break_minutes: 30,
      notes: "",
    });
    setReason("");
    setAddModal(true);
  };

  const saveEdit = async () => {
    if (!editModal || !reason.trim()) {
      toast({ title: "Reason required", description: "Please enter a reason for the edit.", variant: "destructive" });
      return;
    }
    const clockIn = new Date(form.clock_in);
    const clockOut = form.clock_out ? new Date(form.clock_out) : null;
    const grossHours = clockOut ? (clockOut - clockIn) / 3600000 : 0;
    const netHours = Math.max(0, grossHours - (form.break_minutes || 0) / 60);

    const changes = {
      clock_in: clockIn.toISOString(),
      clock_out: clockOut ? clockOut.toISOString() : null,
      duration_hours: Math.round(grossHours * 100) / 100,
      net_hours: Math.round(netHours * 100) / 100,
      break_minutes: Number(form.break_minutes) || 0,
      work_center: form.work_center,
      notes: form.notes,
      is_manual: true,
      edited_by: currentUser?.id,
      edited_by_name: currentUser?.full_name || currentUser?.email,
      edited_at: new Date().toISOString(),
      edit_reason: reason,
    };

    await base44.entities.TimeEntry.update(editModal.id, changes);
    await writeAuditLog({
      entryId: editModal.id,
      employeeId: editModal.employee_id,
      employeeName: editModal.employee_name,
      userId: currentUser?.id,
      userName: currentUser?.full_name || currentUser?.email,
      action: "admin_edit",
      field: "clock_in / clock_out / break_minutes",
      oldVal: `${editModal.clock_in} → ${editModal.clock_out}, ${editModal.break_minutes}m break`,
      newVal: `${changes.clock_in} → ${changes.clock_out}, ${changes.break_minutes}m break`,
      reason,
    });

    toast({ title: "Entry updated", description: "Changes saved and logged." });
    setEditModal(null);
    onRefresh();
  };

  const saveAdd = async () => {
    if (!form.employee_id || !form.clock_in) {
      toast({ title: "Required fields missing", variant: "destructive" });
      return;
    }
    const emp = employees.find(e => e.id === form.employee_id);
    const clockIn = new Date(form.clock_in);
    const clockOut = form.clock_out ? new Date(form.clock_out) : null;
    const grossHours = clockOut ? (clockOut - clockIn) / 3600000 : 0;
    const netHours = Math.max(0, grossHours - (form.break_minutes || 0) / 60);

    const entry = await base44.entities.TimeEntry.create({
      employee_id: form.employee_id,
      employee_name: emp?.name || "",
      entry_type: "shift",
      work_center: form.work_center || "General",
      clock_in: clockIn.toISOString(),
      clock_out: clockOut ? clockOut.toISOString() : null,
      duration_hours: Math.round(grossHours * 100) / 100,
      net_hours: Math.round(netHours * 100) / 100,
      break_minutes: Number(form.break_minutes) || 0,
      is_active: false,
      is_manual: true,
      notes: form.notes || "",
      edited_by: currentUser?.id,
      edited_by_name: currentUser?.full_name || currentUser?.email,
      edited_at: new Date().toISOString(),
      edit_reason: reason || "Admin created entry",
      workweek_start: format(getWorkweekStart(clockIn, 1), "yyyy-MM-dd"),
      pay_period_label: payPeriodLabel(clockIn),
    });

    await writeAuditLog({
      entryId: entry.id,
      employeeId: form.employee_id,
      employeeName: emp?.name,
      userId: currentUser?.id,
      userName: currentUser?.full_name || currentUser?.email,
      action: "admin_create",
      field: "all",
      newVal: `${clockIn.toISOString()} → ${clockOut?.toISOString()}, ${form.break_minutes}m break`,
      reason: reason || "Admin created entry",
    });

    toast({ title: "Entry added" });
    setAddModal(false);
    onRefresh();
  };

  const forceClockOut = async (active) => {
    const now = new Date();
    const clockIn = parseISO(active.clock_in);
    const grossHours = Math.max(0, (now - clockIn) / 3600000);
    const breakMins = active.break_minutes || 0;
    const netHours = Math.max(0, grossHours - breakMins / 60);

    await base44.entities.TimeEntry.update(active.id, {
      clock_out: now.toISOString(),
      duration_hours: Math.round(grossHours * 100) / 100,
      net_hours: Math.round(netHours * 100) / 100,
      is_active: false,
      is_on_break: false,
      is_manual: true,
      edited_by: currentUser?.id,
      edited_by_name: currentUser?.full_name || currentUser?.email,
      edited_at: now.toISOString(),
      edit_reason: "Admin forced clock-out",
    });

    await writeAuditLog({
      entryId: active.id,
      employeeId: active.employee_id,
      employeeName: active.employee_name,
      userId: currentUser?.id,
      userName: currentUser?.full_name || currentUser?.email,
      action: "clock_out",
      field: "clock_out",
      oldVal: "active (no clock-out)",
      newVal: now.toISOString(),
      reason: "Admin forced clock-out",
    });

    toast({ title: "Clocked out", description: `${active.employee_name} has been clocked out.` });
    onRefresh();
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="All Employees" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Employees</SelectItem>
            {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={openAdd} className="gap-2">
          <Plus className="w-4 h-4" /> Add Missing Entry
        </Button>
      </div>

      {/* Active entries banner */}
      {activeShown.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Currently Active</p>
          {activeShown.map(e => (
            <div key={e.id} className="flex items-center justify-between border rounded-lg p-3 bg-green-50 border-green-200 text-sm gap-3">
              <div>
                <p className="font-semibold">{e.employee_name}</p>
                <p className="text-xs text-muted-foreground">Clocked in since {e.clock_in ? format(parseISO(e.clock_in), "h:mm a") : "—"}</p>
              </div>
              <Button size="sm" variant="destructive" onClick={() => forceClockOut(e)} className="text-xs h-7">
                Force Clock-Out
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Completed entries table */}
      <div className="border rounded-xl overflow-hidden">
        <div className="bg-muted/30 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide grid grid-cols-[1fr_2fr_2fr_1fr_1fr_40px] gap-2">
          <span>Employee</span>
          <span>Clock In</span>
          <span>Clock Out</span>
          <span>Break</span>
          <span>Net Hrs</span>
          <span></span>
        </div>
        <div className="divide-y max-h-[500px] overflow-y-auto">
          {empEntries.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">No entries for this period</p>
          ) : (
            empEntries.map(e => (
              <div key={e.id} className={`grid grid-cols-[1fr_2fr_2fr_1fr_1fr_40px] gap-2 items-center px-4 py-2.5 text-sm hover:bg-muted/10 ${e.is_manual ? "bg-amber-50/50" : ""}`}>
                <span className="truncate font-medium">{e.employee_name}</span>
                <span className="font-mono text-xs">{e.clock_in ? format(parseISO(e.clock_in), "MMM d, h:mm a") : "—"}</span>
                <span className="font-mono text-xs">{e.clock_out ? format(parseISO(e.clock_out), "h:mm a") : <Badge variant="outline" className="text-xs">Missing</Badge>}</span>
                <span className="text-xs">{e.break_minutes ? `${Math.round(e.break_minutes)}m` : "—"}</span>
                <span className="font-semibold text-xs">{formatHours(getNetHours(e))}</span>
                <button
                  className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  onClick={() => openEdit(e)}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Edit modal */}
      <Dialog open={!!editModal} onOpenChange={() => setEditModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Time Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">Employee: <strong>{editModal?.employee_name}</strong></p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Clock In</Label>
                <Input type="datetime-local" value={form.clock_in || ""} onChange={e => setForm(p => ({...p, clock_in: e.target.value}))} />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Clock Out</Label>
                <Input type="datetime-local" value={form.clock_out || ""} onChange={e => setForm(p => ({...p, clock_out: e.target.value}))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Break Minutes</Label>
                <Input type="number" min="0" value={form.break_minutes || 0} onChange={e => setForm(p => ({...p, break_minutes: e.target.value}))} />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Work Center</Label>
                <Select value={form.work_center || "General"} onValueChange={v => setForm(p => ({...p, work_center: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{WORK_CENTERS.map(wc => <SelectItem key={wc} value={wc}>{wc}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Notes</Label>
              <Input value={form.notes || ""} onChange={e => setForm(p => ({...p, notes: e.target.value}))} />
            </div>
            <div>
              <Label className="text-xs mb-1 block text-destructive">Reason for Edit (required)</Label>
              <Input
                placeholder="e.g. Employee forgot to clock out"
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="border-destructive/50 focus-visible:ring-destructive/30"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModal(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={!reason.trim()}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add modal */}
      <Dialog open={addModal} onOpenChange={setAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Missing Time Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <Label className="text-xs mb-1 block">Employee</Label>
              <Select value={form.employee_id || ""} onValueChange={v => setForm(p => ({...p, employee_id: v}))}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Clock In</Label>
                <Input type="datetime-local" value={form.clock_in || ""} onChange={e => setForm(p => ({...p, clock_in: e.target.value}))} />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Clock Out</Label>
                <Input type="datetime-local" value={form.clock_out || ""} onChange={e => setForm(p => ({...p, clock_out: e.target.value}))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Break (min)</Label>
                <Input type="number" min="0" value={form.break_minutes || 0} onChange={e => setForm(p => ({...p, break_minutes: e.target.value}))} />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Work Center</Label>
                <Select value={form.work_center || "General"} onValueChange={v => setForm(p => ({...p, work_center: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{WORK_CENTERS.map(wc => <SelectItem key={wc} value={wc}>{wc}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Notes / Reason</Label>
              <Input
                placeholder="e.g. Employee forgot to punch in"
                value={reason}
                onChange={e => setReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModal(false)}>Cancel</Button>
            <Button onClick={saveAdd}>Add Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}