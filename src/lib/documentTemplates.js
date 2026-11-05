// Document Library — categories, starter templates and merge fields.

export const CATEGORIES = [
  {
    id: "bid_request",
    label: "Bid Request",
    description: "Collect prices from your vendors before you commit to a scope.",
  },
  {
    id: "customer_order",
    label: "Customer Order",
    description: "Establish a contract between you and the customer and lock in the scope.",
  },
  {
    id: "customer_invoice",
    label: "Customer Invoice",
    description: "Collect payment from the customer.",
  },
  {
    id: "vendor_order",
    label: "Vendor Order",
    description: "Create a commitment to a cost with a supplier.",
  },
  {
    id: "vendor_bill",
    label: "Vendor Bill",
    description: "Record a bill or expense from a vendor.",
  },
];

export const CATEGORY_MAP = CATEGORIES.reduce((acc, c) => ({ ...acc, [c.id]: c }), {});

export const MERGE_FIELDS = [
  "{{company_name}}",
  "{{company_phone}}",
  "{{company_email}}",
  "{{customer_name}}",
  "{{customer_contact}}",
  "{{job_number}}",
  "{{job_name}}",
  "{{site_address}}",
  "{{date}}",
  "{{due_date}}",
  "{{estimate_total}}",
  "{{invoice_number}}",
  "{{invoice_total}}",
  "{{balance_due}}",
  "{{vendor_name}}",
  "{{vendor_contact}}",
  "{{scope_description}}",
];

const money = (n) =>
  typeof n === "number" && n > 0
    ? n.toLocaleString("en-US", { style: "currency", currency: "USD" })
    : "";

