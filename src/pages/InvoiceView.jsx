import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import InvoiceCustomerView from "@/components/invoices/InvoiceCustomerView";

export default function InvoiceView() {
  const { token } = useParams();

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
      <InvoiceCustomerView {...viewProps} contractText={null} />
    </div>
  );
}