import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, DollarSign, Loader2 } from "lucide-react";

export default function ShopLogPublicForm() {
  const { token } = useParams();
  const [jobInfo, setJobInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    entry_date: new Date().toISOString().slice(0, 10),
    shop_labor_hours: "",
    install_labor_hours: "",
    materials_cost: "",
    powder_coat_cost: "",
    draw_measure_hours: "",
    fuel_cost: "",
    submitted_by_name: ""
  });

  // Resolve job info on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/functions/submitShopLogEntry`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ share_token: token, _probe: true })
        });
        const data = await res.json();
        if (cancelled) return;
        if (data.error) {
          setError(data.error);
        } else {
          setJobInfo({ name: data.job_name, number: data.job_number });
        }
      } catch {
        if (!cancelled) setError("Unable to reach server");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/functions/submitShopLogEntry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, share_token: token })
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setSuccess(true);
        setJobInfo({ name: data.job_name, number: data.job_number });
        // Clear numeric fields but keep date and name
        setForm(prev => ({
          ...prev,
          shop_labor_hours: "",
          install_labor_hours: "",
          materials_cost: "",
          powder_coat_cost: "",
          draw_measure_hours: "",
          fuel_cost: ""
        }));
      }
    } catch {
      setError("Unable to submit entry");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-gray-900">Shop Log Entry</h1>
          {jobInfo && (
            <div className="mt-1">
              <p className="text-sm font-medium text-gray-700">{jobInfo.name}</p>
              <p className="text-xs text-gray-500 font-mono">{jobInfo.number}</p>
            </div>
          )}
        </div>

        {success && (
          <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 p-3 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-sm text-emerald-800">Entry saved! You can log another day below.</p>
          </div>
        )}

        {error && !loading && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div>
                <Label htmlFor="date" className="text-xs">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={form.entry_date}
                  onChange={(e) => handleChange("entry_date", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="name" className="text-xs">Submitted By</Label>
                <Input
                  id="name"
                  value={form.submitted_by_name}
                  onChange={(e) => handleChange("submitted_by_name", e.target.value)}
                  placeholder="Your name"
                />
              </div>
            </CardContent>
          </Card>

          {/* Hours section */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-gray-400" /> Hours
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <NumInput label="Shop Labor (hrs)" value={form.shop_labor_hours} onChange={(v) => handleChange("shop_labor_hours", v)} />
              <NumInput label="Install Labor (hrs)" value={form.install_labor_hours} onChange={(v) => handleChange("install_labor_hours", v)} />
              <NumInput label="Draw / Measure (hrs)" value={form.draw_measure_hours} onChange={(v) => handleChange("draw_measure_hours", v)} />
            </CardContent>
          </Card>

          {/* Dollars section */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-gray-400" /> Costs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <NumInput label="Materials ($)" value={form.materials_cost} onChange={(v) => handleChange("materials_cost", v)} />
              <NumInput label="Powder Coat ($)" value={form.powder_coat_cost} onChange={(v) => handleChange("powder_coat_cost", v)} />
              <NumInput label="Fuel ($)" value={form.fuel_cost} onChange={(v) => handleChange("fuel_cost", v)} />
            </CardContent>
          </Card>

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Entry"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function NumInput({ label, value, onChange }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        step="0.01"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
      />
    </div>
  );
}