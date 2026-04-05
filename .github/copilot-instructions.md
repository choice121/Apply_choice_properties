# ⛔ GitHub Copilot — Project Behavior Contract

**Read this file before generating any suggestion for this repository.**

## What This Project Is

A static website: HTML, CSS, vanilla JavaScript only.
Backend: Google Apps Script (external).
Deployment: Cloudflare Pages exclusively.
This environment: code editor only — no runtime, no server, no build step.

## What Copilot MUST NOT Do

- Suggest or complete code that installs packages or imports frameworks
- Suggest server-side code, Node.js modules, or Python imports
- Auto-complete into configuration files (package.json, webpack, vite, etc.)
- Suggest database connections or API integrations not already present
- Recommend build tools, bundlers, or transpilers
- Generate multi-file scaffolding or project setup code

## What Copilot Should Do

- Suggest plain JavaScript, HTML, and CSS completions only
- Stay within the scope of the file being edited
- Respect the existing code style and architecture
- When in doubt — suggest nothing and let the user type

## Enforcement

These rules apply in every environment this repo is cloned or forked into.
See AGENTS.md and PROJECT_RULES.md for the full enforcement contract.
