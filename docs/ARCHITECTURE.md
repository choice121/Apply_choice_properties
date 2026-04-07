# Choice Properties — System Architecture

**Document Status:** Current as of April 7, 2026
**Maintainer:** Update this file whenever the architecture changes

---

## System Overview

Choice Properties Rental Application System is a two-layer system:
1. A **static frontend** served from Cloudflare Pages
2. A **GAS backend** hosted on Google's Apps Script runtime

There is no traditional server. There is no database server. There is no build system.

---

## Layer 1 — Frontend (Static)

### Hosting
- **Platform:** Cloudflare Pages
- **URL:** `https://apply-choice-properties.pages.dev`
- **Deploy trigger:** Push to `main` branch (auto-deploy)

### Technology
- Pure HTML5, CSS3, Vanilla JavaScript
- No framework, no build step, no bundler, no package manager
- No npm, no Node.js runtime dependencies

### Files
```
/
├── index.html          — Main 6-step application form (1,097 lines)
├── js/
│   └── script.js       — Frontend logic class: RentalApplication (2,326 lines)
├── css/
│   └── style.css       — Mobile-first stylesheet
├── server.js           — Replit-only static file server (NOT used in production)
├── _redirects          — Cloudflare Pages SPA redirect rules
└── backend/
    └── code.gs         — GAS source (edited here, deployed to Google manually)
```

### Key Frontend Components

**`RentalApplication` class in `js/script.js`:**
| Method | Purpose |
|---|---|
| `init()` | Bootstrap: reads URL params, restores saved progress, initializes all subsystems |
| `_readApplicationFee()` | Reads `?fee=` URL param; stores in `this.state.applicationFee` |
| `_prefillFromURL()` | Reads `?pn=`, `?addr=`, `?city=`, `?state=`, etc. from URL |
| `setupConditionalFields()` | Shows/hides form sections based on user selections |
| `setupRealTimeValidation()` | Field-level validation with error messages |
| `validateStep(n)` | Returns true/false for each step's required field check |
| `navigateToStep(n)` | Handles step transitions, validation, progress bar |
| `submitApplication()` | Serializes form data and POSTs to GAS endpoint |
| `saveProgress()` / `restoreSavedProgress()` | localStorage auto-save every 30s |
| `setupFileUploads()` | Handles document upload flow |

**URL Parameters (inbound from listing platform):**
| Param | Usage |
|---|---|
| `pn` | Property name → pre-fills property field |
| `addr` | Street address → pre-fills property field |
| `city` | City → property context banner |
| `state` | 2-letter state → property context banner |
| `rent` | Monthly rent → income-to-rent display |
| `beds` | Bedrooms → context banner |
| `baths` | Bathrooms → context banner |
| `pets` | Pet policy string → context banner |
| `terms` | Pipe-separated lease term options → context banner & move-in date constraint |
| `id` | Property ID → display/log only |
| `fee` | Application fee amount → overrides default $50 |
  | `zip` | Property zip code → stored in hidden field |
  | `deposit` | Security deposit amount → displayed in banner |
  | `avail` | Available date → enforced as minimum move-in date |
  | `min_months` | Minimum lease months → fallback when terms array is empty |
  | `smoking` | `true`/`false` — pre-sets and locks the smoking field |
  | `utilities` | Pipe-separated included utilities → banner context |
  | `parking` | Parking description → banner context |
  | `parking_fee` | Parking fee amount → stored in hidden field |

**These params pre-fill the form fields. The values are stored in hidden `<input>` elements and ARE submitted to GAS as part of the form data (stored in Google Sheets under Property context columns). The raw URL params are not directly read or trusted by GAS for validation — the GAS backend only reads the submitted form fields.**

---

## Layer 2 — Backend (Google Apps Script)

### Hosting
- **Platform:** Google Apps Script (GAS) runtime
- **Access:** Google Apps Script editor → Choice Properties project
- **Deployed URL:** `https://script.google.com/macros/s/AKfycbwqctrCLYOPaz1nZeMS5SXuqK7FRXbN5Bf0dSx3-3leyp_B7Bfr4HPC8YZaZ9wZVxtn/exec`

### Technology
- Google Apps Script (JavaScript ES5/ES6 hybrid, server-side only)
- No external libraries, no npm packages
- Uses: SpreadsheetApp, MailApp, DriveApp, PropertiesService, ScriptApp, UrlFetchApp

### File
- `backend/code.gs` — Single source file, 6,161 lines (as of audit)
- Must be **manually copied** into the GAS editor after changes
- No CI/CD between this repo and GAS

### Backend Function Map

