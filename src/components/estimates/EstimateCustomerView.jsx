import React, { useState } from "react";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Lock } from "lucide-react";
import { formatPhoneDisplay } from "@/lib/phoneFormat";
import ComponentsSpec from "./ComponentsSpec";

const STATUS_COLORS = {
  Draft: "bg-muted text-muted-foreground",
  Sent: "bg-blue-100 text-blue-800",
  Approved: "bg-emerald-100 text-emerald-800",
  Rejected: "bg-red-100 text-red-800",
};

const DEFAULT_CONTRACT = `TERMS AND CONDITIONS

By signing this estimate, you ("Customer") agree to authorize High Country Metal Works ("Company") to proceed with the scope of work described above at the agreed-upon price.

1. SCOPE OF WORK — Work is limited to the items described in this estimate. Any changes must be submitted as a written Change Order and approved by both parties before additional work begins.

2. PAYMENT TERMS — A 50% deposit is due before fabrication begins. The remaining 50% balance is due upon project completion, before or at the time of installation.

3. MATERIALS — All materials will be sourced and fabricated by the Company. Substitutions may occur if materials are unavailable, with equivalent quality maintained.

4. TIMELINE — Project timelines are estimates only. The Company is not liable for delays caused by supply chain issues, weather, or circumstances outside our control.

5. WARRANTIES — The Company warrants all workmanship for one (1) year from the date of installation. Material warranties are subject to manufacturer terms.

6. APPROVAL — Your digital signature below constitutes a legally binding agreement to the terms above and authorizes the Company to begin work upon receipt of the required deposit.`;

