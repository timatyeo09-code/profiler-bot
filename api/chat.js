// =============================================================
// THE PROFILER — Server-side API endpoint
// =============================================================
// Deploy this file to Vercel at: /api/chat.js
// Set an environment variable ANTHROPIC_API_KEY in Vercel settings.
// The frontend (profiler-bot-live.html) automatically calls /api/chat
// when deployed, so your key never appears in the browser.
// =============================================================

export default async function handler(req, res) {
  // CORS for preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'Server misconfigured: ANTHROPIC_API_KEY not set in environment variables.'
    });
  }

  try {
    const { system, messages } = req.body;

    if (!system || !messages) {
      return res.status(400).json({ error: 'Missing system or messages' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        system,
        messages
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Claude API error:', response.status, errText);
      return res.status(response.status).json({
        error: `Claude API error: ${response.status}`
      });
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text || '';

    return res.status(200).json({ reply });
  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
