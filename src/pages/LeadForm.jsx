import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2 } from "lucide-react";

const JOB_TYPES = ["Fence", "Gate", "Railing", "Staircase", "Custom Structure", "Other"];

export default function LeadForm() {
  const [form, setForm] = useState({
    name: "", phone: "", email: "", address: "",
    project_type: "", description: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const f = (field, val) => setForm(p => ({ ...p, [field]: val }));

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await base44.functions.invoke("submitLead", form);
      setSubmitted(true);
    } catch (err) {
      setError("Something went wrong. Please try again or call us directly.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">We got your request!</h2>
          <p className="text-muted-foreground">Our team will be in touch within 1 business day to discuss your project.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight mb-1">Request a Quote</h1>
          <p className="text-sm text-muted-foreground">Tell us about your project and we'll get back to you quickly.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 bg-card border rounded-xl p-6 shadow-sm">
          <div>
            <Label className="text-xs">Full Name *</Label>
            <Input value={form.name} onChange={e => f("name", e.target.value)} placeholder="Jane Smith" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Phone *</Label>
              <Input value={form.phone} onChange={e => f("phone", e.target.value)} placeholder="(555) 123-4567" required />
            </div>
            <div>
              <Label className="text-xs">Email *</Label>
              <Input type="email" value={form.email} onChange={e => f("email", e.target.value)} placeholder="jane@email.com" required />
            </div>
          </div>
          <div>
            <Label className="text-xs">Project Address</Label>
            <Input value={form.address} onChange={e => f("address", e.target.value)} placeholder="123 Main St, City, State" />
          </div>
          <div>
            <Label className="text-xs">Type of Project *</Label>
            <Select value={form.project_type} onValueChange={v => f("project_type", v)} required>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {JOB_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Project Description *</Label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={e => f("description", e.target.value)}
              placeholder="Describe what you're looking for, dimensions, style preferences, timeline…"
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Submitting…" : "Submit Quote Request"}
          </Button>
        </form>
      </div>
    </div>
  );
}