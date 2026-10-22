import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Disconnects a conversation EmailAccount — clears tokens and marks as disconnected.
// Body params: account_id
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { account_id } = body;
    if (!account_id) return Response.json({ error: 'account_id required' }, { status: 400 });

    const account = await base44.asServiceRole.entities.EmailAccount.get(account_id).catch(() => null);
    if (!account || account.organization_id !== user.organization_id) {
      return Response.json({ error: 'Account not found' }, { status: 404 });
    }

    await base44.asServiceRole.entities.EmailAccount.update(account_id, {
      status: 'disconnected',
      access_token: null,
      refresh_token: null,
      token_expiry: null,
      sync_error: null,
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}