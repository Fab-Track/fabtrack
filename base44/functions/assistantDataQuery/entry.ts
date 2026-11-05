import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";
import { assistantAccess, forbidden } from "../../shared/assistantAccess.js";

// Read-only, organization-scoped answers about the shop's data.
// Never writes: this function only reads and totals records.
// Access is limited by the signed-in user's FabTrack role.

const OPEN_INVOICE_STATUSES = ["Unpaid", "Partial", "Overdue"];

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const num = (n) => Number(n) || 0;
const todayISO = () => new Date().toISOString().slice(0, 10);

const daysBetween = (from, to) => {
  if (!from) return null;
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86400000);
};

const invoiceDue = (inv) => {
  const balance = num(inv.balance_due);
  if (balance > 0) return round2(balance);
  return round2(Math.max(0, num(inv.total) - num(inv.amount_paid)));
};

const matchesSearch = (search, ...fields) => {
  if (!search) return true;
  return fields.some((f) => String(f || "").toLowerCase().includes(search));
};

async function loadAll(entity, query, sort, max = 2000) {
  const out = [];
  let cursor;
  for (let i = 0; i < 10; i += 1) {
    const page = await entity.filter(query, { sort, limit: 200, cursor });
    const items = Array.isArray(page) ? page : page?.items || [];
    out.push(...items);
    if (Array.isArray(page) || !page?.has_more || !page?.next_cursor || out.length >= max) break;
    cursor = page.next_cursor;
  }
  return out.slice(0, max);
}

// Rate and pricing settings the estimating path needs. Never account keys or tokens.
const SETTINGS_FIELDS = [
  "labor_fab_rate",
  "labor_install_rate",
  "steel_price_per_lb",
  "res_post_height_in",
  "res_picket_length_in",
  "comm_post_height_in",
  "comm_picket_length_in",
  "default_target_margin_pct",
  "fuel_price_per_gal",
  "truck_mpg",
  "fuel_margin_default",
  "install_hours_per_day",
  "job_minimum",
  "deposit_pct",
  "estimate_valid_days",
];

