# ACTIVE WORK — FRONTEND FIX PLAN (April 9, 2026)

A new frontend audit was completed on April 9, 2026, identifying critical bugs
in index.html and js/script.js. A full phased fix plan is in:

  docs/FRONTEND_FIX_PLAN.md  (READ THIS FIRST IF DOING FRONTEND WORK)

Active fix phase: Phase 5 — Code Quality (Phases 1-4 COMPLETE)
Phases 1-4 ALL DONE (C1-C3, T1-T5, V1/V4/V5/V6, L1/L2/L4) as of April 9, 2026
Phase 5 (Q4, Q5) — PENDING, waiting for user to say 'continue'
Workflow: Fix one phase at a time. Mark each issue [x] DONE in FRONTEND_FIX_PLAN.md
as you complete it. STOP after each phase and wait for user to say 'continue'.

This fix plan is SEPARATE from the original 9-phase implementation plan below.
The original 9 phases are complete. This is a new targeted frontend fix cycle.

---

START HERE:
Any AI working on this project MUST read this file before making changes.
Do NOT proceed without verifying the last completed phase.

---

# Choice Properties — Project Status

**System:** Choice Properties Rental Application System
**Stack:** Pure static HTML/CSS/Vanilla JS + Google Apps Script (GAS) backend + Google Sheets database
**Last Updated:** April 8, 2026
**Active Phase:** Phase 9 — COMPLETE (all 9 phases done)

---

## Quick Reference — All Phases

| Phase | Title | Status |
|---|---|---|
| 1 | Critical: Security & Legal | COMPLETE |
| 2 | Core Form Logic Fixes | COMPLETE |
| 3 | Data Integrity & Backend Validation | COMPLETE |
| 4 | Email Templates & Communication System | COMPLETE |
| 5 | Lease System Improvements | COMPLETE |
| 6 | Payment Flow Improvements | COMPLETE |
| 7 | Automation (GAS Triggers) | CANCELLED — all emails are manual |
| 8 | UX & Flow Completion | COMPLETE |
| 9 | Bug Fixes & Integration Improvements | COMPLETE |

---

## Phase 1 — Critical: Security & Legal

**Status:** COMPLETE
**Priority:** Highest — legal and security exposure

### Objectives
- Remove hardcoded admin credentials from source code
- Add management countersignature to executed lease
- Fix Lead Paint Disclosure legal language
- Fix month-to-month lease end date calculation
- Add lease generation validation (prevent $0 rent leases)

### Tasks

- [x] **1.1** Remove hardcoded credentials from `setupAdminPassword()` in `backend/code.gs`
- [x] **1.2** Add management countersignature system to lease (new columns + GAS function + admin panel button + signature block in lease document + pending notice on confirmation page)
- [x] **1.3** Fix Lead Paint Disclosure clause (remove false "acknowledges receipt" language)
- [x] **1.4** Fix month-to-month lease end date: display "Month-to-Month — No Fixed Expiration" instead of calculated +1 month date
- [x] **1.5** Add server-side validation to `generateAndSendLease()` — reject if `monthlyRent` ≤ 0 or `leaseStartDate` is empty

### Files to Modify
- `backend/code.gs`

### Expected Outcome
- No credentials in source code
- Executed lease is legally complete (both parties represented)
- Lead Paint clause does not make false statements
- Month-to-month leases show accurate term
- Lease cannot be sent with missing financial data

### Verification Checklist
- [x] `grep -n "Choice123" backend/code.gs` returns no results ✓
- [x] `grep -n "choiceproperties404" backend/code.gs` returns no results ✓
- [x] `AUDIT_REPORT.md` no longer contains plaintext credentials — redacted with fix note ✓
- [x] Lease document contains a management signature block ✓
- [x] Month-to-month lease end date shows "Month-to-Month — No Fixed Expiration" ✓
- [x] `generateAndSendLease()` returns an error if rent = 0 ✓

---

## Phase 2 — Core Form Logic Fixes

**Status:** COMPLETE
**Blocked By:** Phase 1 must be completed first

### Objectives
- Fix employment field conditional display for non-employed applicants
- Fix co-applicant required field enforcement
- Add age validation (minimum 18 years)
- Fix Reference 1 Relationship required status
- Fix Step 6 fee display to reflect URL param fee
- Fix dead links in footer (Privacy Policy, Terms)
- Fix submission checkbox wording

### Tasks

- [x] **2.1** Conditional employment fields — when status is Unemployed/Retired/Student/Self-employed, show/hide and re-label appropriate fields
- [x] **2.2** Make co-applicant Name/Email/Phone required when the co-applicant checkbox is checked
- [x] **2.3** Add minimum age (18) validation on the Date of Birth field
- [x] **2.4** Make Reference 1 Relationship field required
- [x] **2.5** Update `_readApplicationFee()` to also update the Step 6 fee heading display
- [x] **2.6** Fix footer Privacy Policy and Terms of Service dead links; update consent checkbox wording
- [x] **2.7** Fix the denial email partial-sentence bug (when no reason is provided)

### Files to Modify
- `js/script.js`
- `index.html`
- `backend/code.gs` (denial email fix)

### Expected Outcome
- All applicant types (employed, unemployed, retired, student, self-employed) can complete Step 3
- Co-applicant section enforces required fields when activated
- Under-18 applicants are rejected with a clear message
- All links are valid or clearly marked as "Coming Soon"
- Fee display in Step 6 is always accurate
- Denial email reads correctly with or without a reason

---

## Phase 3 — Data Integrity & Backend Validation

**Status:** COMPLETE
**Blocked By:** Phase 2

### Objectives
- Add server-side validation for all critical fields
- Add duplicate application detection
- Add minimum age server-side check
- Add application ID uniqueness check
- Normalize phone numbers in the backend
- Fix application fee column to always use the backend constant

### Tasks

- [x] **3.1** Add server-side validation in `processApplication()` for: DOB (age ≥ 18), monthly income (numeric), phone (valid format)
- [x] **3.2** Add duplicate application detection: check for existing row with same email + same property before creating a new row
- [x] **3.3** Add App ID uniqueness check in `generateAppId()`
- [x] **3.4** Override `Application Fee` column to always store `APPLICATION_FEE` constant, not the URL-param value
- [x] **3.5** Add phone number normalization function — store all phones in a consistent format

### Files to Modify
- `backend/code.gs`

---

## Phase 4 — Email Templates & Communication System

**Status:** COMPLETE
**Blocked By:** Phase 3

### Objectives
- Create 5 missing email templates
- Fix visual inconsistency in Save & Resume template
- Remove emoji from admin/operational email subjects
- Fix denial email reapplication language
- Add payment method tracking to payment confirmation

