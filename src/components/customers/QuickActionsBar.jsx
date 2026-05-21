import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Mail, Plus, FileText, Receipt } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, parseISO, isValid } from "date-fns";
import { base44 } from "@/api/base44Client";

export default function QuickActionsBar({ customer, unpaidInvoices, onViewOutstanding }) {
  const [reminderOpen, setReminderOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  const hasUnpaid = unpaidInvoices.length > 0;

  const reminderBody = () => {
    const lines = unpaidInvoices.map(inv => {
      const due = inv.due_date && isValid(parseISO(inv.due_date)) ? format(parseISO(inv.due_date), "MMM d, yyyy") : "N/A";
      return `  • ${inv.invoice_number || "Invoice"} — $${(inv.balance_due || 0).toLocaleString()} (due ${due})`;
    }).join("\n");
    return `Hi ${customer.name},\n\nThis is a friendly reminder that you have an outstanding balance with High Country Metal Works:\n\n${lines}\n\nPlease reach out if you have any questions.\n\nThank you!`;
  };

  const sendReminder = async () => {
    if (!customer.email) return;
    setSending(true);
    await base44.integrations.Core.SendEmail({
      to: customer.email,
      subject: "Payment Reminder — Outstanding Balance with High Country Metal Works",
      body: reminderBody(),
    });
    setSending(false);
    setSent(true);
    setTimeout(() => { setSent(false); setReminderOpen(false); }, 2000);
  };

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-5">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  disabled={!hasUnpaid}
                  onClick={() => setReminderOpen(true)}
                >
                  <Mail className="w-3.5 h-3.5" />
                  Send Payment Reminder
                </Button>
              </span>
            </TooltipTrigger>
            {!hasUnpaid && <TooltipContent>No outstanding invoices</TooltipContent>}
          </Tooltip>
        </TooltipProvider>

        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => navigate(`/jobs/new?customer_id=${customer.id}&customer_name=${encodeURIComponent(customer.name)}`)}
        >
          <Plus className="w-3.5 h-3.5" />
          New Job
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 relative"
          disabled={!hasUnpaid}
          onClick={onViewOutstanding}
        >
          <Receipt className="w-3.5 h-3.5" />
          View Outstanding Invoices
          {hasUnpaid && (
            <Badge className="ml-1 bg-orange-100 text-orange-700 border-orange-200 text-[10px] px-1 py-0">
              {unpaidInvoices.length}
            </Badge>
          )}
        </Button>
      </div>

      <Dialog open={reminderOpen} onOpenChange={setReminderOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Payment Reminder</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm">
              <span className="text-muted-foreground">To: </span>
              <span className="font-medium">{customer.email || <span className="text-destructive">No email on file</span>}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Subject: </span>
              <span className="font-medium">Payment Reminder — Outstanding Balance with High Country Metal Works</span>
            </div>
            <div className="bg-muted/40 rounded-lg p-3 text-sm whitespace-pre-wrap font-mono text-xs">
              {reminderBody()}
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setReminderOpen(false)}>Cancel</Button>
              <Button
                className="flex-1 gap-2"
                disabled={!customer.email || sending || sent}
                onClick={sendReminder}
              >
                <Mail className="w-4 h-4" />
                {sent ? "Sent!" : sending ? "Sending..." : "Send Email"}
              </Button>
            </div>
            {!customer.email && <p className="text-xs text-destructive">Add an email address to this customer first.</p>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}