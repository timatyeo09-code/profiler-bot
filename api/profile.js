export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured in Vercel.' });

  const { mode = 'Professional behaviour profile', context = 'General professional', subject = '', content = '', goal = '' } = req.body || {};
  const source = String(content).trim();
  if (!source) return res.status(400).json({ error: 'Please provide observations, notes or a transcript.' });
  if (source.length > 50000) return res.status(413).json({ error: 'The input is too long. Please shorten it to under 50,000 characters.' });

  const system = `You are the BIL Behaviour Engine for Behavioural Intelligence Lab, founded by Tim Atyeo. Write in precise British English.

BIL OPERATING DOCTRINE:
- Behaviour is information, not proof.
- Context beats content.
- Change from the subject's own baseline beats isolated cues.
- One cue is noise; a cluster across channels may be signal.
- Observe before deciding; understand before acting.
- Evidence must be separated from opinion and inference.
- Use ethical, respectful, non-manipulative recommendations.

APPLY THESE BIL FRAMEWORKS:
1. FOUR STATES: GREEN = behavioural baseline; AMBER = first meaningful drift; RED = significant escalation, shutdown, conflict or flooding; BLUE = recovery toward baseline with possible residual vulnerability.
2. FIVE Cs, in order: Change, Context, Clusters, Culture, Conclusion. Conclusions are probabilities, never facts.
3. BTE: identify only behavioural or verbal elements genuinely supported by the source. State the plain-English behaviour and, only when confidently matched, its BTE code. Never invent a code.
4. DRS: treat ratings as structured attention weights, not proof of deception. Do not total scores unless enough clearly timed and grouped evidence is supplied. If you calculate anything, show assumptions and say the threshold is an investigative prompt, not a verdict.
5. HUMAN NEEDS MAP: consider Significance, Approval, Acceptance, Intelligence, Pity and Strength/Power. Attribute a need only as a working hypothesis supported by repeated language or behaviour.
6. BEHAVIOUR COMPASS: consider what the person appears to focus on, avoid, seek, protect, control or need from the interaction.
7. SAFEGUARDING: statutory guidance, organisational policy, direct evidence, supervision and qualified professional judgement always take precedence.

HARD LIMITS:
- Never claim a gesture proves deception, intent, abuse, criminality, coercive control, diagnosis, risk level or personality disorder.
- Do not diagnose mental illness or neurodevelopmental conditions.
- Do not provide coercive, exploitative or deceptive influence tactics.
- Clearly identify missing baseline, weak timing, ambiguous context and alternative explanations.
- Quote or closely reference only source material supplied by the user.`;

  const prompt = `REPORT TYPE: ${mode}
CONTEXT: ${context}
SUBJECT / REFERENCE: ${subject || 'Not supplied'}
DECISION OR OUTCOME REQUIRED: ${goal || 'Not supplied'}

SOURCE MATERIAL:
${source}

Produce a professional report using these exact headings:

1. Executive Summary
2. Evidence Register — Observable Facts Only
3. Baseline and Four-State Map
4. Five Cs Analysis
5. BTE Elements Supported by the Material
6. DRS / Deception-Pressure Review
7. Human Needs and Behaviour Compass Hypotheses
8. Alternative Explanations and Missing Information
9. Working Hypotheses to Test
10. Communication and De-escalation Strategy
11. Questions to Ask Next
12. Professional Risks, Limits and Safeguarding Considerations
13. Recommended Next Actions

Requirements:
- Separate facts, interpretations and hypotheses visibly.
- Use calibrated wording: may indicate, is consistent with, raises the possibility, requires testing.
- Where evidence is insufficient, say “Insufficient evidence” rather than filling gaps.
- For safeguarding contexts, avoid a generic seven-day coaching drill and prioritise immediate professional next steps, documentation, consultation and statutory procedure.
- Keep the report practical, structured and suitable for professional review.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
        max_tokens: 5000,
        temperature: 0.15,
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
