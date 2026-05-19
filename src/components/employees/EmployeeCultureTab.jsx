import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, Coffee } from "lucide-react";
import { differenceInMonths, parseISO } from "date-fns";

function tenure(startDate) {
  if (!startDate) return null;
  const months = differenceInMonths(new Date(), parseISO(startDate));
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years === 0) return `${rem} month${rem !== 1 ? "s" : ""}`;
  if (rem === 0) return `${years} year${years !== 1 ? "s" : ""}`;
  return `${years} year${years !== 1 ? "s" : ""}, ${rem} month${rem !== 1 ? "s" : ""}`;
}

const fields = [
  { key: "favorite_energy_drink", label: "Favorite Energy Drink", multi: false },
  { key: "favorite_snack", label: "Favorite Snack", multi: false },
  { key: "favorite_restaurant", label: "Favorite Restaurant", multi: false },
  { key: "favorite_music_genre", label: "Favorite Music Genre", multi: false },
  { key: "favorite_sports_team", label: "Favorite Sports Team", multi: false },
  { key: "goto_lunch_order", label: "Go-to Lunch Order", multi: false },
  { key: "hobbies", label: "Hobbies / What I Do Outside Work", multi: true },
  { key: "work_motivation", label: "What Motivates Me at Work", multi: true },
  { key: "fun_fact_self", label: "Something Most People Don't Know About Me", multi: true },
  { key: "bucket_list_item", label: "Bucket List Item", multi: true },
];

export default function EmployeeCultureTab({ employee, canEdit, isOwnerOrManager }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(
    Object.fromEntries([...fields.map(f => [f.key, employee[f.key] || ""]), ["fun_fact_team", employee.fun_fact_team || ""]])
  );
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Employee.update(employee.id, form);
    qc.invalidateQueries({ queryKey: ["employee", employee.id] });
    setSaving(false);
  };

  const tenureStr = tenure(employee.start_date);

  return (
    <div className="space-y-5">
      {tenureStr && (
        <div className="flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-lg px-4 py-3">
          <Coffee className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium">{employee.preferred_name || employee.name.split(" ")[0]} has been with High Country Metal Works for <span className="text-accent font-bold">{tenureStr}</span></span>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {fields.map(f => (
          <div key={f.key} className={`space-y-1 ${f.multi ? "md:col-span-2" : ""}`}>
            <Label className="text-xs font-semibold">{f.label}</Label>
            {f.multi
              ? <Textarea rows={2} value={form[f.key]} onChange={e => set(f.key, e.target.value)} disabled={!canEdit} />
              : <Input value={form[f.key]} onChange={e => set(f.key, e.target.value)} disabled={!canEdit} />
            }
          </div>
        ))}

        {isOwnerOrManager && (
          <div className="space-y-1 md:col-span-2">
            <Label className="text-xs font-semibold text-accent">Fun Fact (Added by Team / Owner)</Label>
            <Textarea rows={2} value={form.fun_fact_team} onChange={e => set("fun_fact_team", e.target.value)} placeholder="Something memorable about this person..." />
          </div>
        )}
      </div>

      {canEdit && (
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-1.5" />{saving ? "Saving..." : "Save Culture Info"}
        </Button>
      )}
    </div>
  );
}