### Tasks

- [x] **4.1** Create `holdingFeeReceived` email template + call it from `markHoldingFeePaid()`
- [x] **4.2** Create `leaseSigningReminder` email template (for 24h automated trigger)
- [x] **4.3** Create `leaseExpiryAdminAlert` email template (for 48h automated trigger)
- [x] **4.4** Create `moveInPreparationGuide` email template
- [x] **4.5** Create `adminReviewSummary` email template (sent to admin when fee is marked paid)
- [x] **4.6** Refactor Save & Resume template to use `EMAIL_BASE_CSS`, `buildEmailHeader()`, `EMAIL_FOOTER`
- [x] **4.7** Remove emoji from admin notification and OTP email subjects
- [x] **4.8** Improve denial email: fix partial-sentence bug, add 30-day reapplication protection language
- [x] **4.9** Call `sendAdminReviewSummary()` from within `markAsPaid()`

### Files to Modify
- `backend/code.gs`

---

## Phase 5 — Lease System Improvements

**Status:** COMPLETE
**Blocked By:** Phase 4

### Objectives
- Improve lease document completeness
- Add PDF/print enhancement to lease confirmation page
- Add editable property address to Send Lease modal
- Fix Pet Addendum reference
- Make renter's insurance required
- Add 5th confirmation checkbox for renter's insurance
- Fix early termination notice period for month-to-month leases

### Tasks

- [x] **5.1** Add `@media print` CSS to lease confirmation page for clean printing
- [x] **5.2** Add editable "Property Address (verify before sending)" field to the admin Send Lease modal
- [x] **5.3** Remove Pet Addendum cross-reference from Clause 4 — incorporate pet terms into the main lease body
- [x] **5.4** Change renter's insurance (Clause 13) from "strongly encouraged" to "required" + add 5th confirmation checkbox
- [x] **5.5** Fix early termination notice period: for month-to-month leases, reference `mtmNoticeDays` not `earlyTermNoticeDays` (verified already correctly implemented)
- [x] **5.6** Add a link to the read-only lease page in the "Lease Signed" tenant email

### Files to Modify
- `backend/code.gs`

---

## Phase 6 — Payment Flow Improvements

**Status:** COMPLETE
**Blocked By:** Phase 5

### Objectives
- Add payment method/transaction tracking to Mark as Paid flow
- Add "refunded" payment status
- Add holding fee deadline field
- Improve payment receipt in confirmation email

### Tasks

- [x] **6.1** Add `Actual Payment Method`, `Transaction Reference`, `Amount Collected` fields to the Mark as Paid modal — write to sheet
- [x] **6.2** Add "Mark as Refunded" admin action and "refunded" payment status
- [x] **6.3** Add deadline field to the Request Holding Fee modal — include deadline in holding fee request email
- [x] **6.4** Enhance payment confirmation email with a formatted receipt block (amount, date, method, reference)

### Files Modified
- `backend/code.gs` (admin panel HTML + GAS functions)

---

## Phase 7 — GAS Automation (Triggers)

**Status:** CANCELLED
**Decision:** All emails and status updates are handled manually by admin through the dashboard. No automated triggers will be implemented. Email templates created in Phase 4 (`leaseSigningReminder`, `leaseExpiryAdminAlert`) remain in the codebase as dispatch functions the admin can call manually if needed, but no time-based GAS triggers will be installed.

---

## Phase 8 — UX & Flow Completion

**Status:** COMPLETE — April 7, 2026

### Objectives
- Improve applicant dashboard denied state ✓
- Add document upload UI to the form ✓
- Add "Mark as Contacted" admin action ✓
- Add application age indicator to admin panel ✓
- Add "Withdraw Application" flow on dashboard ✓

### Tasks

- [x] **8.1** Denied dashboard: added "Reapplication Protection" card — shows 30-day no-fee window, 60-day results validity, and contact CTAs (phone + email buttons)
- [x] **8.2** Document upload: added dropzone UI in Step 6 (PDF/JPG/PNG, 4 MB/file, up to 4 files); JS encodes files to base64 on submit; GAS saves to `CP_Applicant_Docs` Drive folder and writes URLs to new `Document URLs` sheet column
- [x] **8.3** Mark as Contacted: added `markAsContacted()` GAS function; new `Last Contacted` sheet column; "Mark Contacted" button added to both admin card renderers (server-rendered and client-side); "Contacted" green badge shown on card when set
- [x] **8.4** Application age: both admin card renderers now show "Xd old" chip on every card — turns amber after 14 days
- [x] **8.5** Withdraw Application: added `withdrawApplication()` GAS function; "Withdraw my application" link on dashboard (hidden for approved/denied/signed); dashboard handles 'withdrawn' status state; property reverts to 'active' on withdrawal

### Files Modified
- `backend/code.gs` — 8 function additions/changes + both card renderers + dashboard template
- `index.html` — document upload section in Step 6
- `css/style.css` — upload zone styles
- `js/script.js` — `setupFileUploads()`, base64 submit encoding

