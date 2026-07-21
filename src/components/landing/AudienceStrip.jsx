import React from "react";

const TRADES = [
  "Ornamental Iron", "Structural Steel", "Custom Railings", "Staircases",
  "Gates & Fencing", "Aluminum Fabrication", "Sheet Metal", "Custom Woodwork",
];

export default function AudienceStrip() {
  return (
    <section className="bg-background border-y py-10 px-6">
      <div className="max-w-6xl mx-auto text-center">
        <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-5">
          Built for custom trades
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {TRADES.map(t => (
            <span key={t} className="rounded-full border bg-card px-4 py-1.5 text-sm font-medium text-foreground">
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}