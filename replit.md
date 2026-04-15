# Choice Properties — Rental Application System

## Overview
A self-contained rental application and management platform for Choice Properties. Handles the full lifecycle of a rental application: submission, fee payment, background checks, status updates, lease generation, and e-signatures.

## Tech Stack
- **Frontend:** Pure HTML5, CSS3, Vanilla JavaScript (ES6+) — no frameworks
- **Backend:** Google Apps Script (GAS) — deployed separately at script.google.com
- **Database:** Google Sheets (via GAS)
- **Dev Server:** Node.js `server.js` (serves static files)
- **Replit Runtime Config:** `server.js` serves `/config.js` from environment variables at request time and blocks non-public source/docs from static serving
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
- The Test Fill utility is hidden by default and appears only when the URL includes `?test=true` or `?test=1`, which supports mobile testing without showing the button during normal use
- The GEOAPIFY_API_KEY is optional (address autocomplete disabled without it)
- BACKEND_URL points to the Google Apps Script deployment URL

## Environment Variables (for production)
- `BACKEND_URL` — Google Apps Script web app URL (required)
- `GEOAPIFY_API_KEY` — Geoapify address autocomplete API key (optional)
- `LISTING_SITE_URL` — Base URL of the listing platform (default: https://choice-properties-site.pages.dev)

## Deployment
- **Primary production target:** Cloudflare Pages static hosting + Google Apps Script backend
- **Replit deployment/preview:** Autoscale via `npm start`, used for local preview and verification only
- In production (Cloudflare), `npm run build` runs `generate-config.js` to inject secrets into `config.js`
- Cloudflare `_headers` and `_redirects` are treated as production-critical source files; Replit configuration must not override Cloudflare/GAS behavior

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

## Security Fixes (April 2026)
- Replit static server only serves public frontend assets and blocks backend source/docs from browser access.
- Test Fill is hidden by default and appears only when the URL includes `?test=true` or `?test=1`.
- Application fee submitted from the browser is no longer authoritative. The GAS backend uses a trusted property fee from Supabase when available, rejects mismatched fee links, and otherwise falls back to the backend default while flagging the row for manual fee verification.
- The GAS backend now rehydrates trusted property context from Supabase before saving an application, then enforces property lease terms, minimum lease months, pets allowed, smoking allowed, pet weight limit, and available-date rules server-side instead of trusting URL/hidden fields.
- The GAS backend now fully validates required co-applicant fields server-side when a co-applicant/guarantor is included.
- Frontend inline click/key handlers were removed from success and review-summary UI so the Cloudflare Content Security Policy can block inline scripts without breaking those buttons.

## Encoding Cleanup (April 2026)
- Repaired UTF-8 mojibake across `backend/code.gs`, removing corrupted sequences like `Ã¢ÂÂ`, `ÃÂ§`, and `Ã°Â...` from admin dashboard pages, applicant dashboard content, lease pages, legal text, email subjects, and email templates.
- Repaired remaining frontend encoding artifacts in `index.html` and `js/script.js`, including Spanish SSN labels, email warning icon text, and "Back to this listing" link text.
- Verified `backend/code.gs`, `js/script.js`, `index.html`, and `css/style.css` have no remaining suspicious mojibake sequences.

## Lease System Final Audit & Polish (April 2026)
Complete audit and fix of `renderLeaseSigningPage()`, `signLease()`, `renderLeaseConfirmPage()`, and `generateAndSendLease()` in `backend/code.gs`. All issues are now resolved — the lease system is considered production-final.

### Critical Bug Fixes
- **`btnNext1` JS error:** The top "I have read" checkbox (`leaseReadConfirm`) was calling `document.getElementById('btnNext1').disabled` — that element never existed. Fixed to call `validateSignatureForm()` instead.
- **Email not gating sign button:** `validateSignatureForm()` now checks that `signerEmail` is filled and valid before enabling the sign button. The email input also gets an `oninput` handler for real-time validation.
- **`leaseReadConfirm` not in validation:** The pre-read acknowledgment checkbox is now included in `validateSignatureForm()` and `submitSignature()` — all 6 conditions must be met (email, signature, leaseReadConfirm, plus the 5 agreement checkboxes).
- **Pet deposit missing from move-in total:** The "Total Due at Move-In" row now includes `petDeposit` via `moveInCostWithPet`. The `agreeFinancial` checkbox and the move-in highlight box also reflect the correct total including pet deposit.
- **Wrong property address in confirmation/emails:** `renderLeaseConfirmPage()` and `signLease()` now prefer `Verified Property Address` over `Property Address` (consistent with the lease document itself).

### Signature Security
- **Minimum signature length raised from 2→5 characters** in both backend (`signLease()`) and frontend (`validateSignatureForm()` / `submitSignature()`).

### Jurisdiction Compliance
- **`entryNoticeDays` added to all 21 states** in `JURISDICTION_MAP`. Article 7 (Right of Entry) now reads the correct hours for each state (e.g., 48h for AZ, 12h for FL) instead of hardcoding "24 hours" for all jurisdictions.
- **`graceLateDay` overflow fix:** If `rentDueDay + gracePeriodDays > 28`, `graceLateDay` is now capped at 28 to prevent impossible ordinals like "the 33rd of the month".

### Legal Completeness
- **Admin lease notes now displayed in the lease document:** If the admin entered notes when sending the lease, a "Special Terms & Conditions" section appears after Article 25.
- **Co-applicant names now on the lease:** If a co-applicant is on the application, their name appears in Article I (Parties), Article II (Tenant row), and Article 3 (Occupancy).

### UX / Polish
- **"person(s)" grammar fixed** → proper "1 person" or "N persons".
- **Font Awesome CDN added** to the lease signing page — the `fa-gavel` icon in the e-sign notice now renders.
- **`@media print` styles added** to the lease signing page — hides signature controls and buttons, ensures clean print output for saving the full lease as a PDF.
- **"Print / Save PDF of this Lease" button added** to the lease footer — tenants can save the actual lease document at any time, not just after signing.
- **Sign button subtitle updated** to mention email as a requirement.

## Cloudflare-First ZIP Replacement (April 2026)
- Replaced the main frontend/runtime files from the uploaded fixed v2 package: `index.html`, `js/script.js`, `css/style.css`, `server.js`, `_headers`, `_redirects`, `generate-config.js`, and `backend/code.gs`.
- Preserved Replit preview compatibility by keeping `npm start` in `package.json` and continuing to serve the preview on `0.0.0.0:5000`.
- Kept the safer backend fee/property validation from the previous Replit version: when `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are configured in GAS Script Properties, submissions validate the property and compare the browser-submitted fee against the trusted property record.
- Patched backend consent validation to match the fixed v2 frontend's consolidated consent checkboxes: `certifyCorrect`, `authorizeVerify`, and `feeAcknowledge`.
