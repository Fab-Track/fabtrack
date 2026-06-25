import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Briefcase, Users, AlertTriangle, RefreshCw, Loader2, TrendingUp, Activity, BarChart3 } from 'lucide-react';

function StatCard({ icon: Icon, label, value, accentClass }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${accentClass || 'bg-primary/10 text-primary'}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground leading-tight">{label}</p>
        <p className="text-xl font-bold leading-tight">{value}</p>
      </div>
    </div>
  );
}

function ActivityRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="w-4 h-4" />
        {label}
      </span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}

export default function PlatformAnalytics() {
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['super-admin', 'platform-analytics'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getPlatformAnalytics', {});
      return res.data;
    },
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['super-admin', 'platform-analytics'] });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const s = data?.summary || {};
  const c = data?.conversion || {};
  const a = data?.activity_7d || {};
  const plans = data?.plan_breakdown || [];

  const trialAccent = s.trials_expiring_soon > 0
    ? 'bg-warning/15 text-warning'
    : 'bg-primary/10 text-primary';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="w-5 h-5 text-accent" />
          Platform Analytics
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isFetching}
          className="gap-1.5 text-muted-foreground"
        >
          {isFetching ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Summary metric cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={Building2} label="Active Orgs" value={s.total_active_orgs ?? 0} />
          <StatCard icon={Briefcase} label="Total Jobs" value={s.total_jobs ?? 0} />
          <StatCard icon={Users} label="Total Users" value={s.total_users ?? 0} />
          <StatCard
            icon={AlertTriangle}
            label="Trials Expiring ≤14d"
            value={s.trials_expiring_soon ?? 0}
            accentClass={trialAccent}
          />
        </div>

        {/* Conversion snapshot + Activity feed */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Conversion snapshot */}
          <div className="p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-accent" />
              <h3 className="text-sm font-semibold">Conversion Snapshot</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Trial Orgs</span>
                <span className="font-semibold">{c.trial_orgs ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Paid Orgs</span>
                <span className="font-semibold">{c.paid_orgs ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm pt-2 border-t">
                <span className="text-muted-foreground">Trial → Paid Rate</span>
                <span className="font-bold text-lg text-accent">{c.conversion_rate ?? 0}%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {c.paid_orgs ?? 0} paid / {c.total_orgs_ever ?? 0} total orgs ever created
              </p>
            </div>
          </div>

          {/* Activity feed */}
          <div className="p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-accent" />
              <h3 className="text-sm font-semibold">Last 7 Days</h3>
            </div>
            <ActivityRow icon={Building2} label="New Orgs Created" value={a.new_orgs ?? 0} />
            <ActivityRow icon={Briefcase} label="New Jobs Created" value={a.new_jobs ?? 0} />
            <ActivityRow icon={Users} label="New Users Invited" value={a.new_users ?? 0} />
          </div>
        </div>

        {/* Per-plan breakdown table */}
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left font-medium px-3 py-2 capitalize">Plan</th>
                <th className="text-right font-medium px-3 py-2">Org Count</th>
                <th className="text-right font-medium px-3 py-2">Avg Jobs/Org</th>
                <th className="text-right font-medium px-3 py-2">Avg Users/Org</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((row) => (
                <tr key={row.plan} className="border-t">
                  <td className="px-3 py-2 capitalize font-medium">{row.plan}</td>
                  <td className="px-3 py-2 text-right">{row.org_count}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{row.avg_jobs}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{row.avg_users}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}