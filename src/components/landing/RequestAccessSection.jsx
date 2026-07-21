import React, { useState, forwardRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, CheckCircle2 } from "lucide-react";

const RequestAccessSection = forwardRef(function RequestAccessSection(_, ref) {
  const [form, setForm] = useState({ first_name: "", last_name: "", business_name: "", email: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  function update(field, val) {
    setForm(p => ({ ...p, [field]: val }));
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
    <section ref={ref} className="bg-background py-20 px-6">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-foreground">Ready to Ditch the Spreadsheets?</h2>
          <p className="mt-3 text-muted-foreground">
            Tell us about your shop and we'll reach out to get you set up.
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          {submitted ? (
            <div className="text-center space-y-3 py-6">
              <CheckCircle2 className="w-12 h-12 text-success mx-auto" />
              <h3 className="text-lg font-semibold">Request Received!</h3>
              <p className="text-sm text-muted-foreground">
                Thanks for your interest in FabTrack. We'll be in touch soon.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">First Name *</Label>
                  <Input className="h-9" value={form.first_name} onChange={e => update("first_name", e.target.value)} placeholder="Jane" />
                </div>
                <div>
                  <Label className="text-xs">Last Name *</Label>
                  <Input className="h-9" value={form.last_name} onChange={e => update("last_name", e.target.value)} placeholder="Smith" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Business Name *</Label>
                <Input className="h-9" value={form.business_name} onChange={e => update("business_name", e.target.value)} placeholder="Smith Fabrication Co." />
              </div>
              <div>
                <Label className="text-xs">Email *</Label>
                <Input className="h-9" type="email" value={form.email} onChange={e => update("email", e.target.value)} placeholder="jane@smithfab.com" />
              </div>
              <div>
                <Label className="text-xs">Phone <span className="text-muted-foreground">(optional)</span></Label>
                <Input className="h-9" value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="(555) 123-4567" />
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
                ) : "Request Access"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
});

export default RequestAccessSection;