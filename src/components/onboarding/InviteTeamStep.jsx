import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Mail } from 'lucide-react';

const INVITE_ROLES = ['Shop Manager', 'Estimator', 'Welder/Fabricator', 'Office Admin'];

export default function InviteTeamStep({ invites, updateInvite }) {
  const filledCount = invites.filter((i) => i.email && i.email.trim()).length;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Invite your team</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Get your crew in so everyone's on the same page. Optional — you can skip this.
        </p>
      </div>

      <div className="space-y-3">
        {invites.map((invite, idx) => (
          <div key={idx} className="flex gap-2 items-end">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Mail className="w-3 h-3" /> Email {idx + 1}
              </Label>
              <Input
                type="email"
                value={invite.email || ''}
                onChange={(e) => updateInvite(idx, { email: e.target.value })}
                placeholder="crew@yourshop.com"
                className="h-10"
              />
            </div>
            <div className="w-40 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Role</Label>
              <Select
                value={invite.role || ''}
                onValueChange={(v) => updateInvite(idx, { role: v })}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {INVITE_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>

      {filledCount === 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
          <UserPlus className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            No worries — invite your crew anytime from the Users page.
          </p>
        </div>
      )}
    </div>
  );
}