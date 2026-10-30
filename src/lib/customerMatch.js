const FREE_EMAIL_DOMAINS = [
  "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com",
  "aol.com", "live.com", "msn.com", "proton.me", "protonmail.com",
  "me.com", "mac.com", "comcast.net", "sbcglobal.net", "verizon.net",
  "yahoo.co.uk", "yahoo.fr", "gmx.com", "zoho.com",
];

function normalizeName(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function digitsOnly(s) {
  return (s || "").replace(/\D/g, "");
}

function getEmailDomain(email) {
  const parts = (email || "").split("@");
  if (parts.length !== 2) return "";
  const domain = parts[1].toLowerCase().trim();
  return FREE_EMAIL_DOMAINS.includes(domain) ? "" : domain;
}

/**
 * Find possible duplicate customers based on loose name, phone, email, or domain matching.
 * @param {Object} input - { name, phone, email }
 * @param {Array} customers - existing customer records
 * @param {Object} jobCounts - map of customer_id -> job count (optional)
 * @returns {Array} matches sorted by relevance
 */
export function findCustomerMatches({ name, phone, email }, customers = [], jobCounts = {}) {
  const matches = [];
  const normName = normalizeName(name);
  const phoneDigits = digitsOnly(phone);
  const emailLower = (email || "").toLowerCase().trim();
  const domain = getEmailDomain(email);

  for (const c of customers) {
    let reason = null;
    let score = 0;

    // Name match (loose — case + punctuation insensitive)
    if (normName && normName.length >= 3) {
      const cName = normalizeName(c.name);
      const cCompany = normalizeName(c.company);
      if (cName && (cName.includes(normName) || normName.includes(cName))) {
        reason = "name";
        score = 3;
      } else if (cCompany && (cCompany.includes(normName) || normName.includes(cCompany))) {
        reason = "name";
        score = 2;
      }
    }

    // Phone match (exact, digits only)
    if (phoneDigits && phoneDigits.length >= 10) {
      const cPhone = digitsOnly(c.phone);
      if (cPhone && cPhone === phoneDigits) {
        if (!reason || score < 5) { reason = "phone"; score = 5; }
      }
    }

    // Email match (exact)
    if (emailLower) {
      const cEmail = (c.email || "").toLowerCase().trim();
      if (cEmail && cEmail === emailLower) {
        if (!reason || score < 6) { reason = "email"; score = 6; }
      }
    }

    // Email domain match (excluding free providers)
    if (domain) {
      const cDomain = getEmailDomain(c.email);
      if (cDomain && cDomain === domain) {
        if (!reason || score < 4) { reason = "domain"; score = 4; }
      }
    }

    if (reason) {
      matches.push({
        customer: c,
        reason,
        score,
        jobCount: jobCounts[c.id] || 0,
      });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}