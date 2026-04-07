# Choice Properties — Implementation Plan

**Created:** April 7, 2026
**Source:** `AUDIT_REPORT.md` — 41 issues identified
**Execution Model:** Phase-by-phase; stop for user approval after each phase
**Architecture Constraint:** Pure static HTML/CSS/JS + GAS backend + Google Sheets — NO exceptions

---

## Phase Summary

| Phase | Title | Issues Addressed | Risk | Status |
|---|---|---|---|---|
| 1 | Critical: Security & Legal | 5 | CRITICAL | COMPLETE |
| 2 | Core Form Logic Fixes | 8 | HIGH | COMPLETE |
| 3 | Data Integrity & Backend Validation | 5 | HIGH | COMPLETE |
| 4 | Email Templates & Communication System | 9 | MEDIUM | COMPLETE |
| 5 | Lease System Improvements | 6 | MEDIUM | COMPLETE |
| 6 | Payment Flow Improvements | 4 | MEDIUM | COMPLETE |
| 7 | GAS Automation (Triggers) | 5 | LOW | CANCELLED |
| 8 | UX & Flow Completion | 5 | LOW | NOT STARTED |

> **Phase 7 is permanently cancelled.** All emails and status updates are admin-initiated through the dashboard. No automated time-based triggers will be installed. This is a deliberate architectural decision.

---

## Phase 1 — Critical: Security & Legal

**Objective:** Eliminate the most severe security and legal risks in the current system before any other work proceeds.

**Why first:** These issues create direct legal liability (executed lease missing landlord signature, false Lead Paint Disclosure statement) and security exposure (hardcoded admin credentials in source). No other improvements are meaningful without these being resolved.

### Task 1.1 — Remove Hardcoded Admin Credentials
**File:** `backend/code.gs`
**Issue Reference:** AUDIT_REPORT.md — Critical Issue #1
**Root Cause:** `setupAdminPassword()` contains `choiceproperties404@gmail.com` as the username and `Choice123$..` as the plaintext password in the function body.
**Fix:**
- Remove the hardcoded credential values from the function body
- Replace with a comment block explaining how to set credentials securely via GAS Script Properties (PropertiesService)
- The function should still exist as a template, but all literal credential values must be removed
**Acceptance:** `grep "Choice123"` and `grep "choiceproperties404@gmail"` on `code.gs` return zero results

### Task 1.2 — Add Management Countersignature to Lease
**File:** `backend/code.gs`
**Issue Reference:** AUDIT_REPORT.md — Critical Issue #2
**Root Cause:** The executed lease is only signed by the tenant. Residential leases require both parties to execute the agreement.
**Fix:**
- Add new GAS function: `managementCountersign(appId, adminSignerName)` that writes `Management Signature`, `Management Signature Date`, and `Management Signer Name` to the sheet
- Add these three columns to the sheet schema constants (`SHEET_HEADERS` array)
- Add a management signature block to the lease document HTML (rendered in `renderLeaseSigningPage()` and on the confirmation page)
- Add "Countersign Lease" button to the admin panel — visible only when `Lease Status = 'signed'`
- The countersign button calls `managementCountersign()` via `google.script.run`
**Acceptance:** Signed leases show a management signature block; admin panel has a "Countersign" button for signed leases

### Task 1.3 — Fix Lead Paint Disclosure Clause
**File:** `backend/code.gs`
**Issue Reference:** AUDIT_REPORT.md — Critical Issue #3
**Root Cause:** Clause 20 says "Tenant acknowledges receipt of the federal Lead-Based Paint Disclosure form" — but no such form is ever delivered, created, or attached. This is a false statement in a legal document.
**Fix:**
- Update the Lead Paint clause text to remove "acknowledges receipt of the federal form"
- Replace with: "Tenant has been informed that properties built prior to 1978 may contain lead-based paint. Tenant should inquire about the year of construction with Management prior to move-in and is encouraged to conduct their own investigation."
- Remove any reference to a specific government form that is not being delivered
**Acceptance:** Lead Paint clause contains no "acknowledges receipt" or "federal form" language