```
doGet(e)                     — Routes GET requests (dashboard, lease, admin, confirm)
doPost(e)                    — Routes POST requests (form submission, admin actions)
processApplication(formData) — Stores application to Sheets, sends emails
generateAppId()              — Creates unique application reference ID
getApplication(appId)        — Fetches single application row from Sheets
getSpreadsheet()             — Returns the active spreadsheet (with fallback)
setupSheet(ss)               — Initializes sheet headers if new
migrateSchema(sheet)         — Adds missing columns to existing data

# Auth
sendAdminOTP(email)          — Sends 6-digit OTP to admin email
verifyOTP(email, code)       — Returns token on success
verifyAdminToken(token)      — Validates HMAC token for admin sessions
setupAdminPassword()         — One-time setup helper for admin credentials

# Email Dispatch
sendApplicantConfirmation(data, appId)       — On form submission
sendAdminNotification(data, appId)           — On form submission
sendResumeEmail(email, resumeUrl, step)      — On save & continue request
sendPaymentConfirmation(appId, email, name, phone) — On markAsPaid()
sendStatusUpdateEmail(appId, email, firstName, status, reason) — On approve/deny
sendHoldingFeeRequestEmail(...)              — On requestHoldingFee()

# Admin Actions
markAsPaid(appId, notes)                     — Marks payment status = 'paid'
updateStatus(appId, status, notes)           — Sets approved / denied
requestHoldingFee(appId, amount, notes)      — Requests holding fee from tenant
markHoldingFeePaid(appId, notes)             — Records holding fee as received

# Lease Flow
generateAndSendLease(appId, leaseData)       — Generates lease, sends email
signLease(appId, signature, checkboxes, ip)  — Records tenant signature
renderLeaseSigningPage(app, baseUrl)         — Renders the lease HTML page
renderLeaseConfirmPage(app, baseUrl)         — Renders the post-sign confirm page
calculateLeaseEndDate(startDate, term)       — Computes end date from term
getJurisdictionData(state)                   — Returns state-specific legal data
getESignText(state)                          — Returns e-sign law citation

# Admin Panel
renderAdminPanel(adminEmail)                 — Full admin HTML with app list
renderAdminLoginPage(baseUrl)               — OTP + password login form

# Email Templates (EmailTemplates object)
applicantConfirmation(data, appId, ...)
adminNotification(data, appId, ...)
paymentConfirmation(appId, name, phone, ...)
statusUpdate(appId, firstName, status, ...)
leaseSent(appId, tenantName, leaseLink, ...)
leaseSignedTenant(appId, firstName, ...)
leaseSignedAdmin(appId, tenantName, ...)

# Email Utilities
buildEmailHeader(title, appId)              — Returns shared HTML header block
EMAIL_BASE_CSS                              — Shared CSS string for all templates
EMAIL_FOOTER                               — Shared footer HTML string
buildPaymentMethodList(data, forAdmin)      — Returns payment methods array
```

---

## Database — Google Sheets

### Schema
The spreadsheet has a single sheet called "Applications" (or the first sheet).
Columns are defined by the `SHEET_HEADERS` array at the top of `code.gs`.

**Column groups:**
1. Application metadata: `App ID`, `Timestamp`, `Status`, `Payment Status`, `Application Fee`, `Payment Date`
2. Property context: `Property Address`, `Property Name`, `Property Address URL`, `Property State`
3. Applicant personal: `First Name`, `Last Name`, `Email`, `Phone`, `DOB`, `SSN Last 4`, `Current Address`, `Residency Duration`, `Prior Address`
4. Co-applicant: `Co-applicant First Name`, `Co-applicant Last Name`, `Co-applicant Email`, `Co-applicant Phone`, `Co-applicant Role`
5. Employment: `Employment Status`, `Employer`, `Job Title`, `Monthly Income`, `Employment Duration`, `Supervisor Name`, `Supervisor Phone`
6. Rental history: `Landlord Name`, `Landlord Phone`, `Reason for Leaving`, `Prior Landlord Name`, `Prior Landlord Phone`
7. Background: `Eviction History`, `Smoker`
8. References: `Ref 1 Name`, `Ref 1 Phone`, `Ref 1 Relationship`, `Ref 2 Name`, `Ref 2 Phone`, `Ref 2 Relationship`
9. Emergency contact: `Emergency Name`, `Emergency Phone`, `Emergency Relationship`
10. Preferences: `Requested Move-in Date`, `Desired Lease Term`, `Preferred Contact Method`, `Preferred Time`, `Preferred Time Specific`, `Payment Methods`, `Other Payment Method`
11. Lease data: `Lease Start Date`, `Lease End Date`, `Monthly Rent`, `Security Deposit`, `Late Fee`, `Rent Due Day`, `Pet Deposit`, `Monthly Pet Rent`, `Unit Type`, `Bedrooms`, `Bathrooms`, `Parking Spaces`, `Lease Term`, `Lease Status`, `Lease Sent Date`, `Lease Signed Date`, `Tenant Signature`, `Tenant IP`, `Tenant Checkboxes`
12. Holding fee: `Holding Fee Amount`, `Holding Fee Status`, `Holding Fee Date`, `Holding Fee Notes`
13. Administrative: `Admin Notes`, `Document URL`, `Payment Notes`
14. System: (to be added) `Management Signature`, `Management Signature Date`, `Management Signer Name`, `Renter Insurance Agreed`, `Verified Property Address`, `Contact Timestamp`, `Payment Method Used`, `Transaction Reference`

