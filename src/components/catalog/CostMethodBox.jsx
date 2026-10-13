import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calcCostPerFoot, fmtMoney } from "@/lib/costItems";

const METHODS = [
  { id: "linear_foot", label: "By linear foot" },
  { id: "weight", label: "By weight" },
  { id: "unit", label: "By unit / sheet" },
];

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-semibold">{label}</Label>
      {children}
    </div>
  );
}

// "How is this item costed?" — 3-way toggle; only the selected method's fields show.
export default function CostMethodBox({ form, set }) {
  const num = (k) => parseFloat(form[k]) || 0;
  const method = form.cost_method;
  const stick = num("cost_per_stick");
  const stock = num("stock_length_ft");
  const calc = calcCostPerFoot({
    method, stock, stick, typedCostPerFoot: num("cost_per_foot"),
    weightPerFt: num("weight_per_ft"), pricePerLb: num("price_per_lb_override"),
  });

  return (
    <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
      <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">How is this item costed?</p>
      <div className="grid grid-cols-3 border rounded-lg overflow-hidden bg-background">
        {METHODS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => set("cost_method", m.id)}
            className={`py-2.5 text-sm font-semibold border-r last:border-r-0 ${method === m.id ? "bg-foreground text-background" : "hover:bg-muted"}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {method === "linear_foot" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Stock length (ft)">
              <Input type="number" step="any" className="font-mono" value={form.stock_length_ft} onChange={(e) => set("stock_length_ft", e.target.value)} />
            </Field>
            <Field label="Cost per stick">
              <Input type="number" step="any" className="font-mono" placeholder="$0.00" value={form.cost_per_stick} onChange={(e) => set("cost_per_stick", e.target.value)} />
            </Field>
          </div>
          {stick > 0 && stock > 0 ? (
            <p className="text-sm">
              Cost per ft = {fmtMoney(stick)} ÷ {stock} ft = <b className="font-mono">{fmtMoney(calc, 4)} / ft</b>. Enter what the supplier invoices; update it when prices change.
            </p>
          ) : (
            <Field label="Cost per ft (no stick price)">
              <Input type="number" step="any" className="font-mono" placeholder="$0.0000" value={form.cost_per_foot} onChange={(e) => set("cost_per_foot", e.target.value)} />
            </Field>
          )}
        </>
      )}

      {method === "weight" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Weight per ft (lb)">
              <Input type="number" step="any" className="font-mono" value={form.weight_per_ft} onChange={(e) => set("weight_per_ft", e.target.value)} />
            </Field>
            <Field label="Price per lb">
              <Input type="number" step="any" className="font-mono" placeholder="$0.00" value={form.price_per_lb_override} onChange={(e) => set("price_per_lb_override", e.target.value)} />
            </Field>
          </div>
          <p className="text-sm">
            Cost per ft = {num("weight_per_ft")} lb × {fmtMoney(num("price_per_lb_override"), 4)} = <b className="font-mono">{fmtMoney(calc, 4)} / ft</b>.
          </p>
        </>
      )}

      {method === "unit" && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Unit">
            <Input placeholder="EA, Sheet, SF" value={form.unit} onChange={(e) => set("unit", e.target.value)} />
          </Field>
          <Field label="Cost per unit">
            <Input type="number" step="any" className="font-mono" placeholder="$0.00" value={form.cost_per_unit} onChange={(e) => set("cost_per_unit", e.target.value)} />
          </Field>
        </div>
      )}
    </div>
  );
}