/**
 * Shared helpers for the FabTrack messaging system.
 */

export const MANAGEMENT_ROLES = ["admin", "owner", "shop_manager", "estimator", "accountant"];
export const ALL_ROLES = ["admin", "owner", "shop_manager", "estimator", "accountant", "fabricator", "installer", "design_specialist"];
export const GENERAL_ROLES = ALL_ROLES; // everyone

/**
 * Derive a channel slug from job number + job name.
 * e.g. HCMW-2025-041 + "Thornton Estate — Driveway Entry Gate" → "hcmw-2025-041-thornton-estate-gate"
 */
export function jobChannelSlug(jobNumber, jobName) {
  const numPart = jobNumber.toLowerCase();
  // strip special chars, take first 4 words
  const words = jobName
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .map(w => w.toLowerCase())
    .filter(Boolean);
  return `${numPart}-${words.join("-")}`;
}

export function jobChannelDisplayName(jobNumber, jobName) {
  const words = jobName
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
  return `${jobNumber} — ${words}`;
}

/**
 * Returns true if a user with the given role can see a given channel.
 */
export function canAccessChannel(channel, userRole, userId, userEmail) {
  if (!channel) return false;

  // Permanent team channels
  if (channel.is_permanent) {
    if (channel.name === "#management") {
      return MANAGEMENT_ROLES.includes(userRole);
    }
    return true; // #general, #pictures, custom
  }

  // Additional team channels — check member_roles or member_ids
  if (channel.channel_type === "team") {
    if (channel.member_roles?.includes(userRole)) return true;
    if (channel.member_ids?.includes(userId)) return true;
    if (channel.member_ids?.includes(userEmail)) return true;
    return false;
  }

  // DM channels — user must be in member_ids
  if (channel.channel_type === "dm") {
    if (channel.member_ids?.includes(userId)) return true;
    if (channel.member_ids?.includes(userEmail)) return true;
    return false;
  }

  // Job channels — all active team roles see all job channels
  if (channel.channel_type === "job") {
    if (["admin", "owner", "shop_manager", "fabricator", "installer", "estimator", "design_specialist", "accountant"].includes(userRole)) return true;
    if (channel.member_ids?.includes(userId)) return true;
    if (channel.member_ids?.includes(userEmail)) return true;
    return false;
  }

  // Fallback: check member_ids
  if (channel.member_ids?.includes(userId)) return true;
  if (channel.member_ids?.includes(userEmail)) return true;
  return false;
}

export const REACTION_EMOJIS = ["👍", "✅", "👀", "🔨", "🔥", "❤️"];

export function formatMessageTime(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export const PERMANENT_CHANNELS = [
  {
    name: "#general",
    display_name: "general",
    description: "Company-wide chat for the whole High Country Metal Works team",
    channel_type: "team",
    is_permanent: true,
    member_roles: GENERAL_ROLES,
    sort_order: 1,
  },
  {
    name: "#management",
    display_name: "management",
    description: "Management discussion — leadership team only",
    channel_type: "team",
    is_permanent: true,
    member_roles: MANAGEMENT_ROLES,
    sort_order: 2,
  },
  {
    name: "#pictures",
    display_name: "pictures",
    description: "Share job photos, finished work, and team moments",
    channel_type: "team",
    is_permanent: true,
    member_roles: GENERAL_ROLES,
    sort_order: 3,
  },
];