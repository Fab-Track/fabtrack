import React, { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import InvoiceCustomerView from "@/components/invoices/InvoiceCustomerView";
import { Loader2, CheckCircle2, XCircle, CreditCard } from "lucide-react";

export default function InvoiceView() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const paymentStatus = searchParams.get("payment");

  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState(null);

  const { data, isLoading: loadingInv } = useQuery({
    queryKey: ["invoice-public", token],
    queryFn: async () => {
      try {
        const res = await base44.functions.invoke("getPublicDocument", { type: "invoice", token });
        return res.data;
      } catch {
        return null;
      }
    },
    enabled: !!token,
    retry: false,
  });

  const invoice = data?.document;
  const job = data?.job;
  const customer = data?.customer;

  const handlePayNow = async () => {
    setPayLoading(true);
    setPayError(null);
    try {
      const origin = window.location.origin;
      const res = await base44.functions.invoke("createStripeCheckout", {
        invoice_id: invoice.id,
        token,
        success_url: `${origin}/invoice-view/${token}?payment=success`,
        cancel_url: `${origin}/invoice-view/${token}?payment=cancelled`,
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

  if (loadingInv) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading invoice…</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Invoice not found.</p>
      </div>
    );
  }

  const balanceDue = invoice.balance_due ?? invoice.total - (invoice.amount_paid || 0);
  const showPayButton = (invoice.status === "Unpaid" || invoice.status === "Partial" || invoice.status === "Overdue") && balanceDue > 0;

  // Build props for InvoiceCustomerView
  const viewProps = {
    invoice,
    job,
    customer,
    lines: invoice.line_items || [],
    subtotal: invoice.subtotal || 0,
    discountPct: invoice.discount_percent || 0,
    discountAmt: ((invoice.subtotal || 0) * (invoice.discount_percent || 0) / 100),
    tax: invoice.tax_percent || 0,
    taxAmount: invoice.tax_amount || 0,
    total: invoice.total || 0,
    amountPaid: invoice.amount_paid || 0,
    balanceDue,
    notes: invoice.notes || "",
    viewMode: invoice.view_mode || "detail",
    issuedDate: invoice.issued_date || "",
    dueDate: invoice.due_date || "",
    invoiceLabel: invoice.invoice_label || "",
    status: invoice.status || "Unpaid",
  };

  return (
    <div className="min-h-screen bg-muted/30 py-4 sm:py-8 px-2 sm:px-4">
      {/* Payment status banners */}
      {paymentStatus === "success" && (
        <div className="max-w-3xl mx-auto mb-4 sm:mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 sm:p-6 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
          <h2 className="text-lg font-bold text-emerald-800 mb-1">Payment Successful!</h2>
          <p className="text-sm text-emerald-700">
            Your payment has been processed. A receipt will be sent to your email. Your invoice status will update shortly.
          </p>
        </div>
      )}

      {paymentStatus === "cancelled" && (
        <div className="max-w-3xl mx-auto mb-4 sm:mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 sm:p-6 text-center">
          <XCircle className="w-10 h-10 text-amber-600 mx-auto mb-2" />
          <h2 className="text-lg font-bold text-amber-800 mb-1">Payment Cancelled</h2>
          <p className="text-sm text-amber-700">
            Your payment was not completed. You can try again whenever you're ready.
          </p>
        </div>
      )}

      {/* Pay Now button — sticky on mobile */}
      {showPayButton && (
        <div className="max-w-3xl mx-auto mb-3 sm:mb-4">
          <button
            onClick={handlePayNow}
            disabled={payLoading}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold py-3 sm:py-3.5 px-6 rounded-xl shadow-lg transition-colors text-sm sm:text-base touch-target"
          >
            {payLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <CreditCard className="w-5 h-5" />
            )}
            {payLoading ? "Redirecting to secure checkout…" : `Pay $${balanceDue.toLocaleString("en-US", { minimumFractionDigits: 2 })} Now`}
          </button>
          {payError && (
            <p className="text-xs text-red-600 mt-2 text-center">{payError}</p>
          )}
          <p className="text-[11px] text-muted-foreground text-center mt-2">
            Secure payment powered by Stripe. Your card details are never stored on this site.
          </p>
        </div>
      )}

      <InvoiceCustomerView {...viewProps} contractText={null} />
    </div>
  );
}