import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, CheckCircle2, Wrench, FileText, ClipboardList, Receipt } from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();
  const formRef = useRef(null);

  const [form, setForm] = useState({ first_name: "", last_name: "", business_name: "", email: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  function update(field, val) {
    setForm(p => ({ ...p, [field]: val }));
  }

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.first_name || !form.last_name || !form.business_name || !form.email) {
      setError("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      await base44.functions.invoke("submitLeadRequest", {
        ...form,
        submitted_at: new Date().toISOString(),
      });
      setSubmitted(true);
    } catch (err) {
      setError("Something went wrong. Please try again or email us directly.");
    }
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Wrench className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg tracking-wide text-foreground">FABTRACK</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
          Sign In
        </Button>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-6 max-w-4xl mx-auto w-full">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground">
          Shop Management Built for Fabrication Shops
        </h1>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl">
          Estimates, job tracking, scheduling, and billing — all in one system.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <Button className="w-full sm:w-auto" onClick={() => navigate("/login")}>
            Sign In
          </Button>
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => window.open("https://calendly.com", "_blank", "noopener,noreferrer")}
          >
            Schedule a Demo
          </Button>
          <Button variant="ghost" className="w-full sm:w-auto" onClick={scrollToForm}>
            Request Access
          </Button>
        </div>
      </section>

      {/* Feature row */}
      <section className="px-6 py-6 max-w-4xl mx-auto w-full">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="flex flex-col items-center text-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">Estimates &amp; Quotes</span>
          </div>
          <div className="flex flex-col items-center text-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">Job Tracking</span>
          </div>
          <div className="flex flex-col items-center text-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">Invoicing &amp; Billing</span>
          </div>
        </div>
      </section>

      {/* Request Access form */}
      <section ref={formRef} className="px-6 py-6 max-w-md mx-auto w-full">
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          {submitted ? (
            <div className="text-center space-y-3 py-6">
              <CheckCircle2 className="w-12 h-12 text-success mx-auto" />
              <h2 className="text-lg font-semibold">Request Received!</h2>
              <p className="text-sm text-muted-foreground">
                Thanks for your interest in FabTrack. We'll be in touch soon.
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-center mb-1">Request Access</h2>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Tell us about your shop and we'll reach out.
              </p>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">First Name *</Label>
                    <Input
                      className="h-9"
                      value={form.first_name}
                      onChange={e => update("first_name", e.target.value)}
                      placeholder="Jane"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Last Name *</Label>
                    <Input
                      className="h-9"
                      value={form.last_name}
                      onChange={e => update("last_name", e.target.value)}
                      placeholder="Smith"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Business Name *</Label>
                  <Input
                    className="h-9"
                    value={form.business_name}
                    onChange={e => update("business_name", e.target.value)}
                    placeholder="Smith Fabrication Co."
                  />
                </div>
                <div>
                  <Label className="text-xs">Email *</Label>
                  <Input
                    className="h-9"
                    type="email"
                    value={form.email}
                    onChange={e => update("email", e.target.value)}
                    placeholder="jane@smithfab.com"
                  />
                </div>
                <div>
                  <Label className="text-xs">Phone <span className="text-muted-foreground">(optional)</span></Label>
                  <Input
                    className="h-9"
                    value={form.phone}
                    onChange={e => update("phone", e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2 rounded-md bg-destructive/10 text-destructive px-3 py-2 text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting…
                    </span>
                  ) : "Submit Request"}
                </Button>
              </form>
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-6 text-center text-xs text-muted-foreground border-t">
        © {new Date().getFullYear()} FabTrack. All rights reserved.
      </footer>
    </div>
  );
}