export default function EstimateCustomerView({ estimate, job, customer, businessInfo, onApprove, onRequestChanges, contractText }) {
  const [showAcceptFlow, setShowAcceptFlow] = useState(false);
  const [typedName, setTypedName] = useState("");

  const lines = estimate?.line_items || [];
  const viewMode = estimate?.view_mode || "summary";

  const subtotal = lines.reduce((s, l) => s + (l.total || 0), 0);
  const discountPct = estimate?.discount_percent || 0;
  const discountAmt = subtotal * (discountPct / 100);
  const afterDiscount = subtotal - discountAmt;
  const markupAmt = afterDiscount * ((estimate?.markup_percent || 0) / 100);
  const afterMarkup = afterDiscount + markupAmt;
  const overheadAmt = afterMarkup * ((estimate?.overhead_percent || 0) / 100);
  const afterOverhead = afterMarkup + overheadAmt;
  const taxAmt = afterOverhead * ((estimate?.tax_percent || 0) / 100);
  const total = afterOverhead + taxAmt;

  const contractBody = contractText || DEFAULT_CONTRACT;

  function handleSubmit() {
    if (!typedName.trim()) return;
    onApprove(typedName.trim());
  }

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-primary px-8 py-6 text-primary-foreground">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">High Country Metal Works</h1>
            {businessInfo?.address && <p className="text-sm opacity-80 mt-0.5">{businessInfo.address}</p>}
            {businessInfo?.phone && <p className="text-sm opacity-80">{businessInfo.phone}</p>}
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold opacity-80">ESTIMATE</p>
            <p className="text-lg font-bold">{estimate?.estimate_number || "EST-DRAFT"}</p>
            <Badge className={`mt-1 ${STATUS_COLORS[estimate?.status] || ""}`}>{estimate?.status || "Draft"}</Badge>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-6">
        {/* Bill To + Dates */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Bill To</p>
            <p className="font-semibold">{customer?.name || job?.customer_name || "—"}</p>
            {customer?.email && <p className="text-sm text-muted-foreground">{customer.email}</p>}
            {customer?.phone && <p className="text-sm text-muted-foreground">{formatPhoneDisplay(customer.phone)}</p>}
            {customer?.address && <p className="text-sm text-muted-foreground">{customer.address}</p>}
          </div>
          <div className="text-right space-y-1">
            <div>
              <span className="text-xs text-muted-foreground">Job: </span>
              <span className="text-sm font-medium">{job?.job_name}</span>
            </div>
            {estimate?.estimate_date && (
              <div>
                <span className="text-xs text-muted-foreground">Date: </span>
                <span className="text-sm">{format(parseISO(estimate.estimate_date), "MMM d, yyyy")}</span>
              </div>
            )}
            {estimate?.expiration_date && (
              <div>
                <span className="text-xs text-muted-foreground">Expires: </span>
                <span className="text-sm">{format(parseISO(estimate.expiration_date), "MMM d, yyyy")}</span>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Line Items */}
        <div>
          {viewMode === "summary" ? (
            <>
              <div className="grid text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 pb-1 border-b"
                style={{ gridTemplateColumns: "2fr 0.6fr 1.5fr 1fr" }}>
                <span>Description</span>
                <span className="text-right">Qty</span>
                <span>Location</span>
                <span className="text-right">Amount</span>
              </div>
              <div className="divide-y">
                {lines.map((line, i) => (
                  <div key={i}>
                    <div className="py-2.5 grid gap-3 text-sm items-start" style={{ gridTemplateColumns: "2fr 0.6fr 1.5fr 1fr" }}>
                      <div>
                        <span>{line.description || "—"}</span>
                        <ComponentsSpec components={line.components} />
                      </div>
                      <span className="text-right text-muted-foreground text-xs">{line.quantity}</span>
                      <span className="text-muted-foreground text-xs">{line.install_location !== "N/A" ? line.install_location : "—"}</span>
                      <span className="font-medium text-right">${(line.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                    </div>
                    {line.photo_url && line.show_photo !== false && (
                      <div className="pb-3">
                        <img src={line.photo_url} alt={line.description || "Service photo"} className="w-full max-h-56 object-cover rounded-lg border" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="grid text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 pb-1 border-b"
                style={{ gridTemplateColumns: "3fr 1.5fr 0.7fr 1fr 1fr" }}>
                <span>Description</span>
                <span>Location</span>
                <span className="text-right">Qty</span>
                <span className="text-right">Unit Cost</span>
                <span className="text-right">Amount</span>
              </div>
              <div className="divide-y">
                {lines.map((line, i) => (
                  <div key={i}>
                    <div className="py-2.5 grid text-sm" style={{ gridTemplateColumns: "3fr 1.5fr 0.7fr 1fr 1fr" }}>
                      <span>{line.description || "—"}</span>
                      <span className="text-muted-foreground text-xs">{line.install_location !== "N/A" ? line.install_location : ""}</span>
                      <span className="text-right text-muted-foreground">{line.quantity} {line.unit}</span>
                      <span className="text-right text-muted-foreground">${(line.unit_cost || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                      <span className="text-right font-medium">${(line.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                    </div>
                    {line.photo_url && line.show_photo !== false && (
                      <div className="pb-3">
                        <img src={line.photo_url} alt={line.description || "Service photo"} className="w-full max-h-56 object-cover rounded-lg border" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <Separator />

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            </div>
            {discountPct > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Discount ({discountPct}%)</span>
                <span>−${discountAmt.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {(estimate?.markup_percent || 0) > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Markup ({estimate.markup_percent}%)</span>
                <span>+${markupAmt.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {(estimate?.overhead_percent || 0) > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Overhead ({estimate.overhead_percent}%)</span>
                <span>+${overheadAmt.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {(estimate?.tax_percent || 0) > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Tax ({estimate.tax_percent}%)</span>
                <span>+${taxAmt.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-lg pt-1">
              <span>Total</span>
              <span>${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {estimate?.notes && (
          <div className="bg-muted/30 rounded-lg px-4 py-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
            <p className="text-sm whitespace-pre-wrap">{estimate.notes}</p>
          </div>
        )}

        <Separator />

        {/* ── Terms & Conditions — always visible ──────────────────── */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Terms &amp; Conditions</p>
          <div className="border rounded-lg p-4 bg-muted/10 text-xs leading-relaxed whitespace-pre-wrap font-mono text-foreground">
            {contractBody}
          </div>
        </div>

        <Separator />

        {/* ── Signature Block ───────────────────────────────────────── */}

        {/* STATUS: Approved — show read-only signed record */}
        {estimate?.status === "Approved" && (
          <div className="space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Signature &amp; Authorization</p>
            <div className="border rounded-lg p-5 bg-emerald-50 border-emerald-200 space-y-4">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="text-sm font-semibold">Estimate Accepted &amp; Signed</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Digital Signature</p>
                  <div className="border-b-2 border-foreground pb-1 min-h-[2rem] flex items-end">
                    <span className="text-base italic font-medium">{estimate.customer_signature || estimate.customer_printed_name || "—"}</span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Printed Name</p>
                  <div className="border-b-2 border-foreground pb-1 min-h-[2rem] flex items-end">
                    <span className="text-sm font-medium">{estimate.customer_printed_name || estimate.customer_signature || "—"}</span>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Date Signed</p>
                <p className="text-sm">
                  {estimate.approved_at
                    ? format(parseISO(estimate.approved_at), "MMMM d, yyyy 'at' h:mm a")
                    : estimate.approved_date
                    ? format(parseISO(estimate.approved_date), "MMMM d, yyyy")
                    : "—"}
                </p>
              </div>
              {estimate.approval_method && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Approval Method</p>
                  <p className="text-sm">{estimate.approval_method}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STATUS: Not yet approved — blank signature lines (printable) + optional live accept flow */}
        {estimate?.status !== "Approved" && (
          <div className="space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Signature &amp; Authorization</p>

            {/* Live Accept flow (web only, when onApprove provided and status is Sent) */}
            {estimate?.status === "Sent" && onApprove && !showAcceptFlow && (
              <div className="space-y-2">
                <button
                  onClick={() => setShowAcceptFlow(true)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-3 rounded-lg transition-colors"
                >
                  ✓ Accept Estimate
                </button>
                {onRequestChanges && (
                  <button
                    onClick={onRequestChanges}
                    className="w-full px-4 border border-input bg-white text-sm rounded-lg py-2.5 hover:bg-muted transition-colors"
                  >
                    Request Changes
                  </button>
                )}
              </div>
            )}

            {estimate?.status === "Sent" && onApprove && showAcceptFlow && (
              <div className="space-y-4">
                <div>
                  <p className="font-semibold text-sm mb-1">Sign Agreement</p>
                  <p className="text-xs text-muted-foreground">Please scroll through the Terms &amp; Conditions above, then type your full name to sign.</p>
                </div>
                <div className="space-y-4 max-w-sm">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Digital Signature</label>
                    <input
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder="Type your full legal name to sign"
                      value={typedName}
                      onChange={e => setTypedName(e.target.value)}
                    />
                  </div>
                  {typedName.trim() && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Printed Name</label>
                      <div className="flex h-9 w-full items-center rounded-md border border-input bg-muted/30 px-3 text-sm font-medium">
                        {typedName.trim()}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleSubmit}
                    disabled={!typedName.trim()}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
                  >
                    ✓ I Agree &amp; Accept This Estimate
                  </button>
                  <button
                    onClick={() => setShowAcceptFlow(false)}
                    className="px-4 border border-input bg-white text-sm rounded-lg hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Blank printable signature lines (shown when no live accept flow active) */}
            {!(estimate?.status === "Sent" && onApprove && showAcceptFlow) && (
              <div className="grid grid-cols-2 gap-6 pt-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-6">Customer Signature</p>
                  <div className="border-b-2 border-foreground" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-6">Printed Name</p>
                  <div className="border-b-2 border-foreground" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-6">Date</p>
                  <div className="border-b-2 border-foreground" />
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}