---


  ---

  ## Phase 9 — Bug Fixes & Integration Improvements

  **Status:** COMPLETE — April 8, 2026
  **Triggered by:** Deep scan of both repos (choice121/Choice + choice121/Apply_choice_properties)
  **Full detail:** See `PHASE9_BUG_FIXES.md` for exact fixes, root causes, and commit references.

  ### Phase 9A — Critical

  - [x] **9A-1** Admin can now deny unpaid applicants — payment guard in `updateStatus()` restricted to approval only
  - [x] **9A-2** Denying an applicant no longer reverts a rented property back to "available" — Supabase sync only fires on approval
  - [x] **9A-3** Property detail page null-rent crash fixed — `monthly_rent` null-guarded throughout `renderProperty()` in Choice repo

  ### Phase 9B — Important

  - [x] **9B-1** Emergency Contact Phone field name fixed in phone normalization loop (`'Emergency Phone'` → `'Emergency Contact Phone'`)
  - [x] **9B-2** Date of Birth and Co-Applicant DOB excluded from localStorage saves (privacy fix)
  - [x] **9B-3** Pets/smoking URL param truthy issue — verified safe, no truthy conditional found in Apply form
  - [x] **9B-4** Rent range filter swaps min/max automatically when user sets them backwards — no more silent empty results

  ### Phase 9C — Improvements

  - [x] **9C-1** Application fee fallback changed from hardcoded constant to `0`; `buildApplyURL()` always sends fee param (even if zero)
  - [x] **9C-2** "Back to listing" link added to application success screen — source URL passed as URL param from Choice listing
  - [x] **9C-3** Email-based App ID recovery added to applicant dashboard login — "Forgot your App ID?" flow via `lookupAppIdByEmail()`

  ### Files Modified
  - `backend/code.gs` (9A-1, 9A-2, 9B-1, 9C-1, 9C-3)
  - `js/script.js` (9B-2, 9C-2)
  - `property.html` in **choice121/Choice** (9A-3)
  - `listings.html` in **choice121/Choice** (9B-4)
  - `js/cp-api.js` in **choice121/Choice** (9C-1, 9C-2)

  

  ---

  ## Phase 10 — External Audit Fixes (Issues 1–21)

  **Status:** IN PROGRESS — April 9, 2026
  **Triggered by:** External AI deep-scan audit identifying 21 remaining issues across security, data integrity, UX, and validation.
  **Full detail:** See `docs/IMPLEMENTATION_PLAN.md` and audit report in repo root.

  ### Phase 10A — Already Fixed (found in code before this phase)
  - [x] **Issue 1** — Employment field toggle now runs on init (10A-1) — employer fields not required by default in HTML
  - [x] **Issue 6** — `getSpreadsheet()` fallback removed (10A-6) — throws clear error instead of creating a new sheet
  - [x] **Issue 7** — Application fee uses URL param with fallback 0 (9C-1) — no hardcoded constant
  - [x] **Issue 11** — Co-applicant consent validated in `validateStep()` — required attr + explicit check
  - [x] **Issue 12** — Hardcoded GAS URL removed (10B-12) — blank `BACKEND_URL` shows user-facing error
  - [x] **Issue 14** — SSN and DOB excluded from localStorage saves (Phase 9B)
  - [x] **Issue 16** — Confirmation email includes name, property, move-in, lease term, email, phone

  ### Phase 10B — Fixed April 9, 2026
  - [x] **Issue 2** — False CSRF token removed from `js/script.js` — was client-generated with no server validation
  - [x] **Issue 4/19** — DOB removed from Step 6 review summary; SSN now displays as `••••` in summary card
  - [x] **Issue 5** — Honeypot field now validated in `doPost()` — submissions with `_trap` filled are rejected
  - [x] **Issue 8** — Extended server-side validation: employer (for employed), SSN format, property address, Reference 1, emergency contact, co-applicant consent
  - [x] **Issue 9** — Income fields normalized in `processApplication()` — strips `START HERE:
Any AI working on this project MUST read this file before making changes.
Do NOT proceed without verifying the last completed phase.

---

# Choice Properties — Project Status

**System:** Choice Properties Rental Application System
**Stack:** Pure static HTML/CSS/Vanilla JS + Google Apps Script (GAS) backend + Google Sheets database
**Last Updated:** April 8, 2026
**Active Phase:** Phase 9 — COMPLETE (all 9 phases done)

---

## Quick Reference — All Phases

| Phase | Title | Status |
|---|---|---|
| 1 | Critical: Security & Legal | COMPLETE |
| 2 | Core Form Logic Fixes | COMPLETE |
| 3 | Data Integrity & Backend Validation | COMPLETE |
| 4 | Email Templates & Communication System | COMPLETE |
| 5 | Lease System Improvements | COMPLETE |
| 6 | Payment Flow Improvements | COMPLETE |
| 7 | Automation (GAS Triggers) | CANCELLED — all emails are manual |
| 8 | UX & Flow Completion | COMPLETE |
| 9 | Bug Fixes & Integration Improvements | COMPLETE |

---

## Phase 1 — Critical: Security & Legal

**Status:** COMPLETE
**Priority:** Highest — legal and security exposure

### Objectives
- Remove hardcoded admin credentials from source code
- Add management countersignature to executed lease
- Fix Lead Paint Disclosure legal language
- Fix month-to-month lease end date calculation
- Add lease generation validation (prevent $0 rent leases)

### Tasks

- [x] **1.1** Remove hardcoded credentials from `setupAdminPassword()` in `backend/code.gs`
- [x] **1.2** Add management countersignature system to lease (new columns + GAS function + admin panel button + signature block in lease document + pending notice on confirmation page)
- [x] **1.3** Fix Lead Paint Disclosure clause (remove false "acknowledges receipt" language)
- [x] **1.4** Fix month-to-month lease end date: display "Month-to-Month — No Fixed Expiration" instead of calculated +1 month date
- [x] **1.5** Add server-side validation to `generateAndSendLease()` — reject if `monthlyRent` ≤ 0 or `leaseStartDate` is empty

### Files to Modify
- `backend/code.gs`

### Expected Outcome
- No credentials in source code
- Executed lease is legally complete (both parties represented)
- Lead Paint clause does not make false statements
- Month-to-month leases show accurate term
- Lease cannot be sent with missing financial data

### Verification Checklist
- [x] `grep -n "Choice123" backend/code.gs` returns no results ✓
- [x] `grep -n "choiceproperties404" backend/code.gs` returns no results ✓
- [x] `AUDIT_REPORT.md` no longer contains plaintext credentials — redacted with fix note ✓
- [x] Lease document contains a management signature block ✓
- [x] Month-to-month lease end date shows "Month-to-Month — No Fixed Expiration" ✓
- [x] `generateAndSendLease()` returns an error if rent = 0 ✓

---

## Phase 2 — Core Form Logic Fixes

**Status:** COMPLETE
**Blocked By:** Phase 1 must be completed first

### Objectives
- Fix employment field conditional display for non-employed applicants
- Fix co-applicant required field enforcement
- Add age validation (minimum 18 years)
- Fix Reference 1 Relationship required status
- Fix Step 6 fee display to reflect URL param fee
- Fix dead links in footer (Privacy Policy, Terms)
- Fix submission checkbox wording

### Tasks

- [x] **2.1** Conditional employment fields — when status is Unemployed/Retired/Student/Self-employed, show/hide and re-label appropriate fields
- [x] **2.2** Make co-applicant Name/Email/Phone required when the co-applicant checkbox is checked
- [x] **2.3** Add minimum age (18) validation on the Date of Birth field
- [x] **2.4** Make Reference 1 Relationship field required
- [x] **2.5** Update `_readApplicationFee()` to also update the Step 6 fee heading display
- [x] **2.6** Fix footer Privacy Policy and Terms of Service dead links; update consent checkbox wording
- [x] **2.7** Fix the denial email partial-sentence bug (when no reason is provided)

### Files to Modify
- `js/script.js`
- `index.html`
- `backend/code.gs` (denial email fix)

### Expected Outcome
- All applicant types (employed, unemployed, retired, student, self-employed) can complete Step 3
- Co-applicant section enforces required fields when activated
- Under-18 applicants are rejected with a clear message
- All links are valid or clearly marked as "Coming Soon"
- Fee display in Step 6 is always accurate
- Denial email reads correctly with or without a reason

---

## Phase 3 — Data Integrity & Backend Validation

**Status:** COMPLETE
**Blocked By:** Phase 2

### Objectives
- Add server-side validation for all critical fields
- Add duplicate application detection
- Add minimum age server-side check
- Add application ID uniqueness check
- Normalize phone numbers in the backend
- Fix application fee column to always use the backend constant

### Tasks

- [x] **3.1** Add server-side validation in `processApplication()` for: DOB (age ≥ 18), monthly income (numeric), phone (valid format)
- [x] **3.2** Add duplicate application detection: check for existing row with same email + same property before creating a new row
- [x] **3.3** Add App ID uniqueness check in `generateAppId()`
- [x] **3.4** Override `Application Fee` column to always store `APPLICATION_FEE` constant, not the URL-param value
- [x] **3.5** Add phone number normalization function — store all phones in a consistent format

### Files to Modify
- `backend/code.gs`

---

## Phase 4 — Email Templates & Communication System

**Status:** COMPLETE
**Blocked By:** Phase 3

### Objectives
- Create 5 missing email templates
- Fix visual inconsistency in Save & Resume template
- Remove emoji from admin/operational email subjects
- Fix denial email reapplication language
- Add payment method tracking to payment confirmation

### Tasks

- [x] **4.1** Create `holdingFeeReceived` email template + call it from `markHoldingFeePaid()`
- [x] **4.2** Create `leaseSigningReminder` email template (for 24h automated trigger)
- [x] **4.3** Create `leaseExpiryAdminAlert` email template (for 48h automated trigger)
- [x] **4.4** Create `moveInPreparationGuide` email template
- [x] **4.5** Create `adminReviewSummary` email template (sent to admin when fee is marked paid)
- [x] **4.6** Refactor Save & Resume template to use `EMAIL_BASE_CSS`, `buildEmailHeader()`, `EMAIL_FOOTER`
- [x] **4.7** Remove emoji from admin notification and OTP email subjects
- [x] **4.8** Improve denial email: fix partial-sentence bug, add 30-day reapplication protection language
- [x] **4.9** Call `sendAdminReviewSummary()` from within `markAsPaid()`

### Files to Modify
- `backend/code.gs`

---

## Phase 5 — Lease System Improvements

**Status:** COMPLETE
**Blocked By:** Phase 4

### Objectives
- Improve lease document completeness
- Add PDF/print enhancement to lease confirmation page
- Add editable property address to Send Lease modal
- Fix Pet Addendum reference
- Make renter's insurance required
- Add 5th confirmation checkbox for renter's insurance
- Fix early termination notice period for month-to-month leases

### Tasks

- [x] **5.1** Add `@media print` CSS to lease confirmation page for clean printing
- [x] **5.2** Add editable "Property Address (verify before sending)" field to the admin Send Lease modal
- [x] **5.3** Remove Pet Addendum cross-reference from Clause 4 — incorporate pet terms into the main lease body
- [x] **5.4** Change renter's insurance (Clause 13) from "strongly encouraged" to "required" + add 5th confirmation checkbox
- [x] **5.5** Fix early termination notice period: for month-to-month leases, reference `mtmNoticeDays` not `earlyTermNoticeDays` (verified already correctly implemented)
- [x] **5.6** Add a link to the read-only lease page in the "Lease Signed" tenant email

### Files to Modify
- `backend/code.gs`

---

## Phase 6 — Payment Flow Improvements

**Status:** COMPLETE
**Blocked By:** Phase 5

### Objectives
- Add payment method/transaction tracking to Mark as Paid flow
- Add "refunded" payment status
- Add holding fee deadline field
- Improve payment receipt in confirmation email

### Tasks

- [x] **6.1** Add `Actual Payment Method`, `Transaction Reference`, `Amount Collected` fields to the Mark as Paid modal — write to sheet
- [x] **6.2** Add "Mark as Refunded" admin action and "refunded" payment status
- [x] **6.3** Add deadline field to the Request Holding Fee modal — include deadline in holding fee request email
- [x] **6.4** Enhance payment confirmation email with a formatted receipt block (amount, date, method, reference)

### Files Modified
- `backend/code.gs` (admin panel HTML + GAS functions)

---

## Phase 7 — GAS Automation (Triggers)

**Status:** CANCELLED
**Decision:** All emails and status updates are handled manually by admin through the dashboard. No automated triggers will be implemented. Email templates created in Phase 4 (`leaseSigningReminder`, `leaseExpiryAdminAlert`) remain in the codebase as dispatch functions the admin can call manually if needed, but no time-based GAS triggers will be installed.

---

## Phase 8 — UX & Flow Completion

**Status:** COMPLETE — April 7, 2026

### Objectives
- Improve applicant dashboard denied state ✓
- Add document upload UI to the form ✓
- Add "Mark as Contacted" admin action ✓
- Add application age indicator to admin panel ✓
- Add "Withdraw Application" flow on dashboard ✓

### Tasks

- [x] **8.1** Denied dashboard: added "Reapplication Protection" card — shows 30-day no-fee window, 60-day results validity, and contact CTAs (phone + email buttons)
- [x] **8.2** Document upload: added dropzone UI in Step 6 (PDF/JPG/PNG, 4 MB/file, up to 4 files); JS encodes files to base64 on submit; GAS saves to `CP_Applicant_Docs` Drive folder and writes URLs to new `Document URLs` sheet column
- [x] **8.3** Mark as Contacted: added `markAsContacted()` GAS function; new `Last Contacted` sheet column; "Mark Contacted" button added to both admin card renderers (server-rendered and client-side); "Contacted" green badge shown on card when set
- [x] **8.4** Application age: both admin card renderers now show "Xd old" chip on every card — turns amber after 14 days
- [x] **8.5** Withdraw Application: added `withdrawApplication()` GAS function; "Withdraw my application" link on dashboard (hidden for approved/denied/signed); dashboard handles 'withdrawn' status state; property reverts to 'active' on withdrawal

### Files Modified
- `backend/code.gs` — 8 function additions/changes + both card renderers + dashboard template
- `index.html` — document upload section in Step 6
- `css/style.css` — upload zone styles
- `js/script.js` — `setupFileUploads()`, base64 submit encoding

---


  ---

  ## Phase 9 — Bug Fixes & Integration Improvements

  **Status:** COMPLETE — April 8, 2026
  **Triggered by:** Deep scan of both repos (choice121/Choice + choice121/Apply_choice_properties)
  **Full detail:** See `PHASE9_BUG_FIXES.md` for exact fixes, root causes, and commit references.

  ### Phase 9A — Critical

  - [x] **9A-1** Admin can now deny unpaid applicants — payment guard in `updateStatus()` restricted to approval only
  - [x] **9A-2** Denying an applicant no longer reverts a rented property back to "available" — Supabase sync only fires on approval
  - [x] **9A-3** Property detail page null-rent crash fixed — `monthly_rent` null-guarded throughout `renderProperty()` in Choice repo

  ### Phase 9B — Important

  - [x] **9B-1** Emergency Contact Phone field name fixed in phone normalization loop (`'Emergency Phone'` → `'Emergency Contact Phone'`)
  - [x] **9B-2** Date of Birth and Co-Applicant DOB excluded from localStorage saves (privacy fix)
  - [x] **9B-3** Pets/smoking URL param truthy issue — verified safe, no truthy conditional found in Apply form
  - [x] **9B-4** Rent range filter swaps min/max automatically when user sets them backwards — no more silent empty results

  ### Phase 9C — Improvements

  - [x] **9C-1** Application fee fallback changed from hardcoded constant to `0`; `buildApplyURL()` always sends fee param (even if zero)
  - [x] **9C-2** "Back to listing" link added to application success screen — source URL passed as URL param from Choice listing
  - [x] **9C-3** Email-based App ID recovery added to applicant dashboard login — "Forgot your App ID?" flow via `lookupAppIdByEmail()`

  ### Files Modified
  - `backend/code.gs` (9A-1, 9A-2, 9B-1, 9C-1, 9C-3)
  - `js/script.js` (9B-2, 9C-2)
  - `property.html` in **choice121/Choice** (9A-3)
  - `listings.html` in **choice121/Choice** (9B-4)
  - `js/cp-api.js` in **choice121/Choice** (9C-1, 9C-2)

  , commas, `/mo` before `parseFloat`
  - [x] **Issue 20** — `$50` default replaced with neutral `—` placeholder; JS fills correct value on load

  ### Remaining Open Issues (Phase 10C and beyond)
  - [ ] **Issue 3** — File uploads still base64 in main POST payload (1MB limit applied, pre-upload not implemented)
  - [ ] **Issue 10** — Residency duration still free-text (structured dropdowns not yet added)
  - [ ] **Issue 13** — Duplicate submission guard still session-based (cookie or server-side lock not yet added)
  - [ ] **Issue 15** — "Track My Application" links to GAS domain without transition notice
  - [ ] **Issue 17** — DOB age check uses browser timezone (date-only normalization not yet applied)
  - [ ] **Issue 18** — Geoapify silent fail (low priority — by design, no user-facing message needed)
  - [ ] **Issue 21** — `code.gs` monolith (429K chars) — deferred, no modularization yet
  
---

## Completed Tasks Log

### Phase 8 — April 7, 2026
- **8.1** Added "Reapplication Protection" card to denied applicant dashboard: 30-day no-fee reapplication window, 60-day results validity, phone + email CTAs.
- **8.2** Added drag-and-drop document upload zone to Step 6 (PDF/JPG/PNG, 4 MB max/file, up to 4 files). JS encodes files to base64 on form submit. GAS `processApplication()` saves files to `CP_Applicant_Docs` Drive folder and stores public URLs in new `Document URLs` sheet column. Upload zone added to `index.html`; CSS in `css/style.css`; `setupFileUploads()` implemented in `js/script.js`.
- **8.3** Added `markAsContacted()` GAS function; new `Last Contacted` sheet column; "Mark Contacted" button in both admin card renderers; "Contacted" green badge shown when date is set.
- **8.4** Application age chip ("Xd old") added to both admin card renderers (client-side + server-rendered). Chip turns amber after 14 days.
- **8.5** Added `withdrawApplication()` GAS function; "Withdraw my application" link on applicant dashboard; `withdrawn` status state; property reverts to `active` on withdrawal.

### Phase 5 — April 7, 2026
- **5.1** Added `@media print` CSS to `renderLeaseConfirmPage()` — hides buttons and contact info, keeps card, detail box, and next-steps sections. Updated button label to "Save or Print Your Lease (PDF)" and added browser-print instruction text below the buttons.
- **5.2** Added "Property Address (verify and correct before sending)" text field to the Send Lease modal (`leasePropertyAddress`). `showLeaseModal()` now accepts a 5th `propertyAddress` param and pre-fills the field. Both card builder call sites (client-side JS template and server-rendered GAS) updated to pass the property address via `safeAddr`. `submitLease()` collects it and passes it as `verifiedPropertyAddress` to `generateAndSendLease()`. GAS function stores it in the new `Verified Property Address` sheet column. `renderLeaseSigningPage()` prefers `Verified Property Address` over `Property Address` when rendering the lease document.
- **5.3** Removed all Pet Addendum cross-references from Clause 4. Pet-present variant now reads "Pet terms are agreed in writing with Management prior to move-in and are incorporated into this Agreement." No-pets variant no longer references "execution of a Pet Addendum."
- **5.4** Updated Clause 13 from "strongly encouraged" to "required," with added proof-of-coverage language. Added 5th confirmation checkbox `agreeInsurance` (row5) to the lease signing page. `validateSignatureForm()` updated to require all 5 checkboxes. Hint text updated from "4 checkboxes" to "5 checkboxes." `submitSignature()` now collects the insurance flag and passes it as the 4th argument to `signLease()`. `signLease()` backend updated to store "Yes"/"No" in new `Renter Insurance Agreed` sheet column. Both columns added to `addMissingLeaseColumns()`.
- **5.5** Verified already correctly implemented in previous session. Early termination Clause 15 conditionally uses `jur.mtmNoticeDays` for month-to-month tenancies and `jur.earlyTermNoticeDays` for fixed-term leases. No code change needed.
- **5.6** Added "View your executed lease agreement" link and descriptive note to `EmailTemplates.leaseSignedTenant` template. Lease URL derived from `dashboardLink` by replacing `path=dashboard` with `path=lease`.

### Phase 4 — April 7, 2026
- **4.1** Added `EmailTemplates.holdingFeeReceived` template. Added `sendHoldingFeeReceivedEmail()` dispatch function. `markHoldingFeePaid()` now calls it after updating the sheet, computing remaining move-in balance from rent + deposit − holding fee.
- **4.2** Added `EmailTemplates.leaseSigningReminder` template. Added `sendLeaseSigningReminder()` dispatch function (ready for Phase 7 trigger to call).
- **4.3** Added `EmailTemplates.leaseExpiryAdminAlert` template. Added `sendLeaseExpiryAdminAlert()` dispatch function that emails all admin addresses (ready for Phase 7 trigger to call).
- **4.4** Added `EmailTemplates.moveInPreparationGuide` template with move-in payment breakdown, what-to-bring checklist, utility setup note, renter's insurance requirement, parking reminder, and maintenance contact. Added `sendMoveInPreparationGuide()` dispatch. `signLease()` now calls it after recording the signature.
- **4.5** Added `EmailTemplates.adminReviewSummary` template with full application data table (property, applicant, residency, employment, references, background, co-applicant sections). Added `sendAdminReviewSummary(appId)` dispatch that fetches the row from the sheet.
- **4.6** Refactored `sendResumeEmail()` to use `EMAIL_BASE_CSS`, `buildEmailHeader()`, and `EMAIL_FOOTER` — now visually consistent with all other transactional emails. Content unchanged.
- **4.7** Removed `🔔` from admin notification subject; removed `🔐` from OTP email subject. Subjects now read: `New Application: [AppID] — [Name]...` and `Admin Login Code — Choice Properties`.
- **4.8** Denial email "Looking Ahead" step 1 now includes: 60-day on-file period, 30-day no-new-fee reapplication window with instruction to contact the team.
- **4.9** `markAsPaid()` now calls `sendAdminReviewSummary(appId)` immediately after `sendPaymentConfirmation()`.

### Phase 6 — April 7, 2026
- **6.1** Added `Amount Collected` field to the Mark as Paid modal (alongside the existing Payment Method dropdown and Transaction Reference field). `markAsPaid()` now accepts a 5th `amountCollected` parameter. Value is written to the new `Amount Collected` sheet column (added to `migrateSchema()`). Admin audit note also records the amount.
- **6.2** `markAsRefunded()` function confirmed complete. "Refunded" button added to the **server-rendered** admin card (`buildAdminCardHtml`) — it was already present in the client-side JS card renderer. Both paths now show the button when `Payment Status = 'paid'`.
- **6.3** Holding fee deadline dropdown confirmed complete in the Request Holding Fee modal (`requestHoldingFee()` stores deadline to `Holding Fee Deadline` sheet column; `sendHoldingFeeRequestEmail()` includes deadline in the tenant email).
- **6.4** `paymentConfirmation` email template updated to show `Amount Collected` (the actual amount the admin recorded) alongside the `Application Fee` constant. `sendPaymentConfirmation()` signature updated to pass `amountCollected` through from `markAsPaid()`.

### Phase 3 — April 7, 2026
- **3.1** Added phone digit count validation (< 10 digits → reject with clear message) and monthly income non-numeric warning (log only, never reject) in `processApplication()`.
- **3.2** Added duplicate detection before row insert: compares incoming `Email` + `Property Address` against all existing rows; skips rows with `denied` or `withdrawn` status. Returns `{ duplicate: true, existingAppId }` so the client can surface the existing reference number.
- **3.3** Extracted `generateUniqueAppId(sheet, col)` wrapper that calls `generateAppId()` up to 5 times, checking the App ID column for each candidate before returning. `processApplication()` now calls `generateUniqueAppId()` instead of `generateAppId()`.
- **3.4** `Application Fee` case in the `rowData` switch now always pushes `APPLICATION_FEE` constant — client-supplied values are completely ignored on write.
- **3.5** Added `normalizePhone(phone)` utility. Applied to 7 phone fields (`Phone`, `Co-Applicant Phone`, `Supervisor Phone`, `Reference 1 Phone`, `Reference 2 Phone`, `Emergency Phone`, `Landlord Phone`) before any sheet write.

### Phase 2 — April 7, 2026
- **2.1** Upgraded `toggleEmployerSection()` in `js/script.js` to handle 5 statuses (Employed, Self-employed, Unemployed, Retired, Student) with per-status field visibility, labels, and required enforcement. Labels re-apply on language change.
- **2.2** Added `required` to `coFirstName`, `coLastName`, `coEmail`, `coPhone` when co-applicant checkbox is checked; removes and clears them when unchecked.
- **2.3** Frontend age validation already present. Added server-side age ≥ 18 check in `processApplication()` in `backend/code.gs`.
- **2.4** Added `required` attribute and `required` CSS class to `#ref1Relationship` in `index.html`.
- **2.5** `_readApplicationFee()` now updates the fee title heading and `.fee-amount` element in the DOM when a `?fee=` URL param is present.
- **2.6** Footer Privacy Policy and Terms of Service links changed from `href="#"` to `mailto:choicepropertygroup@hotmail.com` with descriptive `title` attributes. `termsAgreeLabel` updated to honest certification wording (en + es).
- **2.7** Denial email in `backend/code.gs` now uses `"Our decision is based on our standard application review criteria."` as the fallback when no reason is provided.

