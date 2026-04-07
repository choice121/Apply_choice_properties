# Choice Properties - Rental Application System

## Overview
A fully self-contained rental application system for Choice Properties. Pure static web
application — no build tools, package managers, or server-side runtime required.

This is the **sole application processing system** for Choice Properties. The main listing
platform (`choice-properties-site.pages.dev`) handles property browsing only. When a user
clicks Apply on any listing they are redirected here with property context pre-loaded via
URL parameters. All application processing, lease generation, payment tracking, and email
communication happen exclusively in this system.

> **Integration status (April 2026 — active):** The main listing platform has been fully
> updated to redirect all "Apply Now" buttons here. All "Track My Application" links
> across the main platform (nav, footer, FAQ, property pages) now point to this system's
> applicant dashboard. No changes to this repository were required — the URL parameter
> contract established in Session 028 was already complete.

## Architecture

| Layer    | Technology              | Hosting              |
|----------|-------------------------|----------------------|
| Frontend | Pure HTML5, CSS3, Vanilla JS | Cloudflare Pages |
| Backend  | Google Apps Script (`backend/code.gs`) | Google's GAS Runtime |
| Storage  | Google Sheets           | Auto-managed by GAS  |
| Email    | MailApp (GAS)           | Sent via Google      |

**This system is completely separate from the main platform's Supabase backend.**
No data is shared, synced, or passed between systems beyond the one-way redirect URL.

## Project Layout

```
.
├── index.html          # Main entry point — 6-step application form
├── css/style.css       # Mobile-first stylesheet (2,300+ lines)
├── js/script.js        # Application logic — RentalApplication class
├── backend/code.gs     # Google Apps Script — deploy to Google separately
├── PROJECT_RULES.md    # Architecture constraints (machine + human readable)
└── README.md           # This file — project documentation
```

## Integration with Main Listing Platform (Session 028)

The main platform redirects users to this form when they click "Apply" on a property.
It passes optional display-only context via URL query parameters:

| Param   | Value                | Effect in this form                        |
|---------|----------------------|--------------------------------------------|
| `id`    | Property ID          | Stored in state for logging (not sent to GAS) |
| `pn`    | Property name        | Pre-fills the Property Address field       |
| `addr`  | Street address       | Pre-fills the Property Address field       |
| `city`  | City                 | Shown in property context banner           |
| `state` | State (2-letter)     | Shown in property context banner           |
| `rent`  | Monthly rent amount  | Powers income-to-rent ratio display (Step 3) |

**These parameters are purely cosmetic.** They improve UX by showing applicants which
property they're applying for and pre-filling the address field. The GAS backend never
reads, validates, or uses these values — it processes only what the applicant types.

### New UI components added (Session 028):
- **Property context banner** — appears between header and progress bar when URL params
  are present. Shows property name, location, rent, and "Managed by Choice Properties."
- **Income-to-rent ratio** — in Step 3, when `rent` param is present, shows a live
  ratio indicator as the applicant enters income. Green ≥2.5x, amber 2–2.49x, red <2x.
- **Success card property line** — shows the property name on the submission success card.

## Deployment

Deploy to Cloudflare Pages as a static site. No build step needed.
- `publicDir` is the project root (`.`)
- Connect to your Git repo and Cloudflare will auto-deploy on every push.

**Do not deploy `backend/code.gs` to Cloudflare.** It runs exclusively on Google's
Apps Script runtime. Deploy it separately from the GAS editor at script.google.com.

## GAS Backend — What It Does

The `backend/code.gs` file is a Google Apps Script web app that handles:

### Application processing (`doPost`)
- Receives form submissions as multipart/form-data
- Validates required fields (First Name, Last Name, Email, Phone)
- Writes application to Google Sheets with ~80 columns
- Sends confirmation email to applicant via `MailApp`
- Sends admin notification to 3 admin email addresses
- Returns `{ success: true, appId: "CP-YYYYMMDD-XXXXXX" }`

### Application IDs
Format: `CP-YYYYMMDD-XXXXXXNNN` (date + random hex + milliseconds)
Generated server-side in `generateAppId()`.

