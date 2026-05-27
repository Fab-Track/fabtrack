import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Returns the assigned phone number info for the current user (matched by email),
 * plus all phone numbers for owner "send as" dropdown.
 */
export function useAssignedSmsNumber(userEmail, enabled = true) {
  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list("-created_date", 100),
    enabled,
    staleTime: 30000,
  });

  const { data: phoneNumbers = [] } = useQuery({
    queryKey: ["twilioPhoneNumbers"],
    queryFn: () => base44.entities.TwilioPhoneNumber.list("sort_order", 50),
    enabled,
    staleTime: 30000,
  });

  const myEmployee = employees.find(e => e.email === userEmail);
  const myAssignedRecord = phoneNumbers.find(n => n.assigned_employee_id === myEmployee?.id);
  const mainNumber = phoneNumbers.find(n => n.is_main);

  // Numbers assigned to employees (for owner "send as" picker)
  const numbersWithEmployees = phoneNumbers
    .filter(n => n.assigned_employee_id || n.is_main)
    .map(n => {
      const emp = employees.find(e => e.id === n.assigned_employee_id);
      return {
        ...n,
        employee: emp || null,
        displayName: n.is_main && !n.assigned_employee_id
          ? "Main Business Number"
          : emp?.name || "Unassigned",
      };
    });

  return {
    myEmployee,
    myAssignedNumber: myAssignedRecord?.phone_number || null,
    myAssignedRecord,
    mainNumber,
    numbersWithEmployees,
    allPhoneNumbers: phoneNumbers,
  };
}

export function formatPhone(e164) {
  if (!e164) return "";
  const digits = e164.replace(/\D/g, "");
  if (digits.length === 11 && digits[0] === "1") {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return e164;
}