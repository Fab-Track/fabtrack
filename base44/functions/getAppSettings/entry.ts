import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    return Response.json({
      twilio_from_number: Deno.env.get('TWILIO_FROM_NUMBER') || null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});