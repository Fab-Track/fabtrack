import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { format, parseISO, isValid, isPast } from "date-fns";
import { FileText, Receipt, FileDiff, DollarSign, AlertCircle, Eye, CreditCard } from "lucide-react";

const fmt = (n) => `$${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

function statusBadgeClass(status) {
  const map = {
    Paid: "bg-emerald-100 text-emerald-800",
    Approved: "bg-emerald-100 text-emerald-800",
    Closed: "bg-emerald-100 text-emerald-800",
    Sent: "bg-blue-100 text-blue-800",
    Pending: "bg-orange-100 text-orange-800",
    Draft: "bg-muted text-muted-foreground",
    Unpaid: "bg-yellow-100 text-yellow-800",
    Partial: "bg-blue-100 text-blue-800",
    Overdue: "bg-red-100 text-red-800",
    Rejected: "bg-red-100 text-red-800",
    Declined: "bg-red-100 text-red-800",
  };
  return map[status] || "bg-muted text-muted-foreground";
}

export default function CustomerTransactionsTab({ customer, allInvoices, allJobs }) {
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Fetch estimates and change orders for this customer's jobs
  const customerJobs = useMemo(
    () => allJobs.filter(j => j.customer_id === customer.id || j.customer_name === customer.name),
    [allJobs, customer]
  );
  const jobIds = useMemo(() => customerJobs.map(j => j.id), [customerJobs]);

  const { data: allEstimates = [] } = useQuery({
    queryKey: ["customer-estimates", customer.id],
    queryFn: async () => {
      if (!jobIds.length) return [];
      const results = await Promise.all(jobIds.map(id => base44.entities.Estimate.filter({ job_id: id })));
      return results.flat();
    },
    enabled: jobIds.length > 0,
  });

  const { data: allChangeOrders = [] } = useQuery({
    queryKey: ["customer-cos", customer.id],
    queryFn: async () => {
      if (!jobIds.length) return [];
      const results = await Promise.all(jobIds.map(id => base44.entities.ChangeOrder.filter({ job_id: id })));
      return results.flat();
    },
    enabled: jobIds.length > 0,
  });

  const customerInvoices = useMemo(
    () => allInvoices.filter(inv => inv.customer_id === customer.id || inv.customer_name === customer.name),
    [allInvoices, customer]
  );

  // Build job lookup
  const jobMap = useMemo(() => {
    const m = {};
    customerJobs.forEach(j => { m[j.id] = j; });
    return m;
  }, [customerJobs]);

  // Build unified transaction rows
  const rows = useMemo(() => {
    const list = [];

    allEstimates.forEach(est => {
      const job = jobMap[est.job_id];
      list.push({
        id: est.id,
        type: "Estimate",
        docNumber: est.job_number ? `EST-${est.job_number}` : `EST-${est.id.slice(-6).toUpperCase()}`,
        jobId: est.job_id,
        jobName: job?.job_name || est.job_number || "—",
        description: job?.job_name || "Estimate",
        amount: est.total || 0,
        balance: est.status === "Approved" ? 0 : est.total || 0,
        status: est.status === "Rejected" ? "Declined" : est.status,
        date: est.approved_date || est.created_date || "",
        raw: est,
      });
    });

    customerInvoices.forEach(inv => {
      const overdueFlag = inv.status !== "Paid" && inv.due_date && isValid(parseISO(inv.due_date)) && isPast(parseISO(inv.due_date));
      const status = overdueFlag ? "Overdue" : inv.status;
      list.push({
        id: inv.id,
        type: "Invoice",
        docNumber: inv.invoice_number || `INV-${inv.id.slice(-6).toUpperCase()}`,
        jobId: inv.job_id,
        jobName: inv.job_name || "—",
        description: inv.notes || inv.job_name || "Invoice",
        amount: inv.total || 0,
        balance: inv.balance_due || (inv.status === "Paid" ? 0 : (inv.total || 0) - (inv.amount_paid || 0)),
        status,
        date: inv.issued_date || inv.created_date || "",
        raw: inv,
      });

      // Payment sub-rows for paid invoices
      if (inv.status === "Paid" && inv.amount_paid) {
        list.push({
          id: `pay-${inv.id}`,
          type: "Payment",
          docNumber: `PMT-${inv.id.slice(-6).toUpperCase()}`,
          jobId: inv.job_id,
          jobName: inv.job_name || "—",
          description: `Payment — ${inv.invoice_number || "Invoice"}`,
          amount: inv.amount_paid,
          balance: 0,
          status: "Closed",
          date: inv.paid_date || inv.updated_date || "",
          raw: inv,
        });
      }
    });

    allChangeOrders.forEach(co => {
      const job = jobMap[co.job_id];
      list.push({
        id: co.id,
        type: "Change Order",
        docNumber: co.co_number || `CO-${co.id.slice(-6).toUpperCase()}`,
        jobId: co.job_id,
        jobName: job?.job_name || co.job_name || "—",
        description: co.description || "Change Order",
        amount: co.cost_impact || 0,
        balance: co.status === "Approved" ? 0 : co.cost_impact || 0,
        status: co.status === "Rejected" ? "Declined" : co.status,
        date: co.created_date || "",
        raw: co,
      });
    });

    return list.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [allEstimates, customerInvoices, allChangeOrders, jobMap]);

  // Financial summary
  const openBalance = useMemo(() =>
    customerInvoices.filter(i => i.status !== "Paid").reduce((s, i) => s + (i.balance_due || (i.total || 0) - (i.amount_paid || 0)), 0),
    [customerInvoices]
  );
  const overdueBalance = useMemo(() =>
    customerInvoices.filter(i => i.status !== "Paid" && i.due_date && isValid(parseISO(i.due_date)) && isPast(parseISO(i.due_date)))
      .reduce((s, i) => s + (i.balance_due || (i.total || 0) - (i.amount_paid || 0)), 0),
    [customerInvoices]
  );
  const lifetimeRevenue = useMemo(() =>
    customerInvoices.filter(i => i.status === "Paid").reduce((s, i) => s + (i.total || 0), 0),
    [customerInvoices]
  );

  // Filtered rows
  const filtered = useMemo(() => {
    let list = rows;
    if (typeFilter !== "all") {
      const map = { estimates: "Estimate", invoices: "Invoice", payments: "Payment", cos: "Change Order" };
      list = list.filter(r => r.type === map[typeFilter]);
    }
    if (statusFilter === "open") list = list.filter(r => ["Unpaid", "Sent", "Partial", "Pending", "Draft"].includes(r.status));
    else if (statusFilter === "paid") list = list.filter(r => ["Paid", "Closed", "Approved"].includes(r.status));
    else if (statusFilter === "overdue") list = list.filter(r => r.status === "Overdue");
    if (dateFrom) list = list.filter(r => r.date >= dateFrom);
    if (dateTo) list = list.filter(r => r.date <= dateTo);
    return list;
  }, [rows, typeFilter, statusFilter, dateFrom, dateTo]);

  const TYPE_ICON = {
    Estimate: FileText,
    Invoice: Receipt,
    Payment: CreditCard,
    "Change Order": FileDiff,
  };

  return (
    <div className="space-y-4">
      {/* Summary mini-cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Open Balance</p>
            <p className={`text-lg font-bold ${openBalance > 0 ? "text-orange-600" : "text-foreground"}`}>{fmt(openBalance)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Overdue</p>
            <p className={`text-lg font-bold ${overdueBalance > 0 ? "text-red-600" : "text-foreground"}`}>{fmt(overdueBalance)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Lifetime Revenue</p>
            <p className="text-lg font-bold text-emerald-700">{fmt(lifetimeRevenue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="estimates">Estimates</SelectItem>
            <SelectItem value="invoices">Invoices</SelectItem>
            <SelectItem value="payments">Payments</SelectItem>
            <SelectItem value="cos">Change Orders</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="paid">Paid / Closed</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 w-36 text-xs" placeholder="From" />
        <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 w-36 text-xs" placeholder="To" />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {/* Header */}
          <div className="hidden md:grid grid-cols-[1fr_90px_110px_1.2fr_1.5fr_90px_90px_100px_80px] gap-2 px-4 py-2 border-b bg-muted/30 text-xs font-medium text-muted-foreground">
            <span>Date</span>
            <span>Type</span>
            <span>Doc #</span>
            <span>Job</span>
            <span>Description</span>
            <span className="text-right">Amount</span>
            <span className="text-right">Balance</span>
            <span>Status</span>
            <span>Actions</span>
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No transactions found.</p>
          ) : (
            <div className="divide-y">
              {filtered.map(row => {
                const Icon = TYPE_ICON[row.type] || FileText;
                const dateStr = row.date && isValid(parseISO(row.date)) ? format(parseISO(row.date), "MMM d, yyyy") : "—";
                return (
                  <div key={row.id} className="grid md:grid-cols-[1fr_90px_110px_1.2fr_1.5fr_90px_90px_100px_80px] gap-2 px-4 py-3 items-center hover:bg-muted/20 text-sm">
                    <span className="text-xs text-muted-foreground">{dateStr}</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Icon className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">{row.type}</span>
                    </span>
                    <span className="text-xs font-mono">{row.docNumber}</span>
                    <span className="truncate">
                      {row.jobId ? (
                        <Link to={`/jobs/${row.jobId}`} className="text-blue-600 hover:underline text-xs truncate">{row.jobName}</Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">{row.jobName}</span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">{row.description}</span>
                    <span className={`text-right text-sm font-medium ${row.type === "Change Order" && row.amount < 0 ? "text-red-600" : ""}`}>
                      {row.type === "Change Order" && row.amount >= 0 ? "+" : ""}{fmt(row.amount)}
                    </span>
                    <span className={`text-right text-sm font-semibold ${row.balance > 0 ? "text-orange-600" : "text-muted-foreground"}`}>
                      {row.balance > 0 ? fmt(row.balance) : <span className="text-emerald-600">$0.00</span>}
                    </span>
                    <span>
                      <Badge className={`text-[10px] px-1.5 py-0.5 ${statusBadgeClass(row.status)}`}>{row.status}</Badge>
                    </span>
                    <span className="flex items-center gap-1">
                      {row.jobId && (
                        <Link to={`/jobs/${row.jobId}`}>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}