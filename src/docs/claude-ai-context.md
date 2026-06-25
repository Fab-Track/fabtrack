# FabTrack — App Context for Claude.ai

> **Purpose:** Paste this entire document into a Claude.ai conversation to give it full context about your FabTrack app built on the Base44 platform.

---

## 1. Overview

**FabTrack** is a specialized operations and project management platform for custom metal fabrication shops. It integrates estimating, production scheduling, shop floor time tracking, and job costing into one unified workflow.

**Platform:** Base44 (backend-as-a-service: auth, database, integrations, hosting)
**Frontend:** React + Tailwind CSS + JavaScript on Vite
**Backend:** Deno Deploy edge functions (in `functions/` folder)
**Architecture:** Multi-tenant SaaS — each organization has fully isolated data via `organization_id` scoping on every entity.

---

## 2. Multi-Tenancy & Roles

### Roles
- `owner` — Full access (org-level admin)
- `admin` — Full access (org-level admin)
- `shop_manager` — Job Board, Schedule, Shop Floor, Work Centers, Inventory
- `estimator` — Estimates, Customers, Sales Pipeline, Invoices
- `design_specialist` — Job Board, Schedule, Drawing Queue, Documents
- `fabricator` — Assigned jobs, clock in/out, Shop Floor, Work Centers, install schedule
- `accountant` — Invoices, Financial Reports, Customer Balances
- `payroll` — Time & Payroll, employee hours, corrections, payroll export
- `super_admin` — Platform owner (no org scope; can see all orgs for support)

### Key Architecture Decisions
- Users have a `roles` array (multi-role support). Old users have single `role` string — normalized via `getUserRoles(user)`.
- Every entity record is scoped to `organization_id` for data isolation.
- `Employee` entity is linked to `User` via email matching (`user_id` field, auto-matched on registration).
- Super admins have no org scope — they manage all organizations from `/super-admin`.
- Onboarding wizard at `/setup` gates new org owners until `onboarding_completed` is true on the Organization.
- Role-aware `RootRouter`: super admins → `/super-admin`, org users → `/dashboard`, unauthenticated → `/login`.

---

## 3. Pipeline Architecture (Core Workflow)

Jobs flow through three pipeline boards: **Sales → Shop → Billing**

### Sales Board Stages
```
New Lead → Estimate in Progress → Estimate Sent → Negotiation / In Review → Awaiting Deposit → Deposit Received / Sale Won
```

### Shop Board Stages
```
New Jobs Landed — Needs Approval → On Deck for Measure → Ready for Measure → Needs Drawing → Drawing Needs Approval → On Deck for Fabrication → Fabricate → Fabrication Complete — Needs Powder Coat → At Powder Coat → Ready for Install → Install in Progress / Not Complete → Install Complete
```

### Billing Board Stages
```
Needs 2nd Half Invoice Created → 2nd Half Invoice Sent → 10 Days Overdue → 15 Days Overdue → 20 Days Overdue → 30 Days Overdue → 30+ Days Overdue → Paid / Closed
```

### Billing overdue auto-calculation
- Based on `invoice_sent_date` vs current date, with payment check
- 10/15/20/30/30+ day overdue buckets

### Board access by role
```js
Sales:   ["owner", "estimator", "admin", "installer"]
Shop:    ["owner", "shop_manager", "fabricator", "installer", "design_specialist", "foreman", "admin"]
Billing: ["owner", "estimator", "admin", "accountant", "installer"]
```

---

## 4. Entity Schemas (Data Model)

All entities have built-in fields: `id`, `created_date`, `updated_date`, `created_by_id`. Below are the custom fields.

### Organization
```
name, slug, logo_url, address, phone, email, website, is_active,
subscription_status (trial|active|past_due|suspended),
plan (trial|starter|professional|enterprise),
stripe_customer_id, stripe_subscription_id, active_user_count,
subscription_period_end, last_billing_sync_at, created_by_user_id,
onboarding_completed (boolean), primary_trade, shop_size,
default_hourly_rate, is_demo, demo_created_at, demo_reset_at
```

