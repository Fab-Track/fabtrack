import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle, Shield } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function MigrationPanel() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  async function runMigration() {
    setRunning(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke("migrateToOrganization", {});
      const data = res.data;
      if (data.success) {
        setResult(data);
        toast.success("Multi-tenant migration complete!");
      } else {
        toast.error(data.error || "Migration failed");
      }
    } catch (err) {
      toast.error("Migration failed. Check console for details.");
    }
    setRunning(false);
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h2 className="font-semibold text-base">Multi-Tenant Setup</h2>
        <p className="text-sm text-muted-foreground">
          Run this once to migrate your app to the multi-organization architecture. All existing data will be assigned to "High Country Metal Works".
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Shield className="w-4 h-4 text-amber-500" />
            Data Migration
          </CardTitle>
          <CardDescription>
            Creates the High Country Metal Works organization and assigns all existing users, jobs, customers, invoices, employees, and settings to it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!result ? (
            <Button onClick={runMigration} disabled={running} className="gap-1.5">
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              {running ? "Running Migration..." : "Run Migration"}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" /> Migration complete
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Organization:</strong> {result.organization?.name} ({result.organization?.slug})</p>
                <p><strong>Users assigned:</strong> {result.users_updated}</p>
                <p><strong>Entities migrated:</strong></p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 ml-2">
                  {Object.entries(result.entities_migrated || {}).map(([name, info]) => (
                    <p key={name} className="text-[11px]">
                      {name}: {info.updated || 0} records
                    </p>
                  ))}
                </div>
                <p><strong>Settings updated:</strong> {result.settings_updated}</p>
              </div>
            </div>
          )}

          {result?.error && (
            <div className="flex items-center gap-2 text-red-600 mt-2 text-sm">
              <AlertCircle className="w-4 h-4" /> {result.error}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        <strong>Important:</strong> Only run this once. After migration, all queries should include <code className="font-mono bg-muted px-1 rounded text-[11px]">organization_id</code> filtering. Use <code className="font-mono bg-muted px-1 rounded text-[11px]">useOrgId()</code> and <code className="font-mono bg-muted px-1 rounded text-[11px]">withOrgFilter()</code> from <code className="font-mono bg-muted px-1 rounded text-[11px]">@/lib/orgContext</code>.
      </p>
    </div>
  );
}