import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

const WORK_CENTERS = ["Cut", "Fit", "Weld", "Grind"];

const CRITERIA = [
  { key: "weld_quality", label: "Weld Quality", centers: ["Weld"] },
  { key: "alignment_squareness", label: "Alignment & Squareness", centers: ["Fit", "Weld"] },
  { key: "baseplate_centering", label: "Baseplate Centering", centers: ["Fit", "Weld"] },
  { key: "cut_list_adherence", label: "Cut List Adherence", centers: ["Cut"] },
  { key: "grind_finish_quality", label: "Grind / Finish Quality", centers: ["Grind", "Weld"] },
  { key: "material_waste", label: "Material Waste (5=minimal)", centers: ["Cut", "Fit", "Weld", "Grind"] },
];

function computeScore(fields, workCenter) {
  const applicable = CRITERIA.filter(c => c.centers.includes(workCenter));
  if (!applicable.length) return 0;
  const sum = applicable.reduce((s, c) => s + (fields[c.key] || 3), 0);
  return Math.round((sum / (applicable.length * 5)) * 100);
}

export default function QCInspectionForm({ jobs, employees, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    job_id: "", employee_id: "", work_center: "Weld",
    weld_quality: 3, alignment_squareness: 3, baseplate_centering: 3,
    cut_list_adherence: 3, grind_finish_quality: 3, material_waste: 3,
    passed_first_time: true, rework_required: false, rework_notes: "", inspector_notes: "",
  });

  const applicableCriteria = CRITERIA.filter(c => c.centers.includes(form.work_center));
  const qualityScore = computeScore(form, form.work_center);

  const save = useMutation({
    mutationFn: () => {
      const job = jobs.find(j => j.id === form.job_id);
      const emp = employees.find(e => e.id === form.employee_id);
      return base44.entities.QCInspection.create({
        ...form,
        job_number: job?.job_number,
        employee_name: emp?.name,
        quality_score: qualityScore,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries(["qcInspections"]);
      onClose?.();
    },
  });

  function ScoreSlider({ field, label }) {
    const val = form[field] || 3;
    const color = val >= 4 ? "text-emerald-600" : val >= 3 ? "text-amber-600" : "text-destructive";
    return (
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <Label className="text-sm">{label}</Label>
          <span className={`text-sm font-bold ${color}`}>{val}/5</span>
        </div>
        <Slider
          min={1} max={5} step={1}
          value={[val]}
          onValueChange={([v]) => setForm(f => ({ ...f, [field]: v }))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Poor</span><span>Excellent</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 py-2">
      {/* Job + Employee + Work Center */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label>Job *</Label>
          <Select value={form.job_id} onValueChange={v => setForm(f => ({ ...f, job_id: v }))}>
            <SelectTrigger><SelectValue placeholder="Select job…" /></SelectTrigger>
            <SelectContent>
              {jobs.filter(j => !["Estimate", "Invoiced"].includes(j.status)).map(j => (
                <SelectItem key={j.id} value={j.id} className="text-xs">{j.job_number} – {j.job_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Employee *</Label>
          <Select value={form.employee_id} onValueChange={v => setForm(f => ({ ...f, employee_id: v }))}>
            <SelectTrigger><SelectValue placeholder="Select employee…" /></SelectTrigger>
            <SelectContent>
              {employees.filter(e => e.is_active !== false).map(e => (
                <SelectItem key={e.id} value={e.id}>{e.name} ({e.role})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Work Center *</Label>
          <Select value={form.work_center} onValueChange={v => setForm(f => ({ ...f, work_center: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{WORK_CENTERS.map(wc => <SelectItem key={wc} value={wc}>{wc}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {/* Score preview */}
      <div className="rounded-xl border p-4 text-center bg-muted/30">
        <p className="text-xs text-muted-foreground mb-1">Projected Quality Score</p>
        <p className={`text-4xl font-black ${qualityScore >= 80 ? "text-emerald-600" : qualityScore >= 60 ? "text-amber-600" : "text-destructive"}`}>
          {qualityScore}
        </p>
        <p className="text-xs text-muted-foreground">out of 100</p>
      </div>

      {/* Sliders */}
      <div className="space-y-4">
        {applicableCriteria.map(c => (
          <ScoreSlider key={c.key} field={c.key} label={c.label} />
        ))}
      </div>

      {/* Pass/Rework */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Passed First Time?</Label>
          <Switch
            checked={form.passed_first_time}
            onCheckedChange={v => setForm(f => ({ ...f, passed_first_time: v, rework_required: !v }))}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label>Rework Required?</Label>
          <Switch
            checked={form.rework_required}
            onCheckedChange={v => setForm(f => ({ ...f, rework_required: v }))}
          />
        </div>
        {form.rework_required && (
          <Textarea
            rows={2}
            placeholder="Describe rework needed…"
            value={form.rework_notes}
            onChange={e => setForm(f => ({ ...f, rework_notes: e.target.value }))}
          />
        )}
        <Textarea
          rows={2}
          placeholder="Inspector notes (optional)…"
          value={form.inspector_notes}
          onChange={e => setForm(f => ({ ...f, inspector_notes: e.target.value }))}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onClose && <Button variant="outline" onClick={onClose}>Cancel</Button>}
        <Button
          onClick={() => save.mutate()}
          disabled={!form.job_id || !form.employee_id || save.isPending}
        >
          {save.isPending ? "Saving…" : "Submit Inspection"}
        </Button>
      </div>
    </div>
  );
}