import crypto from 'node:crypto';

export const TIERS = Object.freeze({
  demo: { engine: true, write: false },
  pilot: { engine: true, write: true },
  professional: { engine: true, write: true },
  enterprise: { engine: true, write: true },
  admin: { engine: true, write: true }
});

export function authIsConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
}

function bearerToken(req) {
  const header = String(req.headers?.authorization || '');
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
}

async function supabaseRequest(path, token, options = {}) {
  const url = `${String(process.env.SUPABASE_URL).replace(/\/$/, '')}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      apikey: process.env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => null);
  return { response, data };
}

export async function authenticate(req) {
  if (!authIsConfigured()) {
    return { mode: 'legacy', user: null, profile: null, tier: 'demo' };
  }

  const token = bearerToken(req);
  if (!token) {
    return { error: 'Sign in to use the BIL Professional Suite.', status: 401 };
  }

  const userResult = await supabaseRequest('/auth/v1/user', token, { method: 'GET' });
  if (!userResult.response.ok || !userResult.data?.id) {
    return { error: 'Your session is invalid or has expired. Please sign in again.', status: 401 };
  }

  const select = [
    'id',
    'organisation_id',
    'full_name',
    'role',
    'subscription_tier',
    'account_status',
    'access_expires_at'
  ].join(',');
  const profileResult = await supabaseRequest(
    `/rest/v1/profiles?id=eq.${encodeURIComponent(userResult.data.id)}&select=${encodeURIComponent(select)}`,
    token,
    { method: 'GET' }
  );
  const profile = Array.isArray(profileResult.data) ? profileResult.data[0] : null;

  if (!profileResult.response.ok || !profile) {
    return { error: 'Your BIL access profile has not been created. Contact BIL support.', status: 403 };
  }
  if (profile.account_status !== 'active') {
    return { error: 'This account is not active. Contact BIL support.', status: 403 };
  }
  if (profile.access_expires_at && new Date(profile.access_expires_at).getTime() <= Date.now()) {
    return { error: 'Your BIL access period has expired. Contact BIL to renew access.', status: 403 };
  }

  const tier = String(profile.subscription_tier || 'demo').toLowerCase();
  if (!TIERS[tier]) {
    return { error: 'This account does not have a recognised access tier.', status: 403 };
  }

  return { mode: 'authenticated', token, user: userResult.data, profile, tier };
}

export async function requireEngineAccess(req, res) {
  const access = await authenticate(req);
  if (access.error) {
    res.status(access.status).json({ error: access.error });
    return null;
  }

  if (access.mode === 'legacy') {
    const supplied = String(req.body?.accessCode || '').trim();
    const expected = String(process.env.BIL_DEMO_CODE || '').trim();
    const suppliedHash = crypto.createHash('sha256').update(supplied).digest();
    const expectedHash = crypto.createHash('sha256').update(expected).digest();
    if (expected && !crypto.timingSafeEqual(suppliedHash, expectedHash)) {
      res.status(401).json({
        error: 'This demonstration requires an access code for AI analysis. Enter the code from your BIL invitation.'
      });
      return null;
    }
  }

  if (!TIERS[access.tier]?.engine) {
    res.status(403).json({ error: 'Your BIL plan does not include Behaviour Engine access.' });
    return null;
  }

  res.setHeader('X-BIL-Access-Tier', access.tier);
  return access;
}

export function demoWatermark(text, tier) {
  if (tier !== 'demo') return text;
  return `DEMONSTRATION OUTPUT — NOT FOR OPERATIONAL OR CASE-RECORD USE\n\n${text}`;
}

export function hashInviteCode(code) {
  return crypto.createHash('sha256').update(String(code).trim()).digest('hex');
}
