BIL INTELLIGENCE PORTAL - VERCEL PROJECT

Files:
- index.html: portal with working Claude-powered Profiler
- api/profile.js: secure Vercel serverless function
- vercel.json: deployment configuration

Required Vercel environment variable:
ANTHROPIC_API_KEY = your private Anthropic API key

Optional environment variable:
ANTHROPIC_MODEL = claude-sonnet-4-5

Deployment:
Upload this entire folder to the GitHub repository connected to Vercel, keeping the api folder intact. Vercel will redeploy automatically.
