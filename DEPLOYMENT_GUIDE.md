# Apply Choice Properties — Deployment Guide

> **Based on actual codebase scan — April 2026**
> This guide reflects what the code actually does.

---

## How This System Works

| Layer | Technology | Where it runs |
|---|---|---|
| Application form | Static HTML / CSS / JS | Cloudflare Pages |
| Backend / data storage | Google Apps Script | Google's GAS runtime |
| Spreadsheet storage | Google Sheets | Google Drive |
| Email | MailApp (built into GAS) | Google's mail relay |

> **Replit is a code editor only.** `server.js` in the repo root is a simple local preview
> server for the Replit environment — it is **not used in production at all**.
> Cloudflare Pages serves the static files directly with no server involved.

> **There is no build step.** This project has no `package.json`, no `npm install`,
> and no `node generate-config.js`. Never add these — the architecture is intentionally
> static HTML/CSS/JS only. See `PROJECT_RULES.md` for the full constraint contract.

---

## System Architecture — Two Separate Pieces

This deployment has two independent parts that are set up separately:

```
  PART 1: Cloudflare Pages (static frontend)
  ─────────────────────────────────────────
  apply-choice-properties.pages.dev
  ↳ Serves index.html (the application form)
  ↳ js/script.js runs in the browser
  ↳ On form submit → calls BACKEND_URL (GAS)

  PART 2: Google Apps Script (backend)
  ────────────────────────────────────
  script.google.com deployment
  ↳ backend/code.gs handles all form submissions
  ↳ Writes data to Google Sheets
  ↳ Sends confirmation emails via MailApp
```

Both parts must be set up and working for the system to function.

---

## Part 1 — Cloudflare Pages (Frontend)

### Day-to-Day Deployment

```
Edit files in your editor
       ↓
git add .
git commit -m "your message"
git push origin main
       ↓
Cloudflare Pages detects the push
       ↓
Site is live globally in ~1–2 minutes (no build step runs)
```

### First-Time Cloudflare Pages Setup

1. Go to **dash.cloudflare.com → Workers & Pages → Create application → Pages → Connect to Git**
2. Connect GitHub and select the **`choice121/Apply_choice_properties`** repository
3. Under **Set up builds and deployments**:
   - **Framework preset**: None
   - **Root directory**: `/` *(repository root)*
   - **Build command**: *(leave completely empty — no build command)*
   - **Build output directory**: `.` *(a single dot — the repo root)*
4. Click **Save and Deploy**

> **No environment variables needed for Cloudflare Pages.** The frontend has no config
> injection step. All backend configuration lives in the Google Apps Script (Part 2).

The site will be available at `apply-choice-properties.pages.dev` (or your custom domain).

### Custom Domain (Optional)

Cloudflare Pages → your project → **Custom domains** → Add domain. SSL is automatic.

---

## Part 2 — Google Apps Script Backend

The backend is `backend/code.gs` in this repository. It runs on Google's infrastructure,
not on any server you control.

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

### Connect the Frontend to Your GAS Deployment

Open `js/script.js` and find this block near the top of the `RentalApplication` constructor:

```javascript
this.BACKEND_URL = window.CP_CONFIG && window.CP_CONFIG.BACKEND_URL
    ? window.CP_CONFIG.BACKEND_URL
    : 'https://script.google.com/macros/s/AKfycb.../exec';
```

Replace the hardcoded fallback URL with your own GAS Web App URL from Step 6.
Commit and push — Cloudflare Pages redeploys automatically.

> **Important:** `window.CP_CONFIG` is never injected in this static site.
> The hardcoded fallback URL is always the one used. There is no config injection step.
> Replacing the URL in `script.js` is the correct and only way to point the form at your GAS.

### Updating the GAS Backend After Code Changes

When you change `backend/code.gs`:

1. Open **script.google.com** → open your project
2. Replace the script code with the updated `code.gs` content
3. Click **Deploy → Manage deployments → Edit** (pencil icon)
4. Increment the version number and click **Deploy**

> **Critical — never click "New deployment".**
> A new deployment creates a **new URL**. The old hardcoded URL in `script.js` will stop working.
> The existing deployment URL never changes as long as you always use **Manage deployments → Edit**.

---

## How Property Context Passes Between the Two Systems

When a user clicks "Apply" on a listing in the main platform (`choice-properties-site.pages.dev`),
they are redirected here with URL parameters:

| Parameter | Meaning | Example |
|---|---|---|
| `pn` | Property name | `?pn=Oak+Street+Apartments` |
| `addr` | Street address | `&addr=123+Oak+St` |
| `city` | City | `&city=Austin` |
| `state` | 2-letter state | `&state=TX` |
| `rent` | Monthly rent | `&rent=1800` |
| `id` | Property ID (display only) | `&id=prop_abc123` |

These parameters pre-fill the property address field and show a context banner on the form.
They are display-only — the GAS backend does not trust them for any validation.

---

## When You Change the GAS URL (Avoid If Possible)

If you must create a new GAS deployment (e.g. you're setting up from scratch):

1. Get the new GAS Web App URL from **Deploy → Manage deployments**
2. In this repo, open `js/script.js`
3. Replace the hardcoded URL in the `BACKEND_URL` fallback with your new URL
4. Commit and push — Cloudflare Pages redeploys in ~1–2 minutes

---

## Verifying the Setup

1. Open your live URL (e.g. `https://apply-choice-properties.pages.dev`)
2. Fill out the form partially and check that autosave works (no console errors)
3. Submit a test application — check the Google Sheet for a new row
4. Check your `ADMIN_EMAIL` for a notification email
5. Check the applicant's email address for a confirmation email

---

## Troubleshooting

**Form submits but nothing appears in Google Sheets**
→ The GAS URL in `script.js` is wrong or pointing to a deleted deployment
→ Open browser DevTools → Network tab → check for errors on the form POST request
→ Check the GAS Executions log: script.google.com → your project → Executions

**"Script function not found" error in GAS logs**
→ The `doPost` function is missing or `code.gs` was not saved before deploying
→ Re-paste `code.gs` content, save, and redeploy via Manage deployments → Edit

**No confirmation emails sent**
→ Check GAS Executions log for errors
→ Verify `ADMIN_EMAIL` is set in Script Properties
→ GAS MailApp has daily sending limits — check Google Workspace quota

**Form shows blank / errors on load**
→ Check browser console for JavaScript errors
→ Cloudflare Pages → your project → Deployments — verify the latest deploy succeeded

**Address autocomplete not working**
→ Geoapify is used for address autocomplete. The API key is baked into the frontend.
→ If it stopped working, the key may have a referrer restriction set in the Geoapify dashboard
→ Geoapify → API Keys → remove or update the HTTP referrer restriction

---

*Choice Properties · Your trust is our standard.*