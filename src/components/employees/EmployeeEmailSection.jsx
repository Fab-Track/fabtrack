import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle, CheckCircle2, Mail, Send, RefreshCw, XCircle, ExternalLink
} from "lucide-react";
import { toast } from "sonner";

// Roles that have email sending capability
const EMAIL_ROLES = ["owner", "estimator", "shop_manager", "admin", "accountant"];
const ALLOWED_DOMAIN = "highcountrymetalworks.com";

function ConnectionBadge({ employee }) {
  const status = employee.gmail_token_status;
  if (status === "connected" && employee.gmail_connected) {
    return (
      <Badge className="gap-1 bg-green-100 text-green-700 border-green-200 text-xs">
        <CheckCircle2 className="w-3 h-3" />
        {employee.assigned_comm_email} — Connected
      </Badge>
    );
  }
  if (status === "expired") {
    return (
      <Badge className="gap-1 bg-red-100 text-red-700 border-red-200 text-xs">
        <XCircle className="w-3 h-3" />
        Connection expired — reconnect
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300 bg-amber-50 text-xs">
      <AlertCircle className="w-3 h-3" />
      Email not connected — using info@highcountrymetalworks.com
    </Badge>
  );
}

export default function EmployeeEmailSection({ employee, canEdit }) {
  const qc = useQueryClient();
  const [emailInput, setEmailInput] = useState(employee.assigned_comm_email || "");
  const [savingEmail, setSavingEmail] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testing, setTesting] = useState(false);
  const [showTestInput, setShowTestInput] = useState(false);

  const role = employee.role?.toLowerCase() || "";
  if (!EMAIL_ROLES.includes(role)) return null;

  async function handleSaveEmail() {
    const trimmed = emailInput.trim().toLowerCase();
    if (trimmed && !trimmed.endsWith(`@${ALLOWED_DOMAIN}`)) {
      toast.error(`Only @${ALLOWED_DOMAIN} addresses are permitted`);
      return;
    }
    setSavingEmail(true);
    await base44.entities.Employee.update(employee.id, {
      assigned_comm_email: trimmed || null,
      gmail_connected: false,
      gmail_token_status: "disconnected",
    });
    qc.invalidateQueries({ queryKey: ["employee", employee.id] });
    qc.invalidateQueries({ queryKey: ["employees"] });
    setSavingEmail(false);
    toast.success("Email address saved");
  }

  function handleConnectGmail() {
    // Gmail OAuth requires Google Cloud Console setup.
    // Once a Google OAuth app connector is configured, this will open the consent flow.
    toast.info(
      "Gmail OAuth setup required. Go to Settings → Integrations → Gmail to configure Google OAuth credentials, then connect from there.",
      { duration: 6000 }
    );
  }

  async function handleDisconnect() {
    await base44.entities.Employee.update(employee.id, {
      gmail_connected: false,
      gmail_token_status: "disconnected",
      gmail_connected_at: null,
    });
    qc.invalidateQueries({ queryKey: ["employee", employee.id] });
    qc.invalidateQueries({ queryKey: ["employees"] });
    toast.success("Gmail disconnected");
  }

  async function handleTestEmail() {
    if (!testEmail.trim()) { toast.error("Enter an email address to test"); return; }
    if (!employee.assigned_comm_email) { toast.error("No email address assigned"); return; }
    if (!employee.gmail_connected) { toast.error("Gmail is not connected yet"); return; }
    setTesting(true);
    const resp = await base44.functions.invoke("sendCustomerMessage", {
      channel: "Email",
      to_email: testEmail.trim(),
      from_email: employee.assigned_comm_email,
      from_name: employee.preferred_name || employee.name,
      subject: "FabTrack Test Email",
      message_body: `✅ Test email from FabTrack — ${employee.preferred_name || employee.name}'s Gmail is connected!`,
    });
    setTesting(false);
    if (resp.data?.ok) {
      toast.success("Test email sent!");
    } else {
      toast.error("Failed: " + (resp.data?.error || "Unknown error"));
    }
  }

  const isConnected = employee.gmail_connected && employee.gmail_token_status === "connected";
  const isExpired = employee.gmail_token_status === "expired";

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center gap-2 mb-1">
        <Mail className="w-3.5 h-3.5 text-muted-foreground" />
        <Label className="text-xs font-semibold">Assigned Email / Gmail</Label>
      </div>

      <ConnectionBadge employee={employee} />

      {canEdit ? (
        <div className="space-y-2">
          {/* Email address input */}
          <div className="flex gap-2">
            <Input
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              placeholder={`name@${ALLOWED_DOMAIN}`}
              className="h-9 text-sm"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleSaveEmail}
              disabled={savingEmail || emailInput === (employee.assigned_comm_email || "")}
              className="shrink-0"
            >
              {savingEmail ? "Saving…" : "Save"}
            </Button>
          </div>

          {employee.assigned_comm_email && (
            <div className="flex gap-2 flex-wrap">
              {!isConnected ? (
                <Button size="sm" variant="outline" onClick={handleConnectGmail} className="gap-1.5 text-xs h-8">
                  <ExternalLink className="w-3 h-3" />
                  {isExpired ? "Reconnect Gmail" : "Connect Gmail"}
                </Button>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 border border-green-200 rounded-md text-xs text-green-700">
                    <CheckCircle2 className="w-3 h-3" />
                    Connected
                    {employee.gmail_connected_at && (
                      <span className="text-green-600 ml-1">
                        · {new Date(employee.gmail_connected_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleDisconnect}
                    className="text-xs text-muted-foreground hover:text-destructive underline underline-offset-2"
                  >
                    Disconnect
                  </button>
                </>
              )}
            </div>
          )}

          {/* Test email */}
          {isConnected && (
            <div>
              {showTestInput ? (
                <div className="flex gap-2">
                  <Input
                    value={testEmail}
                    onChange={e => setTestEmail(e.target.value)}
                    placeholder="Send test to: email@example.com"
                    className="h-8 text-sm"
                  />
                  <Button size="sm" onClick={handleTestEmail} disabled={testing} className="gap-1.5 shrink-0">
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
                  Send a test email to verify this connection
                </button>
              )}
            </div>
          )}

          {/* Setup note when no email assigned */}
          {!employee.assigned_comm_email && (
            <p className="text-xs text-muted-foreground">
              Enter an @{ALLOWED_DOMAIN} address, save it, then connect Gmail to enable sending from this address.
            </p>
          )}
        </div>
      ) : (
        employee.assigned_comm_email ? (
          <div className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2 text-sm">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <span>{employee.assigned_comm_email}</span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No email assigned</p>
        )
      )}
    </div>
  );
}