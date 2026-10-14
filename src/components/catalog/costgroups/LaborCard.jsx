import React from "react";
import { Input } from "@/components/ui/input";
import { money } from "@/lib/costGroups";

const n1 = (x) => (Math.round(x * 100) / 100).toString();

function Rule({ value, field, onChange, onCommit, prefix = "", suffix }) {
  return (
    <span className="inline-flex items-center gap-1 font-mono text-xs">
      {prefix}
      <Input type="number" step="any" className="h-7 w-20 text-xs" value={value ?? ""} onChange={(e) => onChange(field, e.target.value)} onBlur={() => onCommit(field)} />
      {suffix}
    </span>
  );
}

export default function LaborCard({ rules, setRule, commit, calc, unit, rates, hoursPerDay }) {
  const th = "px-4 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground";
  const td = "px-4 py-3 align-middle";
  const rp = { onChange: setRule, onCommit: commit };
  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      <h3 className="text-lg font-bold p-5">Labor &amp; finish</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40"><tr><th className={th}>Cost</th><th className={th}>Rule for this style</th><th className={th}>Calculation</th><th className={`${th} text-right`}>Cost</th></tr></thead>
          <tbody>
            <tr className="border-t">
              <td className={`${td} font-bold`}>Fabrication</td>
              <td className={td}><Rule field="fab" value={rules.fab} {...rp} suffix={`hr / 10 ${unit}`} /></td>
              <td className={`${td} text-muted-foreground`}>{n1(calc.fabHrs)} hrs × {money(rates.fab, 0)}/hr</td>
              <td className={`${td} text-right font-bold font-mono`}>{money(calc.fab)}</td>
            </tr>
            <tr className="border-t">
              <td className={`${td} font-bold`}>Powder coat</td>
              <td className={td}><Rule field="pc" value={rules.pc} {...rp} prefix="$" suffix={`/ ${unit}`} /></td>
              <td className={`${td} text-muted-foreground`}>{n1(calc.qty)} {unit} × {money(rules.pc || 0)}</td>
              <td className={`${td} text-right font-bold font-mono`}>{money(calc.pc)}</td>
            </tr>
            <tr className="border-t">
              <td className={`${td} font-bold`}>Install</td>
              <td className={td}>
                <div className="space-y-1">
                  <Rule field="inst" value={rules.inst} {...rp} suffix={`hr / 10 ${unit}`} />
                  <Rule field="crew" value={rules.crew} {...rp} prefix="crew of " />
                </div>
              </td>
              <td className={`${td} text-muted-foreground`}>{n1(calc.instHrs)} hrs × {rules.crew || 0} × {money(rates.install, 0)}/hr</td>
              <td className={`${td} text-right font-bold font-mono`}>{money(calc.install)}</td>
            </tr>
            <tr className="border-t">
              <td className={`${td} font-bold`}>Install days</td>
              <td className={`${td} font-mono text-xs`}>{hoursPerDay} hrs / day (Settings)</td>
              <td className={`${td} text-muted-foreground`}>{calc.days} {calc.days === 1 ? "day" : "days"} → sets trips for fuel on the estimate</td>
              <td className={`${td} text-right font-bold`}>—</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}