### Phase 1 — April 7, 2026
- **1.1** Verified no hardcoded credentials in `setupAdminPassword()` — empty string placeholders in place
- **1.2** Added management countersignature block to the lease document HTML (before the E-SIGNATURE BLOCK in `renderLeaseSigningPage()`) and added "Management Countersignature Pending" notice to `renderLeaseConfirmPage()`. `managementCountersign()` GAS function, sheet columns, and admin panel "Countersign Lease" button were already implemented.
- **1.3** Verified Lead Paint Disclosure clause contains no "acknowledges receipt of the federal form" language — already corrected
- **1.4** Verified `calculateLeaseEndDate()` returns `null` for month-to-month and `generateAndSendLease()` displays "Month-to-Month — No Fixed Expiration" — already implemented
- **1.5** Verified `generateAndSendLease()` rejects `monthlyRent ≤ 0` and missing/invalid `leaseStartDate` — already implemented

---

## Known Issues Remaining

All 41 issues from `AUDIT_REPORT.md` have been addressed. Phases 1–6 covered the bulk of the work; Phase 8 completed the remaining UX items. Phase 7 (Automation) was cancelled by design — all communications remain admin-initiated. The system is feature-complete.

---

## Modified Files Log

### Phase 1
- `backend/code.gs` — Added management signature block in `renderLeaseSigningPage()` and countersignature pending notice in `renderLeaseConfirmPage()`
- `PROJECT_STATUS.md` — Updated phase status to COMPLETE

