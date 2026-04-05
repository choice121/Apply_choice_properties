# Choice Properties - Rental Application System

## Project Overview
A self-contained, data-driven rental application and management platform for Choice Properties. Handles the complete rental workflow: 6-step application form, lease generation, e-signatures, payment tracking, and applicant communications.

## Architecture
- **Type:** Pure static web application (HTML5, CSS3, Vanilla JavaScript)
- **Backend:** Google Apps Script (GAS) running on Google's infrastructure
- **Storage:** Google Sheets (managed via GAS)
- **No build system, no package manager** (by design - see PROJECT_RULES.md)

## Project Layout
```
index.html          # 6-step application form & main entry point
css/style.css       # Mobile-first stylesheet
js/script.js        # RentalApplication class & frontend logic
backend/code.gs     # Google Apps Script backend
_redirects          # Cloudflare Pages redirect rules (not used in Replit)
```

## Development in Replit
- Served via `python3 -m http.server 5000 --bind 0.0.0.0`
- Port: 5000 (webview)
- No npm, yarn, or package managers (project rule)
- External libraries loaded via CDN only

## Deployment
- Configured as a static site deployment
- Public directory: `.` (project root)

## Key Constraints (from PROJECT_RULES.md)
- No npm/yarn/package managers
- No React, Vue, Tailwind, or frameworks
- Mobile-first CSS (min-width breakpoints)
- Pure separation from any Supabase backend
- Google Apps Script is the only backend
