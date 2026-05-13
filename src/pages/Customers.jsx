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
  DollarSign, Briefcase, TrendingUp, AlertCircle, ArrowLeft,
  ChevronRight, FileText, Receipt, FileDiff
} from "lucide-react";
import { Link } from "react-router-dom";
import { format, parseISO, isValid } from "date-fns";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { STATUS_COLORS } from "@/lib/jobHelpers";

const JOB_TYPE_COLORS = ["#3b82f6", "#f97316", "#a855f7", "#10b981", "#84cc16", "#ef4444"];

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

// ── Customer Detail Panel ──────────────────────────────────────────────────────
function CustomerDetail({ customer, allJobs, allInvoices, onBack }) {
  const customerJobs = useMemo(() =>
    allJobs.filter(j => j.customer_id === customer.id || j.customer_name === customer.name)
      .sort((a, b) => (b.created_date || "").localeCompare(a.created_date || "")),
    [allJobs, customer]
  );

  const customerInvoices = useMemo(() =>
    allInvoices.filter(inv => inv.customer_id === customer.id || inv.customer_name === customer.name),
    [allInvoices, customer]
  );

  const totalRevenue = customerInvoices.filter(inv => inv.status === "Paid").reduce((s, inv) => s + (inv.total || 0), 0);
  const outstandingBalance = customerInvoices.filter(inv => inv.status !== "Paid").reduce((s, inv) => s + (inv.balance_due || 0), 0);
  const totalJobs = customerJobs.length;
  const avgJobSize = totalJobs > 0 ? totalRevenue / totalJobs : 0;

  // Job type breakdown
  const typeMap = {};
  customerJobs.forEach(j => {
    const t = j.job_type || "Other";
    typeMap[t] = (typeMap[t] || 0) + 1;
  });
  const typeData = Object.entries(typeMap).map(([name, value]) => ({ name, value }));

  // Revenue by year (from invoices)
  const revenueByYear = {};
  customerInvoices.forEach(inv => {
    if (inv.status !== "Paid" || !inv.paid_date) return;
    const yr = inv.paid_date.slice(0, 4);
    revenueByYear[yr] = (revenueByYear[yr] || 0) + (inv.total || 0);
  });
  const revenueData = Object.entries(revenueByYear).sort().map(([year, amt]) => ({ year, amt }));

  return (
    <div>
      {/* Back */}
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5">
        <ArrowLeft className="w-4 h-4" /> All Customers
      </button>

      {/* Header */}
      <div className="bg-card border rounded-xl p-5 mb-5">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">{customer.name}</h2>
            {customer.company && <p className="text-sm text-muted-foreground">{customer.company}</p>}
            {customer.type && <Badge variant="outline" className="mt-1 text-xs">{customer.type}</Badge>}
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
        <StatCard icon={AlertCircle} label="Outstanding" value={`$${outstandingBalance.toLocaleString()}`} color={outstandingBalance > 0 ? "text-destructive" : "text-foreground"} />
      </div>

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

      {/* Jobs list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-muted-foreground" />
            Job History ({totalJobs})
          </CardTitle>
        </CardHeader>
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

      {/* Notes */}
      {customer.notes && (
        <Card className="mt-4">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{customer.notes}</p></CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function Customers() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
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

  const filtered = customers.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.company?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (selectedCustomer) {
    return (
      <div className="p-4 md:p-6 max-w-[1100px] mx-auto">
        <CustomerDetail
          customer={selectedCustomer}
          allJobs={allJobs}
          allInvoices={allInvoices}
          onBack={() => setSelectedCustomer(null)}
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-6">
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
                      {["GC", "Homeowner", "Architect", "Designer", "Other"].map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
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

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(customer => {
          const cJobs = allJobs.filter(j => j.customer_id === customer.id || j.customer_name === customer.name);
          const cInvoices = allInvoices.filter(inv => inv.customer_id === customer.id || inv.customer_name === customer.name);
          const revenue = cInvoices.filter(i => i.status === "Paid").reduce((s, i) => s + (i.total || 0), 0);
          return (
            <Card key={customer.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedCustomer(customer)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-sm">{customer.name}</h3>
                    {customer.company && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Building2 className="w-3 h-3" /> {customer.company}
                      </div>
                    )}
                  </div>
                  {customer.type && <Badge variant="outline" className="text-xs">{customer.type}</Badge>}
                </div>
                <div className="space-y-0.5 mb-3">
                  {customer.phone && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Phone className="w-3 h-3" /> {customer.phone}</div>}
                  {customer.email && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Mail className="w-3 h-3" /> {customer.email}</div>}
                </div>
                <Separator className="mb-2" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{cJobs.length} job{cJobs.length !== 1 ? "s" : ""}</span>
                  {revenue > 0 && <span className="font-semibold text-foreground">${revenue.toLocaleString()}</span>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && !isLoading && (
        <p className="text-center text-muted-foreground py-12">No customers found.</p>
      )}
    </div>
  );
}