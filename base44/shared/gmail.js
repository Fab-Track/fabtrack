// Shared Gmail API utilities for conversation email sync and send.
// Used by syncConversationEmails, sendConversationEmail, and disconnectConversationEmail.

// Refresh the Gmail access token if it's expired or about to expire.
// Returns { access_token, expiry, refresh_token } or throws.
export async function ensureValidToken(account, clientId, clientSecret) {
  const now = Date.now();
  const expiry = account.token_expiry ? new Date(account.token_expiry).getTime() : 0;
  // If token has more than 2 minutes left, use it
  if (account.access_token && expiry > now + 120000) {
    return { access_token: account.access_token, refresh_token: account.refresh_token };
  }
  if (!account.refresh_token) {
    throw new Error("No refresh token — account must be reconnected");
  }
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: account.refresh_token,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(10000),
  });
  const tokens = await res.json();
  if (tokens.error) {
    throw new Error(`Token refresh failed: ${tokens.error_description || tokens.error}`);
  }
  return {
    access_token: tokens.access_token,
    refresh_token: account.refresh_token,
    expiry: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
  };
}

// Base64url encode a string (for raw email construction)
function base64UrlEncode(str) {
  // Use btoa with binary string encoding
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Build a raw RFC 2822 email message
export function buildRawEmail({ fromName, fromEmail, toEmail, subject, body, replyTo }) {
  const lines = [
    `From: ${fromName ? `"${fromName}" <${fromEmail}>` : fromEmail}`,
    `To: ${toEmail}`,
    `Subject: ${subject || "(no subject)"}`,
    "Content-Type: text/plain; charset=UTF-8",
    "MIME-Version: 1.0",
  ];
  if (replyTo) lines.push(`Reply-To: ${replyTo}`);
  lines.push("", body);
  return base64UrlEncode(lines.join("\r\n"));
}

// Send an email via the Gmail API
export async function sendGmailMessage(accessToken, rawEmail) {
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: rawEmail }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json();
  if (data.error) {
    throw new Error(`Gmail send failed: ${data.error.message || data.error}`);
  }
  return data; // { id, threadId, labelIds }
}

// List messages since a given timestamp. Returns array of { id, threadId }
export async function listGmailMessages(accessToken, afterTimestamp) {
  const q = afterTimestamp ? `after:${Math.floor(afterTimestamp / 1000)}` : "newer_than:7d";
  const messages = [];
  let pageToken = null;
  // Fetch up to 3 pages (max 300 messages) per sync
  for (let i = 0; i < 3; i++) {
    const params = new URLSearchParams({ q, maxResults: "100" });
    if (pageToken) params.set("pageToken", pageToken);
    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`, {
      headers: { "Authorization": `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    if (data.error) throw new Error(`Gmail list failed: ${data.error.message || data.error}`);
    if (data.messages) messages.push(...data.messages);
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }
  return messages;
}

// Get full message details including headers and body
export async function getGmailMessage(accessToken, messageId) {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`, {
    headers: { "Authorization": `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10000),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Gmail get failed: ${data.error.message || data.error}`);
  return data;
}

// Parse message headers to extract From, To, Subject, Date, Cc
export function parseMessageHeaders(headers) {
  const get = (name) => {
    const h = headers?.find(h => h.name?.toLowerCase() === name.toLowerCase());
    return h?.value || "";
  };
  return {
    from: get("From"),
    to: get("To"),
    subject: get("Subject"),
    date: get("Date"),
    cc: get("Cc"),
    replyTo: get("Reply-To"),
  };
}

// Extract email addresses from a header value like "John <john@example.com>"
export function extractEmails(headerValue) {
  if (!headerValue) return [];
  const matches = headerValue.match(/<([^>]+)>/g);
  if (matches) return matches.map(m => m.replace(/[<>]/g, "").toLowerCase().trim());
  // No angle brackets — try to parse as plain email
  const parts = headerValue.split(",").map(p => p.trim());
  return parts.filter(p => p.includes("@")).map(p => p.toLowerCase().trim());
}

// Extract display name from a header value
export function extractDisplayName(headerValue) {
  if (!headerValue) return "";
  const match = headerValue.match(/^"?([^"<]+?)"?\s*<?/);
  return match ? match[1].trim() : "";
}

// Decode base64url to string
function base64UrlDecode(str) {
  try {
    str = str.replace(/-/g, "+").replace(/_/g, "/");
    const padding = str.length % 4;
    if (padding) str += "=".repeat(4 - padding);
    const binary = atob(str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}

// Extract text body from a Gmail message payload
export function extractMessageBody(payload) {
  if (!payload) return "";
  // If body is directly in the part
  if (payload.body?.data) {
    return base64UrlDecode(payload.body.data);
  }
  // Check parts
  if (payload.parts) {
    // Prefer text/plain
    const textPart = payload.parts.find(p => p.mimeType === "text/plain" && p.body?.data);
    if (textPart) return base64UrlDecode(textPart.body.data);
    // Fall back to text/html
    const htmlPart = payload.parts.find(p => p.mimeType === "text/html" && p.body?.data);
    if (htmlPart) {
      const html = base64UrlDecode(htmlPart.body.data);
      // Simple HTML to text conversion
      return html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\s+/g, " ")
        .trim();
    }
    // Check nested parts
    for (const part of payload.parts) {
      const body = extractMessageBody(part);
      if (body) return body;
    }
  }
  return "";
}