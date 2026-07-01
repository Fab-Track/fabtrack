// ─────────────────────────────────────────────────────────────────
// FabTrack Permissions Data
// ─────────────────────────────────────────────────────────────────

export const ROLES = ["admin", "shop_manager", "estimator", "design_specialist", "fabricator", "accountant"];
export const ROLE_LABELS = {
  owner: "Owner",
  admin: "Admin",
  shop_manager: "Shop Manager",
  estimator: "Estimator",
  design_specialist: "Design Specialist",
  fabricator: "Fabricator",
  accountant: "Accountant",
};

export const ROLE_SUMMARIES = {
  admin: "Full access to all features and settings, same as Owner.",
  shop_manager: "Sees Job Board, Schedule, Shop Floor, Work Centers",
  estimator: "Sees Estimates, Customers, Sales Pipeline, Invoices",
  design_specialist: "Sees Job Board, Schedule, Drawing Queue, Documents",
  fabricator: "Sees assigned jobs, clocks in/out, Shop Floor, Work Centers, install schedule and site details",
  accountant: "Sees Invoices, Financial Reports, Customer Balances, Payroll",
};

// Access levels: 3=Full Control, 2=Edit, 1=View Only, 0=No Access
export const ACCESS_LEVELS = [
  { value: 3, symbol: "✦", label: "Full Control", color: "bg-emerald-100 text-emerald-800" },
  { value: 2, symbol: "✎", label: "Edit",         color: "bg-blue-100 text-blue-800" },
  { value: 1, symbol: "👁", label: "View Only",    color: "bg-gray-100 text-gray-700" },
  { value: 0, symbol: "—",  label: "No Access",    color: "bg-red-50 text-red-400" },
];

export const ACCESS_BY_VALUE = Object.fromEntries(ACCESS_LEVELS.map(a => [a.value, a]));

// Permission rows grouped by section
export const PERMISSION_GROUPS = [
  {
    group: "Navigation & Dashboard",
    rows: [
      { id: "dash_shop",       label: "Dashboard — Shop tab" },
      { id: "dash_pipeline",   label: "Dashboard — Pipeline tab" },
      { id: "dash_finance",    label: "Dashboard — Finance tab" },
      { id: "messages",       label: "Messages / Notifications" },
      { id: "reports_sales",  label: "Reports — Sales tab" },
      { id: "reports_financial", label: "Reports — Financial tab" },
      { id: "reports_overview_prod_cust", label: "Reports — Overview/Production/Customers tabs" },
    ],
  },
  {
    group: "Job Board",
    rows: [
      { id: "jobs_view_sales",   label: "View Sales board" },
      { id: "jobs_view_shop",    label: "View Shop board" },
      { id: "jobs_view_billing", label: "View Billing board" },
      { id: "jobs_create",    label: "Create new job" },
      { id: "jobs_edit",      label: "Edit job details" },
      { id: "jobs_delete",    label: "Delete job" },
      { id: "jobs_move",      label: "Move job between pipeline stages" },
      { id: "jobs_costing",   label: "View job costing data" },
      { id: "jobs_contact",   label: "View customer contact info on job" },
    ],
  },
  {
    group: "Estimates",
    rows: [
      { id: "estimates", label: "Estimates (view/create/edit/send/approve/delete)" },
    ],
  },
  {
    group: "Invoices",
    rows: [
      { id: "invoices", label: "Invoices (view/create/edit/send/mark paid/delete)" },
    ],
  },
  {
    group: "Change Orders",
    rows: [
      { id: "change_orders", label: "Change Orders (view/create/edit/send/approve/delete)" },
    ],
  },
  {
    group: "Customers",
    rows: [
      { id: "cust_view",      label: "Customers — view list/profile" },
      { id: "cust_edit",      label: "Customers — create/edit/delete" },
      { id: "cust_financial", label: "Customers — financial/transaction history" },
    ],
  },
  {
    group: "Documents",
    rows: [
      { id: "docs_view_create", label: "Documents — view/upload/create on job" },
      { id: "docs_delete",      label: "Documents — delete" },
    ],
  },
  {
    group: "Schedule",
    rows: [
      { id: "sched_own",      label: "Schedule — view own assignments" },
      { id: "sched_all",      label: "Schedule — view all jobs" },
      { id: "sched_edit",     label: "Schedule — create/edit entries" },
      { id: "sched_assign",   label: "Schedule — assign crew to jobs" },
    ],
  },
  {
    group: "Shop Floor",
    rows: [
      { id: "shop_clock",        label: "Clock in / out (own)" },
      { id: "shop_live",         label: "View live shop status (all employees)" },
      { id: "shop_time_entries", label: "Add / edit / delete time entries" },
      { id: "shop_log",          label: "View Shop Log on job" },
    ],
  },
  {
    group: "Craftsman Score",
    rows: [
      { id: "score_own",              label: "Craftsman Score — view own score" },
      { id: "score_all",              label: "Craftsman Score — view all employees' scores" },
      { id: "score_breakdown_notes",  label: "Craftsman Score — score breakdown / add notes" },
    ],
  },
  {
    group: "Employees",
    rows: [
      { id: "emp_view", label: "Employees — view list/profiles/labor rates" },
      { id: "emp_edit", label: "Employees — edit/deactivate" },
    ],
  },
  {
    group: "Payroll",
    rows: [
      { id: "payroll_own",   label: "Payroll — view own hours & pay" },
      { id: "payroll_admin", label: "Payroll — all employees' payroll / run payroll / edit pay rates" },
    ],
  },
  {
    group: "Work Centers",
    rows: [
      { id: "wc_view",        label: "Work Centers — view" },
      { id: "wc_edit",        label: "Work Centers — create/edit" },
    ],
  },
  {
    group: "Communications",
    rows: [
      { id: "comm_send",          label: "Send messages to customers" },
      { id: "comm_conversations", label: "View all/own customer conversations" },
      { id: "comm_templates",     label: "Access message templates" },
    ],
  },
  {
    group: "Settings",
    rows: [
      { id: "set_admin",    label: "Settings — Company, Users & Roles, Notifications (shop-wide), Message Templates, Integrations, Job Board config" },
      { id: "set_billing",  label: "Settings — Billing & Subscription" },
      { id: "set_personal", label: "Notifications (personal only) / My Account (own)" },
    ],
  },
];

