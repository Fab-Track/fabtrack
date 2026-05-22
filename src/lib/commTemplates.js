// Default message templates — seeded on first load
export const DEFAULT_TEMPLATES = [
  {
    name: "New Lead Response",
    channel: "Both",
    stage_trigger: "New Lead",
    subject: "Thanks for contacting High Country Metal Works",
    sms_body: "Hi {customer_first_name}, this is {sender_name} from High Country Metal Works. Thanks for reaching out! I'll be in touch shortly to discuss your project. Questions? Call or text us at {company_phone}.",
    email_body: "Hi {customer_first_name},\n\nThank you for reaching out to High Country Metal Works. We'd love to help with your project. I'll be following up shortly to learn more about what you need.\n\nIn the meantime, feel free to call or text us at {company_phone}.\n\nLooking forward to connecting!\n\n{sender_name}",
    sort_order: 1,
  },
  {
    name: "Estimate Sent",
    channel: "Both",
    stage_trigger: "Estimate Sent",
    subject: "Your Estimate from High Country Metal Works — {job_name}",
    sms_body: "Hi {customer_first_name}, your estimate for {job_name} is ready to view: {estimate_link}. Questions? Reply here or call {sender_phone}.",
    email_body: "Hi {customer_first_name},\n\nPlease find your estimate for {job_name} at the link below. We'd love to earn your business — let us know if you have any questions or would like to make any adjustments.\n\n{estimate_link}\n\n{sender_name}",
    sort_order: 2,
  },
  {
    name: "Estimate Follow-Up (7 days)",
    channel: "Both",
    stage_trigger: "",
    subject: "Following Up — {job_name} Estimate",
    sms_body: "Hi {customer_first_name}, just checking in on the estimate we sent for {job_name}. Any questions? We're happy to walk you through it. Reply here or call {sender_phone}.",
    email_body: "Hi {customer_first_name},\n\nI wanted to follow up on the estimate we sent for {job_name}. We want to make sure you have everything you need to make a decision.\n\nFeel free to reply with any questions or give us a call at {sender_phone}.\n\n{sender_name}",
    sort_order: 3,
  },
  {
    name: "Deposit Received / Sale Won",
    channel: "Both",
    stage_trigger: "Deposit Received / Sale Won",
    subject: "Deposit Received — {job_name} is on the Schedule!",
    sms_body: "Hi {customer_first_name}, we've received your deposit for {job_name} — you're officially on our schedule! We'll be in touch to coordinate the next steps. Thanks for choosing HCMW!",
    email_body: "Hi {customer_first_name},\n\nGreat news — we've received your deposit and {job_name} is officially on our production schedule. We'll reach out soon to coordinate the measure appointment.\n\nThank you for choosing High Country Metal Works!\n\n{sender_name}",
    sort_order: 4,
  },
  {
    name: "Measure Appointment Scheduling",
    channel: "Both",
    stage_trigger: "On Deck for Measure",
    subject: "Ready to Schedule Your Measure — {job_name}",
    sms_body: "Hi {customer_first_name}, we're ready to schedule your measure for {job_name}. When works best for you? Reply here or call {sender_phone}.",
    email_body: "Hi {customer_first_name},\n\nWe're ready to get your measure scheduled for {job_name}. Please reply with a few dates and times that work for you, or give us a call at {sender_phone} to get something on the calendar.\n\n{sender_name}",
    sort_order: 5,
  },
  {
    name: "Install Date Confirmation",
    channel: "Both",
    stage_trigger: "Install in Progress / Not Complete",
    subject: "Install Date Confirmed — {job_name}",
    sms_body: "Hi {customer_first_name}, your install for {job_name} is scheduled for {install_date}. Our crew will arrive in the morning. Questions? Call {sender_phone}.",
    email_body: "Hi {customer_first_name},\n\nYour installation for {job_name} is confirmed for {install_date}. Our crew will be there in the morning. Please make sure the site is accessible and let us know if anything has changed.\n\nLooking forward to completing your project!\n\n{sender_name}",
    sort_order: 6,
  },
  {
    name: "Install Day Reminder (Day Before)",
    channel: "SMS",
    stage_trigger: "",
    subject: "",
    sms_body: "Hi {customer_first_name}, just a reminder — our crew will be at your location tomorrow for the {job_name} install. Questions? Call {sender_phone}.",
    email_body: "",
    sort_order: 7,
  },
  {
    name: "Install Complete",
    channel: "Both",
    stage_trigger: "Install Complete",
    subject: "Installation Complete — {job_name}",
    sms_body: "Hi {customer_first_name}, your {job_name} install is complete! We hope you love it. Your final invoice will be sent shortly.",
    email_body: "Hi {customer_first_name},\n\nGreat news — your {job_name} installation is complete! We hope you're thrilled with how it turned out. Please find your final invoice attached.\n\nIf you have any questions or concerns don't hesitate to reach out.\n\n{sender_name}",
    sort_order: 8,
  },
  {
    name: "Invoice Sent",
    channel: "Both",
    stage_trigger: "2nd Half Invoice Sent",
    subject: "Invoice from High Country Metal Works — {job_name}",
    sms_body: "Hi {customer_first_name}, your invoice for {job_name} is ready: {invoice_link}. Amount due: {invoice_amount}. Questions? Call {sender_phone}.",
    email_body: "Hi {customer_first_name},\n\nPlease find your invoice for {job_name} at the link below.\n\nAmount due: {invoice_amount}\n\n{invoice_link}\n\nThank you for your business!\n\n{sender_name}",
    sort_order: 9,
  },
  {
    name: "Payment Reminder (10 Days Overdue)",
    channel: "Both",
    stage_trigger: "10 Days Overdue",
    subject: "Payment Reminder — {job_name}",
    sms_body: "Hi {customer_first_name}, just a reminder that your balance of {balance_due} for {job_name} is past due. Please give us a call at {sender_phone} or pay online: {invoice_link}.",
    email_body: "Hi {customer_first_name},\n\nThis is a friendly reminder that your balance of {balance_due} for {job_name} is past due. Please pay at your earliest convenience:\n\n{invoice_link}\n\nIf you have any questions please don't hesitate to reach out.\n\n{sender_name}",
    sort_order: 10,
  },
  {
    name: "Payment Received / Thank You",
    channel: "Both",
    stage_trigger: "Paid / Closed",
    subject: "Payment Received — Thank You!",
    sms_body: "Hi {customer_first_name}, we've received your payment for {job_name}. Thank you! It was a pleasure working with you.",
    email_body: "Hi {customer_first_name},\n\nWe've received your payment for {job_name} — thank you! It was truly a pleasure working with you.\n\nIf you know anyone who could use our services we'd love the referral.\n\nThanks again for choosing High Country Metal Works!\n\n{sender_name}",
    sort_order: 11,
  },
];