const QUERY_DOMAIN = {
  summary: null,
  outstanding_invoices: "finance",
  overdue_invoices: "finance",
  estimates_awaiting_approval: "estimating",
  jobs_by_stage: "production",
  estimating_context: "estimating",
};

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.organization_id) return Response.json({ error: "No organization on this account" }, { status: 403 });

    const access = assistantAccess(user);
    if (!access) return forbidden();

    const body = await req.json().catch(() => ({}));
    const query = String(body.query || "summary").trim().toLowerCase();
    const search = String(body.search || "").trim().toLowerCase();
    const org = user.organization_id;
    const today = todayISO();

    const known = Object.keys(QUERY_DOMAIN);
    if (!known.includes(query)) {
      return Response.json({ error: `Unknown query. Use one of: ${known.join(", ")}` }, { status: 400 });
    }

    const domain = QUERY_DOMAIN[query];
    if (domain && !access[domain]) {
      return forbidden(
        domain === "finance"
          ? "Your role can't see invoice or financial totals in the assistant."
          : domain === "estimating"
            ? "Your role can't see estimate or pricing data in the assistant."
            : "Your role can't see production data in the assistant.",
      );
    }

    if (query === "summary" && !access.finance && !access.estimating && !access.production) {
      return forbidden();
    }

    const result = { query, as_of: new Date().toISOString(), today, organization_id: org };

    const runInvoices = access.finance && ["summary", "outstanding_invoices", "overdue_invoices"].includes(query);
    const runEstimates = access.estimating && ["summary", "estimates_awaiting_approval"].includes(query);
    const runJobs = access.production && ["summary", "jobs_by_stage"].includes(query);

    if (runInvoices) {
      const invoices = await loadAll(
        base44.entities.Invoice,
        { status: { $in: OPEN_INVOICE_STATUSES } },
        "due_date",
      );

      const open = invoices
        .map((inv) => {
          const due = invoiceDue(inv);
          const pastDue = due > 0 && !!inv.due_date && inv.due_date < today;
          const overdue = pastDue || (due > 0 && inv.status === "Overdue");
          return {
            invoice_number: inv.invoice_number || "",
            customer_name: inv.customer_name || "",
            job_number: inv.job_number || "",
            status: inv.status || "",
            total: round2(inv.total),
            amount_paid: round2(inv.amount_paid),
            balance_due: due,
            due_date: inv.due_date || "",
            days_overdue: overdue ? daysBetween(inv.due_date, today) : 0,
            overdue,
          };
        })
        .filter((inv) => inv.balance_due > 0)
        .filter((inv) => matchesSearch(search, inv.customer_name, inv.job_number, inv.invoice_number));

      const outstanding = open.reduce((s, i) => s + i.balance_due, 0);
      const overdue = open.filter((i) => i.overdue);
      const overdueTotal = overdue.reduce((s, i) => s + i.balance_due, 0);

      const list = query === "overdue_invoices" ? overdue : open;

      result.invoices = {
        outstanding_total: round2(outstanding),
        outstanding_count: open.length,
        overdue_total: round2(overdueTotal),
        overdue_count: overdue.length,
        oldest_due_date: open.length ? open.map((i) => i.due_date).filter(Boolean).sort()[0] || "" : "",
        invoices: list
          .slice()
          .sort((a, b) => b.balance_due - a.balance_due)
          .slice(0, 25),
        shown: Math.min(list.length, 25),
      };
    }

    if (runEstimates) {
      const estimates = await loadAll(base44.entities.Estimate, { status: "Sent" }, "-estimate_date");

      const awaiting = estimates
        .filter((e) => matchesSearch(search, e.estimate_number, e.job_number))
        .map((e) => ({
          estimate_number: e.estimate_number || "",
          job_number: e.job_number || "",
          total: round2(e.total),
          estimate_date: e.estimate_date || "",
          expiration_date: e.expiration_date || "",
          days_waiting: e.estimate_date ? daysBetween(e.estimate_date, today) : null,
          expired: !!e.expiration_date && e.expiration_date < today,
        }));

      result.estimates = {
        awaiting_count: awaiting.length,
        awaiting_total: round2(awaiting.reduce((s, e) => s + e.total, 0)),
        expired_count: awaiting.filter((e) => e.expired).length,
        estimates: awaiting.sort((a, b) => b.total - a.total).slice(0, 25),
      };
    }

    if (runJobs) {
      const jobs = await loadAll(base44.entities.Job, { is_archived: { $ne: true } }, "-updated_date");

      const byStage = new Map();
      jobs.forEach((job) => {
        const board = job.pipeline_board || "Sales";
        const stage = job.stage || "Unknown";
        const key = `${board}||${stage}`;
        byStage.set(key, (byStage.get(key) || 0) + 1);
      });

      result.jobs = {
        active_count: jobs.length,
        by_stage: Array.from(byStage.entries())
          .map(([key, count]) => {
            const [board, stage] = key.split("||");
            return { board, stage, count };
          })
          .sort((a, b) => a.board.localeCompare(b.board) || b.count - a.count),
        overdue_installs: jobs
          .filter((job) => !job.is_lead_closed)
          .filter((job) => job.expected_install_date && job.expected_install_date < today)
          .filter((job) => !["Install Complete", "Invoiced", "Complete", "Closed", "Paid/Closed"].includes(job.stage || ""))
          .slice(0, 25)
          .map((job) => ({
            job_number: job.job_number || "",
            job_name: job.job_name || "",
            customer_name: job.customer_name || "",
            stage: job.stage || "",
            board: job.pipeline_board || "",
            expected_install_date: job.expected_install_date || "",
            days_late: daysBetween(job.expected_install_date, today),
          })),
      };
    }

    if (query === "estimating_context") {
      const settingsRows = await base44.entities.AppSettings.list("-created_date", 1);
      const rawSettings = (Array.isArray(settingsRows) ? settingsRows[0] : settingsRows?.items?.[0]) || {};
      const settings = {};
      SETTINGS_FIELDS.forEach((field) => {
        if (rawSettings[field] !== undefined && rawSettings[field] !== null) {
          settings[field] = rawSettings[field];
        }
      });

      const [services, materials, categories, knowledge] = await Promise.all([
        loadAll(base44.entities.ServiceCatalog, {}, "sort_order", 500),
        loadAll(base44.entities.MaterialPriceList, {}, "name", 500),
        loadAll(base44.entities.CatalogCategory, {}, "sort_order", 200),
        loadAll(base44.entities.AssistantKnowledge, { is_active: true }, "-created_date", 200),
      ]);

      result.settings = settings;
      result.services = services
        .filter((s) => s.is_active !== false)
        .map((s) => ({
          name: s.name || "",
          category: s.category || "",
          unit: s.unit || "",
          description: s.default_description || "",
          is_railing: s.is_railing === true,
          components: s.components || [],
          cost_primary_unit: s.cost_primary_unit || "",
          cost_materials_per_unit: num(s.cost_materials_per_unit),
          cost_fab_hours_per_unit: num(s.cost_fab_hours_per_unit),
          cost_powder_coat_per_unit: num(s.cost_powder_coat_per_unit),
          cost_install_crew_size: num(s.cost_install_crew_size),
          cost_install_hours_per_unit: num(s.cost_install_hours_per_unit),
        }));
      result.materials = materials
        .filter((m) => m.active !== false)
        .map((m) => ({
          name: m.name || "",
          category: m.category || "",
          component_type: m.component_type || [],
          cost_method: m.cost_method || "",
          cost_per_foot: num(m.cost_per_foot),
          cost_per_unit: num(m.cost_per_unit),
          see_unit: m.unit || "",
          stock_length_ft: num(m.stock_length_ft),
          weight_per_ft: num(m.weight_per_ft),
          price_per_lb_override: m.price_per_lb_override ?? null,
        }));
      result.categories = categories.map((c) => ({
        name: c.name || "",
        pricing_unit: c.pricing_unit || "",
        is_railing: c.is_railing === true,
        is_fixed_price: c.is_fixed_price === true,
        post_spacing_in: num(c.post_spacing_in),
        post_width_in: num(c.post_width_in),
        picket_clear_gap_in: num(c.picket_clear_gap_in),
        picket_width_in: num(c.picket_width_in),
        rail_runs: num(c.rail_runs),
      }));
      result.knowledge = knowledge.map((k) => ({
        title: k.title || "",
        category: k.category || "",
        content: k.content || "",
      }));
    }

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}