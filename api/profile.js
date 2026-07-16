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

  /* Demonstration gate: set BIL_DEMO_CODE in Vercel env vars to require an
     access code for engine use (protects the public demo's API spend).
     Leave BIL_DEMO_CODE unset on customer deployments — engine runs open. */
  const demoCode = process.env.BIL_DEMO_CODE;
  if (demoCode && String(body.accessCode || '').trim() !== String(demoCode).trim()) {
    return res.status(401).json({
      error: 'This demonstration requires an access code for AI analysis. Enter the code from your BIL invitation.'
    });
  }

  const mode = String(body.mode || 'Professional behaviour profile').trim();
  const context = String(body.context || 'General professional').trim();
  const subject = String(body.subject || '').trim();
  const content = String(body.content || '').trim();
  const goal = String(body.goal || '').trim();
  const wantStream = body.stream === true;

  if (!content) {
    return res.status(400).json({ error: 'Please provide observations, notes or a transcript.' });
  }
  if (content.length > 30000) {
    return res.status(413).json({ error: 'The input is too long. Keep it under 30,000 characters.' });
  }

  const system = `You are the BIL Behaviour Engine for Behavioural Intelligence Lab. Use British English. Separate observable evidence from interpretation. Never claim that a single gesture proves deception, intent, diagnosis, abuse, criminality or risk. Use calibrated language such as "may indicate", "is consistent with" and "requires testing". Apply the BIL method: baseline, change, context, clusters, culture and calibrated conclusion. Where relevant, organise material through the Four States (Green baseline, Amber drift, Red escalation, Blue recovery), BTE references, cautious DRS weighting, Human Needs hypotheses and the Behaviour Compass. Never invent a BTE code or score not supplied by the user. Statutory guidance, agency procedure and qualified professional judgement always take precedence. Do not diagnose mental illness or personality disorders. Do not provide coercive, manipulative or exploitative tactics.`;

  const prompt = `REPORT TYPE: ${mode}\nCONTEXT: ${context}\nSUBJECT / REFERENCE: ${subject || 'Not supplied'}\nREQUIRED OUTCOME: ${goal || 'Not supplied'}\n\nSOURCE MATERIAL:\n${content}\n\nReturn a focused professional report using these headings:\n1. Executive Summary\n2. Observable Evidence\n3. Behavioural Changes and Clusters\n4. Alternative Explanations\n5. Working Hypotheses to Test\n6. Questions to Ask Next\n7. Communication Strategy\n8. Risks, Limits and Safeguards\n9. Recommended Next Actions\n\nOnly reference evidence present in the source material. Clearly distinguish evidence from inference. Keep the report practical and concise.`;

  const anthropicPayload = {
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
    max_tokens: 1800,
    temperature: 0.2,
    system,
    messages: [{ role: 'user', content: prompt }]
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 50000);

  try {
    /* ---- STREAMING PATH (profiler.html sends stream:true) ----
       First words reach the screen in a couple of seconds instead of
       a long blank wait. Any failure before the stream starts returns
       normal JSON so the client can fall back cleanly. */
    if (wantStream) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({ ...anthropicPayload, stream: true })
      });

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}));
        return res.status(response.status || 502).json({
          error: data?.error?.message || `Anthropic returned HTTP ${response.status}.`
        });
      }

      res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Accel-Buffering': 'no'
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            if (!raw || raw === '[DONE]') continue;
            try {
              const evt = JSON.parse(raw);
              if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta' && evt.delta.text) {
                res.write(evt.delta.text);
              }
            } catch { /* ignore malformed keep-alive lines */ }
          }
        }
      } catch {
        res.write('\n\n[The connection was interrupted. The report above may be incomplete — run the analysis again if needed.]');
      }
      return res.end();
    }

    /* ---- STANDARD JSON PATH (Case Workspace assistant + analysis, unchanged contract) ---- */
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(anthropicPayload)
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

    return res.status(200).json({ result, model: data.model || 'Configured Anthropic model', usage: data.usage || null });
  } catch (error) {
    if (error?.name === 'AbortError') {
      return res.status(504).json({ error: 'The analysis exceeded the time limit. Try a shorter observation.' });
    }
    console.error('Profile function error', error);
    return res.status(500).json({ error: 'The server could not reach Anthropic. Check the Vercel logs and try again.' });
  } finally {
    clearTimeout(timeout);
  }
}
