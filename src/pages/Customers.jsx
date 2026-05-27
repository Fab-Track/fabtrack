import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Plus, Search, Phone, Mail, MapPin, Building2,
  DollarSign, Briefcase, TrendingUp, ArrowLeft,
  ChevronRight, ArrowUpDown, Send
} from "lucide-react";
import CustomerCommTab from "@/components/comms/CustomerCommTab";
import MessageComposerModal from "@/components/comms/MessageComposerModal";
import { Link } from "react-router-dom";
import { format, parseISO, isValid } from "date-fns";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { STATUS_COLORS } from "@/lib/jobHelpers";
import OutstandingAgingCard from "@/components/customers/OutstandingAgingCard";
import PaymentBehaviorCard from "@/components/customers/PaymentBehaviorCard";
import QuickActionsBar from "@/components/customers/QuickActionsBar";
import CustomerARSummaryBar from "@/components/customers/CustomerARSummaryBar";

const JOB_TYPE_COLORS = ["#3b82f6", "#f97316", "#a855f7", "#10b981", "#84cc16", "#ef4444"];

const CUSTOMER_TYPES = [
  "Homeowner",
  "General Contractor",
  "Builder / Developer",
  "Commercial Business",
  "Subcontractor",
  "Other",
];

function StatCard({ icon: Icon, label, value, sub, color = "text-foreground" }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <Icon className="w-5 h-5 text-muted-foreground/40 mt-0.5" />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Customer Type Badge ────────────────────────────────────────────────────────
function TypeBadge({ type }) {
  if (!type) return null;
  const colorMap = {
    "Homeowner": "bg-blue-100 text-blue-700 border-blue-200",
    "General Contractor": "bg-purple-100 text-purple-700 border-purple-200",
    "Builder / Developer": "bg-green-100 text-green-700 border-green-200",
    "Commercial Business": "bg-orange-100 text-orange-700 border-orange-200",
    "Subcontractor": "bg-yellow-100 text-yellow-700 border-yellow-200",
    "Other": "bg-gray-100 text-gray-600 border-gray-200",
  };
  return (
    <Badge className={`text-[10px] border ${colorMap[type] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
      {type}
    </Badge>
  );
}

// ── Customer Detail Panel ──────────────────────────────────────────────────────
function CustomerDetail({ customer, allJobs, allInvoices, onBack, onUpdated }) {
  const queryClient = useQueryClient();
  const [editingType, setEditingType] = useState(false);
  const [activeTab, setActiveTab] = useState("overview"); // overview | invoices | communications
  const [composerOpen, setComposerOpen] = useState(false);

  const customerJobs = useMemo(() =>
    allJobs.filter(j => j.customer_id === customer.id || j.customer_name === customer.name)
      .sort((a, b) => (b.created_date || "").localeCompare(a.created_date || "")),
    [allJobs, customer]
  );

  const customerInvoices = useMemo(() =>
    allInvoices.filter(inv => inv.customer_id === customer.id || inv.customer_name === customer.name),
    [allInvoices, customer]
  );

  const paidInvoices = customerInvoices.filter(inv => inv.status === "Paid");
  const unpaidInvoices = customerInvoices.filter(inv => inv.status !== "Paid");
  const totalRevenue = paidInvoices.reduce((s, inv) => s + (inv.total || 0), 0);
  const totalJobs = customerJobs.length;
  const avgJobSize = totalJobs > 0 ? totalRevenue / totalJobs : 0;

  // Job type breakdown
  const typeMap = {};
  customerJobs.forEach(j => {
    const t = j.job_type || "Other";
    typeMap[t] = (typeMap[t] || 0) + 1;
  });
  const typeData = Object.entries(typeMap).map(([name, value]) => ({ name, value }));

  // Revenue by year
  const revenueByYear = {};
  customerInvoices.forEach(inv => {
    if (inv.status !== "Paid" || !inv.paid_date) return;
    const yr = inv.paid_date.slice(0, 4);
    revenueByYear[yr] = (revenueByYear[yr] || 0) + (inv.total || 0);
  });
  const revenueData = Object.entries(revenueByYear).sort().map(([year, amt]) => ({ year, amt }));

  const updateTypeMutation = useMutation({
    mutationFn: (type) => base44.entities.Customer.update(customer.id, { type }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      onUpdated({ ...customer, type: updated.type });
      setEditingType(false);
    },
  });

  const invoicesToShow = activeTab === "invoices" ? unpaidInvoices : customerInvoices;

  return (
    <div>
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5">
        <ArrowLeft className="w-4 h-4" /> All Customers
      </button>

      {/* Header */}
      <div className="bg-card border rounded-xl p-5 mb-5">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold">{customer.name}</h2>
              {editingType ? (
                <Select
                  value={customer.type || ""}
                  onValueChange={(v) => updateTypeMutation.mutate(v)}
                  onOpenChange={(open) => { if (!open) setEditingType(false); }}
                  defaultOpen
                >
                  <SelectTrigger className="h-7 w-44 text-xs">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CUSTOMER_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <button onClick={() => setEditingType(true)} className="hover:opacity-70 transition-opacity">
                  {customer.type ? <TypeBadge type={customer.type} /> : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground border-dashed">+ Add Type</Badge>
                  )}
                </button>
              )}
            </div>
            {customer.company && <p className="text-sm text-muted-foreground mt-0.5">{customer.company}</p>}
          </div>
          <div className="space-y-1 text-sm text-muted-foreground">
            {customer.phone && <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{customer.phone}</div>}
            {customer.email && <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{customer.email}</div>}
            {customer.address && <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{customer.address}</div>}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard icon={DollarSign} label="Total Revenue" value={`$${totalRevenue.toLocaleString()}`} />
        <StatCard icon={Briefcase} label="Total Jobs" value={totalJobs} />
        <StatCard icon={TrendingUp} label="Avg Job Size" value={`$${avgJobSize.toLocaleString("en-US", { maximumFractionDigits: 0 })}`} />
        <PaymentBehaviorCard paidInvoices={paidInvoices} />
      </div>

      {/* Outstanding Aging */}
      {unpaidInvoices.length > 0 && (
        <div className="mb-5">
          <OutstandingAgingCard unpaidInvoices={unpaidInvoices} lifetimeRevenue={totalRevenue} />
        </div>
      )}

      {/* Send Message button — only shown outside the communications tab */}
      {activeTab !== "communications" && (
        <div className="flex justify-end mb-2">
          <Button size="sm" onClick={() => setComposerOpen(true)} className="gap-1.5">
            <Send className="w-3.5 h-3.5" /> Send Message
          </Button>
        </div>
      )}

      {/* Quick Actions */}
      <QuickActionsBar
        customer={customer}
        unpaidInvoices={unpaidInvoices}
        onViewOutstanding={() => setActiveTab("invoices")}
      />

      {/* Charts */}
      {(typeData.length > 0 || revenueData.length > 0) && (
        <div className="grid md:grid-cols-2 gap-4 mb-5">
          {typeData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Job Type Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-4">
                <ResponsiveContainer width={120} height={120}>
                  <PieChart>
                    <Pie data={typeData} cx="50%" cy="50%" outerRadius={55} dataKey="value">
                      {typeData.map((_, i) => <Cell key={i} fill={JOB_TYPE_COLORS[i % JOB_TYPE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5">
                  {typeData.map((item, i) => (
                    <div key={item.name} className="flex items-center gap-2 text-xs">
                      <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: JOB_TYPE_COLORS[i % JOB_TYPE_COLORS.length] }} />
                      <span className="text-muted-foreground">{item.name}</span>
                      <span className="font-medium ml-auto">{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {revenueData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Revenue by Year</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={revenueData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                    <YAxis hide />
                    <Tooltip formatter={v => `$${v.toLocaleString()}`} />
                    <Bar dataKey="amt" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Jobs / Invoices / Communications tabs */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <button
          onClick={() => setActiveTab("overview")}
          className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${activeTab === "overview" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          Job History ({totalJobs})
        </button>
        <button
          onClick={() => setActiveTab("invoices")}
          className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${activeTab === "invoices" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          Outstanding Invoices
          {unpaidInvoices.length > 0 && (
            <Badge className="ml-1.5 bg-orange-100 text-orange-700 border-orange-200 text-[10px] px-1">{unpaidInvoices.length}</Badge>
          )}
        </button>
        <button
          onClick={() => setActiveTab("communications")}
          className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${activeTab === "communications" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          Communications
        </button>
      </div>

      {activeTab === "overview" && (
        <Card>
          <CardContent className="p-0">
            {customerJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No jobs yet.</p>
            ) : (
              <div className="divide-y">
                {customerJobs.map(job => (
                  <div key={job.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-mono text-muted-foreground">{job.job_number}</span>
                        <Badge className={`text-[10px] ${STATUS_COLORS[job.status] || ""}`}>{job.status}</Badge>
                      </div>
                      <p className="text-sm font-medium truncate">{job.job_name}</p>
                      {job.expected_install_date && isValid(parseISO(job.expected_install_date)) && (
                        <p className="text-xs text-muted-foreground">{format(parseISO(job.expected_install_date), "MMM d, yyyy")}</p>
                      )}
                    </div>
                    {job.estimate_total > 0 && (
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold">${job.estimate_total.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">estimate</p>
                      </div>
                    )}
                    <Link to={`/jobs/${job.id}`} className="text-muted-foreground hover:text-foreground shrink-0">
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "invoices" && (
        <Card>
          <CardContent className="p-0">
            {unpaidInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No outstanding invoices.</p>
            ) : (
              <div className="divide-y">
                {unpaidInvoices.map(inv => (
                  <div key={inv.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-mono text-muted-foreground">{inv.invoice_number}</span>
                        <Badge className={`text-[10px] ${inv.status === "Overdue" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>{inv.status}</Badge>
                      </div>
                      <p className="text-sm font-medium">{inv.job_name}</p>
                      {inv.due_date && isValid(parseISO(inv.due_date)) && (
                        <p className="text-xs text-muted-foreground">Due {format(parseISO(inv.due_date), "MMM d, yyyy")}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-orange-600">${(inv.balance_due || 0).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">balance due</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "communications" && (
        <Card>
          <CardContent className="p-0">
            <CustomerCommTab customer={customer} />
          </CardContent>
        </Card>
      )}

      {customer.notes && activeTab !== "communications" && (
        <Card className="mt-4">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{customer.notes}</p></CardContent>
        </Card>
      )}

      <MessageComposerModal
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        customer={customer}
      />
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function Customers() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [filterOutstanding, setFilterOutstanding] = useState(false);
  const [sortBy, setSortBy] = useState("name"); // name | outstanding | lastJob
  const [form, setForm] = useState({ name: "", type: "", company: "", phone: "", email: "", address: "", notes: "" });
  const queryClient = useQueryClient();

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list("-created_date", 200),
  });

  const { data: allJobs = [] } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => base44.entities.Job.list("-created_date", 500),
  });

  const { data: allInvoices = [] } = useQuery({
    queryKey: ["invoices-global"],
    queryFn: () => base44.entities.Invoice.list("-created_date", 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Customer.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setDialogOpen(false);
      setForm({ name: "", type: "", company: "", phone: "", email: "", address: "", notes: "" });
    },
  });

  // Per-customer computed metrics for list
  const customerMetrics = useMemo(() => {
    const map = {};
    customers.forEach(c => {
      const invoices = allInvoices.filter(inv => inv.customer_id === c.id || inv.customer_name === c.name);
      const jobs = allJobs.filter(j => j.customer_id === c.id || j.customer_name === c.name);
      const outstanding = invoices.filter(i => i.status !== "Paid").reduce((s, i) => s + (i.balance_due || 0), 0);
      const lastJob = jobs.sort((a, b) => (b.created_date || "").localeCompare(a.created_date || ""))[0];
      map[c.id] = { outstanding, lastJobDate: lastJob?.created_date || null };
    });
    return map;
  }, [customers, allInvoices, allJobs]);

  const filtered = useMemo(() => {
    let list = customers.filter(c =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.company?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
    );
    if (filterType !== "all") list = list.filter(c => c.type === filterType);
    if (filterOutstanding) list = list.filter(c => (customerMetrics[c.id]?.outstanding || 0) > 0);
    list = [...list].sort((a, b) => {
      if (sortBy === "outstanding") return (customerMetrics[b.id]?.outstanding || 0) - (customerMetrics[a.id]?.outstanding || 0);
      if (sortBy === "lastJob") return ((customerMetrics[b.id]?.lastJobDate || "") > (customerMetrics[a.id]?.lastJobDate || "")) ? 1 : -1;
      return (a.name || "").localeCompare(b.name || "");
    });
    return list;
  }, [customers, search, filterType, filterOutstanding, sortBy, customerMetrics]);

  if (selectedCustomer) {
    return (
      <div className="p-4 md:p-6 max-w-[1100px] mx-auto">
        <CustomerDetail
          customer={selectedCustomer}
          allJobs={allJobs}
          allInvoices={allInvoices}
          onBack={() => setSelectedCustomer(null)}
          onUpdated={(updated) => setSelectedCustomer(updated)}
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">{customers.length} contacts</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1.5" />Add Customer</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Customer</DialogTitle></DialogHeader>
            <form onSubmit={e => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-3">
              <div>
                <Label className="text-xs">Name *</Label>
                <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Type</Label>
                  <Select value={form.type} onValueChange={v => setForm({...form, type: v})}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {CUSTOMER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Company</Label>
                  <Input value={form.company} onChange={e => setForm({...form, company: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Phone</Label>
                  <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Address</Label>
                <Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
              </div>
              <div>
                <Label className="text-xs">Notes</Label>
                <Input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Customer"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* AR Summary Bar */}
      <CustomerARSummaryBar customers={customers} allInvoices={allInvoices} />

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {CUSTOMER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <button
          onClick={() => setFilterOutstanding(v => !v)}
          className={`flex items-center gap-1.5 px-3 h-9 rounded-md border text-sm transition-colors ${filterOutstanding ? "bg-orange-50 border-orange-300 text-orange-700 font-medium" : "border-input text-muted-foreground hover:text-foreground"}`}
        >
          Has Outstanding Balance
        </button>
        <button
          onClick={() => setSortBy(s => s === "outstanding" ? "name" : "outstanding")}
          className={`flex items-center gap-1.5 px-3 h-9 rounded-md border text-sm transition-colors ${sortBy === "outstanding" ? "bg-primary text-primary-foreground" : "border-input text-muted-foreground hover:text-foreground"}`}
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          Sort by Balance
        </button>
      </div>

      {/* Customer table */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-2.5 border-b bg-muted/30 text-xs font-medium text-muted-foreground">
          <span>Customer</span>
          <span>Type</span>
          <span
            className="cursor-pointer hover:text-foreground flex items-center gap-1"
            onClick={() => setSortBy(s => s === "outstanding" ? "name" : "outstanding")}
          >
            Outstanding <ArrowUpDown className="w-3 h-3" />
          </span>
          <span
            className="cursor-pointer hover:text-foreground flex items-center gap-1"
            onClick={() => setSortBy(s => s === "lastJob" ? "name" : "lastJob")}
          >
            Last Job <ArrowUpDown className="w-3 h-3" />
          </span>
          <span>Contact</span>
        </div>
        {filtered.length === 0 && !isLoading ? (
          <p className="text-center text-muted-foreground py-12">No customers found.</p>
        ) : (
          <div className="divide-y">
            {filtered.map(customer => {
              const metrics = customerMetrics[customer.id] || {};
              return (
                <div
                  key={customer.id}
                  className="grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3.5 hover:bg-muted/30 cursor-pointer items-center"
                  onClick={() => setSelectedCustomer(customer)}
                >
                  <div>
                    <p className="font-semibold text-sm">{customer.name}</p>
                    {customer.company && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Building2 className="w-3 h-3" /> {customer.company}
                      </div>
                    )}
                  </div>
                  <div><TypeBadge type={customer.type} /></div>
                  <div>
                    {metrics.outstanding > 0 ? (
                      <span className="text-sm font-semibold text-orange-500">${metrics.outstanding.toLocaleString()}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </div>
                  <div>
                    {metrics.lastJobDate ? (
                      <span className="text-xs text-muted-foreground">{format(parseISO(metrics.lastJobDate), "MMM d, yyyy")}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {customer.phone && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="w-3 h-3" />{customer.phone}</div>}
                    {customer.email && <div className="flex items-center gap-1 text-xs text-muted-foreground truncate"><Mail className="w-3 h-3" />{customer.email}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}