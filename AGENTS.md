# ⛔ STOP — AI AGENT HARD BLOCK

  This file is the primary AI behavior contract for this repository.
  It is recognized by OpenAI Codex, Claude, Cursor, Copilot, and most agent frameworks.
  **Every rule below is non-negotiable and applies in every environment.**

  ---

  ## WHAT THIS PROJECT IS

  A static website: plain HTML, CSS, and vanilla JavaScript.
  Backend: Google Apps Script only (deployed separately to Google).
  Hosting: Cloudflare Pages only.
  Editing: Done in any code editor (Replit, VS Code, Cursor, etc.) — editor use only.

  ### ✅ BUILD SYSTEM EXISTS — DO NOT REMOVE

  This project has a **minimal build step** for secret injection only. These files MUST exist:

  | File | Purpose | Touch it? |
  |---|---|---|
  | `generate-config.js` | Reads CF env vars → writes `config.js` at build time | Only if env var names change |
  | `package.json` | Defines the build command for Cloudflare Pages | Only if `generate-config.js` is renamed |
  | `config.js` | Auto-generated at build time — NEVER committed | Never edit manually |

  **Why it exists:** The Geoapify API key and GAS backend URL are secrets that must not live
  in the source code. They are stored in Cloudflare Pages environment variables and injected
  into `config.js` at build time. `js/script.js` reads them via `window.CP_CONFIG`.

  **What this build step does NOT do:** It does not run `npm install`. It does not introduce
  a runtime server. `generate-config.js` uses only Node.js built-in `fs` module.
  No `node_modules` directory exists or should ever exist.

  ---

  ## WHAT THIS PROJECT IS NOT

  This is NOT a Node.js runtime project.
  This is NOT a Python project.
  This is NOT a server-side application.
  This is NOT a platform that needs migration or additional backend setup.

  ---

  ## ⛔ ABSOLUTE PROHIBITIONS — ZERO EXCEPTIONS

  You MUST NOT do any of the following, ever, under any circumstance:

  - Run `npm install`, `yarn install`, `pip install`, or any package manager install command
  - Add any dependencies to `package.json` (it has no `dependencies` section intentionally)
  - Create `node_modules/`, `dist/`, or any build output directory
  - Create or start a local server of any kind (Node, Express, Python, FastAPI, etc.)
  - Add, configure, or modify any workflow, CI/CD pipeline, or automation config
  - Add a Dockerfile, docker-compose.yml, or any containerization config
  - Run any database commands or connect to any database other than Supabase via browser JS
  - Create any server-side API routes, functions, or endpoints in this repository
  - Install or configure Drizzle, Prisma, Sequelize, or any ORM
  - Run git commands (push, commit, reset, etc.)
  - Run the `server.js` file — it is a local Replit preview server only, never production
  - Delete `generate-config.js` or `package.json` — these are required for the build step

  ---

  ## ✅ WHAT YOU ARE ALLOWED TO DO

  - Edit HTML, CSS, and `js/script.js` for frontend changes
  - Edit `backend/code.gs` — remember to deploy it separately in Google Apps Script
  - Edit `generate-config.js` ONLY if the list of Cloudflare environment variables changes
  - Edit documentation files (README.md, DEPLOYMENT_GUIDE.md, etc.)
  - Edit `_headers` and `_redirects` for Cloudflare Pages configuration
  - Edit `css/style.css`

  ---

  ## CLOUDFLARE PAGES ENVIRONMENT VARIABLES

  The following environment variables must be set in Cloudflare Pages for the build to work:

  | Variable | Required | Purpose |
  |---|---|---|
  | `GEOAPIFY_API_KEY` | Yes | Address autocomplete. Autocomplete is disabled if missing |
  | `BACKEND_URL` | No | GAS Web App URL. Falls back to the hardcoded URL in generate-config.js |
  | `LISTING_SITE_URL` | No | Main listing platform URL. Defaults to choice-properties-site.pages.dev |

  These are set in: **Cloudflare Pages → apply-choice-properties → Settings → Environment variables**

  ---

  ## ⚠ CRITICAL SECURITY RULES

  - `config.js` is gitignored. NEVER commit it. It contains secrets.
  - API keys must NEVER be hardcoded in `js/script.js` or any source file.
  - If you need to add a new API key, add an env var to Cloudflare AND read it in `generate-config.js`.
  - The GAS Web App URL in `backend/code.gs` is a public URL (GAS handles auth via CSRF token) — it is safe to have in the source code as a fallback.

  ---

  ## PROJECT RULES REFERENCE

  See `PROJECT_RULES.md` for the complete frontend architecture contract.
  See `DEPLOYMENT_GUIDE.md` for step-by-step deployment instructions.
  See `PROJECT_STATUS.md` for what has been built and what is complete.
  