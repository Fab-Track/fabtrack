import React, { useState } from "react";
import { format, parseISO } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatPhoneDisplay } from "@/lib/phoneFormat";
import ComponentsSpec from "@/components/estimates/ComponentsSpec";

const STATUS_COLORS = {
  Unpaid: "bg-amber-100 text-amber-800",
  Partial: "bg-blue-100 text-blue-800",
  Paid:    "bg-emerald-100 text-emerald-800",
  Overdue: "bg-red-100 text-red-800",
};

const DEFAULT_PAYMENT_TERMS = `PAYMENT TERMS

Payment is due within 30 days of invoice date unless otherwise agreed in writing.

Accepted payment methods: Check, ACH, Credit Card, or Stripe.

Late payments may be subject to a 1.5% monthly finance charge. For questions regarding this invoice, please contact High Country Metal Works directly.`;

export default function InvoiceCustomerView({ invoice, job, customer, lines, subtotal, discountPct, discountAmt, tax, taxAmount, total, amountPaid, balanceDue, notes, viewMode, issuedDate, dueDate, invoiceLabel, status, contractText }) {
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState(null);

  const showPayButton = (status === "Unpaid" || status === "Partial" || status === "Overdue") && balanceDue > 0 && invoice?.id;

  const handlePayNow = async () => {
    setPayLoading(true);
    setPayError(null);
    try {
      const origin = window.location.origin;
      const res = await base44.functions.invoke("createStripeCheckout", {
        invoice_id: invoice.id,
        success_url: `${origin}/invoice-view/${invoice.id}?payment=success`,
        cancel_url: `${origin}/invoice-view/${invoice.id}?payment=cancelled`,
      });
      if (res.data?.checkout_url) {
        window.location.href = res.data.checkout_url;
      } else {
        setPayError(res.data?.error || "Failed to create checkout session");
      }
    } catch (err) {
      setPayError("Something went wrong. Please try again.");
    }
    setPayLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-primary px-8 py-6 text-primary-foreground">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">High Country Metal Works</h1>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold opacity-80">INVOICE</p>
            <p className="text-lg font-bold">{invoice?.invoice_number || "INV-DRAFT"}</p>
            {invoiceLabel && (
              <p className="text-xs opacity-75 mt-0.5">{invoiceLabel}</p>
            )}
            <Badge className={`mt-1 ${STATUS_COLORS[status] || "bg-muted text-muted-foreground"}`}>{status || "Unpaid"}</Badge>
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
          </div>
          <div className="text-right space-y-1">
            <div>
              <span className="text-xs text-muted-foreground">Job: </span>
              <span className="text-sm font-medium">{job?.job_name}</span>
            </div>
            {job?.site_address && (
              <div>
                <span className="text-xs text-muted-foreground">Site: </span>
                <span className="text-sm">{job.site_address}</span>
              </div>
            )}
            {issuedDate && (
              <div>
                <span className="text-xs text-muted-foreground">Invoice Date: </span>
                <span className="text-sm">{format(parseISO(issuedDate), "MMM d, yyyy")}</span>
              </div>
            )}
            {dueDate && (
              <div>
                <span className="text-xs text-muted-foreground">Due: </span>
                <span className="text-sm font-medium">{format(parseISO(dueDate), "MMM d, yyyy")}</span>
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
                style={{ gridTemplateColumns: "2fr 0.6fr 1fr" }}>
                <span>Description</span>
                <span className="text-right">Qty</span>
                <span className="text-right">Amount</span>
              </div>
              <div className="divide-y">
                {lines.map((line, i) => (
                  <div key={i} className="py-2.5 grid gap-3 text-sm items-start" style={{ gridTemplateColumns: "2fr 0.6fr 1fr" }}>
                    <div>
                      <span>{line.description || "—"}</span>
                      <ComponentsSpec components={line.components} />
                    </div>
                    <span className="text-right text-muted-foreground text-xs">{line.quantity}</span>
                    <span className="font-medium text-right">${(line.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="grid text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 pb-1 border-b"
                style={{ gridTemplateColumns: "3fr 0.7fr 1fr 1fr" }}>
                <span>Description</span>
                <span className="text-right">Qty</span>
                <span className="text-right">Unit Cost</span>
                <span className="text-right">Amount</span>
              </div>
              <div className="divide-y">
                {lines.map((line, i) => (
                  <div key={i} className="py-2.5 grid text-sm" style={{ gridTemplateColumns: "3fr 0.7fr 1fr 1fr" }}>
                    <span>{line.description || "—"}</span>
                    <span className="text-right text-muted-foreground">{line.quantity} {line.unit}</span>
                    <span className="text-right text-muted-foreground">${(line.unit_cost || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                    <span className="text-right font-medium">${(line.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          {lines.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No line items.</p>
          )}
        </div>

        <Separator />

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-72 space-y-1.5 text-sm">
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
            {tax > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Tax ({tax}%)</span>
                <span>+${taxAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-lg pt-1">
              <span>Total</span>
              <span>${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            </div>
            {amountPaid > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Amount Paid</span>
                <span>−${amountPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {amountPaid > 0 && (
              <div className={`flex justify-between font-bold border-t pt-1 ${balanceDue > 0 ? "text-destructive" : "text-emerald-600"}`}>
                <span>Balance Due</span>
                <span>${balanceDue.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              </div>
            )}
          </div>
        </div>

        {/* Pay Now */}
        {showPayButton && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 sm:p-5 text-center">
            <p className="text-sm font-semibold text-emerald-800 mb-3">
              Ready to pay? Click below to pay securely with credit or debit card.
            </p>
            <button
              onClick={handlePayNow}
              disabled={payLoading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold py-3 px-8 rounded-xl shadow-lg transition-colors text-sm sm:text-base touch-target"
            >
              {payLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <CreditCard className="w-5 h-5" />
              )}
              {payLoading
                ? "Redirecting to secure checkout…"
                : `Pay $${balanceDue.toLocaleString("en-US", { minimumFractionDigits: 2 })} Now`}
            </button>
            {payError && (
              <p className="text-xs text-red-600 mt-2">{payError}</p>
            )}
            <p className="text-[11px] text-muted-foreground mt-2">
              Secure payment powered by Stripe
            </p>
          </div>
        )}

        {/* Customer Notes */}
        {notes && (
          <div className="bg-muted/30 rounded-lg px-4 py-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
            <p className="text-sm whitespace-pre-wrap">{notes}</p>
          </div>
        )}

        <Separator />

        {/* Payment Terms / T&C */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Payment Terms</p>
          <div className="border rounded-lg p-4 bg-muted/10 text-xs leading-relaxed whitespace-pre-wrap font-mono text-foreground">
            {contractText || DEFAULT_PAYMENT_TERMS}
          </div>
        </div>
      </div>
    </div>
  );
}