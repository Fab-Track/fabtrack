import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";

const CHECKS = ["Built by fabricators, for fabricators", "Estimate to invoice in one system", "Your whole crew on the same page"];

export default function LandingHero({ onRequestAccess }) {
  return (
    <section className="relative bg-sidebar overflow-hidden">
      <img
        src="https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=1800&q=70"
        alt="Metal fabrication shop floor"
        className="absolute inset-0 w-full h-full object-cover opacity-25"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-sidebar/60 via-sidebar/80 to-sidebar" />
      <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-24 text-center">
        <span className="inline-block rounded-full border border-sidebar-primary/40 bg-sidebar-primary/10 text-sidebar-primary text-xs font-semibold tracking-widest uppercase px-4 py-1.5 mb-6">
          Shop Management Software
        </span>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white max-w-3xl mx-auto leading-tight">
          Run Your Fab Shop Like a <span className="text-sidebar-primary">Well-Oiled Machine</span>
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-sidebar-foreground max-w-2xl mx-auto">
          FabTrack takes custom fabrication shops from first estimate to final invoice —
          job boards, shop-floor time tracking, scheduling, and billing in one place.
        </p>
        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            size="lg"
            className="w-full sm:w-auto bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 font-semibold text-base px-8"
            onClick={onRequestAccess}
          >
            Request Access <ArrowRight className="w-4 h-4" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full sm:w-auto border-sidebar-foreground/30 bg-transparent text-white hover:bg-sidebar-accent hover:text-white text-base px-8"
            onClick={() => window.open("https://calendly.com", "_blank", "noopener,noreferrer")}
          >
            Schedule a Demo
          </Button>
        </div>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-x-8 gap-y-2">
          {CHECKS.map(c => (
            <span key={c} className="flex items-center gap-2 text-sm text-sidebar-foreground">
              <CheckCircle2 className="w-4 h-4 text-sidebar-primary shrink-0" /> {c}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}