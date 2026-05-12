import { differenceInDays, parseISO, isValid } from "date-fns";

export const JOB_STATUSES = [
  "Estimate", "Approved", "Fab Queue", "In Fabrication", 
  "Powder Coat", "Install Scheduled", "Install Complete", "Invoiced"
];

export const STATUS_COLORS = {
  "Estimate": "bg-muted text-muted-foreground",
  "Approved": "bg-blue-100 text-blue-800",
  "Fab Queue": "bg-purple-100 text-purple-800",
  "In Fabrication": "bg-amber-100 text-amber-800",
  "Powder Coat": "bg-orange-100 text-orange-800",
  "Install Scheduled": "bg-cyan-100 text-cyan-800",
  "Install Complete": "bg-emerald-100 text-emerald-800",
  "Invoiced": "bg-gray-100 text-gray-600",
};

export function getJobHealth(job) {
  if (!job.expected_install_date) return "gray";
  const installDate = parseISO(job.expected_install_date);
  if (!isValid(installDate)) return "gray";
  const daysUntilInstall = differenceInDays(installDate, new Date());
  
  if (job.status === "Invoiced" || job.status === "Install Complete") return "green";
  
  // Red: install < 10 days and not yet in powder coat or beyond
  const advancedStatuses = ["Powder Coat", "Install Scheduled", "Install Complete", "Invoiced"];
  if (daysUntilInstall < 10 && !advancedStatuses.includes(job.status)) return "red";
  
  // Yellow: install < 20 days and not yet in fabrication or beyond
  const midStatuses = ["In Fabrication", ...advancedStatuses];
  if (daysUntilInstall < 20 && !midStatuses.includes(job.status)) return "yellow";
  
  // Past due
  if (daysUntilInstall < 0 && job.status !== "Invoiced" && job.status !== "Install Complete") return "red";
  
  return "green";
}

export function getHealthDot(health) {
  const colors = {
    red: "bg-red-500",
    yellow: "bg-amber-500",
    green: "bg-emerald-500",
    gray: "bg-gray-400",
  };
  return colors[health] || colors.gray;
}

export function getHealthBorder(health) {
  const colors = {
    red: "border-l-red-500",
    yellow: "border-l-amber-500",
    green: "border-l-emerald-500",
    gray: "border-l-gray-300",
  };
  return colors[health] || colors.gray;
}

export function isJobStalled(job) {
  if (job.status === "Invoiced" || job.status === "Install Complete" || job.status === "Estimate") return false;
  if (!job.last_activity_date) return true;
  const lastActivity = parseISO(job.last_activity_date);
  if (!isValid(lastActivity)) return true;
  return differenceInDays(new Date(), lastActivity) > 5;
}

export function generateJobNumber() {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, "0");
  return `HCMW-${year}-${seq}`;
}