---

## Verification Results

### Phase 1 — April 7, 2026
All 5 verification checks passed:
- `grep "Choice123" backend/code.gs` → 0 results ✓
- `grep "choiceproperties404" backend/code.gs` → 0 results ✓
- Management signature block present in lease document ✓
- Month-to-month end date shows "Month-to-Month — No Fixed Expiration" ✓
- `generateAndSendLease()` returns error when rent = 0 ✓

---

## Architecture Constraints (Read Before Every Phase)

1. **No Node.js, npm, or build tools** — pure static HTML/CSS/JS frontend only
2. **Backend is GAS only** — `backend/code.gs` is deployed externally to Google Apps Script
3. **No new infrastructure** — no databases, no new APIs, no new hosting layers
4. **Mobile-first CSS** — base styles target ≤ 480px; desktop via `min-width` breakpoints only
5. **Cloudflare Pages compatible** — frontend must remain a static deployment
6. **GAS constraints** — no ES modules, no `import/export`, use `var`/`const`/`let` GAS-compatible syntax
7. **Admin credentials** — NEVER hardcode in source; set manually via GAS editor Properties only
8. **`PROJECT_RULES.md`** — read before every phase; it is the non-negotiable architecture contract

---

  NEXT AI INSTRUCTIONS:
  - Read `PROJECT_STATUS.md` (this file) first
  - Read `PROJECT_RULES.md` second
  - Read `PHASE9_BUG_FIXES.md` third — this is the active work document
  - Phases 1–8 are complete. Phase 9 (Bug Fixes & Improvements) is STARTING.
  - A full deep scan was completed April 8, 2026 — all bugs are documented in `PHASE9_BUG_FIXES.md`
  - Fix in strict priority order: Phase 9A (critical) → 9B (important) → 9C (improvements)
  - Architecture constraints in `PROJECT_RULES.md` are non-negotiable — read before every change
  - Phase 7 (GAS Automation) is permanently cancelled — do NOT implement automated triggers
  - Do not introduce any infrastructure not already in the project

  ---

  ## Post-Phase Security Hardening (April 7, 2026)

  **Status:** COMPLETE

  Actions taken after all 8 phases completed:

  - [x] Redacted plaintext admin credentials from `AUDIT_REPORT.md`
  - [ ] Decommission dead Supabase Edge Functions (process-application, sign-lease, get-application-status, mark-paid, generate-lease, mark-movein, update-status) — no longer called by any page
  - [ ] Add rate limiting / honeypot to GAS `doPost()` endpoint

  ---

  ## Phase 9 — Bug Fixes & Integration Improvements

  **Status:** ALL PHASES COMPLETE — April 8, 2026
  **Triggered by:** Deep scan of both repos (Apply_choice_properties + Choice)
  **Full detail:** See `PHASE9_BUG_FIXES.md` in this repo and `KNOWN_ISSUES.md` in the Choice repo

  ### Phase 9A — Critical (COMPLETE — April 8, 2026)
  - [x] **9A-1** `updateStatus()` payment guard now only blocks approval — admins can deny unpaid applicants (`backend/code.gs`)
  - [x] **9A-2** Supabase sync now only fires on approval — denial no longer reverts rented property to available (`backend/code.gs`)
  - [x] **9A-3** All `p.monthly_rent.toLocaleString()` calls null-guarded — property detail page no longer crashes on null rent (`Choice/property.html`, 10 occurrences)

  ### Phase 9B — Important (COMPLETE — April 8, 2026)
  - [x] **9B-1** Emergency Contact Phone field name fixed in phone normalization array (`backend/code.gs`)
  - [x] **9B-2** Date of Birth and Co-Applicant DOB now excluded from localStorage saves (`js/script.js`)
  - [x] **9B-3** Verified safe — no truthy `if (pets)` / `if (smoking)` conditionals found; values go directly to hidden inputs (`js/script.js`, `Choice/property.html`)
  - [x] **9B-4** Rent swap guard added to `fetchAndRender()` — min/max are silently corrected before query fires (`Choice/listings.html`)

  ### Phase 9C — Improvements (COMPLETE — April 8, 2026)
  - [x] **9C-1** Application fee switch case now falls back to 0 (free); fee always sent from cp-api.js (`backend/code.gs`, `Choice/js/cp-api.js`)
  - [x] **9C-2** Source URL param added to buildApplyURL; back link shown on success screen (`js/script.js`, `Choice/js/cp-api.js`)
  - [x] **9C-3** lookupAppIdByEmail() added; forgot link in login page; doPost route wired (`backend/code.gs`)
  

  ---

  ## Phase 10 — System Audit & Issue Resolution

  **Status:** IN PROGRESS — Phase A not yet started
  **Started:** April 8, 2026
  **Scan by:** AI Code Scan (external)

  ### Overview
  A full audit of both `choice121/Choice` (listing platform) and `choice121/Apply_choice_properties` (this repo) identified **18 issues** across 6 severity categories. A structured fix plan has been created and pushed to the repo.

  ### Documents Created
  - `ISSUES.md` — Full issue tracker with status checkboxes (all 18 issues)
  - `FIX_PLAN.md` — Phase-by-phase implementation plan with exact code changes

  ### Issue Summary
  | Severity | Count |
  |----------|-------|
  | Critical | 3 |
  | Important | 6 |
  | Moderate | 6 |
  | Integration | 3 |
  | **Total** | **18** |

  ### Fix Phases
  | Phase | Focus | Issues | Status |
  |-------|-------|--------|--------|
  | A | Critical Data Integrity | C1, C2, I5, M5 | ⬜ Not Started |
  | B | Connection Reliability | I1, B3, M6 | ⬜ Not Started |
  | C | Form & UX Fixes | M1, I3, I4, C3 | ⬜ Not Started |
  | D | Security Hardening | I2, M2, M4, M3 | ⬜ Not Started |
  | E | Infrastructure | I6, B1 | ⬜ Not Started |
  | F | Choice Repo Fixes | B2 | ⬜ Not Started |

  ### Top 3 Priority Fixes
  1. **[C1]** Remove duplicate `Security Deposit` case in `processApplication()` → `backend/code.gs`
  2. **[C2]** Add explicit cases for 8 missing property context fields → `backend/code.gs`
  3. **[M5]** Add reverse property status sync when approved→withdrawn → `backend/code.gs`

  ### Tasks
  - [~] External scan completed — 18 issues identified
  - [x] `ISSUES.md` created with all issues tracked
  - [x] `FIX_PLAN.md` created with implementation plan
  - [x] `AGENTS.md` updated to reference issue tracking docs
  - [ ] Phase A fixes applied to `backend/code.gs`
  - [ ] Phase B fixes applied
  - [ ] Phase C fixes applied
  - [ ] Phase D fixes applied
  - [ ] Phase E fixes applied
  - [ ] Phase F fixes applied to Choice repo
  - [ ] All 18 issues marked `[x]` in `ISSUES.md`
  

  ---

  ## Phase 10 — Security Hardening & Deployment System

  **Status:** COMPLETE
  **Last Updated:** April 2026

  ### Summary

  Resolved production security issues and introduced a proper build system to keep secrets
  out of the source code. Applied automatically via GitHub API and Cloudflare API.

  ### Tasks

  - [x] **10.1** Remove hardcoded Geoapify API key from `js/script.js` — it was committed in plain text in a public repo. Key is now loaded from `window.CP_CONFIG.GEOAPIFY_API_KEY` at runtime.
  - [x] **10.2** Add `generate-config.js` — build script that reads Cloudflare env vars and writes `config.js` (`window.CP_CONFIG`) at deploy time. Uses only Node.js built-in `fs` module.
  - [x] **10.3** Add `package.json` — defines the build command (`node generate-config.js`) for Cloudflare Pages.
  - [x] **10.4** Update `index.html` — add `<script src="/config.js"></script>` before `js/script.js` so `window.CP_CONFIG` is available at runtime.
  - [x] **10.5** Add `config.js` to `.gitignore` — prevents auto-generated secrets file from being committed.
  - [x] **10.6** Fix `_headers` file — corrected indentation (Cloudflare Pages is strict), added `no-cache` rule for `config.js` so fresh secrets are always served.
  - [x] **10.7** Fix broken back-link domain in `js/script.js` — was pointing to `choice-properties.pages.dev` (wrong), now correctly points to `choice-properties-site.pages.dev`.
  - [x] **10.8** Set Cloudflare Pages build command to `node generate-config.js` for the `apply-choice-properties` project.
  - [x] **10.9** Set Cloudflare Pages env vars: `GEOAPIFY_API_KEY`, `BACKEND_URL`, `LISTING_SITE_URL` for both production and preview environments.
  - [x] **10.10** Updated `AGENTS.md`, `DEPLOYMENT_GUIDE.md`, `README.md` to reflect the new build system and prevent future contributors from accidentally reverting these security fixes.

  ### ⚠ Outstanding Action Required

  - **Rotate the Geoapify API key.** The old key (`bea2afb13c904abea5cb2c2693541dcf`) was
    exposed in the public GitHub commit history. Go to **app.geoapify.com → API Keys**,
    generate a new key, then update `GEOAPIFY_API_KEY` in Cloudflare Pages env vars and
    trigger a redeploy. Delete the old key in Geoapify to invalidate it.

  ### Files Changed
  - `js/script.js` — removed hardcoded key, fixed domain link
  - `index.html` — added `config.js` script tag
  - `generate-config.js` — new file
  - `package.json` — new file
  - `.gitignore` — added `config.js`
  - `_headers` — fixed indentation, added config.js no-cache rule
  

  ---

  ## Phase 10A — Critical Bug Fixes (Round 2)

  **Status:** COMPLETE — April 9, 2026
  **Triggered by:** Deep scan report (REPORT_Application_Form_Issues.md) — 21-issue audit
  **Full detail:** See REPORT_Application_Form_Issues.md for root causes and fix descriptions.

  ### Phase 10A Tasks

  - [x] **10A-1** Employer fields no longer block unemployed/student/retired applicants on first load
    - Removed hardcoded `required` from `employer`, `jobTitle`, `employmentDuration`, `supervisorName`, `supervisorPhone` in `index.html`
    - Removed matching `class="required"` from their labels (required state is now fully dynamic)
    - Added post-restore re-invocation of `toggleEmployerSection()` in `js/script.js` `initialize()` so that a saved employment status (e.g. Unemployed from localStorage) immediately applies the correct field visibility without requiring user interaction
  - [x] **10A-3** File attachments no longer risk silently destroying the entire submission payload
    - Reduced per-file size limit from 2 MB to 1 MB in `setupFileUploads()`
    - Added total payload size guard: if all files together exceed 3 MB raw (≈4 MB base64), files are dropped from the submission and the user is shown a clear message to email documents separately — form data always submits successfully
  - [x] **10A-6** `getSpreadsheet()` no longer silently creates a second spreadsheet on GAS context reset
    - Removed both `SpreadsheetApp.create()` fallback calls
    - Function now throws a descriptive, user-facing error if the spreadsheet cannot be found
    - Error includes the support phone number so applicants have a recovery path

  ### Files Modified
  - `index.html` (10A-1)
  - `js/script.js` (10A-1, 10A-3)
  - `backend/code.gs` (10A-6)

  ### Issues Skipped (per user instruction)
  - **10A-5 (Issue 5)** — Honeypot / bot protection — intentionally not implemented

  
  ---

  ## Phase 10B — Data Quality & Privacy Fixes

  **Status:** COMPLETE — April 9, 2026
  **Triggered by:** Deep scan report (REPORT_Application_Form_Issues.md)

  ### Phase 10B Tasks

  - [x] **10B-8** Server-side `processApplication()` now validates presence of 5 additional required fields: Property Address, Reference 1 Name, Reference 1 Phone, Emergency Contact Name, Emergency Contact Phone. Returns a specific field-name error to the frontend rather than throwing a generic exception.
  - [x] **10B-9** Monthly income input now has `inputmode="decimal"` and updated placeholder so mobile users get a numeric keyboard. Backend income normalization (strip `$`, commas, non-numeric characters before `parseFloat`) was already in place from Phase 3.
  - [x] **10B-11** Backend now validates co-applicant consent server-side: if `Has Co-Applicant` = "Yes" but `Co-Applicant Consent` is not "on", submission is rejected with a clear message. Frontend already validated this in `validateStep()`.
  - [x] **10B-12** Hardcoded GAS endpoint URL removed from `js/script.js`. `BACKEND_URL` is now set from `config.js` only (injected at Cloudflare build time). If `BACKEND_URL` is blank at runtime, `handleFormSubmit()` shows a user-facing error with the support phone number instead of silently routing submissions to the exposed URL.
  - [x] **10B-14 (verified already fixed)** SSN and Co-Applicant SSN were already excluded from localStorage saves. `clearSavedProgress()` was already called on successful submission. No code change needed.
  - [x] **10B-15 (verified already fixed)** Co-applicant consent checkbox was already validated in `validateStep()`. No code change needed.

  ### Files Modified
  - `js/script.js` (10B-12)
  - `index.html` (10B-9)
  - `backend/code.gs` (10B-8, 10B-11)

  