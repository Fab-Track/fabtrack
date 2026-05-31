// Default message templates — seeded on first load
export const DEFAULT_TEMPLATES = [
  {
    name: "Estimate Sent",
    channel: "Both",
    stage_trigger: "Estimate Sent",
    subject: "Your Estimate from High Country Metal Works — {job_name}",
    sms_body: "Hi {customer_first_name}, your estimate for {job_name} is ready to review — {estimate_link}. Questions? Call or text {company_phone}.",
    email_body: "Hi {customer_first_name},\n\nYour estimate for {job_name} is ready for your review. We've outlined the full scope and pricing — take a look and approve online when you're ready to move forward.\n\nReview & Approve Your Estimate: {estimate_link}\n\nEstimate total: {estimate_amount}\n\nThis estimate is valid for 30 days. If you have any questions about the scope or pricing, just reply to this email or give us a call.\n\nThanks,\n{sender_name}\n{company_name}\n{company_phone}",
    is_active: true,
    sort_order: 1,
  },
  {
    name: "Estimate Follow-Up",
    channel: "Both",
    stage_trigger: "",
    subject: "Following up — {job_name} Estimate",
    sms_body: "Hi {customer_first_name}, just checking in on your estimate for {job_name}. Any questions? {estimate_link}",
    email_body: "Hi {customer_first_name},\n\nI wanted to follow up on the estimate we sent for {job_name}. We'd love to get this project on the schedule for you.\n\nView Your Estimate: {estimate_link}\n\nIf you have any questions or want to adjust the scope, just let me know — happy to talk through it.\n\n{sender_name}\n{company_name}\n{company_phone}",
    is_active: true,
    sort_order: 2,
  },
  {
    name: "Estimate Approved Confirmation",
    channel: "Both",
    stage_trigger: "",
    subject: "Estimate Approved — Next Steps for {job_name}",
    sms_body: "Hi {customer_first_name}, we got your approval on {job_name} — thank you! We'll send your deposit invoice shortly.",
    email_body: "Hi {customer_first_name},\n\nThank you for approving your estimate for {job_name}! We're excited to get started.\n\nHere's what happens next:\n1. We'll send your deposit invoice shortly\n2. Once the deposit is received, we'll schedule your project\n3. We'll keep you updated as work progresses\n\nQuestions in the meantime? Reply here or call us at {company_phone}.\n\n{sender_name}\n{company_name}",
    is_active: true,
    sort_order: 3,
  },
  {
    name: "Deposit Invoice Sent",
    channel: "Both",
    stage_trigger: "",
    subject: "Deposit Invoice — {job_name} ({invoice_number})",
    sms_body: "Hi {customer_first_name}, your deposit invoice for {job_name} is ready — {deposit_amount} due. Pay here: {invoice_link}",
    email_body: "Hi {customer_first_name},\n\nYour deposit invoice for {job_name} is ready. Once we receive your deposit, we'll get your project scheduled.\n\nAmount due: {deposit_amount}\nDue by: {invoice_due_date}\n\nView & Pay Invoice: {invoice_link}\n\nYou can pay by card or ACH bank transfer directly on the invoice page. If you'd prefer to pay by check, please make it out to High Country Metal Works and reference {invoice_number}.\n\n{sender_name}\n{company_name}\n{company_phone}",
    is_active: true,
    sort_order: 4,
  },
  {
    name: "Deposit Payment Received",
    channel: "Both",
    stage_trigger: "Deposit Received / Sale Won",
    subject: "Deposit Received — {job_name}",
    sms_body: "Hi {customer_first_name}, we received your deposit for {job_name} — thank you! We'll be in touch soon to schedule.",
    email_body: "Hi {customer_first_name},\n\nWe've received your deposit for {job_name} — thank you!\n\nWe'll be in touch soon to confirm your project schedule. In the meantime, feel free to reach out with any questions.\n\n{sender_name}\n{company_name}\n{company_phone}",
    is_active: true,
    sort_order: 5,
  },
  {
    name: "Install Scheduled",
    channel: "Both",
    stage_trigger: "Install Scheduled",
    subject: "Install Scheduled — {job_name}",
    sms_body: "Hi {customer_first_name}, your install for {job_name} is scheduled for {install_date} at {install_time}. Reply with any questions.",
    email_body: "Hi {customer_first_name},\n\nGreat news — your installation for {job_name} is scheduled!\n\nDate: {install_date}\nTime: {install_time}\nInstaller: {installer_name}\n\nPlease ensure the install area is accessible at that time. If you need to reschedule or have site access details to share, reply to this email or call us at {company_phone}.\n\nWe'll send a reminder the day before.\n\n{sender_name}\n{company_name}",
    is_active: true,
    sort_order: 6,
  },
  {
    name: "Install Day Reminder",
    channel: "Both",
    stage_trigger: "",
    subject: "Install Tomorrow — {job_name}",
    sms_body: "Hi {customer_first_name}, reminder: your {company_name} install for {job_name} is tomorrow at {install_time}. Questions? {company_phone}",
    email_body: "Hi {customer_first_name},\n\nJust a reminder that your installation for {job_name} is scheduled for tomorrow, {install_date} at {install_time}.\n\n{installer_name} will be on site. Please make sure the area is accessible.\n\nIf anything has changed or you need to reach us, call or text {company_phone}.\n\nSee you tomorrow!\n\n{sender_name}\n{company_name}",
    is_active: true,
    sort_order: 7,
  },
  {
    name: "Final Invoice Sent",
    channel: "Both",
    stage_trigger: "2nd Half Invoice Sent",
    subject: "Final Invoice — {job_name} ({invoice_number})",
    sms_body: "Hi {customer_first_name}, your final invoice for {job_name} is ready — {invoice_amount} due. Pay here: {invoice_link}",
    email_body: "Hi {customer_first_name},\n\nYour project is complete — thank you for choosing High Country Metal Works! Your final invoice for {job_name} is ready.\n\nAmount due: {invoice_amount}\nDue by: {invoice_due_date}\n\nView & Pay Invoice: {invoice_link}\n\nIt's been a pleasure working on this project. If you have any questions about the invoice, just reply here.\n\n{sender_name}\n{company_name}\n{company_phone}",
    is_active: true,
    sort_order: 8,
  },
  {
    name: "Payment Overdue — Day 3",
    channel: "Both",
    stage_trigger: "",
    subject: "Payment Reminder — {invoice_number} for {job_name}",
    sms_body: "Hi {customer_first_name}, just a reminder your invoice for {job_name} ({balance_due}) was due {invoice_due_date}. Pay: {invoice_link}",
    email_body: "Hi {customer_first_name},\n\nThis is a friendly reminder that invoice {invoice_number} for {job_name} was due on {invoice_due_date}.\n\nBalance due: {balance_due}\n\nPay Now: {invoice_link}\n\nIf you've already sent payment, please disregard this message. If you have questions, reply here or call {company_phone}.\n\n{sender_name}\n{company_name}",
    is_active: true,
    sort_order: 9,
  },
  {
    name: "Payment Overdue — Day 14",
    channel: "Both",
    stage_trigger: "",
    subject: "Invoice Past Due — {invoice_number} for {job_name}",
    sms_body: "Hi {customer_first_name}, invoice {invoice_number} for {job_name} is now 14 days past due ({balance_due}). Please pay: {invoice_link}",
    email_body: "Hi {customer_first_name},\n\nInvoice {invoice_number} for {job_name} is now 14 days past due.\n\nBalance due: {balance_due}\n\nPay Now: {invoice_link}\n\nPlease arrange payment at your earliest convenience. If there's an issue we can help resolve, please call us at {company_phone}.\n\n{sender_name}\n{company_name}",
    is_active: true,
    sort_order: 10,
  },
  {
    name: "Payment Overdue — Day 21",
    channel: "Both",
    stage_trigger: "",
    subject: "Action Required — Overdue Invoice {invoice_number}",
    sms_body: "Hi {customer_first_name}, invoice {invoice_number} for {job_name} is 21 days past due ({balance_due}). Please pay immediately: {invoice_link}",
    email_body: "Hi {customer_first_name},\n\nInvoice {invoice_number} for {job_name} is now 21 days past due. We need to resolve this balance of {balance_due} promptly.\n\nPay Now: {invoice_link}\n\nIf you're experiencing difficulties, please contact us immediately at {company_phone} so we can work out a resolution. Continued non-payment may result in additional action.\n\n{sender_name}\n{company_name}\n{company_phone}",
    is_active: true,
    sort_order: 11,
  },
  {
    name: "Final Payment Received",
    channel: "Both",
    stage_trigger: "Paid / Closed",
    subject: "Payment Received — {job_name} is Complete!",
    sms_body: "Hi {customer_first_name}, we received your final payment for {job_name} — thank you! It was a pleasure working with you.",
    email_body: "Hi {customer_first_name},\n\nWe've received your final payment for {job_name} — thank you so much!\n\nIt was a genuine pleasure working on this project with you. If you're happy with the results, we'd love it if you shared your experience with others — referrals mean the world to a small business like ours.\n\nWe hope to work with you again in the future. Don't hesitate to reach out any time.\n\n{sender_name}\n{company_name}\n{company_phone}",
    is_active: true,
    sort_order: 12,
  },
  {
    name: "New Lead Response",
    channel: "Both",
    stage_trigger: "New Lead",
    subject: "Thanks for contacting High Country Metal Works",
    sms_body: "Hi {customer_first_name}, this is {sender_name} from High Country Metal Works. Thanks for reaching out! I'll be in touch shortly to discuss your project. Questions? Call or text us at {company_phone}.",
    email_body: "Hi {customer_first_name},\n\nThank you for reaching out to High Country Metal Works. We'd love to help with your project. I'll be following up shortly to learn more about what you need.\n\nIn the meantime, feel free to call or text us at {company_phone}.\n\nLooking forward to connecting!\n\n{sender_name}\n{company_name}",
    is_active: true,
    sort_order: 13,
  },
];

