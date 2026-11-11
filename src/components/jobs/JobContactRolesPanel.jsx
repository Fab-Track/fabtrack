import React from "react";
import { User, MapPin, Phone, Mail, Navigation } from "lucide-react";
import { formatPhoneDisplay } from "@/lib/phoneFormat";

function FieldLabel({ icon: Icon, children }) {
  return (
    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
      {Icon && <Icon className="w-3 h-3" />}{children}
    </p>
  );
}

function ContactValue({ contact }) {
  if (!contact) return <p className="text-sm text-muted-foreground">Not set</p>;
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="text-sm font-medium truncate">{contact.name}</p>
      {contact.phone && (
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Phone className="w-2.5 h-2.5 shrink-0" /> {formatPhoneDisplay(contact.phone)}
        </div>
      )}
      {contact.email && (
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
          <Mail className="w-2.5 h-2.5 shrink-0" /> {contact.email}
        </div>
      )}
    </div>
  );
}

/**
 * Read-only summary of the job's site and contact roles.
 * These values are set in Edit Job.
 */
export default function JobContactRolesPanel({ job, customer }) {
  const contacts = customer?.contacts || [];
  const locations = customer?.locations || [];

  const findContact = (id) => contacts.find((c) => c.id === id) || null;

  // Site contact is entered on the job's Edit Job form
  const siteContact =
    findContact(job.site_contact_id) ||
    (job.onsite_contact_name || job.onsite_contact_phone || job.onsite_contact_email
      ? { name: job.onsite_contact_name, phone: job.onsite_contact_phone, email: job.onsite_contact_email }
      : null);

  // Bill-to comes from the customer's Edit Customer form
  const billToContact =
    findContact(job.bill_to_contact_id) ||
    (customer?.billing_same_as_primary
      ? (customer?.name || customer?.email || customer?.phone
          ? { name: customer.name, phone: customer.phone, email: customer.email }
          : null)
      : (customer?.billing_contact_name || customer?.billing_contact_phone || customer?.billing_contact_email
          ? { name: customer.billing_contact_name, phone: customer.billing_contact_phone, email: customer.billing_contact_email }
          : null));

  const location = locations.find((l) => l.id === job.location_id) || null;
  const locationAddress = location
    ? location.address || [location.street, location.city, location.state, location.zip].filter(Boolean).join(", ")
    : "";

  // The job's own site address always wins — job site edits never change a saved location
  const siteAddress = job.site_address || locationAddress || "";
  const usesLocation = !!locationAddress && siteAddress === locationAddress;

  // Coordinates make the maps link exact; address is the fallback
  const lat = job.site_lat ?? (usesLocation ? location?.lat : null);
  const lng = job.site_lng ?? (usesLocation ? location?.lng : null);
  const mapsQuery = lat && lng ? `${lat},${lng}` : siteAddress;
  const mapsUrl = mapsQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`
    : null;

  return (
    <div className="border-t border-border mt-3 pt-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        <div className="min-w-0">
          <FieldLabel icon={MapPin}>Job Site</FieldLabel>
          {siteAddress ? (
            <div className="space-y-0.5">
              {usesLocation && (
                <p className="text-sm font-medium truncate">{location.label || location.display_name || "Job Site"}</p>
              )}
              {siteAddress && (
                mapsUrl ? (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-accent hover:underline truncate"
                    title="Open in maps"
                  >
                    <Navigation className="w-2.5 h-2.5 shrink-0" />
                    <span className="truncate">{siteAddress}</span>
                  </a>
                ) : (
                  <p className="text-[11px] text-muted-foreground truncate">{siteAddress}</p>
                )
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Not set</p>
          )}
        </div>

        <div className="min-w-0">
          <FieldLabel icon={User}>Site Contact</FieldLabel>
          <ContactValue contact={siteContact} />
        </div>

        <div className="min-w-0">
          <FieldLabel icon={User}>Drawing Approver</FieldLabel>
          <ContactValue contact={findContact(job.approver_contact_id)} />
        </div>

        <div className="min-w-0">
          <FieldLabel icon={User}>Bill-To Contact</FieldLabel>
          <ContactValue contact={billToContact} />
        </div>
      </div>
    </div>
  );
}