export const MERGE_FIELDS = [
  { key: "{customer_first_name}", label: "Customer First Name" },
  { key: "{job_name}", label: "Job Name" },
  { key: "{job_number}", label: "Job Number" },
  { key: "{install_date}", label: "Install Date" },
  { key: "{estimate_amount}", label: "Estimate Amount" },
  { key: "{invoice_amount}", label: "Invoice Amount" },
  { key: "{balance_due}", label: "Balance Due" },
  { key: "{sender_name}", label: "Sender Name" },
  { key: "{sender_phone}", label: "Sender Phone" },
  { key: "{company_phone}", label: "Company Phone" },
  { key: "{estimate_link}", label: "Estimate Link" },
  { key: "{invoice_link}", label: "Invoice Link" },
];

// Stages that auto-queue a message
export const STAGE_QUEUE_MAP = {
  "New Lead": "New Lead Response",
  "Estimate Sent": "Estimate Sent",
  "Deposit Received / Sale Won": "Deposit Received / Sale Won",
  "On Deck for Measure": "Measure Appointment Scheduling",
  "Install in Progress / Not Complete": "Install Date Confirmation",
  "Install Complete": "Install Complete",
  "2nd Half Invoice Sent": "Invoice Sent",
  "10 Days Overdue": "Payment Reminder (10 Days Overdue)",
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

  return text
    .replace(/{customer_first_name}/g, firstName)
    .replace(/{job_name}/g, job.job_name || "{job_name}")
    .replace(/{job_number}/g, job.job_number || "{job_number}")
    .replace(/{install_date}/g, installDate)
    .replace(/{estimate_amount}/g, estimateAmount)
    .replace(/{invoice_amount}/g, invoiceAmount)
    .replace(/{balance_due}/g, balanceDue)
    .replace(/{sender_name}/g, sender.name || "{sender_name}")
    .replace(/{sender_phone}/g, sender.phone || "(801) 210-9103")
    .replace(/{company_phone}/g, "(801) 210-9103")
    .replace(/{estimate_link}/g, estimate ? `[Estimate Link]` : "{estimate_link}")
    .replace(/{invoice_link}/g, invoice ? `[Invoice Link]` : "{invoice_link}");
}

export function smsSegmentCount(text) {
  return Math.ceil((text || "").length / 160) || 1;
}