export const MERGE_FIELDS = [
  { key: "{customer_first_name}", label: "Customer First Name" },
  { key: "{job_name}", label: "Job Name" },
  { key: "{job_number}", label: "Job Number" },
  { key: "{estimate_amount}", label: "Estimate Amount" },
  { key: "{estimate_link}", label: "Estimate Link" },
  { key: "{invoice_number}", label: "Invoice Number" },
  { key: "{invoice_amount}", label: "Invoice Amount" },
  { key: "{invoice_due_date}", label: "Invoice Due Date" },
  { key: "{invoice_link}", label: "Invoice Link" },
  { key: "{deposit_amount}", label: "Deposit Amount" },
  { key: "{balance_due}", label: "Balance Due" },
  { key: "{install_date}", label: "Install Date" },
  { key: "{install_time}", label: "Install Time" },
  { key: "{installer_name}", label: "Installer Name" },
  { key: "{sender_name}", label: "Sender Name" },
  { key: "{company_phone}", label: "Company Phone" },
  { key: "{company_name}", label: "Company Name" },
];

// Stages that auto-queue a message
export const STAGE_QUEUE_MAP = {
  "New Lead": "New Lead Response",
  "Estimate Sent": "Estimate Sent",
  "Deposit Received / Sale Won": "Deposit Payment Received",
  "Install Scheduled": "Install Scheduled",
  "2nd Half Invoice Sent": "Final Invoice Sent",
  "Paid / Closed": "Final Payment Received",
};

