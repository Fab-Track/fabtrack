import React from "react";
import { money } from "@/lib/costGroups";
import SignBlock from "./SignBlock";

const COLS = "2.4fr 1.3fr 0.7fr 1fr";
const th = "text-[11px] font-bold uppercase tracking-wider text-muted-foreground";

function TotRow({ label, value, cls = "" }) {
  return <div className={`flex justify-between py-0.5 text-sm ${cls}`}><span>{label}</span><span className="font-mono">{value}</span></div>;
}

// Single customer layout used by the Customer view toggle, the share page and (as data) the PDF.
export default function CustomerEstimateDoc({ doc, onSign, preview, pending, error }) {
  return (
    <div className="space-y-4 max-w-4xl mx-auto w-full">
      <div className="bg-card border rounded-xl p-6 md:p-7">
        <div className="flex justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold">{doc.business.name}</h2>
            {doc.business.address && <p className="text-sm text-muted-foreground">{doc.business.address}</p>}
          </div>
          <div className="text-right text-sm font-mono"><p>{doc.estimate_number}</p><p className="text-muted-foreground">Valid {doc.valid_days} days</p></div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <div style={{ minWidth: 560 }}>
            <div className="grid gap-3 px-3 py-2 bg-muted/50 border-b" style={{ gridTemplateColumns: COLS }}>
              <span className={th}>Description</span><span className={th}>Install location</span>
              <span className={`${th} text-right`}>Qty</span><span className={`${th} text-right`}>Amount</span>
            </div>
            {doc.lines.map((l, i) => (
              <div key={i} className="grid gap-3 px-3 py-3 border-b text-sm items-start" style={{ gridTemplateColumns: COLS }}>
                <div>
                  <p className="font-bold">{l.name}{l.color ? ` — ${l.color}` : ""}</p>
                  {l.description && <p className="text-muted-foreground text-[13px]">{l.description}</p>}
                </div>
                <span>{l.location || "—"}</span>
                <span className="text-right font-mono">{l.qty} {l.unit}</span>
                <span className="text-right font-mono font-bold">{money(l.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5"><SignBlock doc={doc} onSign={onSign} preview={preview} pending={pending} error={error} /></div>
      </div>

      <div className="bg-card border rounded-xl p-5 w-full sm:w-[380px] ml-auto">
        <TotRow label="Subtotal" value={money(doc.subtotal)} cls="text-base" />
        <div className="border-t my-2" />
        <div className="flex justify-between items-baseline py-1"><span className="font-bold">Total</span><span className="font-mono text-3xl font-bold">{money(doc.total)}</span></div>
        <TotRow label={`${doc.deposit_pct}% deposit to schedule`} value={money(doc.deposit)} cls="text-muted-foreground" />
        <TotRow label={`Balance on completion · ${doc.terms}`} value={money(doc.balance)} cls="text-muted-foreground" />
      </div>
    </div>
  );
}