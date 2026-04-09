# Apply Choice Properties — Deployment Guide

  > **Last updated: April 2026 — reflects the current production stack after security hardening.**

  ---

  ## How This System Works

  | Layer | Technology | Where it runs |
  |---|---|---|
  | Application form | Static HTML / CSS / JS | Cloudflare Pages |
  | Config injection | `generate-config.js` | Cloudflare Pages **build step** |
  | Backend / data storage | Google Apps Script | Google's GAS runtime |
  | Spreadsheet storage | Google Sheets | Google Drive |
  | Email | MailApp (built into GAS) | Google's mail relay |

  > **Replit is a code editor only.** `server.js` in the repo root is a simple local preview
  > server for the Replit environment — it is **not used in production at all**.
  > Cloudflare Pages serves the static files directly.

  ---

  ## System Architecture — Two Separate Pieces

  This deployment has two independent parts set up separately:

  ```
    PART 1: Cloudflare Pages (static frontend + build step)
    ────────────────────────────────────────────────────────
    apply-choice-properties.pages.dev
    ↳ Build step: node generate-config.js
        reads GEOAPIFY_API_KEY + BACKEND_URL from CF env vars
        writes config.js → available to the browser as window.CP_CONFIG
    ↳ Serves index.html (the application form)
    ↳ js/script.js reads window.CP_CONFIG for API keys
    ↳ On form submit → calls BACKEND_URL (GAS)

    PART 2: Google Apps Script (backend)
    ─────────────────────────────────────
    script.google.com deployment
    ↳ backend/code.gs handles all form submissions
    ↳ Writes data to Google Sheets
    ↳ Sends confirmation emails via MailApp
  ```

  Both parts must be set up and working for the system to function end-to-end.

  ---

  ## Part 1 — Cloudflare Pages (Frontend)

  ### Day-to-Day Deployment

  Every push to `main` triggers an automatic redeploy:

  ```
  Edit files in your editor
         ↓
  git add .
  git commit -m "your message"
  git push origin main
         ↓
  Cloudflare Pages detects the push
         ↓
  Build step runs: node generate-config.js
    - Reads GEOAPIFY_API_KEY, BACKEND_URL, LISTING_SITE_URL from CF env vars
    - Writes config.js (injects keys into window.CP_CONFIG)
         ↓
  Site is live globally in ~1–2 minutes
  ```

  ### Build Step — What It Does

  `generate-config.js` runs at Cloudflare Pages build time and:
  1. Reads `GEOAPIFY_API_KEY`, `BACKEND_URL`, and `LISTING_SITE_URL` from CF environment variables
  2. Writes `config.js` with `window.CP_CONFIG` containing those values
  3. Logs a warning (but does not fail) if `GEOAPIFY_API_KEY` is missing — autocomplete is just disabled

  `config.js` is gitignored. It is generated fresh on every deploy and never committed.

  The build uses only Node.js built-in modules (`fs`). No `npm install` is ever needed.

  ---

  ### First-Time Cloudflare Pages Setup

  1. Go to **dash.cloudflare.com → Workers & Pages → Create application → Pages → Connect to Git**
  2. Connect GitHub and select the **`choice121/Apply_choice_properties`** repository
  3. Under **Set up builds and deployments**:
     - **Framework preset**: None
     - **Root directory**: `/` *(repository root)*
     - **Build command**: `node generate-config.js`
     - **Build output directory**: `.` *(a single dot — the repo root)*
  4. Add the **Environment Variables** listed below
  5. Click **Save and Deploy**

  From this point on, every push to `main` auto-redeploys the site.

  ---

  ### Environment Variables

  Set these in **Cloudflare Pages → apply-choice-properties → Settings → Environment variables**.
  Apply to both **Production** and **Preview** environments.

  | Variable | Required | Default if missing | Notes |
  |---|---|---|---|
  | `GEOAPIFY_API_KEY` | Recommended | Address autocomplete disabled | Get from app.geoapify.com → API Keys |
  | `BACKEND_URL` | No | Hardcoded GAS URL in generate-config.js | Set this if the GAS deployment URL ever changes |
  | `LISTING_SITE_URL` | No | `https://choice-properties-site.pages.dev` | Base URL of the main listing platform — used for back-to-listing links |

  > **Security:** Never hardcode API keys in `js/script.js` or any source file.
  > All keys must come from Cloudflare environment variables via `generate-config.js`.

  After changing any variable, trigger a redeploy: **Cloudflare Pages → Deployments → Retry deployment** (or push any commit).

  ---

  ### Custom Domain (Optional)

  Cloudflare Pages → your project → **Custom domains** → Add domain. SSL is automatic.

  ---

  ## Part 2 — Google Apps Script Backend

  The backend is `backend/code.gs` in this repository. It runs on Google's infrastructure, not on any server you control.

  ### First-Time GAS Setup

  1. Open **script.google.com** → click **New project**
  2. Delete all default code
  3. Paste the entire contents of `backend/code.gs` from this repository
  4. Click **Project Settings** (gear icon) → **Script Properties** → click **Add script property**:

  | Property | Value |
  |---|---|
  | `ADMIN_EMAIL` | Your admin/notification email address |
  | `FROM_NAME` | Display name for outgoing emails (e.g. `Choice Properties`) |
  | `SPREADSHEET_ID` | Google Sheets ID (see below) |

  5. Create a Google Sheet (or use an existing one):
     - Open **sheets.google.com** → create a new spreadsheet
     - Copy the ID from the URL: `https://docs.google.com/spreadsheets/d/**THIS_PART**/edit`
     - Paste it as the value of `SPREADSHEET_ID` in Script Properties

  6. In the GAS editor: **Deploy → New deployment**
     - Type: **Web App**
     - Execute as: **Me**
     - Who has access: **Anyone**
  7. Click **Deploy** → copy the **Web App URL** shown

  ### Connect the Frontend to GAS

  Set the Web App URL as `BACKEND_URL` in Cloudflare Pages environment variables. The form will submit to this URL on every application submission. If `BACKEND_URL` is not set, the system falls back to the URL hardcoded in `generate-config.js`.

  ### Updating GAS After Code Changes

  1. Make changes to `backend/code.gs` in this repo
  2. Copy the updated code to the GAS editor at **script.google.com**
  3. Click **Deploy → Manage deployments → Edit** (pencil icon — **NOT 'New deployment'**)
  4. Increment the version number and click **Deploy**

  > **Critical:** Always use **Manage deployments → Edit**. Never click **New deployment**.
  > A new deployment generates a new URL, which breaks the frontend connection.
  > If you accidentally create a new deployment, update `BACKEND_URL` in Cloudflare env vars.

  ---

  ## Verifying the Deployment

  After any deploy, check:
  1. Open the live site — address autocomplete should work if `GEOAPIFY_API_KEY` is set
  2. **Cloudflare Pages → Deployments** — build log shows any errors from `generate-config.js`
  3. Submit a test application and verify it arrives in Google Sheets
  4. Check the confirmation email arrives in the test applicant's inbox

  ---

  ## Troubleshooting

  **Address autocomplete not working**
  → `GEOAPIFY_API_KEY` not set in Cloudflare Pages env vars, or not deployed yet
  → Open browser console — you'll see `[CP] GEOAPIFY_API_KEY not configured`
  → Set the key, then: Cloudflare Pages → Deployments → Retry deployment

  **Form submissions not going through**
  → `BACKEND_URL` is pointing to an old or deleted GAS deployment
  → Verify the GAS Web App URL is active at script.google.com → Deployments
  → Update `BACKEND_URL` in Cloudflare env vars if it changed

  **config.js 404 in browser console**
  → The build step did not run — check Cloudflare Pages build log
  → Confirm build command is set to `node generate-config.js` in CF Pages settings

  **Build fails with a Node.js error**
  → Check Cloudflare Pages build log for the error
  → Likely: a syntax error in `generate-config.js` or a missing env var
  → The build does NOT run `npm install` — there are no dependencies to install

  **"window.CP_CONFIG is not defined" in browser console**
  → `config.js` was not loaded before `js/script.js`
  → Verify `index.html` has `<script src="/config.js"></script>` immediately before the `script.js` tag

  ---

  ## Security Notes

  - **API keys must never be hardcoded** in `js/script.js` or any source file. Always use Cloudflare env vars → `generate-config.js` → `window.CP_CONFIG`.
  - **`config.js` is gitignored** and must never be committed. It is regenerated on every deploy.
  - **Geoapify API key rotation:** If the key is ever compromised, generate a new key at app.geoapify.com, update `GEOAPIFY_API_KEY` in Cloudflare Pages, and trigger a redeploy. The old key should be deleted in Geoapify.
  - **The GAS Web App URL is a public endpoint** — GAS handles authorization via CSRF token validation in `code.gs`. Do not treat the URL itself as a secret.
  