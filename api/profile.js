export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'ANTHROPIC_API_KEY is missing in Vercel Environment Variables.'
    });
  }

  const body = req.body || {};
  const mode = String(body.mode || 'Professional behaviour profile').trim();
  const context = String(body.context || 'General professional').trim();
  const subject = String(body.subject || '').trim();
  const content = String(body.content || '').trim();
  const goal = String(body.goal || '').trim();

  if (!content) {
    return res.status(400).json({ error: 'Please provide observations, notes or a transcript.' });
  }
  if (content.length > 30000) {
    return res.status(413).json({ error: 'The input is too long. Keep it under 30,000 characters.' });
  }

  const system = `You are the BIL Behaviour Engine for Behavioural Intelligence Lab. Use British English. Separate observable evidence from interpretation. Never claim that a single gesture proves deception, intent, diagnosis, abuse, criminality or risk. Use calibrated language such as "may indicate", "is consistent with" and "requires testing". Consider baseline, change, context, clusters and culture. Statutory guidance, agency procedure and qualified professional judgement always take precedence. Do not diagnose mental illness or personality disorders. Do not provide coercive, manipulative or exploitative tactics.`;

  const prompt = `REPORT TYPE: ${mode}\nCONTEXT: ${context}\nSUBJECT / REFERENCE: ${subject || 'Not supplied'}\nREQUIRED OUTCOME: ${goal || 'Not supplied'}\n\nSOURCE MATERIAL:\n${content}\n\nReturn a focused professional report using these headings:\n1. Executive Summary\n2. Observable Evidence\n3. Behavioural Changes and Clusters\n4. Alternative Explanations\n5. Working Hypotheses to Test\n6. Questions to Ask Next\n7. Communication Strategy\n8. Risks, Limits and Safeguards\n9. Recommended Next Actions\n\nOnly reference evidence present in the source material. Clearly distinguish evidence from inference. Keep the report practical and concise.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5',
        max_tokens: 1800,
        temperature: 0.2,
        system,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data?.error?.message || `Anthropic returned HTTP ${response.status}.`;
      console.error('Anthropic API error', response.status, data);
      return res.status(response.status).json({ error: message });
    }

    const result = Array.isArray(data.content)
      ? data.content.filter(item => item.type === 'text').map(item => item.text).join('\n\n').trim()
      : '';

    if (!result) {
      return res.status(502).json({ error: 'Anthropic returned an empty report. Please try again.' });
    }

    return res.status(200).json({ result, model: data.model || 'Configured Anthropic model' });
  } catch (error) {
    if (error?.name === 'AbortError') {
      return res.status(504).json({ error: 'The analysis exceeded 45 seconds. Try a shorter observation.' });
    }
    console.error('Profile function error', error);
    return res.status(500).json({ error: 'The server could not reach Anthropic. Check the Vercel logs and try again.' });
  } finally {
    clearTimeout(timeout);
  }
}