### Task 1.4 — Fix Month-to-Month Lease End Date
**File:** `backend/code.gs`
**Issue Reference:** AUDIT_REPORT.md — Critical Issue #5
**Root Cause:** `calculateLeaseEndDate()` returns `startDate + 1 month - 1 day` for month-to-month terms. The lease then displays this as a fixed "Expiration Date," which is legally inaccurate for a month-to-month tenancy.
**Fix:**
- In `calculateLeaseEndDate()`: if `term` is "Month-to-month", return the string `"Month-to-Month"` instead of a calculated date
- In `renderLeaseSigningPage()`: when `Lease End Date = "Month-to-Month"`, display "Month-to-Month (No Fixed Expiration Date)" in the lease
- In Article II of the lease document: conditionally render "This Lease shall continue on a month-to-month basis until terminated by either party with proper notice as required by applicable state law" when the term is month-to-month
- In the leaseSent email template: handle the month-to-month end date gracefully
**Acceptance:** A month-to-month lease shows "No Fixed Expiration Date" and does not display a specific calculated end date

### Task 1.5 — Add Lease Generation Validation
**File:** `backend/code.gs`
**Issue Reference:** AUDIT_REPORT.md — High Priority Issue #7
**Root Cause:** `generateAndSendLease()` accepts empty or zero values for critical financial fields and defaults them to 0, meaning an admin could accidentally send a lease with $0/month rent.
**Fix:**
- At the top of `generateAndSendLease()`, add validation:
  - `monthlyRent` must be a number greater than 0
  - `leaseStartDate` must be a non-empty, parseable date
  - Return `{ success: false, error: "Monthly rent is required and must be greater than $0." }` if validation fails
  - Return `{ success: false, error: "Lease start date is required." }` if date validation fails
- The admin panel's lease modal should display the error message returned if validation fails
**Acceptance:** Attempting to send a lease with 0 rent returns an error to the admin and sends no email

---

## Phase 2 — Core Form Logic Fixes

**Objective:** Fix all form logic errors that block legitimate applicants or allow data quality issues.

**Why second:** These are the most user-facing bugs. Unemployed, retired, and student applicants literally cannot complete the form today.

### Task 2.1 — Conditional Employment Fields
**File:** `js/script.js`
**Issue Reference:** AUDIT_REPORT.md — ISSUE-F01, ISSUE-F04
**Root Cause:** All employment detail fields (Employer, Job Title, Duration, Supervisor Name, Supervisor Phone) are required regardless of employment status. Unemployed, retired, and student applicants cannot fill them truthfully.
**Fix:**
In `setupConditionalFields()`, add a listener on `#employmentStatus`. When the value changes:
- **Employed (Full-time / Part-time):** Show all fields as-is with original labels and `required`
- **Self-employed:** Show Employer (relabeled "Business Name"), Job Title as normal. Replace Supervisor Name/Phone with "Business Phone" and relabel. Remove `required` from Supervisor fields.
- **Unemployed:** Hide Employer, Job Title, Employment Duration, Supervisor Name, Supervisor Phone. Remove `required` from all.
- **Retired:** Hide Supervisor Name, Supervisor Phone. Employer becomes optional ("Former Employer — Optional"). Remove `required` from Supervisor fields.
- **Student:** Relabel Employer → "School / Institution Name". Show Employment Duration as "Years at Institution". Hide Supervisor Name/Phone. Remove `required` from Supervisor fields.
**Acceptance:** All 5 employment status types allow form completion without validation errors

### Task 2.2 — Co-Applicant Required Fields
**File:** `js/script.js`
**Issue Reference:** AUDIT_REPORT.md — ISSUE-F10
**Root Cause:** When `#hasCoApplicant` is checked, the co-applicant fields are shown but not required.
**Fix:**
In `setupConditionalFields()`, when `#hasCoApplicant` changes:
- If checked: add `required` attribute to `#coFirstName`, `#coLastName`, `#coEmail`, `#coPhone`
- If unchecked: remove `required` attribute and clear the co-applicant field values
**Acceptance:** Checking co-applicant box makes Name/Email/Phone required; unchecking removes requirement

### Task 2.3 — Minimum Age Validation (18+)
**Files:** `js/script.js`, `backend/code.gs`
**Issue Reference:** AUDIT_REPORT.md — ISSUE-F11
**Root Cause:** No age validation exists on DOB field; someone could enter any date.
**Fix:**
- Frontend: in real-time validation, when `#dob` changes, compute age from the entered date. If under 18: show error "Applicant must be at least 18 years of age to apply."
- Backend: in `processApplication()`, if `DOB` is provided, validate age ≥ 18. If not: return `{ success: false, error: "Applicant must be 18 or older." }`
**Acceptance:** DOB entry for anyone under 18 shows an error; form cannot be submitted; backend rejects if bypassed