// Default permissions for each non-owner role
// Key: permission row id → access level value (3/2/1/0)
export const DEFAULT_PERMISSIONS = {
  // Admin — full control on every row, same as Owner, but remains an editable column
  admin: {
    dash_shop: 3, dash_pipeline: 3, dash_finance: 3, messages: 3,
    reports_sales: 3, reports_financial: 3, reports_overview_prod_cust: 3,
    jobs_view_sales: 3, jobs_view_shop: 3, jobs_view_billing: 3,
    jobs_create: 3, jobs_edit: 3, jobs_delete: 3, jobs_move: 3, jobs_costing: 3, jobs_contact: 3,
    estimates: 3, invoices: 3, change_orders: 3,
    cust_view: 3, cust_edit: 3, cust_financial: 3,
    docs_view_create: 3, docs_delete: 3,
    sched_own: 3, sched_all: 3, sched_edit: 3, sched_assign: 3,
    shop_clock: 3, shop_live: 3, shop_time_entries: 3, shop_log: 3,
    score_own: 3, score_all: 3, score_breakdown_notes: 3,
    emp_view: 3, emp_edit: 3,
    payroll_own: 3, payroll_admin: 3,
    wc_view: 3, wc_edit: 3,
    comm_send: 3, comm_conversations: 3, comm_templates: 3,
    set_admin: 3, set_billing: 3, set_personal: 3,
  },
  shop_manager: {
    dash_shop: 3, dash_pipeline: 0, dash_finance: 0, messages: 3,
    reports_sales: 0, reports_financial: 0, reports_overview_prod_cust: 0,
    jobs_view_sales: 0, jobs_view_shop: 3, jobs_view_billing: 0,
    jobs_create: 0, jobs_edit: 2, jobs_delete: 0, jobs_move: 2, jobs_costing: 1, jobs_contact: 1,
    estimates: 0, invoices: 0, change_orders: 0,
    cust_view: 1, cust_edit: 0, cust_financial: 0,
    docs_view_create: 0, docs_delete: 0,
    sched_own: 3, sched_all: 3, sched_edit: 3, sched_assign: 3,
    shop_clock: 3, shop_live: 1, shop_time_entries: 0, shop_log: 3,
    score_own: 1, score_all: 1, score_breakdown_notes: 0,
    emp_view: 0, emp_edit: 0,
    payroll_own: 1, payroll_admin: 0,
    wc_view: 1, wc_edit: 0,
    comm_send: 0, comm_conversations: 0, comm_templates: 0,
    set_admin: 0, set_billing: 0, set_personal: 3,
  },
  estimator: {
    dash_shop: 1, dash_pipeline: 3, dash_finance: 1, messages: 3,
    reports_sales: 3, reports_financial: 1, reports_overview_prod_cust: 3,
    jobs_view_sales: 3, jobs_view_shop: 1, jobs_view_billing: 1,
    jobs_create: 3, jobs_edit: 3, jobs_delete: 0, jobs_move: 3, jobs_costing: 3, jobs_contact: 3,
    estimates: 3, invoices: 1, change_orders: 3,
    cust_view: 3, cust_edit: 3, cust_financial: 1,
    docs_view_create: 3, docs_delete: 2,
    sched_own: 1, sched_all: 3, sched_edit: 2, sched_assign: 0,
    shop_clock: 1, shop_live: 0, shop_time_entries: 0, shop_log: 0,
    score_own: 0, score_all: 0, score_breakdown_notes: 0,
    emp_view: 0, emp_edit: 0,
    payroll_own: 1, payroll_admin: 0,
    wc_view: 1, wc_edit: 0,
    comm_send: 3, comm_conversations: 3, comm_templates: 3,
    set_admin: 0, set_billing: 0, set_personal: 3,
  },
  design_specialist: {
    dash_shop: 3, dash_pipeline: 0, dash_finance: 0, messages: 3,
    reports_sales: 0, reports_financial: 0, reports_overview_prod_cust: 0,
    jobs_view_sales: 0, jobs_view_shop: 3, jobs_view_billing: 0,
    jobs_create: 0, jobs_edit: 1, jobs_delete: 0, jobs_move: 2, jobs_costing: 0, jobs_contact: 0,
    estimates: 0, invoices: 0, change_orders: 0,
    cust_view: 0, cust_edit: 0, cust_financial: 0,
    docs_view_create: 3, docs_delete: 0,
    sched_own: 3, sched_all: 1, sched_edit: 0, sched_assign: 0,
    shop_clock: 3, shop_live: 0, shop_time_entries: 0, shop_log: 0,
    score_own: 3, score_all: 0, score_breakdown_notes: 0,
    emp_view: 0, emp_edit: 0,
    payroll_own: 1, payroll_admin: 0,
    wc_view: 1, wc_edit: 0,
    comm_send: 0, comm_conversations: 0, comm_templates: 0,
    set_admin: 0, set_billing: 0, set_personal: 3,
  },
  // Fabricator = merged Fabricator + Installer
  fabricator: {
    dash_shop: 3, dash_pipeline: 0, dash_finance: 0, messages: 3,
    reports_sales: 0, reports_financial: 0, reports_overview_prod_cust: 0,
    jobs_view_sales: 0, jobs_view_shop: 3, jobs_view_billing: 0,
    jobs_create: 0, jobs_edit: 1, jobs_delete: 0, jobs_move: 2, jobs_costing: 0, jobs_contact: 0,
    estimates: 0, invoices: 0, change_orders: 0,
    cust_view: 0, cust_edit: 0, cust_financial: 0,
    docs_view_create: 0, docs_delete: 0,
    sched_own: 3, sched_all: 1, sched_edit: 0, sched_assign: 0,
    shop_clock: 3, shop_live: 0, shop_time_entries: 0, shop_log: 3,
    score_own: 3, score_all: 0, score_breakdown_notes: 0,
    emp_view: 0, emp_edit: 0,
    payroll_own: 1, payroll_admin: 0,
    wc_view: 1, wc_edit: 0,
    comm_send: 0, comm_conversations: 0, comm_templates: 0,
    set_admin: 0, set_billing: 0, set_personal: 3,
  },
  accountant: {
    dash_shop: 1, dash_pipeline: 1, dash_finance: 1, messages: 1,
    reports_sales: 0, reports_financial: 1, reports_overview_prod_cust: 1,
    jobs_view_sales: 0, jobs_view_shop: 0, jobs_view_billing: 3,
    jobs_create: 0, jobs_edit: 0, jobs_delete: 0, jobs_move: 0, jobs_costing: 3, jobs_contact: 1,
    estimates: 0, invoices: 3, change_orders: 1,
    cust_view: 3, cust_edit: 0, cust_financial: 3,
    docs_view_create: 1, docs_delete: 0,
    sched_own: 0, sched_all: 1, sched_edit: 0, sched_assign: 0,
    shop_clock: 0, shop_live: 0, shop_time_entries: 0, shop_log: 0,
    score_own: 0, score_all: 0, score_breakdown_notes: 0,
    emp_view: 0, emp_edit: 0,
    payroll_own: 3, payroll_admin: 3,
    wc_view: 0, wc_edit: 0,
    comm_send: 2, comm_conversations: 2, comm_templates: 0,
    set_admin: 0, set_billing: 1, set_personal: 3,
  },
};

// Flatten all rows for convenience
export const ALL_ROWS = PERMISSION_GROUPS.flatMap(g => g.rows.map(r => ({ ...r, group: g.group })));