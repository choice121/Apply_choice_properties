# Choice Properties — Rental Application System

## Project Overview

A static web application for managing rental applications for Choice Properties. It handles the full lifecycle from form submission and fee payment tracking to background checks, lease generation, and e-signatures.

## Architecture

- **Frontend:** Pure HTML5, CSS3, and Vanilla JavaScript (ES6+) — no frameworks
- **Backend:** Google Apps Script (GAS) — source tracked in `backend/` and deployed externally
- **Database:** Google Sheets (via GAS)
- **External APIs:** Geoapify (address autocomplete), Supabase (property status sync)
- **Libraries (CDN):** Font Awesome, Inter font, QRCode.js

## Project Structure

```
/
├── index.html              # 6-step rental application form (main entry point)
├── server.js               # Local/Replit dev server (serves static files on port 5000)
├── generate-config.js      # Build-time config generator (Cloudflare Pages)
├── config.js               # Auto-generated config file (injected env vars)
├── package.json            # npm scripts, including GAS deploy helpers
├── _headers                # Cloudflare Pages HTTP headers
├── _redirects              # Cloudflare Pages redirects
├── css/
│   └── style.css           # Mobile-first stylesheet (~2300 lines)
├── js/
│   └── script.js           # RentalApplication class — all frontend logic (~2300 lines)
├── backend/
│   ├── code.gs             # Google Apps Script backend source
│   └── appsscript.json     # GAS manifest used by clasp push
├── credentials.enc         # AES-256-GCM encrypted GAS credentials (safe to commit)
├── scripts/
│   ├── gas-push.js         # Push backend/code.gs to Google Apps Script
│   ├── gas-encrypt.js      # Encrypt credentials into credentials.enc
│   └── gas-setup.js        # Decrypt credentials.enc on fresh environments
└── docs/                   # Architecture docs, implementation plans
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
| `GAS_SCRIPT_ID` | Apps Script project ID used by `npm run gas:push` |

Without the frontend variables, the form renders but submissions and autocomplete won't work. Without `GAS_SCRIPT_ID`, the GAS push helper will tell the operator how to provide it.

## Google Apps Script Deployment

The project uses `@google/clasp` to push `backend/code.gs` to Google Apps Script directly from Replit.

### Pushing changes
```
npm run gas:push
```

### Fresh Replit setup (importing from GitHub)
Credentials are stored encrypted in `credentials.enc` (committed to the repo). To restore on a new Replit:

1. Run `npm run gas:setup` and enter the password when prompted.
2. Add the new Replit's callback URL to your Google OAuth client's authorized redirect URIs:
   - Go to console.cloud.google.com → APIs & Credentials → edit the OAuth client
   - Add: `https://<new-replit-domain>/auth/callback`
3. Run `npm run gas:push` — everything works.

### Re-encrypting after credential changes
If you rotate OAuth secrets or the refresh token changes, re-run:
```
npm run gas:encrypt
```
Then commit the updated `credentials.enc`.

### OAuth credentials (Google Cloud)
- **Project:** 13445296763
- **Client ID:** 13445296763-p6rrutohf9j3qc25n7io5c2elh5vo6hr.apps.googleusercontent.com
- **Script ID:** 1r2IjwGtiMQ2GSiKnfZhg6FxZN9lwub5Oxh25bBDLs6paf8qAkWQxlPd-
- **Apps Script API:** Enabled at script.google.com/home/usersettings

`.clasp.json` and `.clasprc.json` are gitignored. All sensitive values live in the encrypted `credentials.enc`.

## Key Features

- **6-Step Application Form:** Personal info, employment, rental history, document uploads
- **Bilingual:** Full English and Spanish support
- **Admin Dashboard:** GAS-rendered UI for reviewing applications
- **Applicant Dashboard:** Status tracking page
- **Lease Generation:** State-specific legal jurisdictions, e-signatures. Landlord's legal name (from "Property Owner" column) appears only in Article I of the lease. Everywhere else — emails, dashboard, reminder emails, signature block, and confirmation page — shows Choice Properties as the management contact.
- **Lease Signing Flow:** GAS-rendered signing pages sanitize application data before rendering, validate tenant email and signature server-side, prevent duplicate signature submissions, and only show the final confirmation page once the lease status is recorded as signed.
- **Security:** OTP-based admin login, device fingerprinting

## Workflows

- **Start application:** `node server.js` → port 5000 (webview)

## Deployment

Configured for autoscale deployment with `node server.js`. In production on Cloudflare Pages, `generate-config.js` runs at build time to inject secrets. The backend (`backend/code.gs`) can now be pushed to Google Apps Script with the GAS deploy helper after Google login and `GAS_SCRIPT_ID` are configured.
