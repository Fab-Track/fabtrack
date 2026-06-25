import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, Building2 } from 'lucide-react';

const TRADE_OPTIONS = [
  'Structural Steel',
  'Ornamental Iron',
  'Miscellaneous Metals',
  'Aluminum Fabrication',
  'Sheet Metal',
  'Mixed/Other',
];

const SIZE_OPTIONS = [
  'Solo operator',
  '2-5 employees',
  '6-15 employees',
  '16+ employees',
];

export default function ShopSetupStep({ data, update }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Set up your shop</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Tell us about your fabrication shop. This takes about 30 seconds.
        </p>
      </div>

      <div className="space-y-4">
        {/* Shop name */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
            Shop name
          </Label>
          <Input
            value={data.shop_name || ''}
            onChange={(e) => update({ shop_name: e.target.value })}
            placeholder="High Country Metal Works"
            className="h-10"
          />
        </div>

        {/* Primary trade */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Primary trade</Label>
          <Select
            value={data.primary_trade || ''}
            onValueChange={(v) => update({ primary_trade: v })}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Select your main trade" />
            </SelectTrigger>
            <SelectContent>
              {TRADE_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Shop size */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Shop size</Label>
          <Select
            value={data.shop_size || ''}
            onValueChange={(v) => update({ shop_size: v })}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="How many people work here?" />
            </SelectTrigger>
            <SelectContent>
              {SIZE_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Default hourly rate */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
            Default hourly labor rate
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={data.default_hourly_rate ?? ''}
              onChange={(e) => update({ default_hourly_rate: e.target.value === '' ? null : parseFloat(e.target.value) })}
              placeholder="75.00"
              className="h-10 pl-7"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">/hr</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Pre-populates labor costs on your job estimates. You can change it anytime.
          </p>
        </div>
      </div>
    </div>
  );
}