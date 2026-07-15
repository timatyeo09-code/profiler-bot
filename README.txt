BIL PROFESSIONAL SUITE V1.3 - COMPLETE LOCAL CASE WORKSPACE

Upload all files to the ROOT of your GitHub repository:
- index.html
- profiler.html
- cases.html
- vercel.json
- api/profile.js
- README.txt

Included in this build:
- Case dashboard and search
- Full case details, status, team, manager, review date and risk
- Chronology with source, confidence and linked BTE codes
- BTE selector and DRS total
- Protective factors and missing information
- Document reference register
- AI-assisted Analyse Case function using /api/profile
- Professional reports, Print/PDF and JSON export
- Mobile responsive layout

Important limitation:
- This is a local-first MVP. Cases are stored in browser localStorage on one device.
- Secure organisation accounts, shared cloud storage, permissions and audit logs require a database/authentication backend and are not included in this static Vercel build.

Required Vercel environment variable:
ANTHROPIC_API_KEY

Optional:
ANTHROPIC_MODEL=claude-sonnet-4-5
