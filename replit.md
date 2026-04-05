# Choice Properties - Rental Application System

## Overview
A rental application and property management system for Choice Properties. This is a pure static web application with no build tools, package managers, or server-side runtime required.

## Architecture
- **Frontend:** Pure HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Backend:** Google Apps Script (`backend/code.gs`) — deployed separately to Google
- **Database:** Google Sheets (managed via Google Apps Script)
- **CDN Libraries:** Font Awesome 6.4.0, Google Fonts (Inter), QRCode.js, Geoapify API

## Project Layout
```
.
├── index.html        # Main entry point (application form)
├── css/style.css     # Mobile-first stylesheet
├── js/script.js      # Application logic
├── backend/code.gs   # Google Apps Script backend (deploy to Google separately)
└── PROJECT_RULES.md  # Architecture constraints
```

## Running in Replit
- Served via Python's built-in HTTP server on port 5000
- Workflow: "Start application" → `python3 -m http.server 5000 --bind 0.0.0.0`

## Deployment
- Configured as a **static** deployment (no build step needed)
- `publicDir` is the project root (`.`)

## Key Constraints (from PROJECT_RULES.md)
- No npm, yarn, pip, or build tools allowed
- No frameworks (React, Vue, Tailwind, etc.)
- All external libraries via CDN only
- Mobile-first CSS (min-width media queries)

## GAS-Generated Pages (backend/code.gs)
All three dashboard pages are rendered entirely by Google Apps Script functions:

### `renderAdminLoginPage()`
- Clean card-based login with OTP + password options
- CP wordmark logo (replaces 🏢 emoji)
- Full mobile responsive

### `renderAdminPanel()`
- **Sidebar** (desktop ≥640px): FA icons, CP wordmark logo, live badge counts
- **Mobile nav bar** (≤640px): Fixed bottom nav with 7 filter tabs — replaces hidden sidebar
- **Stats row**: Horizontal scroll on mobile (no cramped 2-col grid)
- **Application cards**: Clickable email (mailto:) and phone (tel:) chips, FA icons, apostrophe-safe onclick handlers
- **Action buttons**: Min-height 38px touch targets, FA icons
- **Modals**: body.modal-open scroll-lock, max-height with scroll on small screens
- **Toast**: Positioned above mobile nav bar on small screens
- Font Awesome 6.4.0 imported

### `renderApplicantDashboard()`
- **CP wordmark** logo in top-bar (replaces emoji)
- **Progress tracker**: Small-screen label hiding (≤360px)
- **Contact card** (replaces dark footer): Tappable phone/email/address rows with FA icons
- **Back link**: Full-width button with FA arrow icon, visible against dark background
- **Toggle button**: FA chevron icons with aria-expanded
- Font Awesome 6.4.0 imported

### `buildAdminCard()` / `buildCardHtml()` (card builders)
- Apostrophe escaping fix: names like O'Brien no longer break onclick handlers
- Email chips → `<a href="mailto:...">`, phone chips → `<a href="tel:...">`
- All emoji icons replaced with Font Awesome equivalents
- Payment preference icons use FA medal/award/coins

## Branding
- Primary color: #1B3A5C (navy)
- Accent: #2A6FAD (blue)
- CP wordmark used as logo across all pages (40-46px rounded square)
