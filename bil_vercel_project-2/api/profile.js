export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured in Vercel.' });

  const { mode = 'Prospect profile', context = 'General', subject = '', content = '', goal = '' } = req.body || {};
  if (!String(content).trim()) return res.status(400).json({ error: 'Please provide observations, notes or a transcript.' });
  if (String(content).length > 50000) return res.status(413).json({ error: 'The input is too long. Please shorten it to under 50,000 characters.' });

  const system = `You are The Profiler for Behavioural Intelligence Lab (BIL). Produce careful, practical behavioural analysis using British English. Separate observed facts from interpretations. Never claim that a single gesture proves deception, intent, diagnosis, abuse, criminality or risk. Use calibrated language such as "may indicate", "is consistent with" and "requires testing". Consider baseline, change, context, clusters and culture. Where safeguarding is involved, state that statutory guidance, agency procedure and qualified professional judgement take precedence. Do not diagnose mental illness or personality disorders. Do not provide manipulative, coercive or exploitative tactics.`;

  const prompt = `ANALYSIS TYPE: ${mode}\nCONTEXT: ${context}\nSUBJECT / REFERENCE: ${subject || 'Not supplied'}\nUSER'S REQUIRED OUTCOME: ${goal || 'Not supplied'}\n\nSOURCE MATERIAL:\n${content}\n\nReturn a concise professional report with these exact headings:\n1. Executive Summary\n2. Observable Evidence\n3. Behavioural Patterns and Changes\n4. Alternative Explanations\n5. Working Hypotheses to Test\n6. Communication Strategy\n7. Questions to Ask Next\n8. Risks, Limits and Red Flags\n9. Recommended Next Actions\n10. Seven-Day Coaching Drill\n\nUnder Observable Evidence, quote or closely reference only information present in the source material. Clearly distinguish evidence from inference. Keep the report practical and avoid overclaiming.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5',
        max_tokens: 3000,
        temperature: 0.2,
        system,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Anthropic error:', data);
      return res.status(response.status).json({ error: data?.error?.message || 'Anthropic rejected the request.' });
    }

    const result = Array.isArray(data.content)
      ? data.content.filter(x => x.type === 'text').map(x => x.text).join('\n\n')
      : '';
    return res.status(200).json({ result, model: data.model, usage: data.usage });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'The server could not reach Anthropic. Please try again.' });
  }
}