### Settings Sheet
A second sheet named "Settings" stores:
- Admin emails list (column A: "admin_emails", column B: comma-separated email addresses)
- Admin auth credentials (hashed): `admin_username`, `admin_password_hash`
- System constants: (as needed)

---

## Authentication System

### Admin Authentication Flow
```
1. Admin visits GAS URL with ?path=admin
2. GAS renders login page (renderAdminLoginPage)
3. Admin enters email → "Send OTP" button → doPost → sendAdminOTP()
4. OTP email sent (6-digit code, 10-minute expiry)
5. Admin enters code → verifyOTP() → returns HMAC session token
6. Admin enters stored password (separate from OTP)
7. Token stored in browser sessionStorage
8. All subsequent admin panel actions send the token for verification
9. verifyAdminToken() checks HMAC + expiry on every admin action
```

### Security Notes
- OTP expires in 10 minutes
- Session tokens have a configurable expiry
- Passwords are stored as PBKDF2 hashes in the Settings sheet (after Phase 1 fix)
- **CRITICAL:** After Phase 1, no credentials exist in source code

---

## Application Lifecycle States

```
Submission
    │
    ▼
Status: pending, Payment Status: unpaid
    │
    ▼ (admin collects fee + marks paid)
Status: pending, Payment Status: paid
    │
    ├──── ▼ (admin denies)
    │   Status: denied
    │
    ▼ (admin approves)
Status: approved, Payment Status: paid
    │
    ▼ (admin generates lease)
Lease Status: sent
    │
    ▼ (tenant signs)
Lease Status: signed
    │
    ▼ (admin countersigns — Phase 1)
Lease Status: executed
```

**Payment Status values:** `unpaid`, `paid`, `refunded` (Phase 6)
**Application Status values:** `pending`, `approved`, `denied`, `withdrawn` (Phase 8)
**Lease Status values:** `none`, `sent`, `signed`, `executed` (Phase 1)

---

## Email System

### Shared Infrastructure
All templates use:
- `EMAIL_BASE_CSS` — shared CSS string (~200 lines)
- `buildEmailHeader(title, appId)` — returns the blue header block HTML
- `EMAIL_FOOTER` — returns the footer block with address and disclaimer
- `MailApp.sendEmail()` — GAS built-in mailer

### Sender Configuration
- **From name:** Choice Properties Leasing / Choice Properties System
- **Reply-to:** choicepropertygroup@hotmail.com
- **Contact phone:** 707-706-3137

### Admin Emails
Fetched dynamically from the Settings sheet via `getAdminEmails()`:
- choicepropertygroup@hotmail.com
- theapprovalh@gmail.com
- jamesdouglaspallock@gmail.com

---

## GAS Deployment Process (Manual)

Since GAS has no CI/CD integration with this repository:

1. Edit `backend/code.gs` in this repository
2. Open the GAS editor at script.google.com
3. Open the Choice Properties project
4. Replace the content of the script file with the updated `code.gs`
5. Click "Deploy → Manage deployments → New deployment" (or update existing)
6. Copy the new deployment URL if it changed
7. Update the `BACKEND_URL` constant in `js/script.js` if the URL changed

**IMPORTANT:** After deploying, always test:
- Form submission (new test application)
- Admin login (OTP flow)
- Admin panel loading
- Lease generation (if lease-related changes were made)

---

## Separation from Main Platform

**Main listing platform:** `choice-properties-site.pages.dev`
**Application system:** `apply-choice-properties.pages.dev`

These are FULLY SEPARATE systems. They share only:
- A one-way redirect link (listing → application form) with URL params
- No data flows back from application system to listing platform
- No shared database, API, or authentication

---

## Known Constraints

| Constraint | Reason | Impact |
|---|---|---|
| No PDF generation natively | GAS/HtmlService cannot export PDF | Lease has no downloadable copy |
| No real-time websockets | Static + GAS = no push | Status updates require page refresh |
| GAS execution quotas | Google free tier limits | High volume could hit daily email limits |
| No ES modules in GAS | GAS runtime doesn't support import/export | All code in one file |
| Manual GAS deployment | No CI/CD between repo and GAS | Changes require manual copy-paste to GAS editor |
| 6-minute GAS execution limit | GAS terminates long-running functions | Batch operations must be chunked |
