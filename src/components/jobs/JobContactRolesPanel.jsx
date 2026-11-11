import React from "react";
import { User, MapPin, Phone, Mail } from "lucide-react";
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
  const location = locations.find((l) => l.id === job.location_id) || null;
  const siteAddress =
    (location ? location.address || [location.street, location.city, location.state, location.zip].filter(Boolean).join(", ") : "") ||
    job.site_address ||
    "";

  return (
    <div className="border-t border-border mt-3 pt-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        <div className="min-w-0">
          <FieldLabel icon={MapPin}>Job Site</FieldLabel>
          {location || siteAddress ? (
            <div className="space-y-0.5">
              {location && <p className="text-sm font-medium truncate">{location.label || location.display_name || "Job Site"}</p>}
              {siteAddress && <p className="text-[11px] text-muted-foreground truncate">{siteAddress}</p>}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Not set</p>
          )}
        </div>

        <div className="min-w-0">
          <FieldLabel icon={User}>Site Contact</FieldLabel>
          <ContactValue contact={findContact(job.site_contact_id)} />
        </div>

        <div className="min-w-0">
          <FieldLabel icon={User}>Drawing Approver</FieldLabel>
          <ContactValue contact={findContact(job.approver_contact_id)} />
        </div>

        <div className="min-w-0">
          <FieldLabel icon={User}>Bill-To Contact</FieldLabel>
          <ContactValue contact={findContact(job.bill_to_contact_id)} />
        </div>
      </div>
    </div>
  );
}