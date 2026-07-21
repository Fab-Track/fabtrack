import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Trash2, Send, AlignJustify, LayoutList, CheckCircle2, Save } from "lucide-react";
import { toast } from "sonner";
import { format, addDays, parseISO } from "date-fns";
import { autoMoveSalesStage } from "@/lib/salesPipelineTriggers";
import { useAuth } from "@/lib/AuthContext";
import { useWriteOrgId } from "@/lib/orgContext";
import ProductServiceDropdown from "@/components/estimates/ProductServiceDropdown";
import { useJobDetailConfig } from "@/hooks/useJobDetailConfig";
import { formatPhoneDisplay } from "@/lib/phoneFormat";
import RailingInlineCalc from "@/components/estimates/RailingInlineCalc";
import StaircaseInlineCalc from "@/components/estimates/StaircaseInlineCalc";
import EstimateCustomerView from "@/components/estimates/EstimateCustomerView";
import SendEstimatePanel from "@/components/estimates/SendEstimatePanel";

const CATEGORIES = ["Labor", "Material", "Equipment", "Sub-contractor", "Other"];
const INSTALL_LOCATIONS = [
  "Interior — Main Staircase", "Interior — Secondary Staircase", "Interior — Loft / Mezzanine",
  "Interior — Balcony / Overlook", "Interior — Basement Staircase", "Interior — Other",
  "Exterior — Front Porch", "Exterior — Front Balcony", "Exterior — Back Deck",
  "Exterior — Back Porch", "Exterior — Side Yard", "Exterior — Pool Area",
  "Exterior — Driveway / Entry", "Exterior — Rooftop / Terrace", "Exterior — Staircase to Grade",
  "Exterior — Other", "Commercial — Staircase", "Commercial — Corridor / Hallway",
  "Commercial — Parking Structure", "Commercial — External Entry", "Commercial — Other", "N/A",
];

const blankLine = () => ({
  _id: Math.random().toString(36).slice(2),
  service_name: "",
  description: "",
  install_location: "N/A",
  category: "Labor",
  quantity: 1,
  unit: "ls",
  unit_cost: 0,
  total: 0,
  _is_railing: false,
  _railing_style: null,
  _is_staircase: false,
  _staircase_type: null,
});

function calcLine(line) {
  return { ...line, total: (line.quantity || 0) * (line.unit_cost || 0) };
}

// Generate estimate number from count
function genEstimateNumber(count) {
  const year = new Date().getFullYear();
  return `EST-${year}-${String((count || 0) + 1).padStart(3, "0")}`;
}

