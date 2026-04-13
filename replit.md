# Choice Properties — Rental Application System

## Overview
A self-contained rental application and management platform for Choice Properties. Handles the full lifecycle of a rental application: submission, fee payment, background checks, status updates, lease generation, and e-signatures.

## Tech Stack
- **Frontend:** Pure HTML5, CSS3, Vanilla JavaScript (ES6+) — no frameworks
- **Backend:** Google Apps Script (GAS) — deployed separately at script.google.com
- **Database:** Google Sheets (via GAS)
- **Dev Server:** Node.js `server.js` (serves static files)
- **Replit Runtime Config:** `server.js` serves `/config.js` from environment variables at request time
- **CDN Libraries:** Font Awesome, Inter (Google Font), QRCode.js, Geoapify

## Project Structure
```
.
├── index.html          # Main 6-step rental application form
├── css/style.css       # Mobile-first stylesheet
├── js/script.js        # Core frontend logic (RentalApplication class)
├── config.js           # Auto-generated config (secrets injected at build time)
├── server.js           # Node.js dev server (port 5000, 0.0.0.0)
├── generate-config.js  # Build script that generates config.js from env vars
├── backend/code.gs     # Google Apps Script source (deploy manually to GAS)
└── docs/               # Architecture, project status, implementation plan
```

## Running Locally (Replit)
- The workflow `Start application` runs `node server.js` on port 5000
- `npm start` runs `node server.js` on port 5000
- `config.js` contains placeholder values for static/local development; Replit serves runtime values from environment variables
- The GEOAPIFY_API_KEY is optional (address autocomplete disabled without it)
- BACKEND_URL points to the Google Apps Script deployment URL

## Environment Variables (for production)
- `BACKEND_URL` — Google Apps Script web app URL (required)
- `GEOAPIFY_API_KEY` — Geoapify address autocomplete API key (optional)
- `LISTING_SITE_URL` — Base URL of the listing platform (default: https://choice-properties-site.pages.dev)

## Deployment
- **Replit deployment:** Autoscale via `npm start`
- **Original deployment:** Cloudflare Pages (static hosting) + GAS backend
- In production (Cloudflare), `npm run build` runs `generate-config.js` to inject secrets into `config.js`

## Key Features
- 6-step bilingual (EN/ES) application form
- Mobile-first responsive design
- Auto-save progress via localStorage
- Admin dashboard for property managers
- Applicant dashboard for status tracking and lease signing
- Automatic email notifications

## Submission Flow Fixes (April 2026)
Fixed a critical bug where users saw "Unable to reach our servers" even though their application was already submitted and emails received. Root causes and fixes:

1. **Backend formatting loop** (`backend/code.gs` ~line 1539): Was iterating and formatting ALL rows in the sheet on every submission — now only formats the newly added row. Eliminates 10–20s of GAS execution time as the sheet grows.
2. **Early auto-verify** (`js/script.js`): `_autoVerifySubmission` is now called immediately after the FIRST network error (not after 3 retries). Uses `_verifyStarted` flag to ensure only one check runs per attempt.
3. **Fetch timeout** (`js/script.js`): Added 30-second `AbortController` timeout to the main POST fetch — ensures predictable failure rather than hanging indefinitely.
4. **Auto-verify cancels retries** (`js/script.js`): When the verify check confirms success, it cancels any pending retry timeout before transitioning to success screen.
5. **Supabase validation deadline** (`backend/code.gs`): Added `deadline: 8` to the property validation `UrlFetchApp.fetch` call — caps the external HTTP call to 8 seconds instead of GAS's default ~30s.

## Encoding Cleanup (April 2026)
- Repaired UTF-8 mojibake across `backend/code.gs`, removing corrupted sequences like `Ã¢ÂÂ`, `ÃÂ§`, and `Ã°Â...` from admin dashboard pages, applicant dashboard content, lease pages, legal text, email subjects, and email templates.
- Repaired remaining frontend encoding artifacts in `index.html` and `js/script.js`, including Spanish SSN labels, email warning icon text, and "Back to this listing" link text.
- Verified `backend/code.gs`, `js/script.js`, `index.html`, and `css/style.css` have no remaining suspicious mojibake sequences.
