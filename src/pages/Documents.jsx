import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOrgFilter } from "@/lib/orgContext";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO, isValid } from "date-fns";
import { Link } from "react-router-dom";
import { Search, FileText, Receipt, FileDiff, ExternalLink } from "lucide-react";

function fmt(val) {
  if (!val) return "—";
  const d = parseISO(val);
  return isValid(d) ? format(d, "MMM d, yyyy") : "—";
}

function money(val) {
  return `$${(val || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

const EST_STATUS = {
  Draft:    "bg-muted text-muted-foreground",
  Sent:     "bg-blue-100 text-blue-800",
  Approved: "bg-emerald-100 text-emerald-800",
  Rejected: "bg-red-100 text-red-800",
};

const INV_STATUS = {
  Unpaid:  "bg-amber-100 text-amber-800",
  Partial: "bg-blue-100 text-blue-800",
  Paid:    "bg-emerald-100 text-emerald-800",
  Overdue: "bg-red-100 text-red-800",
};

const CO_STATUS = {
  Draft:    "bg-muted text-muted-foreground",
  Sent:     "bg-blue-100 text-blue-800",
  Approved: "bg-emerald-100 text-emerald-800",
  Rejected: "bg-red-100 text-red-800",
};

function TableHeader({ cols }) {
  return (
    <div className="grid gap-2 px-4 py-2 bg-muted/40 border-b text-xs font-medium text-muted-foreground" style={{ gridTemplateColumns: cols }}>
      {["#", "Job", "Customer", "Date", "Amount", "Status", ""].map(h => <span key={h}>{h}</span>)}
    </div>
  );
}

function exportCsv(rows, filename) {
  const header = Object.keys(rows[0] || {}).join(",");
  const body = rows.map(r => Object.values(r).map(v => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([header + "\n" + body], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

// ── Estimates Tab ──────────────────────────────────────────────────────────────
function EstimatesTab() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const orgFilter = useOrgFilter();

  const { data: estimates = [] } = useQuery({
    queryKey: ["estimates-global", orgFilter],
    queryFn: () => base44.entities.Estimate.filter(orgFilter, "-created_date", 500),
  });

  const filtered = useMemo(() => estimates.filter(e => {
    const matchStatus = statusFilter === "All" || e.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || e.job_number?.toLowerCase().includes(q) || e.job_id?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  }), [estimates, search, statusFilter]);

  return (
    <div>
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input className="pl-8 h-8 text-xs" placeholder="Search by job…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["All", "Draft", "Sent", "Approved", "Rejected"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <button
          className="text-xs text-muted-foreground hover:text-foreground underline"
          onClick={() => exportCsv(filtered.map(e => ({ id: e.id, job: e.job_number, date: e.approved_date || e.created_date, total: e.total, status: e.status })), "estimates.csv")}
        >
          Export CSV
        </button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="grid gap-2 px-4 py-2 bg-muted/40 border-b text-xs font-medium text-muted-foreground" style={{ gridTemplateColumns: "1fr 2fr 1fr 1fr 1fr auto" }}>
          <span>#</span><span>Job</span><span>Date</span><span>Amount</span><span>Status</span><span></span>
        </div>
        {filtered.length === 0
          ? <p className="text-sm text-muted-foreground text-center py-10">No estimates found.</p>
          : filtered.map(e => (
            <div key={e.id} className="grid gap-2 px-4 py-3 border-b last:border-0 items-center text-sm hover:bg-muted/20" style={{ gridTemplateColumns: "1fr 2fr 1fr 1fr 1fr auto" }}>
              <span className="font-mono text-xs text-muted-foreground">{e.id.slice(-6).toUpperCase()}</span>
              <span className="font-medium">{e.job_number || "—"}</span>
              <span className="text-xs text-muted-foreground">{fmt(e.approved_date || e.created_date)}</span>
              <span className="font-semibold">{money(e.total)}</span>
              <Badge className={`text-xs w-fit ${EST_STATUS[e.status] || ""}`}>{e.status}</Badge>
              <Link to={`/jobs/${e.job_id}`} className="text-muted-foreground hover:text-foreground">
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
      </div>
    </div>
  );
}

// ── Invoices Tab ───────────────────────────────────────────────────────────────
function InvoicesTab() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const orgFilter = useOrgFilter();

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices-global", orgFilter],
    queryFn: () => base44.entities.Invoice.filter(orgFilter, "-created_date", 500),
  });

  const filtered = useMemo(() => invoices.filter(inv => {
    const matchStatus = statusFilter === "All" || inv.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || inv.job_number?.toLowerCase().includes(q) || inv.customer_name?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  }), [invoices, search, statusFilter]);

  return (
    <div>
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input className="pl-8 h-8 text-xs" placeholder="Search job, customer…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["All", "Unpaid", "Partial", "Paid", "Overdue"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <button
          className="text-xs text-muted-foreground hover:text-foreground underline"
          onClick={() => exportCsv(filtered.map(inv => ({ id: inv.id, job: inv.job_number, customer: inv.customer_name, type: inv.invoice_type, date: inv.issued_date, total: inv.total, paid: inv.amount_paid, balance: inv.balance_due, status: inv.status })), "invoices.csv")}
        >
          Export CSV
        </button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="grid gap-2 px-4 py-2 bg-muted/40 border-b text-xs font-medium text-muted-foreground" style={{ gridTemplateColumns: "1fr 2fr 1fr 1fr 1fr 1fr 1fr auto" }}>
          <span>#</span><span>Job · Customer</span><span>Type</span><span>Date</span><span>Total</span><span>Paid</span><span>Status</span><span></span>
        </div>
        {filtered.length === 0
          ? <p className="text-sm text-muted-foreground text-center py-10">No invoices found.</p>
          : filtered.map(inv => (
            <div key={inv.id} className="grid gap-2 px-4 py-3 border-b last:border-0 items-center text-sm hover:bg-muted/20" style={{ gridTemplateColumns: "1fr 2fr 1fr 1fr 1fr 1fr 1fr auto" }}>
              <span className="font-mono text-xs text-muted-foreground">{inv.id.slice(-6).toUpperCase()}</span>
              <div>
                <p className="font-medium text-xs">{inv.job_number}</p>
                <p className="text-xs text-muted-foreground">{inv.customer_name}</p>
              </div>
              <span className="text-xs">{inv.invoice_type}</span>
              <span className="text-xs text-muted-foreground">{fmt(inv.issued_date)}</span>
              <span className="font-semibold">{money(inv.total)}</span>
              <span className="text-xs text-muted-foreground">{money(inv.amount_paid)}</span>
              <Badge className={`text-xs w-fit ${INV_STATUS[inv.status] || ""}`}>{inv.status}</Badge>
              <Link to={`/jobs/${inv.job_id}`} className="text-muted-foreground hover:text-foreground">
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
      </div>
    </div>
  );
}

// ── Change Orders Tab ──────────────────────────────────────────────────────────
function ChangeOrdersTab() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const orgFilter = useOrgFilter();

  const { data: changeOrders = [] } = useQuery({
    queryKey: ["changeOrders-global", orgFilter],
    queryFn: () => base44.entities.ChangeOrder.filter(orgFilter, "-created_date", 500),
  });

  const filtered = useMemo(() => changeOrders.filter(co => {
    const matchStatus = statusFilter === "All" || co.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || co.job_number?.toLowerCase().includes(q) || co.description?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  }), [changeOrders, search, statusFilter]);

  return (
    <div>
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input className="pl-8 h-8 text-xs" placeholder="Search job, description…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["All", "Draft", "Sent", "Approved", "Rejected"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <button
          className="text-xs text-muted-foreground hover:text-foreground underline"
          onClick={() => exportCsv(filtered.map(co => ({ id: co.id, job: co.job_number, description: co.description, impact: co.cost_impact, status: co.status })), "change-orders.csv")}
        >
          Export CSV
        </button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="grid gap-2 px-4 py-2 bg-muted/40 border-b text-xs font-medium text-muted-foreground" style={{ gridTemplateColumns: "1fr 1fr 2fr 1fr 1fr auto" }}>
          <span>#</span><span>Job</span><span>Description</span><span>Net Change</span><span>Status</span><span></span>
        </div>
        {filtered.length === 0
          ? <p className="text-sm text-muted-foreground text-center py-10">No change orders found.</p>
          : filtered.map(co => (
            <div key={co.id} className="grid gap-2 px-4 py-3 border-b last:border-0 items-center text-sm hover:bg-muted/20" style={{ gridTemplateColumns: "1fr 1fr 2fr 1fr 1fr auto" }}>
              <span className="font-mono text-xs text-muted-foreground">{co.id.slice(-6).toUpperCase()}</span>
              <span className="text-xs font-medium">{co.job_number}</span>
              <span className="text-xs text-muted-foreground line-clamp-1">{co.description}</span>
              <span className={`text-sm font-bold ${(co.cost_impact || 0) >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                {(co.cost_impact || 0) >= 0 ? "+" : ""}${Math.abs(co.cost_impact || 0).toLocaleString()}
              </span>
              <Badge className={`text-xs w-fit ${CO_STATUS[co.status] || ""}`}>{co.status}</Badge>
              <Link to={`/jobs/${co.job_id}`} className="text-muted-foreground hover:text-foreground">
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function Documents() {
  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
        <p className="text-sm text-muted-foreground">Global view of all estimates, invoices, and change orders. Create new documents from inside a job.</p>
      </div>

      <Tabs defaultValue="estimates">
        <TabsList className="mb-4">
          <TabsTrigger value="estimates" className="gap-1.5"><FileText className="w-3.5 h-3.5" />Estimates</TabsTrigger>
          <TabsTrigger value="invoices" className="gap-1.5"><Receipt className="w-3.5 h-3.5" />Invoices</TabsTrigger>
          <TabsTrigger value="change-orders" className="gap-1.5"><FileDiff className="w-3.5 h-3.5" />Change Orders</TabsTrigger>
        </TabsList>
        <TabsContent value="estimates"><EstimatesTab /></TabsContent>
        <TabsContent value="invoices"><InvoicesTab /></TabsContent>
        <TabsContent value="change-orders"><ChangeOrdersTab /></TabsContent>
      </Tabs>
    </div>
  );
}