# Choice Properties — Rental Application System

## Project Overview

A static web application for managing rental applications for Choice Properties. It handles the full lifecycle from form submission and fee payment tracking to background checks, lease generation, and e-signatures.

## Architecture

- **Frontend:** Pure HTML5, CSS3, and Vanilla JavaScript (ES6+) — no frameworks
- **Backend:** Google Apps Script (GAS) — runs externally, not in this repo
- **Database:** Google Sheets (via GAS)
- **External APIs:** Geoapify (address autocomplete), Supabase (property status sync)
- **Libraries (CDN):** Font Awesome, Inter font, QRCode.js

## Project Structure

```
/
├── index.html          # 6-step rental application form (main entry point)
├── server.js           # Local/Replit dev server (serves static files on port 5000)
├── generate-config.js  # Build-time config generator (Cloudflare Pages)
├── config.js           # Auto-generated config file (injected env vars)
├── package.json        # npm scripts
├── _headers            # Cloudflare Pages HTTP headers
├── _redirects          # Cloudflare Pages redirects
├── css/
│   └── style.css       # Mobile-first stylesheet (~2300 lines)
├── js/
│   └── script.js       # RentalApplication class — all frontend logic (~2300 lines)
├── backend/
│   └── code.gs         # Google Apps Script source (manually deployed to GAS)
└── docs/               # Architecture docs, implementation plans
```

## Running in Replit

The app runs via `node server.js` on port 5000. The server:
- Serves all static files (HTML, CSS, JS)
- Dynamically generates `config.js` from environment variables
- Falls back gracefully when env vars are not set

## Environment Variables (Optional)

| Variable | Description |
|----------|-------------|
| `BACKEND_URL` | Google Apps Script web app URL for form submissions |
| `GEOAPIFY_API_KEY` | API key for address autocomplete |
| `LISTING_SITE_URL` | Base URL of the main listing platform |

Without these, the form renders but submissions and autocomplete won't work.

## Key Features

- **6-Step Application Form:** Personal info, employment, rental history, document uploads
- **Bilingual:** Full English and Spanish support
- **Admin Dashboard:** GAS-rendered UI for reviewing applications
- **Applicant Dashboard:** Status tracking page
- **Lease Generation:** State-specific legal jurisdictions, e-signatures. Landlord's legal name (from "Property Owner" column) appears only in Article I of the lease. Everywhere else — emails, dashboard, reminder emails, signature block, and confirmation page — shows Choice Properties as the management contact.
- **Security:** OTP-based admin login, device fingerprinting

## Workflows

- **Start application:** `node server.js` → port 5000 (webview)

## Deployment

Configured for autoscale deployment with `node server.js`. In production on Cloudflare Pages, `generate-config.js` runs at build time to inject secrets. The backend (`backend/code.gs`) must be manually deployed to Google Apps Script.
