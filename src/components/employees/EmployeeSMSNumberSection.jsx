import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Send, CheckCircle2, Phone } from "lucide-react";
import { toast } from "sonner";

// Roles that have SMS sending capability
const SMS_ROLES = ["owner", "estimator", "shop_manager", "admin"];

function formatPhone(e164) {
  if (!e164) return "";
  const digits = e164.replace(/\D/g, "");
  if (digits.length === 11 && digits[0] === "1") {
    return `(${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
  }
  return e164;
}

export default function EmployeeSMSNumberSection({ employee, canEdit }) {
  const qc = useQueryClient();
  const [testPhone, setTestPhone] = useState("");
  const [testing, setTesting] = useState(false);
  const [showTestInput, setShowTestInput] = useState(false);

  const { data: phoneNumbers = [] } = useQuery({
    queryKey: ["twilioPhoneNumbers"],
    queryFn: () => base44.entities.TwilioPhoneNumber.list("sort_order", 50),
  });

  const role = employee.role?.toLowerCase() || "";
  if (!SMS_ROLES.includes(role)) return null;

  const assignedNumber = phoneNumbers.find(n => n.assigned_employee_id === employee.id);
  const mainNumber = phoneNumbers.find(n => n.is_main);

  // Numbers available: unassigned OR currently assigned to this employee
  const availableNumbers = phoneNumbers.filter(n =>
    !n.assigned_employee_id || n.assigned_employee_id === employee.id
  );
  const takenNumbers = phoneNumbers.filter(n =>
    n.assigned_employee_id && n.assigned_employee_id !== employee.id
  );

  async function handleAssign(numberId) {
    if (!numberId || numberId === "none") {
      // Unassign: clear the current assignment
      if (assignedNumber) {
        await base44.functions.invoke("manageTwilioNumbers", {
          action: "assignNumber",
          number_id: assignedNumber.id,
          employee_id: null,
          employee_name: null,
        });
        qc.invalidateQueries({ queryKey: ["twilioPhoneNumbers"] });
        qc.invalidateQueries({ queryKey: ["employees"] });
        qc.invalidateQueries({ queryKey: ["employee", employee.id] });
        toast.success("SMS number unassigned");
      }
      return;
    }

    await base44.functions.invoke("manageTwilioNumbers", {
      action: "assignNumber",
      number_id: numberId,
      employee_id: employee.id,
      employee_name: employee.name,
    });
    qc.invalidateQueries({ queryKey: ["twilioPhoneNumbers"] });
    qc.invalidateQueries({ queryKey: ["employees"] });
    qc.invalidateQueries({ queryKey: ["employee", employee.id] });
    toast.success("SMS number assigned");
  }

  async function handleTest() {
    if (!testPhone.trim()) { toast.error("Enter a phone number to test"); return; }
    if (!assignedNumber) { toast.error("No number assigned"); return; }
    setTesting(true);
    const resp = await base44.functions.invoke("manageTwilioNumbers", {
      action: "sendTestSMS",
      to_phone: testPhone.trim(),
      from_phone: assignedNumber.phone_number,
      from_name: employee.preferred_name || employee.name,
    });
    setTesting(false);
    if (resp.data?.ok) {
      if (resp.data?.simulated) {
        toast.info("Simulated — Twilio credentials not yet configured");
      } else {
        toast.success("Test SMS sent!");
      }
    } else {
      toast.error("Failed: " + (resp.data?.error || "Unknown error"));
    }
  }

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center gap-2 mb-1">
        <Phone className="w-3.5 h-3.5 text-muted-foreground" />
        <Label className="text-xs font-semibold">Assigned SMS Number</Label>
      </div>

      {/* Warning if no number assigned */}
      {!assignedNumber && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-800">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            No SMS number assigned — outgoing messages will send from the{" "}
            <strong>{mainNumber ? formatPhone(mainNumber.phone_number) : "main business"}</strong> number until one is assigned.
          </span>
        </div>
      )}

      {canEdit ? (
        <div className="space-y-2">
          <Select
            value={assignedNumber?.id || "none"}
            onValueChange={handleAssign}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select a number…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Unassigned (use main number)</SelectItem>
              {/* Available numbers */}
              {availableNumbers.map(n => (
                <SelectItem key={n.id} value={n.id}>
                  {formatPhone(n.phone_number)}
                  {n.is_main ? " — Main Business Number" : ""}
                </SelectItem>
              ))}
              {/* Taken numbers — shown grayed out, not selectable */}
              {takenNumbers.map(n => (
                <SelectItem key={n.id} value={n.id} disabled className="opacity-50">
                  {formatPhone(n.phone_number)} — {n.assigned_employee_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Show assigned number in large format */}
          {assignedNumber && (
            <div className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-base font-mono font-semibold tracking-wide">
                  {formatPhone(assignedNumber.phone_number)}
                </span>
              </div>
              <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">Active</Badge>
            </div>
          )}

          {/* Test SMS */}
          {assignedNumber && (
            <div>
              {showTestInput ? (
                <div className="flex gap-2">
                  <Input
                    value={testPhone}
                    onChange={e => setTestPhone(e.target.value)}
                    placeholder="Send test to: +1..."
                    className="h-8 text-sm"
                  />
                  <Button size="sm" onClick={handleTest} disabled={testing} className="gap-1.5 shrink-0">
                    <Send className="w-3 h-3" />
                    {testing ? "Sending…" : "Send"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowTestInput(false)}>Cancel</Button>
                </div>
              ) : (
                <button
                  onClick={() => setShowTestInput(true)}
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                >
                  Send a test SMS to verify this number
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Read-only view */
        assignedNumber ? (
          <div className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-base font-mono font-semibold tracking-wide">
              {formatPhone(assignedNumber.phone_number)}
            </span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No number assigned</p>
        )
      )}
    </div>
  );
}