import { authenticate } from './_auth.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  const access = await authenticate(req);
  if (access.error) return res.status(access.status).json({ error: access.error });
  if (access.mode === 'legacy') return res.status(200).json({ mode: 'legacy', tier: 'demo' });

  return res.status(200).json({
    mode: 'authenticated',
    user: {
      id: access.user.id,
      email: access.user.email,
      full_name: typeof access.user.user_metadata?.full_name === 'string' ? access.user.user_metadata.full_name : '',
      // Self-reported organisation is contact information, never an access grant.
      organisation_name: typeof access.user.user_metadata?.organisation_name === 'string' ? access.user.user_metadata.organisation_name : ''
    },
    profile: access.profile,
    tier: access.tier
  });
}