### Admin panel (`doGet?path=admin`)
Full HTML UI served by GAS. Features:
- OTP email login (6-digit code, 10-min expiry, 5-strike lockout)
- Username/password login as alternative
- 30-day session persistence with device fingerprinting
- Application dashboard with status management
- Lease generation and e-signature flow
- Payment recording
- Status update emails

### Applicant dashboard (`doGet?path=dashboard&id=<appId>`)
Applicant-facing status page. Accessible via the Track My Application link
on the success screen and in confirmation emails.

### Lease flow (`doGet?path=lease&id=<appId>`)
Admin-triggered. GAS renders a lease signing page for the applicant.
On signing, `doPost(_action=signLease)` records the e-signature to the sheet.

## Email Configuration

Three admin email addresses receive every new application notification:
- `choicepropertygroup@hotmail.com`
- `theapprovalh@gmail.com`
- `jamesdouglaspallock@gmail.com`

These are configured in the Settings sheet (column B2, named range `AdminEmails`).
To change them: update the Settings sheet directly in Google Sheets.

Contact info shown to applicants:
- Phone: 707-706-3137
- Email: choicepropertygroup@hotmail.com
- Address: 2265 Livernois, Suite 500, Troy, MI 48083

## Branding

- Primary color: `#1B3A5C` (navy)
- Accent: `#2A6FAD` (blue)
- Gold accent: `#C9A04A`
- CP wordmark used as logo across all GAS-rendered pages

## Key Constraints

See `PROJECT_RULES.md` for the full enforcement contract. Summary:
- No npm, yarn, pip, or build tools
- No frameworks (React, Vue, Tailwind, etc.)
- All external libraries via CDN only
- Mobile-first CSS (min-width breakpoints only)
- Backend = Google Apps Script only — no Supabase, no new backends
- No connection to or sync with the main platform's Supabase backend

## Dynamic Data Implementation Plan

A full audit was conducted in Session 031 identifying all places where property
data, legal jurisdiction, financial terms, and email content are hardcoded
instead of being driven by the property being applied for.

The complete plan — with 21 issues across 6 phases — is in:
**`DYNAMIC_DATA_PLAN.md`** (project root)

Any AI assistant starting a new session must read that file first.
It is self-contained and requires no manual prompt context from the user.

**All 6 phases complete (D-001–D-021). The Dynamic Data Implementation Plan is fully resolved.**

---

## Change History

