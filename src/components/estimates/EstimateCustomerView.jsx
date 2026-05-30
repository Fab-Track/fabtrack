import React, { useState } from "react";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const STATUS_COLORS = {
  Draft: "bg-muted text-muted-foreground",
  Sent: "bg-blue-100 text-blue-800",
  Approved: "bg-emerald-100 text-emerald-800",
  Rejected: "bg-red-100 text-red-800",
};

export default function EstimateCustomerView({ estimate, job, customer, businessInfo, onApprove, onRequestChanges }) {
  const [approvalName, setApprovalName] = useState("");
  const lines = estimate?.line_items || [];
  const viewMode = estimate?.view_mode || "summary";

  const subtotal = lines.reduce((s, l) => s + (l.total || 0), 0);
  const markupAmt = subtotal * ((estimate?.markup_percent || 0) / 100);
  const afterMarkup = subtotal + markupAmt;
  const overheadAmt = afterMarkup * ((estimate?.overhead_percent || 0) / 100);
  const afterOverhead = afterMarkup + overheadAmt;
  const taxAmt = afterOverhead * ((estimate?.tax_percent || 0) / 100);
  const total = afterOverhead + taxAmt;

  // Summary view: one row per line item — description, qty/unit, location, total (no unit cost)
  // Detail view: full breakdown with qty, unit cost, total
  const displayLines = lines;

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
            {customer?.phone && <p className="text-sm text-muted-foreground">{customer.phone}</p>}
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
                style={{ gridTemplateColumns: "1fr auto" }}>
                <span>Description</span>
                <span className="text-right">Amount</span>
              </div>
              <div className="divide-y">
                {lines.map((line, i) => (
                  <div key={i}>
                    <div className="py-2.5 flex justify-between items-center text-sm">
                      <span>{line.description || "—"}</span>
                      <span className="font-medium ml-4 shrink-0">${(line.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
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
                {displayLines.map((line, i) => (
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

        {/* Approval section — only shown when Sent (not Draft, not already Approved) */}
        {estimate?.status === "Sent" && onApprove && (
          <div className="border-t pt-6 space-y-4">
            <div>
              <p className="font-semibold text-sm mb-1">Approve This Estimate</p>
              <p className="text-sm text-muted-foreground">By approving, you agree to the scope and pricing described above.</p>
            </div>
            <div className="space-y-2 max-w-xs">
              <label className="text-xs text-muted-foreground font-medium">Your Name or Initials</label>
              <input
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="e.g. John Smith or J.S."
                value={approvalName}
                onChange={e => setApprovalName(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => approvalName.trim() && onApprove(approvalName.trim())}
                disabled={!approvalName.trim()}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
              >
                ✓ Approve Estimate
              </button>
              {onRequestChanges && (
                <button
                  onClick={onRequestChanges}
                  className="px-4 border border-input bg-white text-sm rounded-lg hover:bg-muted transition-colors"
                >
                  Request Changes
                </button>
              )}
            </div>
          </div>
        )}
        {estimate?.status === "Approved" && (
          <div className="border-t pt-4 flex items-center gap-2 text-emerald-700">
            <span className="text-lg">✓</span>
            <div>
              <p className="font-semibold text-sm">Approved</p>
              {estimate.customer_signature && <p className="text-xs text-muted-foreground">Signed by {estimate.customer_signature}</p>}
              {estimate.approved_date && <p className="text-xs text-muted-foreground">{format(parseISO(estimate.approved_date), "MMM d, yyyy")}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}