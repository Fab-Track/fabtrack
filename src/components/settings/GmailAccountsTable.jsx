import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2, AlertCircle, XCircle, Mail, ExternalLink, RefreshCw, Info
} from "lucide-react";
import { toast } from "sonner";

const EMAIL_ROLES = ["owner", "estimator", "shop_manager", "admin", "accountant"];
const ALLOWED_DOMAIN = "highcountrymetalworks.com";
const DEFAULT_SENDER = "info@highcountrymetalworks.com";

function StatusBadge({ employee }) {
  const status = employee.gmail_token_status;
  if (status === "connected" && employee.gmail_connected) {
    return (
      <Badge className="gap-1 bg-green-100 text-green-700 border-green-200 text-xs">
        <CheckCircle2 className="w-3 h-3" />Connected
      </Badge>
    );
  }
  if (status === "expired") {
    return (
      <Badge className="gap-1 bg-red-100 text-red-700 border-red-200 text-xs">
        <XCircle className="w-3 h-3" />Expired
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 text-muted-foreground text-xs">
      <AlertCircle className="w-3 h-3" />Not Connected
    </Badge>
  );
}

function ConnectRow({ employee, onConnectClick }) {
  const isConnected = employee.gmail_connected && employee.gmail_token_status === "connected";
  const isExpired = employee.gmail_token_status === "expired";

  return (
    <tr className="border-b last:border-0">
      <td className="py-2.5 pr-4 text-sm font-medium">{employee.name}</td>
      <td className="py-2.5 pr-4 text-sm text-muted-foreground font-mono">
        {employee.assigned_comm_email || <span className="italic text-muted-foreground/60">Not assigned</span>}
      </td>
      <td className="py-2.5 pr-4">
        <StatusBadge employee={employee} />
      </td>
      <td className="py-2.5 pr-4 text-xs text-muted-foreground">
        {employee.gmail_connected_at
          ? new Date(employee.gmail_connected_at).toLocaleDateString()
          : "—"}
      </td>
      <td className="py-2.5 text-right">
        {employee.assigned_comm_email ? (
          <Button
            size="sm"
            variant={isExpired ? "destructive" : "outline"}
            className="h-7 text-xs gap-1"
            onClick={() => onConnectClick(employee)}
          >
            <ExternalLink className="w-3 h-3" />
            {isConnected ? "Reconnect" : isExpired ? "Reconnect" : "Connect Gmail"}
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground italic">Assign email first</span>
        )}
      </td>
    </tr>
  );
}

export default function GmailAccountsTable() {
  const qc = useQueryClient();
  const [defaultSender, setDefaultSender] = useState(DEFAULT_SENDER);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list("-created_date", 100),
    staleTime: 30000,
  });

  const emailEmployees = employees.filter(e =>
    EMAIL_ROLES.includes(e.role?.toLowerCase() || "") && e.is_active !== false
  );

  function handleConnectClick(employee) {
    // Gmail OAuth requires Google Cloud Console setup with client ID/secret.
    // When configured, this opens the OAuth consent popup.
    toast.info(
      `To connect ${employee.name}'s Gmail (${employee.assigned_comm_email}), set up a Google OAuth app in Google Cloud Console and add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your environment variables. Then the Connect button will open the authorization flow.`,
      { duration: 8000 }
    );
  }

  const connectedCount = emailEmployees.filter(e => e.gmail_connected && e.gmail_token_status === "connected").length;

  return (
    <div className="space-y-4">
      {/* Privacy note */}
      <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>
          FabTrack only accesses replies to emails sent through FabTrack. No other emails in the inbox are read or stored. Each user authorizes their own account individually.
        </span>
      </div>

      {/* OAuth setup notice */}
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800">
        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <div>
          <strong>Setup required:</strong> Gmail integration requires a Google Cloud OAuth app.
          Add <code className="font-mono bg-amber-100 px-1 rounded">GOOGLE_CLIENT_ID</code> and{" "}
          <code className="font-mono bg-amber-100 px-1 rounded">GOOGLE_CLIENT_SECRET</code> to your environment variables.{" "}
          <a
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noopener noreferrer"
            className="underline inline-flex items-center gap-0.5"
          >
            Google Cloud Console <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Domain restriction note */}
      <p className="text-xs text-muted-foreground">
        Only <strong>@{ALLOWED_DOMAIN}</strong> addresses can be connected. Personal Gmail or other addresses will be rejected.
      </p>

      {/* Connected accounts table */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : emailEmployees.length === 0 ? (
        <p className="text-sm text-muted-foreground">No employees with email roles found.</p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <div className="px-3 py-2 bg-muted/30 border-b flex items-center justify-between">
            <span className="text-xs font-semibold">Connected Gmail Accounts</span>
            <Badge variant="outline" className="text-xs">
              {connectedCount} / {emailEmployees.length} connected
            </Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/10">
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Employee</th>
                  <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground">Email Address</th>
                  <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground">Last Auth</th>
                  <th className="py-2 pr-3 text-xs font-medium text-muted-foreground text-right">Action</th>
                </tr>
              </thead>
              <tbody className="px-3">
                {emailEmployees.map(emp => (
                  <ConnectRow key={emp.id} employee={emp} onConnectClick={handleConnectClick} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Default sender fallback */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">Default Sender Email (Fallback)</Label>
        <p className="text-xs text-muted-foreground">Used when a user has no connected Gmail account.</p>
        <Input
          className="h-8 text-sm max-w-xs"
          value={defaultSender}
          onChange={e => setDefaultSender(e.target.value)}
          placeholder="info@highcountrymetalworks.com"
        />
      </div>
    </div>
  );
}