export default function EstimatePage() {
  const { jobId, estimateId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const writeOrgId = useWriteOrgId();
  const isNew = estimateId === "new";
  const { config: jobDetailConfig } = useJobDetailConfig();

  const [activeTab, setActiveTab] = useState("edit");
  const [sendPanelOpen, setSendPanelOpen] = useState(false);
  const [sentBanner, setSentBanner] = useState(null);

  // Form state
  const [status, setStatus] = useState("Draft");
  const [lines, setLines] = useState([blankLine()]);
  const [markup, setMarkup] = useState(0);
  const [overhead, setOverhead] = useState(0);
  const [tax, setTax] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("Pricing includes materials, fabrication, powder coat, and installation. Thank you for choosing High Country Metal Works.");
  const [internalNotes, setInternalNotes] = useState("");
  const [signature, setSignature] = useState("");
  const [approvedDate, setApprovedDate] = useState("");
  const [viewMode, setViewMode] = useState("summary");
  const [estimateDate, setEstimateDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [expirationDate, setExpirationDate] = useState(format(addDays(new Date(), 30), "yyyy-MM-dd"));
  const [estimateNumber, setEstimateNumber] = useState("");

  // Data fetches
  const { data: job } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => base44.entities.Job.list().then(jobs => jobs.find(j => j.id === jobId)),
    enabled: !!jobId,
  });

  const { data: existingEstimate } = useQuery({
    queryKey: ["estimate", estimateId],
    queryFn: () => base44.entities.Estimate.list().then(ests => ests.find(e => e.id === estimateId)),
    enabled: !isNew && !!estimateId,
  });

  const { data: customer } = useQuery({
    queryKey: ["customer", job?.customer_id],
    queryFn: () => base44.entities.Customer.list().then(cs => cs.find(c => c.id === job.customer_id)),
    enabled: !!job?.customer_id,
  });

  const { data: allEstimates = [] } = useQuery({
    queryKey: ["estimates", jobId],
    queryFn: () => base44.entities.Estimate.filter({ job_id: jobId }),
    enabled: !!jobId,
  });

  const { data: contractSettings = [] } = useQuery({
    queryKey: ["appSettings", "estimate_settings"],
    queryFn: () => base44.entities.AppSettings.filter({ setting_key: "estimate_settings" }),
  });
  const contractText = contractSettings[0]?.estimate_contract_text || null;

  // Populate form from existing estimate
  useEffect(() => {
    if (existingEstimate) {
      setStatus(existingEstimate.status || "Draft");
      setLines((existingEstimate.line_items || []).map(l => ({ ...l, _id: Math.random().toString(36).slice(2), _is_railing: false, _railing_style: null, _is_staircase: false, _staircase_type: null })));
      setMarkup(existingEstimate.markup_percent || 0);
      setOverhead(existingEstimate.overhead_percent || 0);
      setDiscount(existingEstimate.discount_percent || 0);
      setTax(existingEstimate.tax_percent || 0);
      setNotes(existingEstimate.notes || "");
      setInternalNotes(existingEstimate.internal_notes || "");
      setSignature(existingEstimate.customer_signature || "");
      setViewMode(existingEstimate.view_mode || "summary");
      setEstimateNumber(existingEstimate.estimate_number || "");
      if (existingEstimate.estimate_date) setEstimateDate(existingEstimate.estimate_date);
      if (existingEstimate.expiration_date) setExpirationDate(existingEstimate.expiration_date);
    }
  }, [existingEstimate]);

  // Generate estimate number for new estimates
  useEffect(() => {
    if (isNew && allEstimates.length >= 0 && !estimateNumber) {
      setEstimateNumber(genEstimateNumber(allEstimates.length));
    }
  }, [isNew, allEstimates.length]);

  // Calculations
  const subtotal = lines.reduce((s, l) => s + (l.total || 0), 0);
  const discountAmt = subtotal * (discount / 100);
  const afterDiscount = subtotal - discountAmt;
  const afterMarkup = afterDiscount * (1 + markup / 100);
  const afterOverhead = afterMarkup * (1 + overhead / 100);
  const taxAmt = afterOverhead * (tax / 100);
  const total = afterOverhead + taxAmt;

  const actorName = user?.full_name || user?.email || "Team Member";

  const save = useMutation({
    mutationFn: (nextStatus) => {
      const finalStatus = nextStatus || status;
      const payload = {
        organization_id: writeOrgId,
        job_id: jobId,
        job_number: job?.job_number,
        status: finalStatus,
        estimate_number: estimateNumber,
        estimate_date: estimateDate,
        expiration_date: expirationDate,
        line_items: lines.map(({ _id, _is_railing, _railing_style, _is_staircase, _staircase_type, ...rest }) => rest),
        subtotal,
        discount_percent: discount,
        markup_percent: markup,
        overhead_percent: overhead,
        tax_percent: tax,
        total,
        notes,
        internal_notes: internalNotes,
        customer_signature: signature,
        view_mode: viewMode,
        ...(finalStatus === "Approved" ? { approved_date: approvedDate || new Date().toISOString().split("T")[0] } : {}),
      };
      return isNew
        ? base44.entities.Estimate.create(payload)
        : base44.entities.Estimate.update(estimateId, payload);
    },
    onSuccess: async (savedEstimate) => {
      const prevStatus = existingEstimate?.status || "Draft";
      const finalStatus = savedEstimate?.status || status;

      if (isNew) {
        await autoMoveSalesStage(job, "Estimate In Progress", "Estimate created", actorName);
      }
      if (finalStatus === "Sent" && prevStatus !== "Sent") {
        await autoMoveSalesStage(job, "Estimate Sent", "Estimate marked Sent", actorName);
      }
      if (finalStatus === "Approved" && prevStatus !== "Approved") {
        await base44.entities.Job.update(jobId, { estimate_total: total, customer_approval_status: "approved" });
        await autoMoveSalesStage({ ...job, estimate_total: total }, "Awaiting Deposit", `Estimate approved by ${signature}`, actorName);

        toast.success("Estimate approved — job moved to Awaiting Deposit");
      }

      qc.invalidateQueries(["estimates"]);
      qc.invalidateQueries(["estimates", jobId]);
      qc.invalidateQueries(["job", jobId]);

      if (isNew && savedEstimate?.id) {
        navigate(`/jobs/${jobId}/estimates/${savedEstimate.id}`, { replace: true });
      } else {
        toast.success("Estimate saved");
      }
    },
  });

  function addLine() {
    setLines(prev => [...prev, blankLine()]);
  }

  function updateLine(idx, field, value) {
    setLines(prev => {
      const next = [...prev];
      next[idx] = calcLine({ ...next[idx], [field]: ["quantity", "unit_cost"].includes(field) ? parseFloat(value) || 0 : value });
      return next;
    });
  }

  function removeLine(idx) {
    setLines(prev => prev.filter((_, i) => i !== idx));
  }

  const STAIRCASE_CALC_ITEMS = [
    "Mono Stringer Staircase",
    "Double Stringer Staircase — Steel Treads",
    "Double Stringer Staircase — Concrete Treads",
    "Spiral Staircase",
  ];

  function getStaircaseType(name) {
    if (name.includes("Spiral")) return "spiral";
    return "mono"; // covers mono and both double stringer types
  }

  function handleProductSelect(idx, item) {
    const isStaircaseCalc = STAIRCASE_CALC_ITEMS.some(n => item.name.includes(n.split("—")[0].trim()) || item.name === n);
    const isStaircaseHandrail = item.name === "Staircase Handrail / Railing";
    setLines(prev => {
      const next = [...prev];
      next[idx] = calcLine({
        ...next[idx],
        service_name: item.name,
        description: item.default_description || item.name,
        category: item.default_category || "Labor",
        unit: item.default_unit || "ls",
        unit_cost: item.default_unit_cost || 0,
        _is_railing: !!item.is_railing || isStaircaseHandrail,
        _railing_style: (item.is_railing || isStaircaseHandrail) ? item.name.replace(" Railing", "") : null,
        _is_staircase: isStaircaseCalc,
        _staircase_type: isStaircaseCalc ? getStaircaseType(item.name) : null,
      });
      return next;
    });
  }

  function handleRailingPrice(idx, totalPrice, lnft) {
    setLines(prev => {
      const next = [...prev];
      next[idx] = calcLine({ ...next[idx], quantity: lnft, unit: "lnft", unit_cost: totalPrice / (lnft || 1) });
      return next;
    });
  }

  function handleStaircasePrice(idx, totalPrice, inputQty) {
    setLines(prev => {
      const next = [...prev];
      next[idx] = calcLine({ ...next[idx], quantity: inputQty, unit_cost: totalPrice / (inputQty || 1) });
      return next;
    });
  }

  const estimateForView = {
    ...(existingEstimate || {}),
    status, line_items: lines.map(({ _id, _is_railing, _railing_style, _is_staircase, _staircase_type, ...r }) => r),
    discount_percent: discount, markup_percent: markup, overhead_percent: overhead, tax_percent: tax, total,
    notes, view_mode: viewMode, estimate_number: estimateNumber,
    estimate_date: estimateDate, expiration_date: expirationDate,
    customer_signature: signature,
  };

  if (!job) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Loading…</div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Bar */}
      <div className="sticky top-0 z-20 bg-background border-b px-4 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate(`/jobs/${jobId}`)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to {job.job_name}</span>
            <span className="sm:hidden">Back</span>
          </button>
          <Separator orientation="vertical" className="h-5" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-mono truncate">{estimateNumber || "Draft"}</p>
            <p className="text-sm font-semibold truncate">{job.job_name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge className={status === "Approved" ? "bg-emerald-100 text-emerald-800" : status === "Sent" ? "bg-blue-100 text-blue-800" : "bg-muted text-muted-foreground"}>
            {status}
          </Badge>
          <Button size="sm" variant="outline" className="gap-1 h-8" onClick={() => save.mutate()} disabled={save.isPending}>
            <Save className="w-3.5 h-3.5" />
            {save.isPending ? "Saving…" : "Save"}
          </Button>
          <Button size="sm" className="gap-1.5 h-8 touch-target" onClick={() => { setActiveTab("customer"); setSendPanelOpen(true); }}>
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Review & Send</span>
            <span className="sm:hidden">Send</span>
          </Button>
        </div>
      </div>

      {sentBanner && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Estimate sent to {sentBanner.email} on {sentBanner.date}
        </div>
      )}

      {/* Tabs */}
      <div className="flex-1">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="border-b px-6">
            <TabsList className="h-10 bg-transparent gap-1 -mb-px">
              <TabsTrigger value="edit" className="h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Edit</TabsTrigger>
              <TabsTrigger value="customer" className="h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Customer View</TabsTrigger>
            </TabsList>
          </div>

          {/* ── EDIT TAB ─────────────────────────────── */}
          <TabsContent value="edit" className="mt-0">
            <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-8">

              {/* Header Info */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Customer Info */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm border-b pb-1">Customer</h3>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Name</Label>
                      <p className="text-sm font-medium mt-0.5">{customer?.name || job.customer_name || "—"}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="min-w-0">
                        <Label className="text-xs text-muted-foreground">Email</Label>
                        <p className="text-sm mt-0.5 break-all">{customer?.email || "—"}</p>
                      </div>
                      <div className="min-w-0">
                        <Label className="text-xs text-muted-foreground">Phone</Label>
                        <p className="text-sm mt-0.5 break-all">{customer?.phone ? formatPhoneDisplay(customer.phone) : "—"}</p>
                      </div>
                    </div>
                    {customer?.address && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Address</Label>
                        <p className="text-sm mt-0.5">{customer.address}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Estimate Meta */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm border-b pb-1">Estimate Details</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Job</Label>
                      <p className="text-sm font-medium mt-0.5">{job.job_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{job.job_number}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Estimate #</Label>
                      <p className="text-sm font-medium mt-0.5 font-mono">{estimateNumber}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Date</Label>
                      <Input type="date" className="h-8 text-xs mt-0.5" value={estimateDate} onChange={e => setEstimateDate(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Expiration</Label>
                      <Input type="date" className="h-8 text-xs mt-0.5" value={expirationDate} onChange={e => setExpirationDate(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Status</Label>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["Draft", "Sent", "Approved", "Rejected"].map(s => (
                            <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Line Items</h3>
                  <div className="flex items-center gap-2">
                    {/* View mode toggle */}
                    <div className="flex items-center border rounded-md overflow-hidden h-7">
                      <button
                        type="button"
                        className={`px-2.5 h-full text-xs flex items-center gap-1 transition-colors ${viewMode === "summary" ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:bg-muted"}`}
                        onClick={() => setViewMode("summary")}
                      >
                        <AlignJustify className="w-3 h-3" /> Summary
                      </button>
                      <button
                        type="button"
                        className={`px-2.5 h-full text-xs flex items-center gap-1 transition-colors ${viewMode === "detail" ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:bg-muted"}`}
                        onClick={() => setViewMode("detail")}
                      >
                        <LayoutList className="w-3 h-3" /> Detail
                      </button>
                    </div>
                    <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={addLine}>
                      <Plus className="w-3.5 h-3.5" /> Add Line Item
                    </Button>
                  </div>
                </div>

                {viewMode === "summary" && (
                  <div className="mb-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
                    <strong>Summary View</strong> — Customer sees description, install location, and total only.
                  </div>
                )}

                {/* Desktop: grid layout */}
                <div className="hidden md:block overflow-x-auto -mx-2 px-2">
                  <div style={{ minWidth: 620 }}>
                    {/* Column headers */}
                    <div className="grid gap-1.5 text-xs text-muted-foreground font-medium mb-2 px-1"
                      style={{ gridTemplateColumns: "1.3fr 1.7fr 1.1fr 1fr 0.5fr 0.9fr 0.9fr auto" }}>
                      <span>Service Item</span>
                      <span>Description</span>
                      <span>Install Location</span>
                      <span>Color</span>
                      <span>Qty</span>
                      <span>Unit Cost</span>
                      <span>Amount</span>
                      <span></span>
                    </div>

                    <div className="space-y-1">
                      {lines.map((line, idx) => (
                        <div key={line._id}>
                          <div className="grid gap-1.5 items-center"
                            style={{ gridTemplateColumns: "1.3fr 1.7fr 1.1fr 1fr 0.5fr 0.9fr 0.9fr auto" }}>
                            <ProductServiceDropdown
                              value={line.service_name}
                              onChange={v => updateLine(idx, "service_name", v)}
                              onSelect={item => handleProductSelect(idx, item)}
                            />
                            <Input
                              className="h-8 text-xs"
                              placeholder="Description"
                              value={line.description}
                              onChange={e => updateLine(idx, "description", e.target.value)}
                            />
                            <Select value={line.install_location || "N/A"} onValueChange={v => updateLine(idx, "install_location", v)}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>{INSTALL_LOCATIONS.map(l => <SelectItem key={l} value={l} className="text-xs">{l}</SelectItem>)}</SelectContent>
                            </Select>
                            <Select value={line.color || "none"} onValueChange={v => updateLine(idx, "color", v === "none" ? "" : v)}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Color" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none" className="text-xs">None</SelectItem>
                                {jobDetailConfig.powdercoat_colors.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Input className="h-8 text-xs" type="number" value={line.quantity} onChange={e => updateLine(idx, "quantity", e.target.value)} />
                            <Input className="h-8 text-xs" type="number" placeholder="0.00" value={line.unit_cost} onChange={e => updateLine(idx, "unit_cost", e.target.value)} />
                            <span className="text-sm font-semibold text-right pr-1">
                              ${(line.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeLine(idx)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>

                          {/* Inline Railing Calculator */}
                          {line._is_railing && (
                            <div className="ml-1 mr-8">
                              <RailingInlineCalc
                                styleName={line._railing_style}
                                onPriceChange={(total, lnft) => handleRailingPrice(idx, total, lnft)}
                              />
                            </div>
                          )}

                          {/* Inline Staircase Calculator */}
                          {line._is_staircase && (
                            <div className="ml-1 mr-8">
                              <StaircaseInlineCalc
                                staircaseType={line._staircase_type}
                                onPriceChange={(total, qty) => handleStaircasePrice(idx, total, qty)}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Mobile: card layout */}
                <div className="md:hidden space-y-3">
                  {lines.map((line, idx) => (
                    <div key={line._id} className="bg-card rounded-xl border p-3 space-y-2.5">
                      {/* Service Item */}
                      <div>
                        <Label className="text-[10px] uppercase text-muted-foreground tracking-wider">Service Item</Label>
                        <ProductServiceDropdown
                          value={line.service_name}
                          onChange={v => updateLine(idx, "service_name", v)}
                          onSelect={item => handleProductSelect(idx, item)}
                        />
                      </div>

                      {/* Description */}
                      <div>
                        <Label className="text-[10px] uppercase text-muted-foreground tracking-wider">Description</Label>
                        <Input
                          className="h-9 text-sm mt-0.5"
                          placeholder="Description"
                          value={line.description}
                          onChange={e => updateLine(idx, "description", e.target.value)}
                        />
                      </div>

                      {/* Install Location */}
                      <div>
                        <Label className="text-[10px] uppercase text-muted-foreground tracking-wider">Install Location</Label>
                        <Select value={line.install_location || "N/A"} onValueChange={v => updateLine(idx, "install_location", v)}>
                          <SelectTrigger className="h-9 text-sm w-full mt-0.5"><SelectValue /></SelectTrigger>
                          <SelectContent>{INSTALL_LOCATIONS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>

                      {/* Color */}
                      <div>
                        <Label className="text-[10px] uppercase text-muted-foreground tracking-wider">Color</Label>
                        <Select value={line.color || "none"} onValueChange={v => updateLine(idx, "color", v === "none" ? "" : v)}>
                          <SelectTrigger className="h-9 text-sm w-full mt-0.5"><SelectValue placeholder="Color" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {jobDetailConfig.powdercoat_colors.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Qty + Unit Cost row */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px] uppercase text-muted-foreground tracking-wider">Qty</Label>
                          <Input className="h-9 text-sm mt-0.5" type="number" value={line.quantity} onChange={e => updateLine(idx, "quantity", e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase text-muted-foreground tracking-wider">Unit Cost</Label>
                          <Input className="h-9 text-sm mt-0.5" type="number" placeholder="0.00" value={line.unit_cost} onChange={e => updateLine(idx, "unit_cost", e.target.value)} />
                        </div>
                      </div>

                      {/* Total + Delete */}
                      <div className="flex items-center justify-between pt-1 border-t">
                        <div>
                          <Label className="text-[10px] uppercase text-muted-foreground tracking-wider">Amount</Label>
                          <p className="text-base font-bold mt-0.5">
                            ${(line.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 text-muted-foreground hover:text-destructive touch-target"
                          onClick={() => removeLine(idx)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Inline calculators */}
                      {line._is_railing && (
                        <RailingInlineCalc
                          styleName={line._railing_style}
                          onPriceChange={(total, lnft) => handleRailingPrice(idx, total, lnft)}
                        />
                      )}
                      {line._is_staircase && (
                        <StaircaseInlineCalc
                          staircaseType={line._staircase_type}
                          onPriceChange={(total, qty) => handleStaircasePrice(idx, total, qty)}
                        />
                      )}
                    </div>
                  ))}
                  {lines.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">No line items yet. Click "Add Line Item" to start.</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Adjustments + Summary */}
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">Adjustments</h3>
                  <div className="space-y-2">
                    {[
                      { label: "Discount %", val: discount, set: setDiscount },
                      { label: "Markup %", val: markup, set: setMarkup },
                      { label: "Overhead %", val: overhead, set: setOverhead },
                      { label: "Tax %", val: tax, set: setTax },
                    ].map(({ label, val, set }) => (
                      <div key={label} className="flex items-center gap-3">
                        <Label className="w-28 text-xs shrink-0">{label}</Label>
                        <Input type="number" className="h-8 w-20 text-xs" value={val} onChange={e => set(parseFloat(e.target.value) || 0)} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-sm mb-3">Summary</h3>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span>${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Discount ({discount}%)</span>
                        <span>−${discountAmt.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {markup > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Markup ({markup}%)</span>
                        <span>+${(afterDiscount * markup / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {overhead > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Overhead ({overhead}%)</span>
                        <span>+${(afterMarkup * overhead / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {tax > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Tax ({tax}%)</span>
                        <span>+${taxAmt.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <Separator className="my-1" />
                    <div className="flex justify-between font-bold text-xl pt-1">
                      <span>Total</span>
                      <span>${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Notes */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="font-semibold">Notes <span className="text-xs font-normal text-muted-foreground">(visible to customer)</span></Label>
                  <Textarea rows={4} className="text-sm resize-none" value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">Internal Notes <span className="text-xs font-normal text-muted-foreground">(team only)</span></Label>
                  <Textarea rows={4} className="text-sm resize-none" placeholder="Not visible to customer…" value={internalNotes} onChange={e => setInternalNotes(e.target.value)} />
                </div>
              </div>

              {/* Customer Approval — only visible after Sent */}
              {(status === "Sent" || status === "Approved") && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="font-semibold">Customer Approval</h3>
                    {status === "Approved" && signature ? (
                      <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span className="text-sm font-medium">Approved by {signature}{approvedDate ? ` on ${format(parseISO(approvedDate), "MMM d, yyyy")}` : ""}</span>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground">Enter customer name/initials to record manual approval (phone, in-person, etc.).</p>
                        <div className="grid md:grid-cols-2 gap-4 max-w-lg">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Accepted By</Label>
                            <Input
                              placeholder="Customer name or initials"
                              value={signature}
                              onChange={e => { setSignature(e.target.value); if (e.target.value) setStatus("Approved"); }}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Accepted Date</Label>
                            <Input
                              type="date"
                              value={approvedDate}
                              onChange={e => setApprovedDate(e.target.value)}
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}

              <div className="h-16" />
            </div>
          </TabsContent>

          {/* ── CUSTOMER VIEW TAB ─────────────────────── */}
          <TabsContent value="customer" className="mt-0">
            <div className="relative">
              <div className="max-w-4xl mx-auto px-4 py-8">
                <EstimateCustomerView
                  estimate={estimateForView}
                  job={job}
                  customer={customer}
                  businessInfo={{ address: "High Country Metal Works", phone: "" }}
                  contractText={contractText}
                />
              </div>
              {sendPanelOpen && (
                <SendEstimatePanel
                  estimate={estimateForView}
                  job={job}
                  customer={customer}
                  onClose={() => setSendPanelOpen(false)}
                  onSent={(email) => {
                    setSendPanelOpen(false);
                    setStatus("Sent");
                    setActiveTab("edit");
                    setSentBanner({ email, date: format(new Date(), "MMM d, yyyy") });
                    save.mutate("Sent");
                  }}
                />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}