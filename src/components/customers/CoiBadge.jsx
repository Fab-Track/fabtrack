import React from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { differenceInDays, parseISO, isValid } from "date-fns";

/**
 * Returns true if the customer's COI is expired or expires within 30 days.
 * @param {{ coi_expiration?: string }} customer
 * @returns {boolean}
 */
export function isCoiExpiringSoon(customer) {
  if (!customer?.coi_expiration) return false;
  const d = parseISO(customer.coi_expiration);
  if (!isValid(d)) return false;
  return differenceInDays(d, new Date()) <= 30;
}

/**
 * Small warning badge shown on customer records and job cards
 * when the customer's COI is expiring within 30 days or has passed.
 */
export default function CoiBadge({ customer, className = "" }) {
  if (!isCoiExpiringSoon(customer)) return null;

  const d = parseISO(customer.coi_expiration);
  const days = differenceInDays(d, new Date());
  const expired = days < 0;

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0 rounded border font-medium ${
        expired
          ? "bg-red-100 text-red-700 border-red-200"
          : "bg-amber-100 text-amber-700 border-amber-200"
      } ${className}`}
      title={
        expired
          ? `COI expired ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`
          : `COI expires in ${days} day${days === 1 ? "" : "s"}`
      }
    >
      {expired ? <ShieldAlert className="w-2.5 h-2.5" /> : <AlertTriangle className="w-2.5 h-2.5" />}
      COI {expired ? "expired" : "expiring"}
    </span>
  );
}