### Task 2.4 — Reference 1 Relationship Required
**File:** `index.html`
**Issue Reference:** AUDIT_REPORT.md — ISSUE-F03
**Root Cause:** `#ref1Relationship` is not marked `required` but `#ref1Name` and `#ref1Phone` are.
**Fix:**
- Add `required` attribute to the `#ref1Relationship` field in `index.html`
- Add the field to the Step 4 validation check in `js/script.js`
**Acceptance:** Form cannot advance past Step 4 without a relationship entered for Reference 1

### Task 2.5 — Step 6 Fee Display Fix
**File:** `js/script.js`
**Issue Reference:** AUDIT_REPORT.md — ISSUE-F14
**Root Cause:** `_readApplicationFee()` reads the fee from the URL param and stores it in state, but the Step 6 HTML heading showing "$50.00" is never updated dynamically.
**Fix:**
In `_readApplicationFee()`, after storing the fee in state, also update any DOM element showing the fee amount. Locate the correct selector and update its text content to match the actual fee.
**Acceptance:** If `?fee=75` is in the URL, Step 6 displays "$75.00" not "$50.00"

### Task 2.6 — Fix Dead Links & Consent Checkbox
**Files:** `index.html`
**Issue Reference:** AUDIT_REPORT.md — ISSUE-F08, ISSUE-F15
**Root Cause:** Footer Privacy Policy and Terms of Service links are `href="#"`. The Step 6 consent checkbox references "terms and conditions" that don't exist.
**Fix:**
- Footer links: change `href="#"` to `href="mailto:choicepropertygroup@hotmail.com"` for now, or link to the main platform's privacy/terms pages if they exist. Add `title="Coming soon"` if no real URL is available.
- Step 6 consent checkbox: change label from "I agree to the terms and conditions" to "I certify that all information provided in this application is accurate and complete, and I authorize Choice Properties to verify it."
- Update the Spanish (`es`) translation key accordingly
**Acceptance:** No `href="#"` exists for functional links; consent checkbox has clear, honest wording

### Task 2.7 — Fix Denial Email Partial-Sentence Bug
**File:** `backend/code.gs`
**Issue Reference:** AUDIT_REPORT.md — ISSUE-T05
**Root Cause:** In `EmailTemplates.statusUpdate()`, the denial callout reads: "After review, the primary reason for this decision relates to: [reason]." — when no reason is provided, this renders as a broken sentence.
**Fix:**
In the `statusUpdate` template's denial block:
```
${reason
  ? `After review, the primary reason for this decision relates to: <strong>${reason}</strong>.`
  : `Our decision is based on our standard application review criteria.`
}
```
**Acceptance:** Denial email with no reason reads as a complete sentence

---

## Phase 3 — Data Integrity & Backend Validation

**Objective:** Harden the GAS backend to reject bad data and prevent duplicate/inconsistent records.