// Sample data for template previews
export const SAMPLE_DATA = {
  customer_first_name: "Sarah",
  job_name: "Exterior Deck Railing",
  job_number: "HCMW-2026-335",
  estimate_amount: "$8,750.00",
  estimate_link: "https://app.highcountrymetalworks.com/estimate-view/sample",
  invoice_number: "INV-2026-042",
  invoice_amount: "$4,375.00",
  invoice_due_date: "June 14, 2026",
  invoice_link: "https://app.highcountrymetalworks.com/invoice/sample",
  deposit_amount: "$4,375.00",
  balance_due: "$4,375.00",
  install_date: "June 10, 2026",
  install_time: "8:00 AM",
  installer_name: "Marcus",
  sender_name: "Connor",
  company_phone: "801-210-9103",
  company_name: "High Country Metal Works",
};

// Resolve merge fields against a job + customer + sender context
export function resolveMergeFields(text, { job = {}, customer = {}, sender = {}, estimate = null, invoice = null } = {}) {
  if (!text) return text;
  const firstName = (customer.name || job.customer_name || "").split(" ")[0] || "there";
  const installDate = job.expected_install_date
    ? new Date(job.expected_install_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    : "{install_date}";
  const estimateAmount = estimate?.total ? `$${estimate.total.toLocaleString()}` : "{estimate_amount}";
  const invoiceAmount = invoice?.total ? `$${invoice.total.toLocaleString()}` : "{invoice_amount}";
  const balanceDue = invoice?.balance_due ? `$${invoice.balance_due.toLocaleString()}` : "{balance_due}";
  const depositAmount = invoice?.invoice_type === "Deposit" && invoice?.total ? `$${invoice.total.toLocaleString()}` : "{deposit_amount}";

  return text
    .replace(/{customer_first_name}/g, firstName)
    .replace(/{job_name}/g, job.job_name || "{job_name}")
    .replace(/{job_number}/g, job.job_number || "{job_number}")
    .replace(/{install_date}/g, installDate)
    .replace(/{install_time}/g, job.install_time || "{install_time}")
    .replace(/{installer_name}/g, job.installer_name || "{installer_name}")
    .replace(/{estimate_amount}/g, estimateAmount)
    .replace(/{invoice_amount}/g, invoiceAmount)
    .replace(/{invoice_number}/g, invoice?.invoice_number || "{invoice_number}")
    .replace(/{invoice_due_date}/g, invoice?.due_date || "{invoice_due_date}")
    .replace(/{deposit_amount}/g, depositAmount)
    .replace(/{balance_due}/g, balanceDue)
    .replace(/{sender_name}/g, sender.name || "{sender_name}")
    .replace(/{sender_phone}/g, sender.phone || "(801) 210-9103")
    .replace(/{company_phone}/g, "(801) 210-9103")
    .replace(/{company_name}/g, "High Country Metal Works")
    .replace(/{estimate_link}/g, estimate ? `[Estimate Link]` : "{estimate_link}")
    .replace(/{invoice_link}/g, invoice ? `[Invoice Link]` : "{invoice_link}");
}

export function resolveSampleData(text) {
  if (!text) return text;
  let result = text;
  Object.entries(SAMPLE_DATA).forEach(([key, val]) => {
    result = result.replace(new RegExp(`{${key}}`, "g"), val);
  });
  return result;
}

export function smsSegmentCount(text) {
  return Math.ceil((text || "").length / 160) || 1;
}