### Employee
```
organization_id, user_id (linked Base44 User, null until email match),
name, preferred_name, date_of_birth,
role (welder|fitter|cutter|fabricator|foreman|admin|grinder|estimator|design_specialist|accountant|owner|shop_manager|installer|payroll),
hire_date, work_center_primary, work_center_secondary, hourly_rate, pin (4-digit kiosk PIN),
is_active, employment_status (Full Time|Part Time|Seasonal|Terminated),
start_date, email, phone, personal_email, home_address,
emergency_contact_name/phone/relationship, tshirt_size, profile_photo_url,
years_experience, certifications, has_drivers_license, can_operate_forklift, can_operate_boom_lift,
internal_notes, favorite_energy_drink, favorite_snack, favorite_restaurant,
favorite_music_genre, hobbies, favorite_sports_team, goto_lunch_order,
work_motivation, fun_fact_self, bucket_list_item, fun_fact_team,
onboarding_completed, onboarding_submitted_at, previous_employers,
assigned_sms_number, assigned_comm_email,
gmail_connected, gmail_connected_at, gmail_token_status, gmail_connected_email,
gmail_access_token, gmail_refresh_token, gmail_token_expiry,
calendar_connected, calendar_connected_at, calendar_connected_email,
calendar_access_token, calendar_refresh_token, calendar_token_expiry
```

### Job
```
organization_id, job_number (e.g. HCMW-2025-047), customer_id, customer_name,
job_name, job_type (Fence|Gate|Railing|Staircase|Custom Structure|Other),
pipeline_board (Sales|Shop|Billing), stage, stage_entered_at, stage_history (array),
status (Estimate|Approved|Fab Queue|In Fabrication|Powder Coat|Install Scheduled|Install Complete|Invoiced),
is_archived, archived_at, site_address, expected_install_date, promised_install_date,
design_details, powder_coat_color, powder_coat_code, tools_needed (array),
special_considerations, assigned_crew (array), assigned_crew_names (array),
assigned_estimator, assigned_estimator_name, assigned_rep_id, assigned_rep_name,
customer_approval_status (pending|approved|rejected), internal_notes,
estimate_total, actual_cost, estimated_labor_hours, actual_labor_hours,
last_activity_date, work_center_queue_order (object),
lead_source (Manual|Website Form|Referral|Phone|Other),
lead_customer_phone, lead_customer_email,
second_half_invoice_id, invoice_sent_date,
lead_outcome, lead_outcome_category (Won|Lost|Unqualified|On Hold|Other),
lead_close_reason, lead_lost_to, lead_closed_at, is_lead_closed, close_notes,
follow_up_date, follow_up_notified,
schedule_phases (array of {name, startDate, endDate, status, completedAt, color}),
schedule_created_at, schedule_updated_at,
product_instances (array of {id, product_type, label, data, photos}),
job_level_data ({site_access, materials, site_photos: {before, after}})
```

### Customer
```
organization_id, name, type (Homeowner|General Contractor|Builder/Developer|Commercial Business|Subcontractor|Other),
company, phone, email, address, notes,
job_contact_name/email/phone, billing_contact_name/email/phone, billing_same_as_job
```

### Estimate
```
organization_id, job_id, job_number, estimate_number (e.g. EST-2026-0001),
estimate_date, expiration_date,
service_category (Railing|Staircase|Structural|Gate|Planter Box|Wall Wrap|Awning|Other/Custom),
status (Draft|Sent|Approved|Rejected),
line_items (array of {category, description, quantity, unit, unit_cost, total, phase, install_location, photo_url, show_photo}),
subtotal, discount_percent, markup_percent, overhead_percent, tax_percent, total,
approved_date, approved_at, customer_signature, customer_printed_name,
approval_method (Customer Signed|Verbal Approval|Email Approval),
approved_by_name, approved_by_id,
notes, internal_notes, view_mode (summary|detail),
style_photo_url, railing_style, railing_lnft
```