### Task 3.1 — Server-Side Field Validation
**File:** `backend/code.gs`
**Root Cause:** `processApplication()` only validates Name, Email, and Phone. All other fields pass through unvalidated.
**Fix:**
Add validation in `processApplication()` for:
- `Monthly Income`: if provided, must be a parseable positive number (or a string that parses to one). If not: store as-is but log a warning (don't reject — income is optional in some cases).
- `DOB`: if provided, validate age ≥ 18. Reject with error if under 18.
- `Phone`: validate it has at least 10 digits (strip formatting before checking).
**Acceptance:** Backend returns a descriptive error for invalid DOB; phone numbers with fewer than 10 digits are rejected

### Task 3.2 — Duplicate Application Detection
**File:** `backend/code.gs`
**Root Cause:** Same email + same property can be submitted multiple times with no warning.
**Fix:**
In `processApplication()`, before creating a new row:
- Query existing rows for the same `Email` + `Property Address` combination where `Status` is not `denied` or `withdrawn`
- If a match exists: return `{ success: false, duplicate: true, existingAppId: "..." }` with the existing App ID
- The frontend should display a helpful message: "You already have an active application for this property (Ref: [AppID]). Log in to your dashboard to check your status."
**Acceptance:** Submitting the same email + property twice returns the existing App ID instead of creating a new row

### Task 3.3 — App ID Uniqueness Check
**File:** `backend/code.gs`
**Root Cause:** `generateAppId()` has a small but non-zero collision probability with no uniqueness check.
**Fix:**
After generating an App ID, query the sheet to check if the ID already exists in the `App ID` column. If it does, regenerate. Add a loop limit of 5 attempts before returning an error.
**Acceptance:** App ID generation includes a uniqueness verification step

### Task 3.4 — Application Fee Column Fix
**File:** `backend/code.gs`
**Issue Reference:** AUDIT_REPORT.md — ISSUE-P07
**Root Cause:** The `Application Fee` column stores whatever the URL param sent, which could be manipulated to any value.
**Fix:**
In `processApplication()`, the `Application Fee` switch/case should always write `APPLICATION_FEE` (the backend constant), not `formData['Application Fee']` (the client-supplied value).
**Acceptance:** `grep` the processApplication switch/case for 'Application Fee' — it should map to `APPLICATION_FEE` constant, not form data

### Task 3.5 — Phone Number Normalization
**File:** `backend/code.gs`
**Root Cause:** Phone numbers are stored as typed by the applicant — inconsistent formats.
**Fix:**
Add a `normalizePhone(phone)` helper function that:
- Strips all non-digit characters
- Returns a 10-digit string if the number has 10 digits (US)
- Returns the number with a +1 prefix if 11 digits starting with 1
- Returns the original string if it doesn't match either pattern
Apply this to all Phone fields before storing to the sheet.
**Acceptance:** Phone numbers in the sheet are stored in consistent digit-only format

---

## Phase 4 — Email Templates & Communication System

**Objective:** Create all 5 missing email templates; fix 4 visual/content issues in existing templates.

### Task 4.1 — Holding Fee Received Email Template (NEW)
**File:** `backend/code.gs`
**Root Cause:** When admin marks holding fee as paid, tenant receives no confirmation.
**Fix:**
- Add `holdingFeeReceived` to `EmailTemplates` object
- Template: professional email confirming amount received, how it will be credited at move-in, updated balance, dashboard link
- Create `sendHoldingFeeReceivedEmail(appId, email, name, feeAmount, property, newMoveInBalance)` function
- Call this function from within `markHoldingFeePaid()` after updating the sheet

### Task 4.2 — Lease Signing Reminder Email Template (NEW)
**File:** `backend/code.gs`
**Root Cause:** Tenant receives no reminder if they haven't signed 24 hours after the lease was sent.
**Fix:**
- Add `leaseSigningReminder` to `EmailTemplates` object
- Template: gentle reminder, direct lease link, urgency about unit availability
- Create `sendLeaseSigningReminder(appId, email, firstName, leaseLink)` function
- This function will be called by `checkLeaseSigning()` trigger handler (Phase 7)

### Task 4.3 — Lease Expiry Admin Alert Template (NEW)
**File:** `backend/code.gs`
**Root Cause:** Admin receives no alert if 48 hours pass without a lease signature.
**Fix:**
- Add `leaseExpiryAdminAlert` to `EmailTemplates` object
- Template: alert that tenant has not signed; applicant contact info; suggested action
- Create `sendLeaseExpiryAdminAlert(appId, tenantName, email, phone, property)` function
- Called by `checkLeaseSigning()` trigger handler (Phase 7)

### Task 4.4 — Move-In Preparation Guide Template (NEW)
**File:** `backend/code.gs`
**Root Cause:** After lease is signed, tenant receives no move-in preparation communication.
**Fix:**
- Add `moveInPreparationGuide` to `EmailTemplates` object
- Template: move-in payment total + collection process, what to bring, maintenance contact (707-706-3137), key handoff coordination, utility setup note, parking info
- Create `sendMoveInPreparationGuide(appId, email, firstName, leaseData)` function
- Call from `signLease()` after successfully recording the signature

### Task 4.5 — Admin Review Summary Template (NEW)
**File:** `backend/code.gs`
**Root Cause:** After fee is confirmed paid, admins have no organized application summary to use for their review decision (the original admin alert was sent before fee was confirmed).
**Fix:**
- Add `adminReviewSummary` to `EmailTemplates` object
- Template: full application data table, all sections (personal, employment, rental history, background, references), decision prompt
- Create `sendAdminReviewSummary(appId)` function that fetches the full application row and sends to all admin emails
- Call from `markAsPaid()` after confirming payment

### Task 4.6 — Standardize Save & Resume Email
**File:** `backend/code.gs`
**Root Cause:** `sendResumeEmail()` uses a completely different visual system from all other templates.
**Fix:**
- Refactor the inline HTML in `sendResumeEmail()` to use `EMAIL_BASE_CSS`, `buildEmailHeader()`, and `EMAIL_FOOTER`
- Match the visual style of all other transactional emails
- Keep the content (property line, step number, resume button, browser note) identical

### Task 4.7 — Remove Emoji from Admin/Operational Email Subjects
**File:** `backend/code.gs`
**Root Cause:** Admin notification subject uses `🔔`; OTP email subject uses `🔐`. Enterprise email clients may flag or strip emoji.
**Fix:**
- `sendAdminNotification()`: change subject from `🔔 NEW APPLICATION:...` to `New Application: [AppID] — [Name]`
- `sendAdminOTP()` (or equivalent): change subject from `🔐 Your Admin Login Code...` to `Admin Login Code — Choice Properties`
- Keep emoji in consumer-facing transactional emails (applicant confirmation ✅, lease 📋) — these are appropriate

### Task 4.8 — Improve Denial Email Reapplication Language
**File:** `backend/code.gs`
**Root Cause:** Denied applicants never learn about the 30-day reapplication protection disclosed on the submission success screen.
**Fix:**
In the denial email template's "Looking Ahead" section:
- Add explicit language: "Your application and screening results remain on file for 60 days from your submission date. If you wish to apply for another available Choice Properties unit within 30 days, no new application fee will be required. Please contact our team to discuss options."

### Task 4.9 — Call Admin Review Summary on Fee Confirmation
**File:** `backend/code.gs`
**Root Cause:** `markAsPaid()` only sends the payment confirmation to the applicant.
**Fix:**
After calling `sendPaymentConfirmation()` in `markAsPaid()`, also call `sendAdminReviewSummary(appId)`
**Acceptance:** Admin receives a full application summary email whenever a payment is marked as confirmed

---

## Phase 5 — Lease System Improvements

**Objective:** Improve the lease document's completeness, accuracy, and professionalism.

### Task 5.1 — Print/Save Enhancement for Lease Confirmation Page
**File:** `backend/code.gs`
**Root Cause:** The lease confirmation page has a basic "Print This Page" button but no proper print formatting.
**Fix:**
Add `@media print` CSS to the lease confirmation page:
- Hide navigation, action buttons, and any non-lease content
- Display the full lease document in black-and-white print format
- Add page breaks at appropriate sections
- Ensure the signature block and execution details are included in the print output
- Update the button label to "Save or Print Your Lease (PDF)"
- Add instruction text: "Click 'Print' in your browser, then choose 'Save as PDF' to save a copy for your records."

### Task 5.2 — Editable Property Address in Send Lease Modal
**File:** `backend/code.gs`
**Root Cause:** The lease uses the applicant-typed property address without any admin verification step.
**Fix:**
In the admin panel's Send Lease modal:
- Add a text input pre-filled with the current `Property Address` from the sheet
- Label: "Property Address (verify and correct before sending)"
- Pass the admin-verified address to `generateAndSendLease()` as `verifiedPropertyAddress`
- Store the verified address in a new column `Verified Property Address` (or update `Property Address` column)
- Use this address in the lease document instead of the raw applicant-typed value

### Task 5.3 — Remove Pet Addendum Cross-Reference
**File:** `backend/code.gs`
**Root Cause:** Clause 4 references "a separate Pet Addendum, which must be signed prior to move-in" — but no pet addendum exists.
**Fix:**
Update Clause 4 (Pets) to remove the addendum reference:
- Replace "...as outlined in a separate Pet Addendum, which must be signed prior to move-in" with "...as agreed in writing with Management prior to move-in. All pet terms are incorporated into this Agreement."
- This keeps the clause legally effective without referencing a non-existent document

### Task 5.4 — Renter's Insurance: Required + 5th Checkbox
**File:** `backend/code.gs`
**Root Cause:** Clause 13 currently says renter's insurance is "strongly encouraged" — best practice is to require it.
**Fix:**
- Update Clause 13 to say renter's insurance "is required" and must be maintained throughout the lease term
- Add a 5th confirmation checkbox to the lease signing flow: `[ ] I confirm that I will obtain and maintain a renter's insurance policy for the full duration of this lease term`
- Store this agreement in a new `Renter Insurance Agreed` column in the sheet
- Update `signLease()` to require all 5 checkboxes before accepting the signature

### Task 5.5 — Early Termination Notice for Month-to-Month
**File:** `backend/code.gs`
**Root Cause:** For month-to-month leases, the early termination clause uses `earlyTermNoticeDays` which can be 60 days — longer than the monthly renewal cycle.
**Fix:**
In the lease's early termination clause rendering:
- Add a conditional: if `leaseTerm === 'Month-to-month'`, use `mtmNoticeDays` (the notice to terminate the monthly tenancy) instead of `earlyTermNoticeDays`
- Ensure the clause text reads correctly for month-to-month: "Either party may terminate this month-to-month tenancy by providing [X] days written notice."

### Task 5.6 — Link to Read-Only Lease in Tenant Confirmation Email
**File:** `backend/code.gs`
**Root Cause:** The "Lease Signed" confirmation email has no way for the tenant to access their executed lease later.
**Fix:**
In `EmailTemplates.leaseSignedTenant()`, add a secondary CTA:
- "View your executed lease agreement" → link to `GAS_URL?path=lease&id=APP_ID`
- Add a note: "This link will show your signed lease in read-only format. We recommend printing or saving it as a PDF for your records."

---

## Phase 6 — Payment Flow Improvements

**Objective:** Add payment tracking, refund state, and holding fee deadline to make the payment system complete.

### Task 6.1 — Payment Method Tracking in Mark as Paid
**File:** `backend/code.gs`
**Root Cause:** Admin marks application as paid but cannot record which method was used or any transaction reference.
**Fix:**
- Add fields to the admin panel "Mark as Paid" modal: `Actual Payment Method` (dropdown: Cash, Venmo, Zelle, PayPal, Check, Money Order, Other) and `Transaction Reference / Note` (text)
- Pass these values to the `markAsPaid(appId, notes, actualMethod, transactionRef)` function
- Write to new sheet columns: `Payment Method Used`, `Transaction Reference`
- Include these details in the payment confirmation email receipt block

### Task 6.2 — Refunded Payment Status
**File:** `backend/code.gs`
**Root Cause:** No "refunded" state exists for payment_status. Denied applicants who request refunds cannot be tracked.
**Fix:**
- Add `refunded` as a valid value for the `Payment Status` column
- Add a "Mark as Refunded" button in the admin panel (visible when `Payment Status = 'paid'`)
- Create `markAsRefunded(appId, notes)` function that updates the sheet and logs an admin note
- No email is sent automatically (refund communication is manual)

### Task 6.3 — Holding Fee Deadline
**File:** `backend/code.gs`
**Root Cause:** Holding fee requests have no deadline — tenant doesn't know how long they have to pay.
**Fix:**
- Add a `Deadline` dropdown to the Request Holding Fee modal (options: 24 hours, 48 hours, 72 hours, 7 days)
- Pass the deadline to `requestHoldingFee()` and store in `Holding Fee Deadline` sheet column
- Include the deadline prominently in the `sendHoldingFeeRequestEmail()` template
- Display deadline countdown on the applicant dashboard if holding fee is pending

### Task 6.4 — Enhanced Payment Receipt in Confirmation Email
**File:** `backend/code.gs`
**Root Cause:** Payment confirmation email has a basic receipt but doesn't include method or reference number.
**Fix:**
Update `EmailTemplates.paymentConfirmation()` to include:
- Actual payment method used (if provided)
- Transaction reference / note (if provided)
- A bordered "Receipt" section styled as a formal financial document
- A "Receipt ID" field (use `appId + '-PMT'`)

---

## Phase 7 — GAS Automation (Triggers)

**Objective:** Create the automated triggers that power proactive follow-up at every stage of the pipeline.

### Task 7.1 — `installTriggers()` Function
**File:** `backend/code.gs`
**Root Cause:** No automated triggers exist. All follow-up is manual.
**Fix:**
Create an `installTriggers()` function that:
- Creates daily time-based triggers for all 4 handler functions
- Uses `ScriptApp.newTrigger()` API
- Includes duplicate trigger prevention (check if trigger already exists before installing)
- Documents the required one-time setup step clearly in the function's comment block
- Create `docs/TRIGGERS.md` with plain-English installation instructions

### Task 7.2 — `checkFeeFollowUp()` Handler
**File:** `backend/code.gs`
**Root Cause:** No automated admin reminder if fee is never collected.
**Fix:**
Daily trigger handler:
- Query sheet for rows where `Payment Status = 'unpaid'` AND submission timestamp is more than 72 hours ago
- For each match: send an admin notification email listing the applicant name, App ID, phone, and preferred payment methods
- Log the follow-up in the sheet's admin notes column

### Task 7.3 — `checkLeaseSigning()` Handler
**File:** `backend/code.gs`
**Root Cause:** No automated reminder if lease is not signed within 24 hours; no admin alert at 48 hours.
**Fix:**
Daily trigger handler:
- Query sheet for rows where `Lease Status = 'sent'`
- If sent timestamp is 24–47 hours ago AND no "reminder sent" flag: call `sendLeaseSigningReminder()` to tenant + set a flag
- If sent timestamp is 48+ hours ago: call `sendLeaseExpiryAdminAlert()` to admin

### Task 7.4 — `checkPostApproval()` Handler
**File:** `backend/code.gs`
**Root Cause:** No automated admin reminder if lease is not sent after approval.
**Fix:**
Daily trigger handler:
- Query sheet for rows where `Status = 'approved'` AND `Lease Status = 'none'` AND approval timestamp is 24+ hours ago
- For each match: email admin with applicant name, App ID, and a link to the admin panel

### Task 7.5 — `checkMoveInReminders()` Handler
**File:** `backend/code.gs`
**Root Cause:** No move-in preparation communication exists.
**Fix:**
Daily trigger handler:
- Query sheet for rows where `Lease Status = 'signed'` AND `Lease Start Date` is exactly 7 days from today
- For each match: call `sendMoveInPreparationGuide(appId, email, firstName, leaseData)`

### Task 7.6 — GAS Triggers Documentation
**File:** `docs/TRIGGERS.md` (new file)
**Fix:**
Create a plain-English document explaining:
- What triggers are and why they matter
- How to install them (one-time setup in GAS editor: run `installTriggers()` manually)
- What each trigger does and how often it runs
- How to verify triggers are installed (GAS editor → Triggers menu)
- How to remove/reinstall if needed

---

## Phase 8 — UX & Flow Completion

**Objective:** Complete the end-to-end applicant and admin experience with the final UX improvements.

### Task 8.1 — Applicant Dashboard — Denied State Improvement
**File:** `backend/code.gs`
**Root Cause:** Denied applicants see "Denied" status with no path forward.
**Fix:**
When the applicant dashboard renders for a `denied` application:
- Display a compassionate message with the reapplication protection information (30-day window, 60-day valid results)
- Add a "Discuss Other Options" button: `href="sms:7077063137"` and `href="mailto:choicepropertygroup@hotmail.com"`
- Add: "Your application and screening results remain valid for 60 days. If you wish to explore other available properties, no new application fee will be required within 30 days of this decision."

### Task 8.2 — Document Upload Field in Application Form
**File:** `index.html`, `js/script.js`
**Root Cause:** The GAS backend has `DriveApp.createFile()` support but no visible file upload field exists in the form.
**Fix:**
- Add a file upload field to Step 3 (Employment & Income) or Step 6 (Review & Submit)
- Label: "Supporting Documents (Optional) — Pay stubs, bank statements, ID, or other supporting materials"
- Accept: PDF, JPG, PNG, DOCX (up to 10MB)
- The existing upload handling in `js/script.js` (`setupFileUploads()`) should handle this field
- Add note: "Documents help speed up your review. They are stored securely and only used for application review."

### Task 8.3 — Admin Panel: Mark as Contacted
**File:** `backend/code.gs`
**Root Cause:** Admin has no way to record that they have contacted the applicant about payment.
**Fix:**
- Add a "Mark as Contacted" button to each application row in the admin panel
- Create `markAsContacted(appId, notes)` GAS function that writes a timestamp to `Contact Timestamp` column
- Show contact timestamp in the application detail view
- This prevents the automated fee follow-up trigger (Phase 7) from sending redundant alerts

### Task 8.4 — Application Age Indicator
**File:** `backend/code.gs`
**Root Cause:** Admin cannot see at a glance how old each application is.
**Fix:**
In the admin panel application list rendering, add a "days since submission" badge to each row:
- Green if ≤ 2 days
- Yellow if 3–7 days
- Red if 8+ days
Calculate from the `Timestamp` column and today's date using GAS date arithmetic

### Task 8.5 — Application Withdrawal Flow
**File:** `backend/code.gs`
**Root Cause:** Applicants cannot withdraw their application; they just disappear.
**Fix:**
- Add a "Withdraw My Application" button to the applicant dashboard
- Show a confirmation dialog: "Are you sure you want to withdraw this application? This action cannot be undone."
- Create `withdrawApplication(appId)` GAS function that:
  - Updates `Status` to `withdrawn`
  - Sends a notification to admin: "Applicant [name] has withdrawn application [appId]"
  - Sends a brief confirmation to the applicant
- Add `withdrawn` as a valid status with its own dashboard display state

---

## Appendix — Issue Index

All issues from `AUDIT_REPORT.md` are addressed in this plan:

| Issue ID | Description | Phase | Task |
|---|---|---|---|
| CRITICAL-1 | Hardcoded admin credentials | 1 | 1.1 |
| CRITICAL-2 | No management countersignature | 1 | 1.2 |
| CRITICAL-3 | False Lead Paint Disclosure | 1 | 1.3 |
| CRITICAL-4 | Employment fields block non-employed | 2 | 2.1 |
| CRITICAL-5 | Month-to-month end date wrong | 1 | 1.4 |
| ISSUE-F01 | Employment conditional fields | 2 | 2.1 |
| ISSUE-F02 | Month-to-month lease end date | 1 | 1.4 |
| ISSUE-F03 | Reference relationship not required | 2 | 2.4 |
| ISSUE-F04 | Supervisor required for self-employed | 2 | 2.1 |
| ISSUE-F05 | Income field no format validation | 3 | 3.1 |
| ISSUE-F06 | Residency free text field | 8 | (enhancement) |
| ISSUE-F07 | No file upload field in form | 8 | 8.2 |
| ISSUE-F08 | Dead footer links | 2 | 2.6 |
| ISSUE-F09 | No bankruptcy/criminal question | Deferred | — |
| ISSUE-F10 | Co-applicant fields not required | 2 | 2.2 |
| ISSUE-F11 | No age validation | 2 | 2.3 |
| ISSUE-F12 | No duplicate detection | 3 | 3.2 |
| ISSUE-F13 | How it works open by default | 8 | (enhancement) |
| ISSUE-F14 | Step 6 fee display static | 2 | 2.5 |
| ISSUE-F15 | Consent checkbox references non-existent T&C | 2 | 2.6 |
| MISSING-T01 | Holding fee received email | 4 | 4.1 |
| MISSING-T02 | Lease signing reminder | 4/7 | 4.2 / 7.3 |
| MISSING-T03 | Fee follow-up admin reminder | 4/7 | 4.9 / 7.2 |
| MISSING-T04 | Move-in preparation guide | 4/7 | 4.4 / 7.5 |
| MISSING-T05 | Denial reapplication language | 4 | 4.8 |
| MISSING-T06 | Admin review summary | 4 | 4.5 |
| ISSUE-T01 | Resume email wrong style | 4 | 4.6 |
| ISSUE-T02 | OTP email emoji in subject | 4 | 4.7 |
| ISSUE-T03 | Admin notification emoji in subject | 4 | 4.7 |
| ISSUE-T04 | Timeline inconsistency across emails | 4 | (review during 4.x) |
| ISSUE-T05 | Denial email partial sentence | 2 | 2.7 |
| ISSUE-T06 | No lease copy in signed email | 5 | 5.6 |
| ISSUE-L01 | No management countersignature | 1 | 1.2 |
| ISSUE-L02 | No PDF of executed lease | 5 | 5.1 |
| ISSUE-L03 | Lease as-of date confusion | 5 | (note in 5.x) |
| ISSUE-L04 | Month-to-month end date | 1 | 1.4 |
| ISSUE-L05 | Early termination notice mismatch | 5 | 5.5 |
| ISSUE-L06 | Lead Paint Disclosure false statement | 1 | 1.3 |
| ISSUE-L07 | Pet Addendum doesn't exist | 5 | 5.3 |
| ISSUE-L08 | Renter's insurance optional | 5 | 5.4 |
| ISSUE-L09 | Lease can be sent with $0 rent | 1 | 1.5 |
| ISSUE-L10 | Admin can't verify property address | 5 | 5.2 |
| ISSUE-P01 | Fee display static in Step 6 | 2 | 2.5 |
| ISSUE-P02 | No holding fee deadline | 6 | 6.3 |
| ISSUE-P03 | No holding fee received email | 4 | 4.1 |
| ISSUE-P04 | No payment receipt document | 6 | 6.4 |
| ISSUE-P05 | No payment method tracking | 6 | 6.1 |
| ISSUE-P06 | No refunded payment state | 6 | 6.2 |
| ISSUE-P07 | Fee amount manipulable via URL | 3 | 3.4 |
| GAP-1 | No fee collection follow-up | 7 | 7.2 |
| GAP-2 | No contacted confirmation | 8 | 8.3 |
| GAP-3 | No post-approval lease reminder | 7 | 7.4 |
| GAP-4 | No lease signing enforcement | 7 | 7.3 |
| GAP-5 | No move-in preparation | 4/7 | 4.4 / 7.5 |
| GAP-6 | Split-domain experience | Deferred | Architecture constraint |
| GAP-7 | No withdrawal flow | 8 | 8.5 |
| GAP-8 | Denied dashboard state empty | 8 | 8.1 |

*Note: ISSUE-F09 (bankruptcy/criminal question) is deferred — requires careful fair housing compliance review before adding. GAP-6 (split domain) cannot be fixed without architectural change, which is prohibited by PROJECT_RULES.md.*
