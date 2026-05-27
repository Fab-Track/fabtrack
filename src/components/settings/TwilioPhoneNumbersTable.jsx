import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Phone, Plus, Trash2, AlertCircle, CheckCircle2, Send } from "lucide-react";
import { toast } from "sonner";

function formatPhone(e164) {
  if (!e164) return "";
  const digits = e164.replace(/\D/g, "");
  if (digits.length === 11 && digits[0] === "1") {
    return `(${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
  }
  return e164;
}

export default function TwilioPhoneNumbersTable() {
  const qc = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addNumber, setAddNumber] = useState("");
  const [addIsMain, setAddIsMain] = useState(false);
  const [adding, setAdding] = useState(false);
  const [reassignDialog, setReassignDialog] = useState(null); // { numberId, fromName, toEmployeeId, toName }
  const [testDialog, setTestDialog] = useState(null); // { number }
  const [testPhone, setTestPhone] = useState("");
  const [testing, setTesting] = useState(false);

  const { data: phoneNumbers = [], isLoading } = useQuery({
    queryKey: ["twilioPhoneNumbers"],
    queryFn: () => base44.entities.TwilioPhoneNumber.list("sort_order", 50),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list("-created_date", 100),
  });

  const activeEmployees = employees.filter(e => e.is_active !== false && e.employment_status !== "Terminated");

  // Map: employee_id -> phone number record (for "already assigned" checks)
  const assignedMap = {};
  phoneNumbers.forEach(n => {
    if (n.assigned_employee_id) assignedMap[n.assigned_employee_id] = n;
  });

  async function handleAdd() {
    if (!addNumber.trim()) { toast.error("Enter a phone number"); return; }
    setAdding(true);
    const resp = await base44.functions.invoke("manageTwilioNumbers", {
      action: "validateAndAdd",
      phone_number: addNumber.trim(),
      is_main: addIsMain,
    });
    setAdding(false);
    if (resp.data?.ok) {
      toast.success("Phone number added!");
      qc.invalidateQueries({ queryKey: ["twilioPhoneNumbers"] });
      setShowAddDialog(false);
      setAddNumber("");
      setAddIsMain(false);
    } else {
      toast.error(resp.data?.error || "Failed to add number");
    }
  }

  async function handleRemove(number) {
    if (!confirm(`Remove ${formatPhone(number.phone_number)} from FabTrack? This does not delete it from Twilio.`)) return;
    await base44.functions.invoke("manageTwilioNumbers", { action: "removeNumber", number_id: number.id });
    qc.invalidateQueries({ queryKey: ["twilioPhoneNumbers"] });
    qc.invalidateQueries({ queryKey: ["employees"] });
    toast.success("Number removed");
  }

  async function handleAssign(number, newEmployeeId) {
    const newEmp = activeEmployees.find(e => e.id === newEmployeeId);
    const currentlyAssigned = number.assigned_employee_id
      ? activeEmployees.find(e => e.id === number.assigned_employee_id)
      : null;

    // If already assigned to someone else, show confirmation
    if (currentlyAssigned && currentlyAssigned.id !== newEmployeeId) {
      setReassignDialog({
        numberId: number.id,
        fromName: currentlyAssigned.name,
        toEmployeeId: newEmployeeId,
        toName: newEmp?.name || "",
        phoneDisplay: formatPhone(number.phone_number),
      });
      return;
    }

    await doAssign(number.id, newEmployeeId, newEmp?.name);
  }

  async function doAssign(numberId, employeeId, employeeName) {
    await base44.functions.invoke("manageTwilioNumbers", {
      action: "assignNumber",
      number_id: numberId,
      employee_id: employeeId || null,
      employee_name: employeeName || null,
    });
    qc.invalidateQueries({ queryKey: ["twilioPhoneNumbers"] });
    qc.invalidateQueries({ queryKey: ["employees"] });
    toast.success(employeeId ? `Assigned to ${employeeName}` : "Number unassigned");
    setReassignDialog(null);
  }

  async function handleTestSMS() {
    if (!testPhone.trim()) { toast.error("Enter a phone number to test"); return; }
    setTesting(true);
    const resp = await base44.functions.invoke("manageTwilioNumbers", {
      action: "sendTestSMS",
      to_phone: testPhone.trim(),
      from_phone: testDialog.phone_number,
      from_name: testDialog.assigned_employee_name || "HCMW",
    });
    setTesting(false);
    if (resp.data?.ok) {
      if (resp.data?.simulated) {
        toast.info("Simulated — add Twilio credentials to environment variables first");
      } else {
        toast.success("Test SMS sent successfully!");
      }
    } else {
      toast.error("Failed: " + (resp.data?.error || "Unknown error"));
    }
  }

  // Sort: main first, then by creation
  const sorted = [...phoneNumbers].sort((a, b) => {
    if (a.is_main && !b.is_main) return -1;
    if (!a.is_main && b.is_main) return 1;
    return 0;
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold">Phone Numbers</h4>
          <p className="text-xs text-muted-foreground">Assign Twilio numbers to team members for outgoing SMS</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowAddDialog(true)} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add Number
        </Button>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground py-4 text-center">Loading…</p>
      ) : sorted.length === 0 ? (
        <div className="border border-dashed rounded-xl py-8 text-center text-muted-foreground">
          <Phone className="w-6 h-6 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No phone numbers added yet</p>
          <p className="text-xs mt-1">Click "Add Number" to connect a Twilio number</p>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1.5fr_1.5fr_1fr_auto] gap-3 px-4 py-2 bg-muted/30 border-b text-xs font-medium text-muted-foreground">
            <span>Phone Number</span>
            <span>Assigned To</span>
            <span>Status</span>
            <span></span>
          </div>
          {sorted.map(num => {
            const isAssigned = !!num.assigned_employee_id;
            return (
              <div key={num.id} className="grid grid-cols-[1.5fr_1.5fr_1fr_auto] gap-3 px-4 py-3 border-b last:border-0 items-center">
                {/* Phone number */}
                <div>
                  <p className="text-sm font-mono font-medium">{formatPhone(num.phone_number)}</p>
                  {num.is_main && (
                    <span className="text-[10px] text-accent font-semibold">Main Business Number</span>
                  )}
                  {num.friendly_name && !num.is_main && (
                    <p className="text-[10px] text-muted-foreground">{num.friendly_name}</p>
                  )}
                </div>

                {/* Assigned To dropdown */}
                <div>
                  <Select
                    value={num.assigned_employee_id || "unassigned"}
                    onValueChange={(val) => handleAssign(num, val === "unassigned" ? null : val)}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {activeEmployees.map(emp => {
                        const otherNum = assignedMap[emp.id];
                        const alreadyAssignedElsewhere = otherNum && otherNum.id !== num.id;
                        return (
                          <SelectItem
                            key={emp.id}
                            value={emp.id}
                            disabled={alreadyAssignedElsewhere}
                            className={alreadyAssignedElsewhere ? "opacity-50" : ""}
                          >
                            {emp.name}
                            {alreadyAssignedElsewhere ? ` (${formatPhone(otherNum.phone_number)})` : ""}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status badge */}
                <div>
                  {isAssigned ? (
                    <Badge className="bg-green-100 text-green-700 border-green-200 gap-1 text-[10px]">
                      <CheckCircle2 className="w-3 h-3" /> Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground text-[10px]">
                      Unassigned
                    </Badge>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-1">
                  <button
                    onClick={() => { setTestDialog(num); setTestPhone(""); }}
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                    title="Send test SMS"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleRemove(num)}
                    className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    title="Remove from FabTrack"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Number Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Twilio Phone Number</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Phone Number (E.164 format)</Label>
              <Input
                value={addNumber}
                onChange={e => setAddNumber(e.target.value)}
                placeholder="+18015550142"
                className="font-mono"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Must be a number in your Twilio account</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isMain"
                checked={addIsMain}
                onChange={e => setAddIsMain(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="isMain" className="text-sm cursor-pointer">Mark as Main Business Number</Label>
            </div>
            <div className="flex gap-2 pt-1">
              <Button onClick={handleAdd} disabled={adding} className="flex-1">
                {adding ? "Validating…" : "Add Number"}
              </Button>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reassign Confirmation Dialog */}
      <Dialog open={!!reassignDialog} onOpenChange={() => setReassignDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reassign Phone Number</DialogTitle>
          </DialogHeader>
          {reassignDialog && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                <AlertCircle className="w-4 h-4 inline mr-1.5" />
                Reassign <strong>{reassignDialog.phoneDisplay}</strong> from <strong>{reassignDialog.fromName}</strong> to <strong>{reassignDialog.toName}</strong>?
                <p className="mt-1 text-xs">Future customer replies to this number will route to {reassignDialog.toName}.</p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => doAssign(reassignDialog.numberId, reassignDialog.toEmployeeId, reassignDialog.toName)}
                  className="flex-1"
                >
                  Confirm Reassign
                </Button>
                <Button variant="outline" onClick={() => setReassignDialog(null)}>Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Test SMS Dialog */}
      <Dialog open={!!testDialog} onOpenChange={() => setTestDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Test SMS — {testDialog ? formatPhone(testDialog.phone_number) : ""}</DialogTitle>
          </DialogHeader>
          {testDialog && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Send a test message from <strong>{formatPhone(testDialog.phone_number)}</strong>
                {testDialog.assigned_employee_name && ` (${testDialog.assigned_employee_name})`} to verify it's working.
              </p>
              <div>
                <Label className="text-xs">Send test to number</Label>
                <Input
                  value={testPhone}
                  onChange={e => setTestPhone(e.target.value)}
                  placeholder="+1..."
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleTestSMS} disabled={testing} className="flex-1">
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  {testing ? "Sending…" : "Send Test"}
                </Button>
                <Button variant="outline" onClick={() => setTestDialog(null)}>Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}