| Session | Changes |
|---------|---------| 
| 043 | **Two mapping/UX fixes (`js/script.js`, `backend/code.gs`).** (1) **`Has Vehicle` not stored in sheet:** The Yes/No vehicle question was collected in the form but silently dropped — no column existed in the GAS sheet. Added `'Has Vehicle'` to `initializeSheets()` headers and to `addMissingLeaseColumns()` (existing sheets auto-migrate). The switch default case writes it automatically on submission. (2) **Unemployed/Retired/Student blocked at Step 3:** Applicants selecting one of those statuses were still required to fill Employer, Job Title, Employment Duration, Supervisor Name, Supervisor Phone before advancing. Added `toggleEmployerSection(status)` function in `setupConditionalFields()` — fires on `employmentStatus` change and on page load (for saved/pre-filled state). For non-employed statuses the three employer field rows are hidden and `required` removed; when switching back to an employed status they reappear and `required` is restored. Values are cleared when hidden to avoid submitting stale data. |
| 042 | **Phase 4 — Cross-system property sync (`backend/code.gs`).** New function `_syncPropertyStatusToSupabase(propertyId, supabaseStatus)` added. Uses `UrlFetchApp` to call Supabase REST API (`PATCH /rest/v1/properties?id=eq.<id>`) when an application is approved or denied. approved → `status: 'rented'`; denied → `status: 'active'` (revert to available). Wired into `updateStatus()` — reads `Property ID` from the sheet row, computes the correct Supabase status, and calls the sync function as fire-and-forget (errors caught and logged, never block the approval flow). Credentials (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`) read from GAS Script Properties — never hardcoded. If credentials are absent the function logs a warning and skips silently. **Manual setup required:** in the GAS editor go to Extensions → Apps Script → Project Settings → Script Properties and add `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` (service role key from Supabase Dashboard → Settings → API). |
| 041 | **Phase 1 & Phase 2 improvements — 4 issues resolved across `index.html`, `js/script.js`, `css/style.css`.** Full cross-repo analysis confirmed 23-param URL integration fully aligned. Phase 1: (1) **Critical — `hiddenPropertyAddress` missing `name` attribute:** input had no `name`, silently dropping the URL-provided street address from every FormData submission. Fixed by adding `name="Property Address URL"`. (2) **Move-in date not enforced from `avail` param:** `_prefillFromURL()` stored the available date but never applied it as `min` on `#requestedMoveIn`. Fixed by setting `moveInField.min = avail`. Phase 2: (3) **Lease terms chip added to property context banner:** `_showPropertyBanner` now accepts `terms` (pipe-separated list from URL param) and renders a `fas fa-file-contract` chip with terms formatted as `6-mo, 12-mo`. Call site updated to pass `terms`. (4) **"View listing" back link added to banner:** when `id` URL param is present, a `← View listing` link appears below the "Managed by" badge, pointing to `https://choice-properties.pages.dev/property.html?id=<id>`. Opens in new tab. CSS: added `.pcb-back-link` with hover state. |
| 040 | **Session audit — no code changes.** Full cross-repo deep scan of `choice121/Apply_choice_properties` and `choice121/Choice`. Verified all 3 key files (`js/script.js`, `index.html`, `backend/code.gs`) are byte-for-byte identical between local Replit and GitHub (MD5 verified) — Cloudflare Pages production has correct code. Confirmed property pre-fill banner and address field display correctly from URL params (screenshot verified). Confirmed Session 037 holding fee feature is fully complete in `code.gs` — previous session note claiming areas pending was outdated. Updated `DYNAMIC_DATA_PLAN.md` session log with Sessions 037 (corrected), 038, 039, and 040 entries. No open issues. |
| 039 | **Integration activated — no code changes.** The main listing platform (`choice-properties-site.pages.dev`) was updated to redirect all "Apply Now" buttons to this system using the URL parameter contract established in Session 028. All "Track My Application" links on the main platform (nav, footer, FAQ, property detail pages) now point to `https://apply-choice-properties.pages.dev/?path=dashboard`. The `buildApplyURL()` function on the main platform passes: `id`, `pn`, `addr`, `city`, `state`, `rent`, `beds`, `baths`, `pets`, `term`. This system required zero changes — the integration was already fully implemented and ready. Documentation updated to reflect active integration status. |
| 038 | **Bug fixes — 9 issues resolved across `code.gs`, `index.html`, `js/script.js`.** (1) **Critical — `signLease()` crash:** `app` variable was undefined when building the `sendLeaseSignedTenantEmail` payload, causing a `ReferenceError` that silently swallowed tenant and admin confirmation emails on every lease signing. Fixed by reading `Property State` directly from the sheet row. (2) **Critical — `statusUpdate` email crash:** `EmailTemplates.statusUpdate` referenced `leaseData.propertyState` but `leaseData` was never passed to this template. Crashed every approval and denial email. Fixed by adding `propertyState` parameter to both the template signature and `sendStatusUpdateEmail()` call site. (3) **`requestHoldingFee()` guard:** function had no check that the application was approved and payment confirmed before requesting a holding fee. Added explicit `appStatus !== 'approved'` and `paymentStatus !== 'paid'` guards. (4) **Progress bar flash:** `index.html` hard-coded `step1` as `completed` and `step2` as `active` before JS ran, causing a brief wrong-step flash on load. Fixed to `step1 active`, all others plain. (5) **Broken static success card:** `#successState` was rendered in DOM with all placeholder content visible and a broken track link (`?path=dashboard` with no app ID). Fixed by adding `display:none` — JS always replaces innerHTML before showing the card anyway. (6) **Duplicate `copyAppId`:** defined in both `index.html` inline `<script>` and `window.copyAppId` in `script.js`. Removed the `index.html` copy; consolidated to one robust definition in `script.js` with visual feedback and clipboard fallback. (7) **Applicant dashboard quota risk:** `setInterval(checkForStatusChange, 5000)` polled GAS every 5 seconds — would exhaust the free-tier 6 min/day execution quota with a handful of concurrent viewers. Changed to 45 seconds. (8) **`restoreSavedProgress()` skip set:** cleaned up the sensitive-key guard from a loose `if` to a `Set`-based check, also skipping `_last_updated` and `Application ID` which were previously missed. |
| 037 | **Holding Fee system complete.** New feature across `code.gs` only. (1) **Sheet columns:** 4 new columns: `Holding Fee Amount`, `Holding Fee Status` (`none`/`requested`/`paid`), `Holding Fee Date`, `Holding Fee Notes`. (2) **GAS functions:** `requestHoldingFee()`, `markHoldingFeePaid()`, `sendHoldingFeeRequestEmail()`. (3) **Lease generation:** credit row, move-in cost subtraction, checkbox label. (4) **Admin dashboard:** holding fee badge + “Request Hold Fee” / “Hold Fee Received” buttons on both `buildAdminCard()` (server) and `buildCardHtml()` (client); `holdingFeeModal` with amount input; `showHoldingFeeModal()`; `showConfirmModal()` extended with `holdFeePaid`; all 3 modals in backdrop listener. CSS: `.btn-hold-req`, `.btn-hold-paid`, `.badge-hold-req`, `.badge-hold-paid`. (5) **Tenant dashboard:** holding fee info card on approved apps — amber urgency notice (pending) or green confirmation (paid). |
| 036 | **Phase 6 complete — AI Continuity Infrastructure (D-020–D-021).** D-020: Formally closed — `DYNAMIC_DATA_PLAN.md` maintained with STATUS updates, SESSION LOG entries, and PHASE STATUS table updates across every session since 031. Protocol proven self-sustaining. D-021: `README.md` Change History now has complete structured entries for all sessions 031–036; missing Session 033 entry backfilled. Active-phase line updated to reflect full plan completion. **All 21 issues across all 6 phases are now DONE.** |
| 035 | **Phase 5 complete — Lease Property-Specific Details (D-017–D-019).** (1) D-017: `Unit Type`, `Bedrooms`, `Bathrooms`, `Parking Space`, `Included Utilities` fields added to admin Send Lease modal (2-column grid under new "Property Details" section); written to 5 new sheet columns; Article II renders these rows conditionally — only shown when non-empty. (2) D-018: `Pet Deposit Amount` and `Monthly Pet Rent` fields added to modal (2-column grid under new "Pet Terms" section, defaults 0); written to 2 new sheet columns; Article IV pet clause now appends deposit and pet-rent sentences when amounts are non-zero. (3) D-019: `utilitiesNote` in `renderLeaseSigningPage()` is now dynamic — reads `Included Utilities` from sheet; if set, Article IV clause 8 lists them explicitly; otherwise falls back to standard generic disclaimer. All 3 issues resolved. |
| 033 | **Phase 2 complete — Lease Financial Terms (D-005–D-009).** (1) D-005: `Rent Due Day` (default 1), `Grace Period Days` (default 5), `Late Fee Amount` (default $50) added to admin Send Lease modal with a 3-column grid UI under a divider. Fields reset to defaults on modal close. (2) D-006: `generateAndSendLease()` now accepts and writes the 3 new fields to new sheet columns. `renderLeaseSigningPage()` reads them back and builds `rentDueStr`, `graceStr`, `lateFeeStr` helper strings. Article III financial table rows and Article IV clause 1 (Rent Payment) fully dynamic. (3) D-007: Confirmed already done in Session 032 — `jur.depositReturnDays` from JURISDICTION_MAP already used in Article IV deposit clause. (4) D-008: Articles XV (Early Termination) and XVI (Move-Out Notice) now use `jur.earlyTermNoticeDays` and `jur.moveOutNoticeDays`. (5) D-009: Article XIV (Lease Renewal & Month-to-Month) now uses `jur.earlyTermNoticeDays` and `jur.mtmNoticeDays`. D-014: `APPLICATION_FEE = 50` constant added; all 7 hardcoded $50 instances replaced. All 5 issues resolved. |
| 034 | **Phase 3 complete — Email Templates (D-010–D-013). Phase 4 complete — Form Fields (D-015–D-016).** Property context added to all email subjects and bodies. 5 hidden inputs added to Step 1 in index.html; `_prefillFromURL` populates them so FormData serialises them automatically; manual appending in `handleFormSubmit` removed. `restoreSavedProgress` re-hydrates `propertyContext` and calls `_setupIncomeRatio` from hidden input values when the URL param is absent. |
| 032 | **Phase 1 complete — Critical Data Gaps (D-001–D-004).** (1) D-001: `handleFormSubmit()` in `script.js` now appends `Property ID`, `Property Name`, `Property City`, `Property State`, `Listed Rent` from `propertyContext` to FormData before every submission. `initializeSheets()` and `addMissingLeaseColumns()` in `code.gs` add these 5 columns to the Google Sheet; `processApplication()` switch block writes all 5 on every new row. (2) D-002: `JURISDICTION_MAP` const added at top of `code.gs` covering 20 US states + DEFAULT fallback — maps state code to `stateName`, `county`, `depositReturnDays`, `earlyTermNoticeDays`, `moveOutNoticeDays`, `mtmNoticeDays`, `eSignAct`. `getJurisdiction()` and `getESignText()` helpers added. `renderLeaseSigningPage()` reads `app['Property State']` and derives `jur`, `eSignText`, `eSignShort`. Lease Articles IV, XIV, XV, XXIII all dynamic. (3) D-003: Lease header jurisdiction badge dynamic. (4) D-004: E-sign legal notice, `agreeBinding` checkbox label, `leaseSent` email step list, `leaseSignedTenant` email step list all use `eSignText`/`eSignShort`. Both `sendLeaseEmail` and `sendLeaseSignedTenantEmail` call sites updated to pass `propertyState` in `leaseData`. |
| 031 | **Audit & planning session.** Conducted full system analysis of all hardcoded vs. data-driven values across `js/script.js`, `backend/code.gs`, and `index.html`. Authored `DYNAMIC_DATA_PLAN.md` — 21 issues across 6 phases covering: URL params not reaching GAS backend (D-001), lease jurisdiction hardcoded to Michigan (D-002–D-004), lease financial terms hardcoded (D-005–D-009), email templates missing property context (D-010–D-014), hidden form inputs missing (D-015–D-016), lease missing property-specific details (D-017–D-019), and AI continuity infrastructure (D-020–D-021). No code changes this session — plan only. Phase 1 is the active fix target for Session 032. |
| 030 | (1) Duplicate submission prevention: `handleFormSubmit` guards against `isSubmitting` flag and existing `lastSuccessAppId` in sessionStorage; submit button locked immediately on first click. (2) "Other" payment field fix: selecting Other now sets `required` on text input and focuses it; deselecting clears it. GAS `processApplication` merges Other+text into main column before writing to Sheet — Sheet never shows bare "Other". (3) GAS-down friendly errors: `fetch` wrapped in inner try/catch for network failures; content-type checked before `response.json()` — quota errors and HTML error pages now show a human-readable message with the phone number instead of raw HTML. (4) QR code wired up: `qrcodejs` (already loaded) now generates a 140×140 QR on the success card pointing to the applicant dashboard link — scan to track on phone. CSS: `.qr-track-section`, `.qr-code-box`. | (1) Save & Resume Later: modal + `sendResumeEmail` GAS action — emails applicant a resume link. (2) Retry button styles moved from inline JS to `.btn-retry` CSS class. (3) Step 6 Review edit affordance improved: `summary-group` now keyboard-accessible (role=button, tabindex, onkeydown), `.summary-edit-btn` class with pencil icon, mobile tap highlight. (4) Admin notification email subject now includes property address snippet. (5) `sendResumeEmail` function added to `backend/code.gs` — fire-and-forget, does not block form submission. |
| 028 | Added URL param pre-fill (`_prefillFromURL`), property context banner (`_showPropertyBanner`), income-to-rent ratio (`_setupIncomeRatio`), property line on success card. Updated PROJECT_RULES.md with full separation contract and URL param table. Updated README.md (this file). CSS additions: `.property-context-banner`, `.success-property-line`, `.income-ratio`. |
| Prior | Initial build: 6-step form, GAS backend, admin panel, lease flow, bilingual EN/ES, auto-save, offline detection, smart retry on submission errors, co-applicant section, payment preferences, Geoapify address autocomplete. |
