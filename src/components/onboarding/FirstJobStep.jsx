import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Info } from 'lucide-react';

const JOB_TYPES = ['Railing', 'Gate', 'Structural', 'Stairs', 'Custom Furniture', 'Other'];
const QUICK_STATUSES = ['Estimating', 'In Production', 'Ready to Install', 'Complete'];

export default function FirstJobStep({ data, update }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Add your first job</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Let's get a real job in the system. This is how everything connects.
        </p>
      </div>

      <div className="space-y-4">
        {/* Job name */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Job name</Label>
          <Input
            value={data.job_name || ''}
            onChange={(e) => update({ job_name: e.target.value })}
            placeholder="Smith Residence Stair Rail"
            className="h-10"
          />
        </div>

        {/* Customer name */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Customer name</Label>
          <Input
            value={data.customer_name || ''}
            onChange={(e) => update({ customer_name: e.target.value })}
            placeholder="John Smith"
            className="h-10"
          />
        </div>

        {/* Job type + Quick status side by side */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Job type</Label>
            <Select
              value={data.job_type || ''}
              onValueChange={(v) => update({ job_type: v })}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {JOB_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Quick status</Label>
            <Select
              value={data.quick_status || ''}
              onValueChange={(v) => update({ quick_status: v })}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Current status" />
              </SelectTrigger>
              <SelectContent>
                {QUICK_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Estimated due date */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Estimated due date</Label>
          <Input
            type="date"
            value={data.estimated_due_date || ''}
            onChange={(e) => update({ estimated_due_date: e.target.value })}
            className="h-10"
          />
        </div>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
        <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          You can add materials, labor hours, and documents after setup.
        </p>
      </div>
    </div>
  );
}