### Invoice
```
organization_id, invoice_number (e.g. INV-2026-0001), job_id, job_number, job_name,
customer_id, customer_name, site_address, service_category,
invoice_type (Deposit|Progress|Final),
invoice_label (Deposit Invoice (50%)|Full Invoice (100%)|Final Invoice|Progress Invoice|Change Order Invoice),
status (Unpaid|Partial|Paid|Overdue),
payment_method (Check|ACH|Credit Card|Stripe|QuickBooks Online (QBO)),
view_mode (summary|detail),
line_items (array of {group, description, quantity, unit, unit_cost, total, _est_line_idx, _invoiced_amount, _co_id}),
subtotal, discount_percent, tax_percent, tax_amount, total, amount_paid, balance_due,
due_date, issued_date, paid_date, notes, internal_notes
```

### ChangeOrder
```
organization_id, job_id, job_number, description, status (Draft|Sent|Approved|Rejected),
cost_impact, line_items (array of {category, description, quantity, unit_cost, total}),
customer_approval_date, customer_signature, notes
```

### TimeEntry
```
organization_id, employee_id, employee_name, employee_email,
job_id, job_number, work_center (Cut|Fit|Weld|Grind|Powder Coat|Install|Demo|Design|General),
entry_type (shift|break|lunch),
clock_in, clock_out, duration_hours, net_hours, break_minutes,
is_active, is_on_break, break_start,
is_manual, edited_by, edited_by_name, edited_at, edit_reason,
notes, workweek_start (ISO date of Monday), pay_period_label (e.g. 2026-06-01_2026-06-15),
is_flagged (auto-flagged >12hrs no clock-out), flagged_reason, flagged_at,
is_resolved, resolved_by, resolved_by_name, resolved_at, resolution_notes
```
**RLS:** Employees read own entries; owner/admin/shop_manager/foreman/payroll/super_admin read all.

### CommMessage
```
organization_id, job_id, job_number, job_name, customer_id, customer_name,
channel (SMS|Email), direction (outbound|inbound),
status (queued|draft|scheduled|sent|delivered|failed|dismissed),
to_name, to_phone, to_email, from_name, from_email, from_phone,
subject, body, template_id, template_name,
sent_at, scheduled_for, queued_at, error_message, twilio_sid, opened_at,
sent_by_name, assigned_to_employee_id, assigned_to_employee_name,
attachments (array of {url, name, type})
```

### InventoryItem
```
organization_id, name, sku, category (Steel|Hardware|Consumables|Tools|Other),
unit, quantity_on_hand, reorder_point, unit_cost, vendor_id, vendor_name, location, notes
```

### Other Key Entities (brief)
- **PurchaseOrder** — POs linked to jobs/vendors with line items, receiving status
- **JobAttachment** — Files attached to jobs by category (Cut List, Inspiration Photos, etc.)
- **AttachmentCategory** — Configurable attachment categories with versioning support
- **ServiceCatalog** — Reusable service items with default pricing, photos, railing flag
- **ProductServiceLibrary** — Product/service templates for estimate line items
- **MessageChannel** — Team/job/DM channels with membership management
- **ChannelMembership** — User-channel membership with read tracking
- **Notification** — In-app notifications targeted by role or user
- **CorrectionRequest** — Employee requests for time entry corrections
- **AdminActivityLog** — Audit trail for admin/owner actions (impersonation, edits, overrides)
- **TimeAuditLog** — Detailed time tracking audit trail
- **QCInspection** — Quality control inspections on jobs
- **EmployeeDocument/Goal/Review/WriteUp** — Employee management records
- **MaterialPriceList/MaterialReservation** — Material pricing and job reservations
- **RailingStyleLibrary** — Pre-built railing style configurations
- **TwilioPhoneNumber** — Assigned SMS numbers per employee
- **AppSettings** — Per-org settings (business hours, Stripe config, Gmail sender, etc.)
- **SuperAdminAuditLog** — Platform-level audit trail for super admin actions
- **Issue** — Bug/issue tracker (user reports + system errors)
- **MessageTemplate** — SMS/Email templates with stage triggers
- **InventoryDeductionLog** — Material usage tracking with variance analysis
- **Vendor** — Supplier directory
- **ScheduledEvent** — Calendar events

