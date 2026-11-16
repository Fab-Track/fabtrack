import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Download, Plus, Send, Save, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { useBackwardMoveGuard } from "@/lib/useBackwardMoveGuard.jsx";
import { useAuth } from "@/lib/AuthContext";
import { useWriteOrgId } from "@/lib/orgContext";
import { useJobDetailConfig } from "@/hooks/useJobDetailConfig";
import CustomerEstimateDoc from "@/components/estimates/customer/CustomerEstimateDoc";
import { buildCustomerDoc } from "@/lib/customerEstimate";
import SendEstimatePanel from "@/components/estimates/SendEstimatePanel";
import { generateEstimatePDF } from "@/lib/estimatePdf";
import useCostGroupData from "@/components/catalog/costgroups/useCostGroupData";
import CatalogPicker from "@/components/estimates/v2/CatalogPicker";
import LineRow from "@/components/estimates/v2/LineRow";
import LineBlock from "@/components/estimates/v2/LineBlock";
import { COMPONENT_COLS, COMPONENT_HEADERS } from "@/components/estimates/v2/ComponentRow";
import FuelRow from "@/components/estimates/v2/FuelRow";
import TakeoffDialog from "@/components/estimates/v2/TakeoffDialog";
import ProfitCard from "@/components/estimates/v2/ProfitCard";
import TotalsCard from "@/components/estimates/v2/TotalsCard";
import EstimateExtras from "@/components/estimates/v2/EstimateExtras";
import { unitLabel, money } from "@/lib/costGroups";
import { nextEstimateNumber } from "@/lib/estimateNumber";
import { calcFuel, fuelLine, hasMargin, lineKind, num, priceLine, r2 } from "@/lib/estimateCalc";

// The one grid every line block shares: cost, then margin, then price.
const COLS = COMPONENT_COLS;
const HEADERS = COMPONENT_HEADERS;
const INSTALL_LOCATIONS = [
  "Interior — Main Staircase", "Interior — Secondary Staircase", "Interior — Loft / Mezzanine",
  "Interior — Balcony / Overlook", "Interior — Basement Staircase", "Interior — Other",
  "Exterior — Front Porch", "Exterior — Front Balcony", "Exterior — Back Deck",
  "Exterior — Back Porch", "Exterior — Side Yard", "Exterior — Pool Area",
  "Exterior — Driveway / Entry", "Exterior — Rooftop / Terrace", "Exterior — Staircase to Grade",
  "Exterior — Other", "Commercial — Staircase", "Commercial — Corridor / Hallway",
  "Commercial — Parking Structure", "Commercial — External Entry", "Commercial — Other", "N/A",
];
const newId = () => Math.random().toString(36).slice(2);
const baseLine = { install_location: "N/A", category: "Labor", quantity: 1, unit: "ls", unit_cost: 0, total: 0, show_photo: true };

// Strip UI-only keys and nulls before saving
function cleanLine({ _id, _warn, _railing_style, _is_staircase, _staircase_type, _fab_hours_base, _install_hours_base, ...rest }) {
  if (!hasMargin(rest.margin_pct)) delete rest.margin_pct;
  if (!hasMargin(rest.fab_margin_pct)) delete rest.fab_margin_pct;
  if (!hasMargin(rest.install_margin_pct)) delete rest.install_margin_pct;
  if (!hasMargin(rest.material_margin_pct)) delete rest.material_margin_pct;
  if (!hasMargin(rest.powder_coat_margin_pct)) delete rest.powder_coat_margin_pct;
  if (rest.show_on_customer_estimate == null) delete rest.show_on_customer_estimate;
  if (!rest._railing_takeoff) delete rest._railing_takeoff;
  if (!rest.hours_override) delete rest.hours_override;
  if (rest.photo_url == null) delete rest.photo_url;
  return { ...rest, quantity: num(rest.quantity), unit_cost: num(rest.unit_cost) };
}

