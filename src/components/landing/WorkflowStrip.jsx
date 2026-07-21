import React from "react";
import { ArrowRight } from "lucide-react";

const STEPS = [
  { num: "01", title: "Quote It", desc: "Build the estimate and get customer sign-off online." },
  { num: "02", title: "Build It", desc: "Track the job through the shop with live time tracking." },
  { num: "03", title: "Install It", desc: "Schedule crews and hit your promised install dates." },
  { num: "04", title: "Bill It", desc: "Invoice from the approved scope and get paid faster." },
];

export default function WorkflowStrip() {
  return (
    <section className="bg-sidebar py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">One Workflow, Start to Finish</h2>
          <p className="mt-3 text-sidebar-foreground text-lg">
            Every job follows the same path — FabTrack keeps it moving.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((s, i) => (
            <div key={s.num} className="relative rounded-2xl border border-sidebar-border bg-sidebar-accent p-6">
              <span className="text-sidebar-primary font-mono font-bold text-sm">{s.num}</span>
              <h3 className="mt-2 font-semibold text-lg text-white">{s.title}</h3>
              <p className="mt-1.5 text-sm text-sidebar-foreground leading-relaxed">{s.desc}</p>
              {i < STEPS.length - 1 && (
                <ArrowRight className="hidden lg:block absolute -right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sidebar-primary z-10" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}