---

## 5. Permission Matrix

Access levels: 3=Full Control, 2=Edit, 1=View Only, 0=No Access

Permissions are grouped by section:
- Navigation & Dashboard (dash_own, dash_other, messages, reports_*)
- Job Board (jobs_view, jobs_create, jobs_edit, jobs_delete, jobs_move, jobs_costing, jobs_contact)
- Estimates (est_view, est_create, est_edit_draft, est_edit_sent, est_send, est_approve, est_delete)
- Invoices (inv_view, inv_create, inv_edit, inv_send, inv_paid, inv_delete)
- Change Orders (co_view, co_create, co_edit, co_send, co_approve, co_delete)
- Customers (cust_view_list, cust_view_profile, cust_view_financial, cust_view_transactions, cust_create, cust_edit, cust_delete)
- Documents (docs_view, docs_financial, docs_create, docs_delete)
- Schedule (sched_own, sched_all, sched_edit, sched_assign)
- Shop Floor (shop_clock, shop_live, shop_manual, shop_edit_time, shop_log)
- Craftsman Score (score_own, score_all, score_detail, score_notes)
- Employees (emp_list, emp_profile, emp_rates, emp_edit, emp_deactivate)
- Inventory (inv_view_items, inv_edit_items, inv_delete_items, inv_po)
- Work Centers (wc_view, wc_edit)
- Communications (comm_send, comm_all, comm_own, comm_templates)
- Settings (set_company, set_users, set_notif_shop, set_notif_self, set_templates, set_integrations, set_jobboard, set_billing, set_account)

Each role has a default permission set defined in `lib/permissionsData.js`.

---

## 6. Billing & Plans

### Plans
| Plan | Price | User Cap | Key Features |
|------|-------|----------|-------------|
| Trial | Free | 5 | Full access (time-limited) |
| Starter | $250/mo + $15/user | 5 | Core job management (no time tracking, payroll, reports, costing) |
| Professional | $350/mo + $15/user | 20 | Full shop management (time tracking, payroll, reports, costing, craftsman score, calendar sync) |
| Enterprise | $500/mo + $15/user | 999 | Everything + advanced roles, integrations, branding, priority support |

### Feature Gates
- `time_tracking`, `payroll`, `reports`, `service_catalog`, `change_orders`, `shop_floor`, `job_costing`, `craftsman_score`, `google_calendar_sync`, `multi_role_access` → Professional
- `advanced_roles`, `advanced_integrations`, `custom_branding`, `priority_support` → Enterprise

---

## 7. Integrations

### Currently Configured
- **Stripe** — Subscription billing (base + metered per-user pricing), webhook handling
- **Twilio** — SMS messaging, inbound/outbound, assigned numbers per employee
- **Gmail** — OAuth-based email sending per employee (access/refresh tokens stored on Employee entity)
- **Google Calendar** — Two-way sync via OAuth (workspace connector "Google Calendar Sync")

### Available Built-in Integrations (via Base44 SDK)
- `InvokeLLM` — AI/LLM calls (supports multiple models, JSON schema responses, web search)
- `UploadFile` / `UploadPrivateFile` — File storage
- `ExtractDataFromUploadedFile` — CSV/Excel/PDF/JSON data extraction
- `SendEmail` — Transactional emails
- `GenerateImage` / `GenerateVideo` / `GenerateSpeech` — AI media generation
- `TranscribeAudio` — Speech-to-text (Whisper)

---

## 8. Backend Functions (Key ones)

### Organization & Onboarding
- `createOrganization` — Super admin creates new org + invites owner
- `createDemoOrg` / `resetDemoOrg` — Demo org management with sample data
- `checkOnboardingStatus` — Returns whether org needs onboarding wizard
- `completeOrgOnboarding` — Finalizes onboarding (sets flag, creates initial data)
- `listOrganizations` — Lists all orgs for super admin
- `deleteOrganization` / `updateOrganization` — Org lifecycle management
- `migrateToOrganization` — Migrates data to org scope

