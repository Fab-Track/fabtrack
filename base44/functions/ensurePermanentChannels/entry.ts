import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PERMANENT_CHANNELS = [
  {
    name: "#general",
    display_name: "general",
    description: "Company-wide chat for the whole High Country Metal Works team",
    channel_type: "team",
    visibility: "public",
    is_permanent: true,
    member_roles: ["admin","owner","shop_manager","estimator","accountant","fabricator","installer","design_specialist","user"],
    sort_order: 1,
  },
  {
    name: "#management",
    display_name: "management",
    description: "Management discussion — leadership team only",
    channel_type: "team",
    visibility: "public",
    is_permanent: true,
    member_roles: ["admin","owner","shop_manager","estimator","accountant"],
    sort_order: 2,
  },
  {
    name: "#pictures",
    display_name: "pictures",
    description: "Share job photos, finished work, and team moments",
    channel_type: "team",
    visibility: "public",
    is_permanent: true,
    member_roles: ["admin","owner","shop_manager","estimator","accountant","fabricator","installer","design_specialist","user"],
    sort_order: 3,
  },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const existing = await base44.asServiceRole.entities.MessageChannel.filter({ is_permanent: true });
    const existingNames = new Set(existing.map(c => c.name));

    const created = [];
    for (const ch of PERMANENT_CHANNELS) {
      if (!existingNames.has(ch.name)) {
        await base44.asServiceRole.entities.MessageChannel.create({
          ...ch,
          organization_id: user.organization_id,
        });
        created.push(ch.name);
      }
    }

    return Response.json({ ok: true, created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});