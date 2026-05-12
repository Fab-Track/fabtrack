import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, FileDiff, ChevronRight, CheckCircle2, XCircle, Send } from "lucide-react";

const STATUS_STYLES = {
  Draft: "bg-muted text-muted-foreground",
  Sent: "bg-blue-100 text-blue-800",
  Approved: "bg-emerald-100 text-emerald-800",
  Rejected: "bg-red-100 text-red-800",
};

const CATEGORIES = ["Labor", "Material", "Equipment", "Sub-contractor", "Other"];

const blankLine = () => ({
  _id: Math.random().toString(36).slice(2),
  category: "Labor",
  description: "",
  quantity: 1,
  unit_cost: 0,
  total: 0,
});

function calcLine(line) {
  return { ...line, total: (line.quantity || 0) * (line.unit_cost || 0) };
}

export default function ChangeOrders() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [pickJobOpen, setPickJobOpen] = useState(false);
  const [jobSearch, setJobSearch] = useState("");

  const [form, setForm] = useState({
    job_id: "", job_number: "", description: "",
    status: "Draft", notes: "", customer_signature: "",
  });
  const [lines, setLines] = useState([]);

  const { data: changeOrders = [], isLoading } = useQuery({
    queryKey: ["changeOrders"],
    queryFn: () => base44.entities.ChangeOrder.list("-created_date", 200),
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs-co"],
    queryFn: () => base44.entities.Job.list("-created_date", 200),
  });

  const totalImpact = lines.reduce((s, l) => s + (l.total || 0), 0);

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        line_items: lines.map(({ _id, ...r }) => r),
        cost_impact: totalImpact,
        ...(form.status === "Approved" ? { customer_approval_date: new Date().toISOString() } : {}),
      };
      return editId
        ? base44.entities.ChangeOrder.update(editId, payload)
        : base44.entities.ChangeOrder.create(payload);
    },
    onSuccess: () => { qc.invalidateQueries(["changeOrders"]); setOpen(false); },
  });

  const del = useMutation({
    mutationFn: (id) => base44.entities.ChangeOrder.delete(id),
    onSuccess: () => qc.invalidateQueries(["changeOrders"]),
  });

  function openNew() { setForm({ job_id: "", job_number: "", description: "", status: "Draft", notes: "", customer_signature: "" }); setLines([]); setEditId(null); setOpen(true); }
  function openEdit(co) {
    setForm({ job_id: co.job_id, job_number: co.job_number, description: co.description, status: co.status, notes: co.notes || "", customer_signature: co.customer_signature || "" });
    setLines((co.line_items || []).map(l => ({ ...l, _id: Math.random().toString(36).slice(2) })));
    setEditId(co.id);
    setOpen(true);
  }

  function updateLine(idx, field, value) {
    setLines(prev => {
      const next = [...prev];
      next[idx] = calcLine({ ...next[idx], [field]: field === "quantity" || field === "unit_cost" ? parseFloat(value) || 0 : value });
      return next;
    });
  }

  const filtered = changeOrders.filter(co => {
    const matchStatus = statusFilter === "All" || co.status === statusFilter;
    const matchSearch = !search || co.job_number?.toLowerCase().includes(search.toLowerCase()) || co.description?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const filteredJobs = jobs.filter(j =>
    !jobSearch || j.job_name?.toLowerCase().includes(jobSearch.toLowerCase()) || j.job_number?.toLowerCase().includes(jobSearch.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Change Orders</h1>
          <p className="text-sm text-muted-foreground">{changeOrders.length} change orders</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" /> New CO</Button>
      </div>

      <div className="flex gap-3 mb-4">
        <Input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["All", "Draft", "Sent", "Approved", "Rejected"].map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <FileDiff className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No change orders yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(co => (
            <Card key={co.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openEdit(co)}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <FileDiff className="w-8 h-8 text-muted-foreground/40 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-mono text-muted-foreground">{co.job_number}</span>
                      <Badge className={`text-xs ${STATUS_STYLES[co.status]}`}>{co.status}</Badge>
                    </div>
                    <p className="font-medium text-sm">{co.description}</p>
                    <p className="text-xs text-muted-foreground">{co.line_items?.length || 0} line items</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className={`text-lg font-bold ${co.cost_impact < 0 ? "text-destructive" : co.cost_impact > 0 ? "text-emerald-600" : ""}`}>
                      {co.cost_impact >= 0 ? "+" : ""}${(co.cost_impact || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">cost impact</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* CO Editor Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Change Order" : "New Change Order"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Job */}
            <div className="space-y-1">
              <Label>Job *</Label>
              {form.job_number ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 rounded-md border bg-muted/30 text-sm font-mono">{form.job_number}</div>
                  <Button variant="outline" size="sm" onClick={() => setPickJobOpen(true)}>Change</Button>
                </div>
              ) : (
                <Button variant="outline" className="w-full justify-start text-muted-foreground" onClick={() => setPickJobOpen(true)}>
                  Select a job…
                </Button>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label>Description *</Label>
              <Textarea
                rows={2}
                placeholder="Describe the scope change…"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Line Items</Label>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setLines(p => [...p, blankLine()])}>
                  <Plus className="w-3.5 h-3.5" /> Add
                </Button>
              </div>
              <div className="space-y-1.5">
                {lines.length === 0 && (
                  <p className="text-xs text-muted-foreground py-3 text-center">No line items. Add one above.</p>
                )}
                {lines.map((line, idx) => (
                  <div key={line._id} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-1.5 items-center">
                    <Input className="h-8 text-xs" placeholder="Description" value={line.description} onChange={e => updateLine(idx, "description", e.target.value)} />
                    <Select value={line.category} onValueChange={v => updateLine(idx, "category", v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input className="h-8 text-xs" type="number" placeholder="Qty" value={line.quantity} onChange={e => updateLine(idx, "quantity", e.target.value)} />
                    <Input className="h-8 text-xs" type="number" placeholder="Unit Cost" value={line.unit_cost} onChange={e => updateLine(idx, "unit_cost", e.target.value)} />
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setLines(p => p.filter((_, i) => i !== idx))}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              {lines.length > 0 && (
                <div className="flex justify-end mt-2">
                  <p className="text-sm font-bold">
                    Total Impact: <span className={totalImpact >= 0 ? "text-emerald-600" : "text-destructive"}>
                      {totalImpact >= 0 ? "+" : ""}${totalImpact.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </p>
                </div>
              )}
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Draft", "Sent", "Approved", "Rejected"].map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Customer Signature</Label>
                <Input
                  placeholder="Name / initials for approval"
                  value={form.customer_signature}
                  onChange={e => { setForm({ ...form, customer_signature: e.target.value, status: e.target.value ? "Approved" : form.status }); }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Internal notes…" />
            </div>
          </div>

          <DialogFooter>
            {editId && (
              <Button variant="destructive" className="mr-auto" onClick={() => { del.mutate(editId); setOpen(false); }}>
                Delete
              </Button>
            )}
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={!form.job_id || !form.description || save.isPending}>
              {save.isPending ? "Saving…" : editId ? "Save Changes" : "Create CO"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Job picker */}
      <Dialog open={pickJobOpen} onOpenChange={setPickJobOpen}>
        <DialogContent className="max-w-md">
          <h2 className="font-semibold mb-3">Select a Job</h2>
          <Input placeholder="Search…" value={jobSearch} onChange={e => setJobSearch(e.target.value)} className="mb-3" />
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {filteredJobs.map(j => (
              <button
                key={j.id}
                className="w-full text-left px-3 py-2 rounded-lg border hover:bg-muted transition-colors"
                onClick={() => { setForm(f => ({ ...f, job_id: j.id, job_number: j.job_number })); setPickJobOpen(false); }}
              >
                <p className="text-sm font-medium">{j.job_name}</p>
                <p className="text-xs text-muted-foreground font-mono">{j.job_number}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}