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
