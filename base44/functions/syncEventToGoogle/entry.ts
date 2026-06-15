import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Maps FabTrack event types → Google Calendar color IDs
// 1=lavender, 2=sage, 3=grape, 4=flamingo, 5=banana, 6=tangerine, 7=peacock, 8=graphite, 9=blueberry, 10=basil, 11=tomato
const TYPE_COLORS = {
  Measure: "9",       // blueberry
  Consultation: "3",  // grape
  "Site Visit": "6",  // tangerine
  Other: "8",         // graphite
};

const CONNECTOR_ID = "6a3064759fc0db7e563bb0c8";

async function refreshCalendarToken(base44, employee) {
  const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET');
  if (!clientId || !clientSecret || !employee.calendar_refresh_token) return false;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: employee.calendar_refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) return false;
  const data = await res.json();

  await base44.asServiceRole.entities.Employee.update(employee.id, {
    calendar_access_token: data.access_token,
    calendar_token_expiry: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : null,
  });

  return true;
}

function buildEventBody(event) {
  const date = event.date;
  const startTime = event.start_time;
  const endTime = event.end_time;

  const startDateTime = new Date(`${date}T${startTime}:00`);
  const endDateTime = new Date(`${date}T${endTime}:00`);

  const timeZone = "America/Denver";

  const summary = `${event.event_type}: ${event.job_name || "Appointment"}`;
  const description = [
    `Job: ${event.job_name || ""} (${event.job_number || ""})`,
    `Customer: ${event.customer_name || ""}`,
    `Type: ${event.event_type}`,
    event.notes ? `Notes: ${event.notes}` : "",
  ].filter(Boolean).join("\n");

  return {
    summary,
    description,
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone,
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone,
    },
    location: event.location || "",
    colorId: TYPE_COLORS[event.event_type] || "8",
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Support both entity automation payload and direct API calls
    let event_id, action;
    if (body.event && body.event.entity_name === "ScheduledEvent") {
      // Entity automation payload: { event: { type, entity_name, entity_id }, data: {...} }
      event_id = body.event.entity_id;
      action = body.event.type; // "create" | "update" | "delete"
    } else {
      // Direct API call: { event_id, action }
      event_id = body.event_id;
      action = body.action;
    }

    if (!event_id) {
      return Response.json({ error: "event_id required" }, { status: 400 });
    }

    // Check-only mode — just test the connection
    if (action === "check") {
      let source = null;
      // 1. APP_USER connector
      try {
        const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);
        if (conn?.accessToken) { source = "app_user"; }
      } catch { /* not connected via app user */ }
      
      // 2. Employee-stored token
      if (!source && user) {
        try {
          const employees = await base44.asServiceRole.entities.Employee.filter({
            $or: [
              { created_by_id: user.id },
              { email: user.email },
              { personal_email: user.email },
            ]
          });
          if (employees.length > 0 && employees[0].calendar_connected) {
            source = "employee_token";
          }
        } catch { /* no employee token */ }
      }
      
      // 3. Shared connection
      if (!source) {
        try {
          const shared = await base44.asServiceRole.connectors.getConnection("googlecalendar");
          if (shared?.accessToken) { source = "shared"; }
        } catch { /* not connected via shared */ }
      }
      
      return Response.json({ connected: !!source, source, skipped: !source, reason: source ? null : "Not connected" });
    }

    // Fetch the full ScheduledEvent record
    const events = await base44.asServiceRole.entities.ScheduledEvent.filter({ id: event_id });
    const event = events[0];
    if (!event && action !== "delete") {
      return Response.json({ error: "Event not found" }, { status: 404 });
    }

    // Try multiple sources for Google Calendar access token:
    // 1. APP_USER connector (per-user OAuth via workspace connector)
    // 2. Employee-stored Calendar token (manual OAuth flow)
    // 3. Shared connection (builder-level OAuth)
    let accessToken;
    let connectionSource = "none";

    // 1. Try APP_USER connector
    try {
      const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);
      if (conn?.accessToken) {
        accessToken = conn.accessToken;
        connectionSource = "app_user";
      }
    } catch { /* not connected via app user */ }

    // 2. Try Employee-stored calendar token (match by user id or email)
    if (!accessToken) {
      try {
        const employees = await base44.asServiceRole.entities.Employee.filter({
          $or: [
            { created_by_id: user.id },
            { email: user.email },
            { personal_email: user.email },
          ]
        });
        if (employees.length > 0 && employees[0].calendar_connected && employees[0].calendar_access_token) {
          const emp = employees[0];
          // Check if token is expired and needs refresh
          if (emp.calendar_token_expiry && new Date(emp.calendar_token_expiry) <= new Date()) {
            const refreshed = await refreshCalendarToken(base44, emp);
            if (refreshed) {
              const fresh = await base44.asServiceRole.entities.Employee.get(emp.id);
              accessToken = fresh.calendar_access_token;
            }
          } else {
            accessToken = emp.calendar_access_token;
          }
          if (accessToken) connectionSource = "employee_token";
        }
      } catch { /* no employee token */ }
    }

    // 3. Try shared connection
    if (!accessToken) {
      try {
        const shared = await base44.asServiceRole.connectors.getConnection("googlecalendar");
        if (shared?.accessToken) {
          accessToken = shared.accessToken;
          connectionSource = "shared";
        }
      } catch { /* shared also not available */ }
    }

    if (!accessToken) {
      return Response.json({ skipped: true, reason: "Google Calendar not connected. Click 'Connect Google' on the Calendar page." });
    }

    const authHeader = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };

    if (action === "delete" || (event && event.status === "Cancelled")) {
      // Delete from Google Calendar
      const googleEventId = event?.google_event_id;
      if (googleEventId) {
        const delRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(googleEventId)}`,
          { method: "DELETE", headers: authHeader }
        );
        if (!delRes.ok && delRes.status !== 410) {
          console.error("Google delete failed:", delRes.status);
        }
        // Clear the google_event_id
        if (event) {
          await base44.asServiceRole.entities.ScheduledEvent.update(event.id, { google_event_id: "" });
        }
      }
      return Response.json({ status: "deleted" });
    }

    // Check if any assigned user has their Google connected — use the event creator's connection
    // (We're using getCurrentAppUserConnection which gives the current function caller's connection)

    const eventBody = buildEventBody(event);

    if (event.google_event_id) {
      // Update existing Google event
      const updateRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(event.google_event_id)}`,
        { method: "PUT", headers: authHeader, body: JSON.stringify(eventBody) }
      );
      if (!updateRes.ok) {
        console.error("Google update failed:", updateRes.status);
        return Response.json({ error: "Google update failed", status: updateRes.status });
      }
      return Response.json({ status: "updated" });
    } else {
      // Create new Google event
      const createRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events`,
        { method: "POST", headers: authHeader, body: JSON.stringify(eventBody) }
      );
      if (!createRes.ok) {
        console.error("Google create failed:", createRes.status);
        return Response.json({ error: "Google create failed", status: createRes.status });
      }
      const data = await createRes.json();
      // Store the Google event ID back on the ScheduledEvent
      await base44.asServiceRole.entities.ScheduledEvent.update(event.id, { google_event_id: data.id });
      return Response.json({ status: "created", google_event_id: data.id });
    }
  } catch (error) {
    console.error("syncEventToGoogle error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});