export default function EstimatePage() {
  const { jobId, estimateId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const writeOrgId = useWriteOrgId();
  const isNew = estimateId === "new";
  const { config: jobDetailConfig } = useJobDetailConfig();
  const cat = useCostGroupData();
  const settings = cat.settings;

  const [view, setView] = useState("internal");
  const [sendPanelOpen, setSendPanelOpen] = useState(false);
  const [sentBanner, setSentBanner] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [takeoffLine, setTakeoffLine] = useState(null);

  const [status, setStatus] = useState("Draft");
  const [lines, setLines] = useState([]);
  const [targetMargin, setTargetMargin] = useState(null);
  const [miles, setMiles] = useState("");
  const [extra, setExtra] = useState(1);
  const [fuelMarginPct, setFuelMarginPct] = useState(null);
  const [fuelSeparate, setFuelSeparate] = useState(false);
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
  // Token minted by a save in this session — protects it from being re-minted before the record reloads.
  const mintedShareToken = useRef(null);

  const { data: job } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => base44.entities.Job.list().then((jobs) => jobs.find((j) => j.id === jobId)),
    enabled: !!jobId,
  });
  const { data: existingEstimate } = useQuery({
    queryKey: ["estimate", estimateId],
    queryFn: () => base44.entities.Estimate.list().then((ests) => ests.find((e) => e.id === estimateId)),
    enabled: !isNew && !!estimateId,
  });
  const { data: customer } = useQuery({
    queryKey: ["customer", job?.customer_id],
    queryFn: () => base44.entities.Customer.list().then((cs) => cs.find((c) => c.id === job.customer_id)),
    enabled: !!job?.customer_id,
  });
  const { data: org } = useQuery({
    queryKey: ["organization", user?.organization_id],
    queryFn: () => base44.entities.Organization.get(user.organization_id),
    enabled: !!user?.organization_id,
  });
  const { data: contractSettings } = useQuery({
    queryKey: ["appSettings", "estimate_settings", user?.organization_id],
    queryFn: () => base44.entities.AppSettings.filter({ setting_key: "estimate_settings", organization_id: user.organization_id }).then((r) => r[0] || null),
    enabled: !!user?.organization_id,
  });
  const businessInfo = org
    ? { name: org.name, logo_url: org.logo_url || null, address: org.address || null, phone: org.phone || null }
    : { name: "High Country Metal Works", logo_url: null, address: null, phone: null };

  // Populate once per estimate (refetch on focus must not wipe unsaved edits)
  const populatedFor = useRef(null);
  useEffect(() => {
    if (existingEstimate && populatedFor.current !== estimateId) {
      populatedFor.current = estimateId;
      const e = existingEstimate;
      setStatus(e.status || "Draft");
      setLines((e.line_items || []).filter((l) => !l._is_fuel).map((l) => ({ ...l, _id: newId() })));
      setTargetMargin(e.target_margin_pct ?? null);
      setMiles(e.miles_one_way ?? "");
      setExtra(e.extra_trips ?? 1);
      setFuelMarginPct(e.fuel_margin_pct ?? null);
      setFuelSeparate(!!e.fuel_show_as_separate_line);
      setMarkup(e.markup_percent || 0);
      setOverhead(e.overhead_percent || 0);
      setDiscount(e.discount_percent || 0);
      setTax(e.tax_percent || 0);
      setNotes(e.notes || "");
      setInternalNotes(e.internal_notes || "");
      setSignature(e.customer_signature || "");
      setViewMode(e.view_mode || "summary");
      setEstimateNumber(e.estimate_number || "");
      if (e.estimate_date) setEstimateDate(e.estimate_date);
      if (e.expiration_date) setExpirationDate(e.expiration_date);
    }
  }, [existingEstimate, estimateId]);

  // A brand-new estimate starts its fuel margin at the target, like every other row.
  const fuelInit = useRef(false);
  useEffect(() => {
    if (isNew && !fuelInit.current && settings?.default_target_margin_pct != null) {
      fuelInit.current = true;
      setFuelMarginPct(settings.default_target_margin_pct);
    }
  }, [isNew, settings]);

  const frozen = status !== "Draft";
  const estMargin = targetMargin ?? settings?.default_target_margin_pct ?? 33.3;
  // Fuel keeps its own margin on every record; 0 means at cost.
  const fuelEffMargin = hasMargin(fuelMarginPct) ? num(fuelMarginPct) : 0;
  const snap = frozen && existingEstimate?.fuel_price_per_gal_snapshot != null;
  const fuelPrice = snap ? existingEstimate.fuel_price_per_gal_snapshot : settings?.fuel_price_per_gal || 0;
  const mpg = snap ? existingEstimate.truck_mpg_snapshot : settings?.truck_mpg || 0;

  const priced = useMemo(
    () => lines.map((l) => priceLine(l, { items: cat.items, categories: cat.categories, materials: cat.materials, settings }, estMargin, frozen)),
    [lines, cat.items, cat.categories, cat.materials, settings, estMargin, frozen]
  );
  const fabRate = settings?.labor_fab_rate || 0;
  const installRate = settings?.labor_install_rate || 0;
  const ctx = useMemo(() => ({ items: cat.items, categories: cat.categories, materials: cat.materials, settings }), [cat.items, cat.categories, cat.materials, settings]);
  const fuel = calcFuel({ lines: priced, miles, extra, fuelMarginPct: fuelEffMargin, price: fuelPrice, mpg, hoursPerDay: settings?.install_hours_per_day || 8 });
  const fLine = fuelLine(fuel, miles, extra);

  const subtotal = priced.reduce((s, l) => s + (l.total || 0), 0) + fuel.price;
  const discountAmt = subtotal * (discount / 100);
  const afterDiscount = subtotal - discountAmt;
  const markupAmt = afterDiscount * (markup / 100);
  const afterMarkup = afterDiscount + markupAmt;
  const overheadAmt = afterMarkup * (overhead / 100);
  const afterOverhead = afterMarkup + overheadAmt;
  const taxAmt = afterOverhead * (tax / 100);
  const total = afterOverhead + taxAmt;
  const adjustments = [
    discount > 0 && { label: `Discount (${discount}%)`, value: `−${money(discountAmt)}` },
    markup > 0 && { label: `Markup (${markup}%)`, value: `+${money(markupAmt)}` },
    overhead > 0 && { label: `Overhead (${overhead}%)`, value: `+${money(overheadAmt)}` },
    tax > 0 && { label: `Tax (${tax}%)`, value: `+${money(taxAmt)}` },
  ].filter(Boolean);

  const costLines = priced.filter((l) => lineKind(l) === "cost");
  const hardTotal = costLines.reduce((s, l) => s + num(l.hard_cost), 0) + fuel.cost;
  const calcPrice = costLines.reduce((s, l) => s + (l.total || 0), 0) + fuel.price;

  const actorName = user?.full_name || user?.email || "Team Member";
  const backwardGuard = useBackwardMoveGuard(actorName);
  const outLines = (list) => [...list.map(cleanLine), ...(fLine ? [fLine] : [])];

  const save = useMutation({
    mutationFn: async (nextStatus) => {
      const finalStatus = nextStatus || status;
      const orgId = writeOrgId || user?.organization_id;
      const number = isNew && !estimateNumber ? await nextEstimateNumber(orgId) : estimateNumber;
      const payload = {
        organization_id: writeOrgId, job_id: jobId, job_number: job?.job_number, status: finalStatus,
        estimate_number: number, estimate_date: estimateDate, expiration_date: expirationDate,
        line_items: outLines(priced), subtotal, discount_percent: discount, markup_percent: markup, overhead_percent: overhead, tax_percent: tax, total,
        target_margin_pct: estMargin, miles_one_way: num(miles), extra_trips: num(extra),
        fuel_margin_pct: hasMargin(fuelMarginPct) ? num(fuelMarginPct) : null, fuel_show_as_separate_line: !!fuelSeparate,
        fuel_price_per_gal_snapshot: fuelPrice, truck_mpg_snapshot: mpg, fuel_cost: fuel.cost, fuel_price: fuel.price, total_hard_cost: r2(hardTotal),
        ...(existingEstimate?.share_token || mintedShareToken.current ? {} : { share_token: crypto.randomUUID().replace(/-/g, "") }),
        notes, internal_notes: internalNotes, customer_signature: signature, view_mode: viewMode,
        ...(finalStatus === "Approved" ? { approved_date: approvedDate || new Date().toISOString().split("T")[0] } : {}),
      };
      return isNew ? base44.entities.Estimate.create(payload) : base44.entities.Estimate.update(estimateId, payload);
    },
    onSuccess: async (saved) => {
      const prevStatus = existingEstimate?.status || "Draft";
      const finalStatus = saved?.status || status;
      if (isNew) await backwardGuard.requestMove(job, "Estimate In Progress", "Estimate created");
      if (finalStatus === "Sent" && prevStatus !== "Sent") {
        const res = await backwardGuard.requestMove(job, "Estimate Sent", "Estimate marked Sent");
        if (res?.moved) toast.success("Estimate sent — job moved to Estimate Sent");
        else if (res?.declined) toast("Estimate sent — job stays in its current board");
      }
      if (finalStatus === "Approved" && prevStatus !== "Approved") {
        await base44.entities.Job.update(jobId, { estimate_total: total, customer_approval_status: "approved" });
        const res = await backwardGuard.requestMove({ ...job, estimate_total: total }, "Awaiting Deposit", `Estimate approved by ${signature}`);
        if (res?.moved) toast.success("Estimate approved — job moved to Awaiting Deposit");
        else if (res?.declined) toast("Estimate approved — job stays in its current board");
      }
      qc.invalidateQueries(["estimates"]);
      qc.invalidateQueries(["estimates", jobId]);
      qc.invalidateQueries(["estimate", estimateId]);
      qc.invalidateQueries(["job", jobId]);
      if (isNew && saved?.id) navigate(`/jobs/${jobId}/estimates/${saved.id}`, { replace: true });
      else toast.success("Estimate saved");
    },
  });

  // A share link is only ever built from a persisted token. If the record has none, this
  // awaits the ordinary save, which mints one; the token then comes back on the saved record.
  async function ensureShareToken() {
    if (existingEstimate?.share_token) return existingEstimate.share_token;
    if (isNew && priced.length === 0) return null;
    // A saved record that has not loaded yet must never be saved over unseen data.
    if (!isNew && !existingEstimate) return null;
    try {
      const saved = await save.mutateAsync();
      mintedShareToken.current = saved?.share_token || null;
      return mintedShareToken.current;
    } catch {
      return null;
    }
  }

  function changeLine(idx, patch) {
    setLines((prev) => prev.map((l, i) => {
      if (i !== idx) return l;
      const next = { ...l, ...patch };
      if (lineKind(next) === "legacy" && ("quantity" in patch || "unit_cost" in patch)) next.total = r2(num(next.quantity) * num(next.unit_cost));
      return next;
    }));
  }

  function addFromCatalog(item, category) {
    const fixed = !!category?.is_fixed_price;
    setLines((p) => [...p, {
      ...baseLine, _id: newId(), service_catalog_id: item.id, service_name: item.name, description: item.default_description || item.name,
      is_fixed_price: fixed, unit: fixed ? item.unit || "ls" : unitLabel(category), unit_cost: fixed ? item.default_unit_price || 0 : 0,
      ...(fixed ? {} : { building_type: "Residential", margin_pct: null }),
    }]);
    setPickerOpen(false);
  }
  function addCustom() {
    setLines((p) => [...p, { ...baseLine, _id: newId(), is_fixed_price: true, service_name: "", description: "" }]);
    setPickerOpen(false);
  }

  function startSend() {
    const real = priced;
    if (real.length === 0) return toast.error("Add at least one line item before sending.");
    for (let i = 0; i < real.length; i++) {
      const l = real[i];
      if (!(l.service_name || "").trim()) return toast.error(`Line ${i + 1} has no service name.`);
      if (!(l.description || "").trim()) return toast.error(`Line ${i + 1}${l.service_name ? ` (${l.service_name})` : ""} has no description.`);
    }
    setView("customer");
    setSendPanelOpen(true);
  }

  // show_on_customer_estimate survives this allow-list: it decides what the customer sees.
  const publicLines = (list) => outLines(list).map(({ _is_railing, _railing_takeoff, hard_cost, cost_breakdown, install_hours, hours_override, margin_pct, _takeoff_locked, material_margin_pct, powder_coat_margin_pct, ...r }) => ({
    ...r, components: (r.components || []).map((c) => ({ component_type: c.component_type, name: c.name })),
  }));
  const estimateForView = {
    ...(existingEstimate || {}), status, line_items: publicLines(priced),
    // A sent/approved estimate shows the fuel amount it was saved with, exactly as the share page does.
    fuel_price: frozen && existingEstimate?.fuel_price != null ? existingEstimate.fuel_price : r2(fuel.price),
    fuel_show_as_separate_line: !!fuelSeparate,
    discount_percent: discount, markup_percent: markup, overhead_percent: overhead, tax_percent: tax, subtotal, total,
    notes, view_mode: viewMode, estimate_number: estimateNumber, estimate_date: estimateDate, expiration_date: expirationDate, customer_signature: signature,
  };
  const customerDoc = buildCustomerDoc({
    estimate: estimateForView, settings, customer, businessInfo,
    agreementText: existingEstimate?.agreement_text_snapshot ?? contractSettings?.estimate_contract_text,
  });
  const signedAt = existingEstimate?.status === "Approved" && existingEstimate?.approved_at ? existingEstimate : null;

  if (!job) return <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Loading…</div>;

  const terms = customer?.payment_terms === "Custom" ? `Net ${customer.payment_terms_custom_days || 0}` : customer?.payment_terms || "Net 15";
  const seg = (on) => `px-5 py-2.5 text-sm font-semibold ${on ? "bg-foreground text-background" : "bg-card"}`;

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-5">
        <p className="text-sm"><Link to={`/jobs/${jobId}`} className="text-primary underline">{job.job_name}</Link> <span className="text-muted-foreground">/ Estimates</span></p>
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs font-mono text-muted-foreground">{estimateNumber || "Number assigned on first save"} · auto-numbered</p>
            <h1 className="text-3xl font-bold">{job.job_name}</h1>
            {signedAt && (
              <p className="text-sm text-emerald-700 font-medium mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />Signed by {signedAt.customer_printed_name || signedAt.customer_signature} on {format(new Date(signedAt.approved_at), "MMM d, yyyy")}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge className={status === "Approved" ? "bg-emerald-100 text-emerald-800" : status === "Sent" ? "bg-blue-100 text-blue-800" : "bg-muted text-muted-foreground"}>{status}</Badge>
            <Button variant="outline" onClick={() => save.mutate()} disabled={save.isPending || cat.loading}><Save className="w-4 h-4 mr-1.5" />{save.isPending ? "Saving…" : "Save"}</Button>
            <Button onClick={startSend}><Send className="w-4 h-4 mr-1.5" />Send for signature</Button>
          </div>
        </div>

        {sentBanner && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 text-sm text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />Estimate sent to {sentBanner.email} on {sentBanner.date}
          </div>
        )}

        <div className="bg-card border rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex border rounded-md overflow-hidden">
            <button type="button" className={seg(view === "internal")} onClick={() => setView("internal")}>Internal view</button>
            <button type="button" className={seg(view === "customer")} onClick={() => setView("customer")}>Customer view</button>
          </div>
          {view === "customer" ? <span className="text-xs text-blue-900">This is exactly what the customer receives — no costs, no margin.</span> : <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Target margin</span>
            <Input type="number" step="any" disabled={frozen} className="w-24 h-11 text-lg text-right font-mono border-2 border-primary" value={estMargin} onChange={(e) => setTargetMargin(e.target.value === "" ? 0 : parseFloat(e.target.value))} />
            <span className="font-bold">%</span>
            <span className="text-xs text-muted-foreground">default from Settings</span>
          </div>}
        </div>

        {view === "internal" ? (
          <>
            <div className="bg-card border rounded-xl overflow-x-auto">
              <div style={{ minWidth: 1120 }}>
                <div className="flex items-center justify-between p-4">
                  <h2 className="text-lg font-bold">Line items</h2>
                  <Button variant="outline" onClick={() => setPickerOpen(true)}><Plus className="w-4 h-4 mr-1" />Add from catalog</Button>
                </div>
                <div className="grid items-center gap-2 px-4 py-1.5 border-y bg-muted/40" style={{ gridTemplateColumns: COLS }}>
                  {HEADERS.map((h, i) => <span key={i} className={`text-[11px] font-bold uppercase tracking-wider text-muted-foreground ${i >= 2 && i <= 4 ? "text-right" : ""}`}>{h}</span>)}
                </div>
                {priced.map((l, idx) => lineKind(l) === "cost" ? (
                  <LineBlock key={l._id} line={l} idx={idx} estMargin={estMargin} frozen={frozen} ctx={ctx} item={cat.items.find((i) => i.id === l.service_catalog_id)}
                    colors={jobDetailConfig.powdercoat_colors} locations={INSTALL_LOCATIONS} fabRate={fabRate} installRate={installRate}
                    onChange={changeLine} onRemove={(i) => setLines((p) => p.filter((_, k) => k !== i))} onTakeoff={setTakeoffLine} />
                ) : (
                  <LineRow key={l._id} line={l} idx={idx} frozen={frozen}
                    onChange={changeLine} onRemove={(i) => setLines((p) => p.filter((_, k) => k !== i))} />
                ))}
                {priced.length === 0 && <p className="text-sm text-muted-foreground text-center py-8 border-t">No line items yet. Click "Add from catalog".</p>}
                <FuelRow fuel={fuel} miles={miles} setMiles={setMiles} extra={extra} setExtra={setExtra}
                  fuelMarginPct={hasMargin(fuelMarginPct) ? fuelMarginPct : ""} setFuelMarginPct={(v) => setFuelMarginPct(v === "" ? null : parseFloat(v))}
                  placeholder={fuelEffMargin} separate={fuelSeparate} setSeparate={setFuelSeparate}
                  price={fuelPrice} mpg={mpg} targetMargin={estMargin} frozen={frozen} />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <ProfitCard hard={hardTotal} price={calcPrice} />
              <TotalsCard subtotal={subtotal} adjustments={adjustments} total={total} depositPct={settings?.deposit_pct ?? 50} terms={terms} jobMin={settings?.job_minimum || 0} />
            </div>
            <EstimateExtras s={{ estimateDate, setEstimateDate, expirationDate, setExpirationDate, status, setStatus, notes, setNotes, internalNotes, setInternalNotes, signature, setSignature, approvedDate, setApprovedDate }} />
          </>
        ) : (
          <div className="max-w-4xl mx-auto w-full">
            <div className="flex justify-end mb-3">
              <Button size="sm" variant="outline" onClick={() => generateEstimatePDF(customerDoc)}><Download className="w-4 h-4 mr-1.5" />Download PDF</Button>
            </div>
            <CustomerEstimateDoc doc={customerDoc} preview />
            {sendPanelOpen && (
              <SendEstimatePanel customerDoc={customerDoc} estimate={estimateForView} job={job} customer={customer} businessInfo={businessInfo} onClose={() => setSendPanelOpen(false)} onEnsureShareToken={ensureShareToken}
                onSent={(email) => {
                  setSendPanelOpen(false);
                  setLines(priced);
                  setStatus("Sent");
                  setView("internal");
                  setSentBanner({ email, date: format(new Date(), "MMM d, yyyy") });
                  save.mutate("Sent");
                }} />
            )}
          </div>
        )}
      </div>
      <CatalogPicker open={pickerOpen} onOpenChange={setPickerOpen} categories={cat.categories} items={cat.items} onPick={addFromCatalog} onCustom={addCustom} />
      <TakeoffDialog
        line={takeoffLine}
        materials={cat.materials}
        settings={settings}
        catalogItem={cat.items.find((i) => i.id === takeoffLine?.service_catalog_id)}
        category={cat.categories.find((c) => c.id === cat.items.find((i) => i.id === takeoffLine?.service_catalog_id)?.category_id)}
        onClose={() => setTakeoffLine(null)}
        onApply={(result) => {
          setLines((prev) =>
            prev.map((l) => {
              if (l._id !== takeoffLine?._id) return l;
              return {
                ...l,
                components: result.components,
                hard_cost: result.hard_cost,
                cost_breakdown: result.cost_breakdown,
                _takeoff_locked: true,
                _railing_takeoff: l._railing_takeoff
                  ? { ...l._railing_takeoff, aggregatedMaterials: result.aggregatedMaterials }
                  : null,
              };
            })
          );
        }}
      />
      {backwardGuard.dialog}
    </div>
  );
}