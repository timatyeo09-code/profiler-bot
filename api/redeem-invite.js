import { authenticate, hashInviteCode } from './_auth.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).json({ error: 'Invite redemption is not configured.' });
  }

  const access = await authenticate(req);
  if (access.error) return res.status(access.status).json({ error: access.error });
  if (access.mode !== 'authenticated') {
    return res.status(400).json({ error: 'Individual authentication must be enabled first.' });
  }

  const code = String(req.body?.code || '').trim();
  if (code.length < 6 || code.length > 128) {
    return res.status(400).json({ error: 'Enter a valid BIL invitation code.' });
  }

  const base = String(process.env.SUPABASE_URL).replace(/\/$/, '');
  const serviceHeaders = {
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json'
  };
  const query = new URLSearchParams({
    code_hash: `eq.${hashInviteCode(code)}`,
    used_at: 'is.null',
    select: 'id,tier,organisation_id,access_days,expires_at'
  });
  const invitationResponse = await fetch(`${base}/rest/v1/invite_codes?${query}`, {
    headers: serviceHeaders
  });
  const invitations = await invitationResponse.json().catch(() => []);
  const invitation = Array.isArray(invitations) ? invitations[0] : null;
  if (!invitationResponse.ok || !invitation) {
    return res.status(400).json({ error: 'This invitation code is invalid or has already been used.' });
  }
  if (invitation.expires_at && new Date(invitation.expires_at).getTime() <= Date.now()) {
    return res.status(400).json({ error: 'This invitation code has expired.' });
  }

  const accessExpiresAt = invitation.access_days
    ? new Date(Date.now() + Number(invitation.access_days) * 86400000).toISOString()
    : null;
  const profileResponse = await fetch(`${base}/rest/v1/profiles?id=eq.${encodeURIComponent(access.user.id)}`, {
    method: 'PATCH',
    headers: { ...serviceHeaders, Prefer: 'return=representation' },
    body: JSON.stringify({
      subscription_tier: invitation.tier,
      organisation_id: invitation.organisation_id || access.profile.organisation_id,
      access_expires_at: accessExpiresAt,
      account_status: 'active'
    })
  });
  if (!profileResponse.ok) {
    return res.status(500).json({ error: 'The invitation could not be applied. Contact BIL support.' });
  }

  await fetch(`${base}/rest/v1/invite_codes?id=eq.${encodeURIComponent(invitation.id)}`, {
    method: 'PATCH',
    headers: serviceHeaders,
    body: JSON.stringify({ used_at: new Date().toISOString(), used_by: access.user.id })
  });

  return res.status(200).json({ ok: true, tier: invitation.tier, accessExpiresAt });
}
