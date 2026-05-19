import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle, AlertCircle } from "lucide-react";

const urlParams = new URLSearchParams(window.location.search);
const TOKEN = urlParams.get("token");

const TSHIRT_SIZES = ["XS","S","M","L","XL","XXL","XXXL"];

const SECTIONS = [
  { title: "Personal Information", fields: [
    { key: "preferred_name", label: "Preferred Name / Nickname" },
    { key: "date_of_birth", label: "Date of Birth", type: "date" },
    { key: "phone", label: "Personal Phone" },
    { key: "personal_email", label: "Personal Email", type: "email" },
    { key: "home_address", label: "Home Address" },
    { key: "emergency_contact_name", label: "Emergency Contact Name" },
    { key: "emergency_contact_phone", label: "Emergency Contact Phone" },
    { key: "emergency_contact_relationship", label: "Emergency Contact Relationship" },
  ]},
  { title: "Work Background", fields: [
    { key: "years_experience", label: "Years of Experience in the Trade", type: "number" },
    { key: "previous_employers", label: "Previous Employers (optional)", multi: true },
    { key: "certifications", label: "Certifications Held (e.g. OSHA 10, AWS)", multi: true },
  ]},
  { title: "About You — Culture", fields: [
    { key: "favorite_energy_drink", label: "Favorite Energy Drink" },
    { key: "favorite_snack", label: "Favorite Snack" },
    { key: "favorite_restaurant", label: "Favorite Restaurant" },
    { key: "favorite_music_genre", label: "Favorite Music Genre" },
    { key: "favorite_sports_team", label: "Favorite Sports Team" },
    { key: "goto_lunch_order", label: "Go-to Lunch Order" },
    { key: "hobbies", label: "Hobbies / What You Do Outside Work", multi: true },
    { key: "work_motivation", label: "What Motivates You at Work", multi: true },
    { key: "fun_fact_self", label: "Something Most People Don't Know About You", multi: true },
    { key: "bucket_list_item", label: "A Bucket List Item", multi: true },
  ]},
];

export default function OnboardingSurveyPage() {
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({});
  const [tshirt_size, setTshirtSize] = useState("");
  const [has_drivers_license, setDriversLicense] = useState("");
  const [can_operate_forklift, setForklift] = useState("");
  const [can_operate_boom_lift, setBoomLift] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [signature, setSignature] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!TOKEN) { setError("Invalid survey link."); setLoading(false); return; }
    base44.entities.OnboardingSurvey.filter({ token: TOKEN }).then(rows => {
      const s = rows[0];
      if (!s) { setError("Survey not found."); setLoading(false); return; }
      if (s.is_completed) { setError("This survey has already been submitted."); setLoading(false); return; }
      if (s.expires_at && new Date(s.expires_at) < new Date()) { setError("This survey link has expired."); setLoading(false); return; }
      setSurvey(s);
      setLoading(false);
    });
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!confirmed || !signature.trim()) return;
    setSubmitting(true);

    const submittedData = {
      ...form,
      tshirt_size,
      has_drivers_license: has_drivers_license === "yes",
      can_operate_forklift: can_operate_forklift === "yes",
      can_operate_boom_lift: can_operate_boom_lift === "yes",
      signature,
    };

    // Update the employee record with all collected data
    await base44.entities.Employee.update(survey.employee_id, {
      ...submittedData,
      onboarding_completed: true,
      onboarding_submitted_at: new Date().toISOString(),
    });

    // Mark survey as completed
    await base44.entities.OnboardingSurvey.update(survey.id, {
      is_completed: true,
      submitted_at: new Date().toISOString(),
      submitted_data: submittedData,
    });

    setSubmitted(true);
    setSubmitting(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h2 className="text-lg font-bold mb-2">Survey Unavailable</h2>
        <p className="text-muted-foreground">{error}</p>
      </div>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">All Done, {survey.employee_name?.split(" ")[0]}!</h2>
        <p className="text-muted-foreground">Your onboarding information has been submitted. Welcome to the team at High Country Metal Works!</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-6 px-4 text-center">
        <h1 className="text-2xl font-bold">Welcome to High Country Metal Works</h1>
        <p className="mt-1 opacity-80">Onboarding Survey — {survey.employee_name}</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-4 md:p-8 space-y-8">
        {SECTIONS.map(section => (
          <div key={section.title} className="bg-card border rounded-xl p-5 space-y-4">
            <h2 className="font-bold text-lg border-b pb-2">{section.title}</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {section.fields.map(f => (
                <div key={f.key} className={`space-y-1 ${f.multi ? "md:col-span-2" : ""}`}>
                  <Label className="text-xs font-semibold">{f.label}</Label>
                  {f.multi
                    ? <Textarea rows={2} value={form[f.key] || ""} onChange={e => set(f.key, e.target.value)} />
                    : <Input type={f.type || "text"} value={form[f.key] || ""} onChange={e => set(f.key, e.target.value)} />
                  }
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* T-Shirt & Certifications section */}
        <div className="bg-card border rounded-xl p-5 space-y-4">
          <h2 className="font-bold text-lg border-b pb-2">Sizing & Equipment</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">T-Shirt Size</Label>
              <Select value={tshirt_size} onValueChange={setTshirtSize}>
                <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                <SelectContent>{TSHIRT_SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Driver's License?</Label>
              <Select value={has_drivers_license} onValueChange={setDriversLicense}>
                <SelectTrigger><SelectValue placeholder="Yes / No" /></SelectTrigger>
                <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Can Operate Forklift?</Label>
              <Select value={can_operate_forklift} onValueChange={setForklift}>
                <SelectTrigger><SelectValue placeholder="Yes / No" /></SelectTrigger>
                <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Can Operate Telehandler / Boom Lift?</Label>
              <Select value={can_operate_boom_lift} onValueChange={setBoomLift}>
                <SelectTrigger><SelectValue placeholder="Yes / No" /></SelectTrigger>
                <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Acknowledgment */}
        <div className="bg-card border rounded-xl p-5 space-y-4">
          <h2 className="font-bold text-lg border-b pb-2">Acknowledgment</h2>
          <div className="flex items-start gap-3">
            <Checkbox id="confirm" checked={confirmed} onCheckedChange={setConfirmed} className="mt-0.5" />
            <label htmlFor="confirm" className="text-sm cursor-pointer">I confirm the information above is accurate and complete to the best of my knowledge.</label>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Type Your Full Name as Signature *</Label>
            <Input value={signature} onChange={e => setSignature(e.target.value)} placeholder="Full legal name" required />
          </div>
          <Button type="submit" className="w-full" disabled={!confirmed || !signature.trim() || submitting}>
            {submitting ? "Submitting..." : "Submit Onboarding Survey"}
          </Button>
        </div>
      </form>
    </div>
  );
}