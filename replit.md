# Choice Properties - Rental Application System

## Overview
A rental application and property management system for Choice Properties. This is a pure static web application with no build tools, package managers, or server-side runtime required.

## Architecture
- **Frontend:** Pure HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Backend:** Google Apps Script (`backend/code.gs`) — deployed separately to Google
- **Database:** Google Sheets (managed via Google Apps Script)
- **CDN Libraries:** Font Awesome, Google Fonts, QRCode.js, Geoapify API

## Project Layout
```
.
├── index.html       # Main entry point
├── css/style.css    # Mobile-first stylesheet
├── js/script.js     # Application logic
├── backend/code.gs  # Google Apps Script backend (deploy to Google separately)
└── PROJECT_RULES.md # Architecture constraints
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