const shortDate = (d) => {
  const date = d instanceof Date ? d : new Date();
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

// Values pulled into {{merge}} fields when a document is created from a template.
export function buildMergeContext({ job, customer, org } = {}) {
  const contactId = job?.site_contact_id;
  const siteContact = (customer?.contacts || []).find((c) => c.id === contactId);
  return {
    "{{company_name}}": org?.name || "",
    "{{company_phone}}": org?.phone || "",
    "{{company_email}}": org?.email || "",
    "{{customer_name}}": customer?.display_name || customer?.name || job?.customer_name || "",
    "{{customer_contact}}": siteContact?.name || "",
    "{{job_number}}": job?.job_number || "",
    "{{job_name}}": job?.job_name || "",
    "{{site_address}}": job?.site_address || "",
    "{{date}}": shortDate(),
    "{{due_date}}": job?.promised_install_date || job?.expected_install_date || "",
    "{{estimate_total}}": money(job?.estimate_total),
    "{{invoice_number}}": "",
    "{{invoice_total}}": "",
    "{{balance_due}}": "",
    "{{vendor_name}}": "",
    "{{vendor_contact}}": "",
    "{{scope_description}}": job?.design_details || job?.job_name || "",
  };
}

export function renderTemplate(text, ctx = {}) {
  if (!text) return "";
  return Object.entries(ctx).reduce(
    (out, [key, value]) => out.split(key).join(value == null ? "" : String(value)),
    text
  );
}

const body = (s) => s.trim();

export const DEFAULT_TEMPLATES = [
  {
    category: "bid_request",
    name: "Bid Request",
    body: body(`
BID REQUEST — {{job_number}} {{job_name}}
Date: {{date}}
Vendor: {{vendor_name}}
Contact: {{vendor_contact}}

Project site: {{site_address}}

We are requesting pricing on the following scope:

{{scope_description}}

Please include with your quote:
  - Material cost broken out by item
  - Fabrication or supplier lead time
  - Freight and delivery terms
  - Whether the price is held for 30 days

Please return your pricing by {{due_date}}. Send questions to {{company_phone}}.

Thank you,
{{company_name}}
    `),
  },
  {
    category: "customer_order",
    name: "Change Order",
    body: body(`
CHANGE ORDER — {{job_number}} {{job_name}}
Date: {{date}}
Customer: {{customer_name}}

This change order modifies the scope of work for the project at {{site_address}}.

DESCRIPTION OF CHANGE
{{scope_description}}

PRICE ADJUSTMENT
Original contract total: {{estimate_total}}
This change order: [amount]
Revised contract total: [revised total]

SCHEDULE IMPACT
This change may affect the install date. Any schedule change will be confirmed in writing.

SIGNATURES

Customer: ______________________   Date: __________

{{company_name}}: ______________________   Date: __________
    `),
  },
  {
    category: "customer_order",
    name: "Customer Contract",
    body: body(`
PROJECT AGREEMENT — {{job_number}} {{job_name}}
{{company_name}}  |  {{company_phone}}  |  {{company_email}}
Customer: {{customer_name}}
Project site: {{site_address}}
Date: {{date}}

SCOPE OF WORK
{{scope_description}}

CONTRACT PRICE
Total: {{estimate_total}}

PAYMENT TERMS
A 50% deposit is due before fabrication begins. The remaining balance is due at installation.

MATERIALS
All materials are sourced and fabricated by {{company_name}}. Substitutions of equivalent quality may be made only when a specified material is unavailable.

SCHEDULE
Dates are estimates. {{company_name}} is not responsible for delays caused by weather, site access, or supplier issues outside of our control.

CHANGES
Any change to the scope must be issued as a written change order and approved by both parties.

WARRANTY
Workmanship is warranted for one (1) year from installation. Material warranties follow the manufacturer's terms.

APPROVAL
Signature below authorizes {{company_name}} to begin work upon receipt of the deposit.

Customer: ______________________   Date: __________
PREPARED BY
{{company_name}}
    `),
  },
  {
    category: "customer_order",
    name: "Proposal",
    body: body(`
PROPOSAL — {{job_name}}
Prepared for: {{customer_name}}
Site: {{site_address}}
Date: {{date}}
Prepared by: {{company_name}}

WHAT WE PROPOSE
{{scope_description}}

FINISH AND DETAILS
Finish: [powder coat color / code]
Install location: [interior / exterior]

INVESTMENT
{{estimate_total}}

WHAT'S INCLUDED
  - Shop drawings for your approval
  - Fabrication in our shop
  - Delivery and installation
  - Final walkthrough

NEXT STEP
Approve this proposal online or contact {{company_phone}} with questions.

This proposal is valid for 30 days from {{date}}.
    `),
  },
  {
    category: "customer_order",
    name: "Selections",
    body: body(`
SELECTIONS — {{job_number}} {{job_name}}
Customer: {{customer_name}}
Date: {{date}}

Please confirm the selections below so we can release the job to fabrication.

RAILING STYLE
  Style: ____________________

FINISH
  Color: ____________________
  Sheen: [matte / satin / gloss]

INFILL / PICKETS
  Type: ____________________
  Spacing: ____________________

POSTS & MOUNTING
  Mounting: [top / side / fascia]
  Base plates: [yes / no]

STAIR DETAIL
  Treads: ____________________
  Note: ____________________

NOTES
{{scope_description}}

Customer initials: ______   Date: __________
    `),
  },
  {
    category: "customer_invoice",
    name: "Deposit Invoice",
    body: body(`
DEPOSIT INVOICE — {{invoice_number}}
Date: {{date}}
Bill to: {{customer_name}}
Job: {{job_number}} {{job_name}}
Site: {{site_address}}

Deposit due to release this job to fabrication.

Amount due: {{balance_due}}
Due date: {{due_date}}

Payment methods: check, ACH, or card.
Questions? {{company_phone}} — {{company_email}}

{{company_name}}
    `),
  },
  {
    category: "customer_invoice",
    name: "Invoice",
    body: body(`
INVOICE — {{invoice_number}}
Date: {{date}}
Bill to: {{customer_name}}
Job: {{job_number}} {{job_name}}
Site: {{site_address}}

WORK COMPLETED
{{scope_description}}

Invoice total: {{invoice_total}}
Balance due: {{balance_due}}
Due date: {{due_date}}

Payment methods: check, ACH, or card.
Thank you for your business.

{{company_name}}
    `),
  },
  {
    category: "customer_invoice",
    name: "Progress Invoice",
    body: body(`
PROGRESS INVOICE — {{invoice_number}}
Date: {{date}}
Bill to: {{customer_name}}
Job: {{job_number}} {{job_name}}

Work completed to date:
{{scope_description}}

This billing period: [amount]
Previously billed: [amount]
Invoice total: {{invoice_total}}
Balance due: {{balance_due}}

Due date: {{due_date}}
Payment methods: check, ACH, or card.

{{company_name}}
    `),
  },
  {
    category: "vendor_order",
    name: "Purchase Order",
    body: body(`
PURCHASE ORDER — {{job_number}} {{job_name}}
Date: {{date}}
Vendor: {{vendor_name}}
Contact: {{vendor_contact}}

Ship to: {{company_name}}, {{site_address}}

LINE ITEMS
  1. ______________________________  Qty: ______  Unit: ______
  2. ______________________________  Qty: ______  Unit: ______
  3. ______________________________  Qty: ______  Unit: ______

DELIVERY
Requested delivery date: {{due_date}}
Delivery terms: ____________________

NOTES
{{scope_description}}

Authorized by: ______________________   {{company_name}}
Please confirm receipt and expected ship date.
    `),
  },
  {
    category: "vendor_bill",
    name: "Bill",
    body: body(`
VENDOR BILL
Vendor: {{vendor_name}}
Bill date: {{date}}
Job: {{job_number}} {{job_name}}

CHARGES
{{scope_description}}

Subtotal: ______
Tax: ______
Total: ______

Payment terms: [Net 30]
Notes: ____________________________
    `),
  },
  {
    category: "vendor_bill",
    name: "Expense",
    body: body(`
EXPENSE RECORD
Date: {{date}}
Paid to: {{vendor_name}}
Job: {{job_number}} {{job_name}}

PURPOSE
{{scope_description}}

Amount: ______
Method: [card / check / cash]
Receipt attached: [yes / no]

Notes: ____________________________
    `),
  },
];