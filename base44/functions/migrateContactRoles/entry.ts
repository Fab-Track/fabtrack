import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Migration: copies Customer flat contact/address fields into contacts[] and locations[],
// and sets the new role-id fields on existing Job records.
// Old fields are NOT deleted — only hidden from the UI.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const role = (user.role || '').toLowerCase();
    if (!['admin', 'owner', 'super_admin'].includes(role)) {
      return Response.json({ error: 'Forbidden — admin or owner access required' }, { status: 403 });
    }

    const summary = {
      customersProcessed: 0,
      contactsCreated: 0,
      locationsCreated: 0,
      jobsUpdated: 0,
      errors: [],
    };

    // Paginate all customers (service role bypasses RLS — processes all orgs)
    let cursor = null;
    do {
      const page = await base44.asServiceRole.entities.Customer.list({
        sort: '-created_date',
        limit: 100,
        cursor,
      });
      const customers = page.items || [];

      for (const customer of customers) {
        try {
          const contacts = [...(customer.contacts || [])];
          const locations = [...(customer.locations || [])];

          // 1. Migrate job_contact_* into contacts[]
          let jobContactId = null;
          const jcName = (customer.job_contact_name || '').trim();
          const jcEmail = (customer.job_contact_email || '').trim();
          const jcPhone = (customer.job_contact_phone || '').trim();
          if (jcName || jcEmail || jcPhone) {
            const existing = contacts.find(c =>
              (c.name || '').trim().toLowerCase() === jcName.toLowerCase() &&
              (c.phone || '').trim() === jcPhone
            );
            if (existing) {
              jobContactId = existing.id;
            } else {
              const newContact = {
                id: crypto.randomUUID(),
                name: jcName,
                title: '',
                email: jcEmail,
                phone: jcPhone,
                is_primary: contacts.length === 0,
                created_at: new Date().toISOString(),
              };
              contacts.push(newContact);
              jobContactId = newContact.id;
              summary.contactsCreated++;
            }
          }

          // 2. Migrate billing_contact_* into contacts[]
          let billingContactId = null;
          if (customer.billing_same_as_job !== false && jobContactId) {
            billingContactId = jobContactId;
          } else {
            const bcName = (customer.billing_contact_name || '').trim();
            const bcEmail = (customer.billing_contact_email || '').trim();
            const bcPhone = (customer.billing_contact_phone || '').trim();
            if (bcName || bcEmail || bcPhone) {
              const existing = contacts.find(c =>
                (c.name || '').trim().toLowerCase() === bcName.toLowerCase() &&
                (c.phone || '').trim() === bcPhone
              );
              if (existing) {
                billingContactId = existing.id;
              } else {
                const newContact = {
                  id: crypto.randomUUID(),
                  name: bcName,
                  title: 'Billing',
                  email: bcEmail,
                  phone: bcPhone,
                  is_primary: false,
                  created_at: new Date().toISOString(),
                };
                contacts.push(newContact);
                billingContactId = newContact.id;
                summary.contactsCreated++;
              }
            }
          }

          // 3. Migrate address fields into locations[]
          let locationId = null;
          const street = (customer.address_street || '').trim();
          const city = (customer.address_city || '').trim();
          const state = (customer.address_state || '').trim();
          const zip = (customer.address_zip || '').trim();
          const fullAddress = (customer.address || '').trim() ||
            [street, city, state, zip].filter(Boolean).join(', ');
          if (fullAddress) {
            const existing = locations.find(l =>
              (l.address || '').toLowerCase() === fullAddress.toLowerCase() ||
              ((l.street || '').toLowerCase() === street.toLowerCase() && street)
            );
            if (existing) {
              locationId = existing.id;
            } else {
              const newLocation = {
                id: crypto.randomUUID(),
                label: 'Primary Address',
                street,
                city,
                state,
                zip,
                address: fullAddress,
                display_name: 'Primary Address',
                created_at: new Date().toISOString(),
              };
              locations.push(newLocation);
              locationId = newLocation.id;
              summary.locationsCreated++;
            }
          }

          // 4. Update customer with new contacts[] and locations[]
          const customerChanged =
            contacts.length !== (customer.contacts || []).length ||
            locations.length !== (customer.locations || []).length;
          if (customerChanged) {
            await base44.asServiceRole.entities.Customer.update(customer.id, { contacts, locations });
          }

          // 5. Set role-id fields on this customer's existing jobs
          //    Also merge job-level contact data (onsite_contact_*, project_contact_*) into contacts[]
          const jobs = await base44.asServiceRole.entities.Job.filter({ customer_id: customer.id });
          let contactsChanged = false;
          for (const job of jobs) {
            const updates = {};

            // --- Site contact ---
            const osName = (job.onsite_contact_name || '').trim();
            const osPhone = (job.onsite_contact_phone || '').trim();
            const osEmail = (job.onsite_contact_email || '').trim();
            let jobSiteContactId = job.site_contact_id || (jobContactId && !osName ? jobContactId : null);

            if (osName || osPhone || osEmail) {
              // Find an existing contact matching the job's onsite data
              let match = contacts.find(c =>
                (c.name || '').trim().toLowerCase() === osName.toLowerCase() &&
                (c.phone || '').trim() === osPhone
              );
              if (!match && osName) {
                match = contacts.find(c => (c.name || '').trim().toLowerCase() === osName.toLowerCase());
              }
              if (match) {
                // Merge missing phone/email into the existing contact
                let contactPatched = false;
                if (osPhone && !match.phone) { match.phone = osPhone; contactPatched = true; }
                if (osEmail && !match.email) { match.email = osEmail; contactPatched = true; }
                if (contactPatched) contactsChanged = true;
                jobSiteContactId = match.id;
              } else if (osName) {
                // Create a new contact from the job's onsite data
                const newC = {
                  id: crypto.randomUUID(),
                  name: osName,
                  title: '',
                  email: osEmail,
                  phone: osPhone,
                  is_primary: false,
                  created_at: new Date().toISOString(),
                };
                contacts.push(newC);
                contactsChanged = true;
                jobSiteContactId = newC.id;
                summary.contactsCreated++;
              }
            }
            if (jobSiteContactId && !job.site_contact_id) updates.site_contact_id = jobSiteContactId;

            // --- Approver (project) contact ---
            const pcName = (job.project_contact_name || '').trim();
            const pcPhone = (job.project_contact_phone || '').trim();
            const pcEmail = (job.project_contact_email || '').trim();
            if (pcName || pcPhone || pcEmail) {
              let match = contacts.find(c =>
                (c.name || '').trim().toLowerCase() === pcName.toLowerCase() &&
                (c.phone || '').trim() === pcPhone
              );
              if (!match && pcName) {
                match = contacts.find(c => (c.name || '').trim().toLowerCase() === pcName.toLowerCase());
              }
              if (match) {
                let contactPatched = false;
                if (pcPhone && !match.phone) { match.phone = pcPhone; contactPatched = true; }
                if (pcEmail && !match.email) { match.email = pcEmail; contactPatched = true; }
                if (contactPatched) contactsChanged = true;
                if (!job.approver_contact_id) updates.approver_contact_id = match.id;
              } else if (pcName) {
                const newC = {
                  id: crypto.randomUUID(),
                  name: pcName,
                  title: '',
                  email: pcEmail,
                  phone: pcPhone,
                  is_primary: false,
                  created_at: new Date().toISOString(),
                };
                contacts.push(newC);
                contactsChanged = true;
                if (!job.approver_contact_id) updates.approver_contact_id = newC.id;
                summary.contactsCreated++;
              }
            }

            // --- Bill-to contact ---
            if (billingContactId && !job.bill_to_contact_id) updates.bill_to_contact_id = billingContactId;

            // --- Location ---
            if (locationId && !job.location_id) updates.location_id = locationId;

            if (Object.keys(updates).length > 0) {
              await base44.asServiceRole.entities.Job.update(job.id, updates);
              summary.jobsUpdated++;
            }
          }

          // Persist contacts[] if any were patched/added during job processing
          if (contactsChanged) {
            await base44.asServiceRole.entities.Customer.update(customer.id, { contacts });
          }

          summary.customersProcessed++;
        } catch (err) {
          summary.errors.push({ customerId: customer.id, name: customer.name, error: err.message });
        }
      }

      cursor = page.has_more ? page.next_cursor : null;
    } while (cursor);

    return Response.json({ success: true, ...summary });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}