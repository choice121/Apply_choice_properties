# Choice Properties — Rental Application System

## Overview
A self-contained rental application and management platform for Choice Properties. Handles the full lifecycle of a rental application: submission, fee payment, background checks, status updates, lease generation, and e-signatures.

## Tech Stack
- **Frontend:** Pure HTML5, CSS3, Vanilla JavaScript (ES6+) — no frameworks
- **Backend:** Google Apps Script (GAS) — deployed separately at script.google.com
- **Database:** Google Sheets (via GAS)
- **Dev Server:** Node.js `server.js` (serves static files)
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
- `config.js` contains placeholder values for local development
- The GEOAPIFY_API_KEY is optional (address autocomplete disabled without it)
- BACKEND_URL points to the Google Apps Script deployment URL

## Environment Variables (for production)
- `BACKEND_URL` — Google Apps Script web app URL (required)
- `GEOAPIFY_API_KEY` — Geoapify address autocomplete API key (optional)
- `LISTING_SITE_URL` — Base URL of the listing platform (default: https://choice-properties-site.pages.dev)

## Deployment
- **Replit deployment:** Autoscale via `node server.js`
- **Original deployment:** Cloudflare Pages (static hosting) + GAS backend
- In production (Cloudflare), `npm run build` runs `generate-config.js` to inject secrets into `config.js`

## Key Features
- 6-step bilingual (EN/ES) application form
- Mobile-first responsive design
- Auto-save progress via localStorage
- Admin dashboard for property managers
- Applicant dashboard for status tracking and lease signing
- Automatic email notifications
