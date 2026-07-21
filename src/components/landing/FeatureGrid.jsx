import React from "react";
import { FileText, KanbanSquare, CalendarDays, Timer, DollarSign, Receipt } from "lucide-react";

const FEATURES = [
  {
    icon: FileText,
    title: "Fast, Accurate Estimates",
    desc: "Build quotes from your own service catalog with real material and labor costs baked in — send for e-signature in minutes.",
  },
  {
    icon: KanbanSquare,
    title: "Visual Job Boards",
    desc: "See every job move from lead to install on sales, shop, and billing pipelines. No more whiteboards or lost sticky notes.",
  },
  {
    icon: CalendarDays,
    title: "Production Scheduling",
    desc: "Plan fabrication phases, promised install dates, and crew assignments so nothing slips through the cracks.",
  },
  {
    icon: Timer,
    title: "Shop-Floor Time Tracking",
    desc: "Your crew clocks in and out by job and work center from their phone. Payroll-ready timesheets, automatically.",
  },
  {
    icon: DollarSign,
    title: "Real Job Costing",
    desc: "Know your actual margin on every job — estimated vs. actual hours and costs, tracked as the work happens.",
  },
  {
    icon: Receipt,
    title: "Invoicing & Payments",
    desc: "Turn approved estimates into deposit, progress, and final invoices. Get paid online with card or ACH.",
  },
];

export default function FeatureGrid() {
  return (
    <section className="bg-background py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Everything Your Shop Needs. Nothing It Doesn't.</h2>
          <p className="mt-3 text-muted-foreground text-lg max-w-2xl mx-auto">
            Purpose-built for metal fabricators, welders, and custom builders — not generic project software.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(f => (
            <div key={f.title} className="rounded-2xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded-xl bg-warning/15 flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-warning" />
              </div>
              <h3 className="font-semibold text-lg text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}