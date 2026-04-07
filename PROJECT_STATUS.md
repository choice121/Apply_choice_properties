START HERE:
Any AI working on this project MUST read this file before making changes.
Do NOT proceed without verifying the last completed phase.

---

# Choice Properties — Project Status

**System:** Choice Properties Rental Application System
**Stack:** Pure static HTML/CSS/Vanilla JS + Google Apps Script (GAS) backend + Google Sheets database
**Last Updated:** April 7, 2026
**Active Phase:** Phase 8 — NOT STARTED

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
| 8 | UX & Flow Completion | NOT STARTED |

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

**Status:** NOT STARTED
**Blocked By:** Phase 6

### Objectives
- Improve applicant dashboard denied state
- Add document upload UI to the form
- Add "Mark as Contacted" admin action
- Add application age indicator to admin panel
- Add "Withdraw Application" flow on dashboard

### Tasks

- [ ] **8.1** Improve applicant dashboard denied state: show reapplication protection message and contact CTA
- [ ] **8.2** Add visible file upload field to Step 3 or Step 6 of the application form
- [ ] **8.3** Add "Mark as Contacted" action button in admin panel
- [ ] **8.4** Add application age (days since submission) indicator to admin panel rows
- [ ] **8.5** Add "Withdraw Application" button on the applicant dashboard

### Files to Modify
- `backend/code.gs`
- `index.html`
- `js/script.js`

---

## Completed Tasks Log

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

Of the 41 issues identified in `AUDIT_REPORT.md`, Phases 1–6 have addressed the majority. Phase 8 (UX & Flow Completion) covers the remaining open items. Phase 7 (Automation) has been cancelled by design — all communications remain admin-initiated.

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
- Read `docs/IMPLEMENTATION_PLAN.md` third
- Last completed phase: Phase 6. Phase 7 is CANCELLED. Next active phase: Phase 8.
- Phase 7 (GAS Automation) is permanently cancelled — do NOT implement automated triggers or scheduled emails
- All emails and status updates are admin-initiated through the dashboard only
- Do not introduce any infrastructure not already in the project