### Time Tracking
- `kioskTimeAction` — Shop floor clock in/out/break/lunch via PIN kiosk
- `autoFlagTimeEntries` — Scheduled: flags entries >12hrs without clock-out
- `getPayrollEntries` — Aggregated payroll data for admin view
- `resolveFlaggedEntry` — Admin resolves auto-flagged time entries
- `linkEmployeeToUser` — Auto-matches Employee to User by email on registration

### Communications
- `sendCustomerMessage` — Sends SMS/Email to customer via Twilio/Gmail
- `sendGmail` — Sends email via employee's connected Gmail
- `twilioInbound` — Webhook handler for inbound SMS
- `gmailOAuthStart` / `gmailOAuthCallback` — Gmail OAuth flow
- `calendarOAuthStart` / `calendarOAuthCallback` — Google Calendar OAuth flow
- `syncEventToGoogle` — Pushes scheduled events to Google Calendar

### Sales Pipeline
- `submitLead` — Public lead form submission → creates Job + Customer
- `sendFollowUpReminders` — Scheduled: reminds estimators of follow-up dates
- `sendTodoReminders` — Scheduled: reminds assignees of job todos
- `queueStageMessage` — Auto-queues message templates on stage transitions

### Shop Pipeline
- `advanceBillingStages` — Scheduled: auto-advances billing overdue stages
- `archiveJobChannelOnPaid` — Archives job message channel when invoice paid
- `archiveOldJobChannels` — Scheduled: archives stale job channels
- `createJobChannel` — Creates job-specific message channel
- `ensurePermanentChannels` — Ensures team channels exist
- `postJobSystemMessage` — Posts system messages to job channels

### Billing
- `createStripeCheckout` — Stripe checkout session for plan purchase
- `createSubscriptionCheckout` — Subscription-specific checkout
- `createBillingPortalSession` — Stripe customer portal
- `getOrgBilling` — Org billing status
- `getStripeStatus` / `saveStripeSettings` — Stripe key management
- `syncPlanUsage` — Syncs active user count for metered billing
- `stripeWebhook` — Handles Stripe webhook events

### Super Admin
- `getPlatformAnalytics` — Platform-wide metrics
- `manageOrgUsers` — Manage users within an org
- `logSuperAdminAction` — Audit logging
- `manageTwilioNumbers` — Twilio number assignment

### Issues & Error Tracking
- `reportIssue` — User-submitted issue reports
- `listIssues` / `updateIssue` — Super admin issue management

---

## 9. App Structure (Pages & Routes)

### Auth Flow
- `/login`, `/register`, `/forgot-password`, `/reset-password` — Auth pages (rendered outside sidebar layout)
- `/` → `RootRouter` (role-aware: super_admin → `/super-admin`, org user → `/dashboard`, unauth → `/login`)
- `/setup` → Onboarding wizard (gated by `OnboardingGate`)
- `/welcome` → Onboarding welcome screen
- `/onboarding` → Employee onboarding survey

### Public Pages (no sidebar)
- `/kiosk` — Shop floor time clock kiosk (PIN-based)
- `/lead` — Public lead intake form
- `/super-admin` — Super admin platform management
- `/estimate-view/:estimateId` — Customer-facing estimate approval
- `/invoice-view/:invoiceId` — Customer-facing invoice view

