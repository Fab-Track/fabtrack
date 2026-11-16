import React from "react";

const cap = "text-[11px] font-bold uppercase tracking-wider text-muted-foreground";
const h1 = (x) => `${Math.round((Number(x) || 0) * 100) / 100}`;
const per = (v, qty) => (qty > 0 ? Math.round((v / qty) * 100) / 100 : 0);

const Row = ({ label, value, bold }) => (
  <div className={`flex justify-between text-sm ${bold ? "font-bold" : ""}`}>
    <span>{label}</span>
    <span className="font-mono">{value}</span>
  </div>
);

export default function HoursCard({ qty, unit, hours, crew }) {
  const fab = hours?.fabrication || 0;
  const inst = hours?.install || 0;
  const days = hours?.installDays || 0;
  const crewHours = Math.round(inst * (Number(crew) || 0) * 100) / 100;

  return (
    <div className="bg-card border rounded-xl p-5 space-y-2">
      <h4 className={cap}>Labor hours at {qty} {unit}</h4>
      <p className="text-xs text-muted-foreground">Hours and days are derived from the rules under Labor &amp; finish.</p>
      <Row label="Fabrication" value={`${h1(fab)} hrs`} />
      <Row label="Install (elapsed)" value={`${h1(inst)} hrs × ${Number(crew) || 0} crew`} />
      <Row label="Install days" value={`${days} ${days === 1 ? "day" : "days"}`} />
      <div className="border-t pt-2">
        <Row label="Shop labor hours" value={`${h1(fab + crewHours)} hrs`} bold />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Per {unit}</span>
        <span className="font-mono">{h1(per(fab + crewHours, qty))} hrs</span>
      </div>
    </div>
  );
}