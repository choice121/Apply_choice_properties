# Choice Properties - Rental Application System

## Overview
A static web application for managing rental applications for Choice Properties. It is a multi-step application form that communicates with a Google Apps Script (GAS) backend.

## Architecture
- **Frontend:** Pure static HTML/CSS/Vanilla JavaScript (no build system, no package manager)
- **Backend:** Google Apps Script (code.gs) — hosted externally on Google Apps Script
- **Database:** Google Sheets (via GAS)
- **Email:** Google MailApp (via GAS)

## Project Structure
- `index.html` — Main 6-step rental application form
- `js/script.js` — Frontend logic (validation, state management, form submission)
- `css/style.css` — Mobile-first stylesheet
- `backend/code.gs` — Google Apps Script source (backend logic)
- `server.js` — Simple Node.js static file server for Replit

## Running the App
- Workflow: "Start application" runs `node server.js` on port 5000
- No build step needed — pure static files

## Deployment
- Configured as a static deployment (publicDir: ".")
- Originally designed for Cloudflare Pages hosting

## Changes Applied (UX/Bug Fix Pass)

### Global Removals
- **Income ratio feature fully removed**: deleted `_setupIncomeRatio()` method, all calls to it (including `_prefillFromURL` and `restoreSavedProgress`), the `#incomeRatioResult` div in HTML, and `.income-ratio`, `.income-ratio-label`, `.income-ratio-value` CSS
- **Pay Now button removed**: removed `payNowBtn` event listener from `setupEventListeners()`
- **Test data fill button removed**: removed `#testButtonContainer` HTML block, disabled the test fill IIFE, removed all `.test-button-container` and `.test-fill-btn` CSS

### Trust & Credibility
- Replaced Stripe brand icon (`fab fa-stripe`) with generic security icon (`fas fa-shield-alt`)
- Fixed footer Contact Support link from `href="#"` to `mailto:choicepropertygroup@hotmail.com`
- Added trust statement near submit button: "Your information is securely processed and will only be used for rental application review."

### Wording / Translations (EN + ES)
- "Additional Person Information" → "Co-Applicant / Guarantor Information"
- Step 4 nav label: "Financial & References" → "References & Emergency Contact"
- "Contact Preferences (For Follow-up After Payment)" → "Contact Preferences"
- "Availability for Follow-up (After Payment)" → "Availability"
- "Your Preferences (For Follow-up After Payment)" → "Your Preferences"
- "authorise" → "authorize" everywhere (error messages, consent label)

### Data / Backend
- Added `'Property Address URL'` column to GAS sheet headers, migration columns list, and row data switch/case mapping
- The `name="Property Address URL"` hidden input was already present in HTML — GAS now stores it
