import React from "react";
import { money } from "@/lib/costGroups";

const Row = ({ label, value, cls = "" }) => <div className={`flex justify-between py-0.5 text-sm ${cls}`}><span>{label}</span><span className="font-mono">{value}</span></div>;

export default function TotalsCard({ subtotal, adjustments, total, depositPct, terms, jobMin }) {
  const deposit = total * (depositPct / 100);
  return (
    <div className="bg-card border rounded-xl p-5">
      <Row label="Subtotal" value={money(subtotal)} cls="text-base" />
      {adjustments.map((a) => <Row key={a.label} label={a.label} value={a.value} cls="text-muted-foreground" />)}
      <div className="border-t my-2" />
      <div className="flex justify-between items-baseline py-1"><span className="font-bold">Total</span><span className="font-mono text-3xl font-bold">{money(total)}</span></div>
      <Row label={`${depositPct}% deposit to schedule`} value={money(deposit)} cls="text-muted-foreground" />
      <Row label={`Balance on completion · ${terms}`} value={money(total - deposit)} cls="text-muted-foreground" />
      {jobMin > 0 && total > 0 && total < jobMin && (
        <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">Total is under the <b>{money(jobMin, 0)} job minimum</b>.</p>
      )}
    </div>
  );
}