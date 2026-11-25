/**
 * Maps a Customer.type value to the Job.lead_customer_type enum.
 * Customer types are broader (Homeowner, General Contractor, etc.) while
 * the job lead_customer_type is just "Contractor" or "Homeowner".
 */
export function customerTypeToLeadType(customerType) {
  if (!customerType) return "";
  const t = customerType.toLowerCase();
  if (t === "homeowner") return "Homeowner";
  if (t === "general contractor" || t === "builder / developer" || t === "subcontractor" || t === "commercial business") return "Contractor";
  // "Other" or unknown — leave blank so the user picks
  return "";
}

/**
 * Builds the on-site contact fields from a customer record.
 * Uses the customer's job contact fields first, falling back to
 * primary contact info.
 */
export function deriveOnsiteContactFromCustomer(customer) {
  if (!customer) return { onsite_contact_name: "", onsite_contact_phone: "", onsite_contact_email: "" };
  return {
    onsite_contact_name: customer.job_contact_name || customer.name || "",
    onsite_contact_phone: customer.job_contact_phone || customer.phone || "",
    onsite_contact_email: customer.job_contact_email || customer.email || "",
  };
}

/**
 * The site contact a job starts with when it is created for a customer:
 * the customer's primary directory contact if there is one, otherwise the
 * customer's own details. Without this the job card shows "Not set" until
 * someone opens Edit Job and ticks "Use customer's job contact".
 */
export function deriveSiteContactFromCustomer(customer) {
  if (!customer) return { site_contact_id: "", onsite_contact_name: "", onsite_contact_phone: "", onsite_contact_email: "" };
  const contacts = customer.contacts || [];
  const contact = contacts.find((c) => c.is_primary) || contacts[0] || null;
  if (contact) {
    return {
      site_contact_id: contact.id,
      onsite_contact_name: contact.name || "",
      onsite_contact_phone: contact.phone || "",
      onsite_contact_email: contact.email || "",
    };
  }
  return { site_contact_id: "", ...deriveOnsiteContactFromCustomer(customer) };
}

/**
 * Given a contact object from the customer's contacts[] array,
 * returns the on-site contact fields.
 */
export function contactToOnsiteFields(contact) {
  if (!contact) return { onsite_contact_name: "", onsite_contact_phone: "", onsite_contact_email: "" };
  return {
    onsite_contact_name: contact.name || "",
    onsite_contact_phone: contact.phone || "",
    onsite_contact_email: contact.email || "",
  };
}

/**
 * Given a contact object from the customer's contacts[] array,
 * returns the project contact fields.
 */
export function contactToProjectFields(contact) {
  if (!contact) return { project_contact_name: "", project_contact_phone: "", project_contact_email: "" };
  return {
    project_contact_name: contact.name || "",
    project_contact_phone: contact.phone || "",
    project_contact_email: contact.email || "",
  };
}