### Main App (sidebar layout)
- `/dashboard` — Role-specific dashboard (owner, shop_manager, estimator, accountant, fabricator, design_specialist, installer)
- `/jobs` — Job Board (Sales / Shop / Billing tabs)
- `/jobs/new` — New job creation
- `/jobs/:id` — Job detail (tabs: Overview, Project Details, Documents, Costing, Shop Log, Messages, Communications, History, Todos)
- `/jobs/:jobId/estimates/:estimateId` — Estimate editor
- `/work-centers` — Work center management
- `/schedule` — Production scheduling (Calendar, Timeline, List, Crew views)
- `/messages` — Internal team messaging
- `/conversations` — Customer SMS/Email conversations
- `/calendar` — Calendar view
- `/customers` — Customer directory
- `/inventory` — Inventory management
- `/craftsman` — Craftsman Score (employee quality metrics)
- `/employees` — Employee directory
- `/employees/:id` — Employee profile (tabs: Profile, Work Info, Culture, Documents, Goals & Reviews, Disciplinary)
- `/documents` — Document management
- `/settings` — Settings (Company, Users & Roles, Users, Notifications, Integrations, Job Board, Billing, My Account, Security, Payroll, Service Catalog, Attachment Categories, Estimate Contract, Materials Pricing, Style Library, Stripe, Message Templates, Twilio Numbers, Gmail Accounts, Admin Activity Log, Migration Panel)
- `/my-timesheet` — Employee's own timesheet
- `/admin-payroll` — Admin payroll management (Live Status, Pay Period Report, Time Entry Edit, Corrections, Audit Log)
- `/billing` — Plan management & subscription
- `/reports` — Reports (Overview, Sales, Financial, Production, Customers, Closed Leads)

---

## 10. Key Business Logic

### Job Health Calculation
- **Green:** On track (install >20 days out and in early stages, or past install and invoiced)
- **Yellow:** Behind (install <20 days and not yet in fabrication)
- **Red:** Critical (install <10 days and not yet in powder coat, or past due)
- **Gray:** No install date set

### Stalled Job Detection
- Job is stalled if: not Estimate/Install Complete/Invoiced, and `last_activity_date` >5 days ago

### Job Number Format
- `HCMW-{YEAR}-{SEQ}` (e.g. HCMW-2025-047)

### Estimate/Invoice Numbering
- Estimates: `EST-{YEAR}-{SEQ}` (e.g. EST-2026-0001)
- Invoices: `INV-{YEAR}-{SEQ}` (e.g. INV-2026-0001)

### Work Centers
- Cut, Fit, Weld, Grind, Powder Coat, Install, Design, Demo, General

### Time Entry Types
- `shift` — Work time
- `break` — Unpaid short break
- `lunch` — Unpaid lunch

### Pay Period & Workweek
- Workweek starts Monday (day 1) by default (FLSA default)
- Pay period label format: `2026-06-01_2026-06-15`
- Auto-flagging: entries >12 consecutive hours without clock-out are flagged for admin review

---

## 11. Dashboard Variants

### Owner Dashboard
- Pipeline snapshot, sales funnel, cash flow mini
- Team utilization, shop snapshot, upcoming installs
- Revenue by service type, customer LTV, customer mix
- Closed leads, margin tracker, overdue billing
- Needs attention, stalled jobs, recent activity feed

### Shop Manager Dashboard
- Active jobs board, shop stats, fab hours chart
- Work center live status, upcoming installs
- Craftsman score trend

### Estimator Dashboard
- Sales funnel, estimates aging, lead outcomes
- Revenue goal, recent sales activity, follow-ups

### Fabricator Dashboard
- My current job, my jobs this week
- My score breakdown, my upcoming installs
- Month comparison, stats row

### Accountant Dashboard
- Financial reports, customer AR summary
- Outstanding aging, payment behavior

### Design Specialist Dashboard
- Design queue, design stats, approval reminders
- Productivity stats, priority queue

---

## 12. Tech Stack Summary

- **Frontend:** React 18, Tailwind CSS, shadcn/ui, lucide-react, recharts, react-leaflet, framer-motion, three.js, @hello-pangea/dnd, react-quill, react-markdown, @tanstack/react-query
- **Backend:** Deno Deploy edge functions, Base44 SDK (`npm:@base44/sdk@0.8.31`)
- **Auth:** Base44 platform auth (tokens, sessions, email verification)
- **Database:** Base44 entities (JSON schema-based, MongoDB-like with RLS)
- **Integrations:** Stripe, Twilio, Gmail (OAuth), Google Calendar (OAuth)
- **Realtime:** Base44 entity subscriptions (WebSocket-based)
- **File Storage:** Base44 UploadFile (public) / UploadPrivateFile (private with signed URLs)