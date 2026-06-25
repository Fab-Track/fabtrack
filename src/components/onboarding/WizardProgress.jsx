import React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

const STEPS = ['Shop Setup', 'First Job', 'Invite Team'];

export default function WizardProgress({ currentStep }) {
  // currentStep: 0, 1, 2 for the three form steps; 3 = completion
  const stepIndex = Math.min(currentStep, 2);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            {/* Circle + label */}
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors',
                  i < stepIndex && 'bg-primary border-primary text-primary-foreground',
                  i === stepIndex && 'bg-primary border-primary text-primary-foreground ring-4 ring-primary/15',
                  i > stepIndex && 'bg-card border-border text-muted-foreground'
                )}
              >
                {i < stepIndex ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  'text-[11px] font-medium whitespace-nowrap',
                  i === stepIndex ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {label}
              </span>
            </div>
            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div className={cn(
                'h-0.5 flex-1 mx-2 transition-colors',
                i < stepIndex ? 'bg-primary' : 'bg-border'
              )} />
            )}
          </div>
        ))}
      </div>
      <p className="text-center text-xs text-muted-foreground mt-1">
        Step {stepIndex + 1} of {STEPS.length}
      </p>
    </div>
  );
}