# Choice Properties — Comprehensive Product & Flow Audit Report

**Date:** April 7, 2026
**Scope:** Full codebase, business logic, UX/UI, communication templates, lease lifecycle, and payment flow

---

## EXECUTIVE SUMMARY

The Choice Properties rental application system is a well-architected, fully functional platform built on Google Apps Script and static HTML/CSS/JS. It handles the complete rental lifecycle from application intake through lease execution. The system is notably robust for its tech stack, featuring a multi-state jurisdiction engine, electronic signature compliance, and a well-organized email template library.

However, a thorough audit reveals significant gaps in UX logic, form validation, template consistency, lease document completeness, and end-to-end flow integrity. This report documents every issue found and provides a complete implementation plan.

---

## PHASE 1: SYSTEM-WIDE ANALYSIS

### Architecture Summary

| Layer | Technology | Status |
|---|---|---|
| Frontend | HTML5 / CSS3 / Vanilla JS | Static, CDN-served |
| Backend | Google Apps Script (GAS) | Single `code.gs` file, 6,161 lines |
| Database | Google Sheets | Dynamic column mapping |
| Auth | OTP + HMAC token + password | Solid |
| Hosting | Cloudflare Pages (frontend) + GAS (backend) | Split deployment |
| Emails | GAS MailApp | 9 templates |
| Integrations | Google Drive (file uploads), ipify.org (IP capture) | Lightweight |

### System-Wide Issues Found

1. **`code.gs` monolith** — The entire backend is a single 6,161-line file. This has no runtime impact but makes maintenance increasingly difficult. No modular separation between auth, email, lease, admin, and data layers.

2. **Admin credentials hardcoded in source** — `setupAdminPassword()` contains the literal username (`choiceproperties404@gmail.com`) and password (`Choice123$..`) in plaintext in the source code. Anyone with read access to the repository has these credentials. This is a critical security issue.

3. **No rate limiting or abuse protection** — The GAS `doPost()` endpoint accepts submissions without any throttling. A bot could submit thousands of applications. GAS daily quotas provide some natural protection, but there is no intentional guard.

4. **No duplicate detection** — An applicant can submit multiple applications for the same property with the same email. Each creates a new row with a new App ID. No deduplication check exists.

5. **File upload vulnerability** — `DriveApp.createFile()` receives the raw multipart content from `doPost()`. Files are uploaded to Google Drive without validation of file type, extension, or actual content. A malicious file could be uploaded.

6. **Application ID collision risk** — `generateAppId()` appends 6 random alphanumeric chars + 3-digit milliseconds. While collision probability is low, it is not zero and there is no uniqueness check before saving to the sheet.

7. **No server-side field validation** — `processApplication()` only validates `First Name`, `Last Name`, `Email`, and `Phone`. All other fields (SSN, DOB, addresses, income, etc.) are accepted as-is with no backend validation. The backend trusts the client entirely.

8. **`getSpreadsheet()` fallback creates new sheets** — If the active spreadsheet context is lost (GAS execution environment resets), the fallback creates a new blank spreadsheet and stores its ID. Existing data remains in the original sheet, new submissions go to the new one. This is a silent data loss risk.

9. **Email log redundancy** — `processApplication()` calls `logEmail('application_submitted', ...)` after already logging `logEmail('applicant_confirmation', ...)` and `logEmail('admin_notification', ...)`. Three log entries for one submission is redundant and inflates the log sheet.

10. **`column['Security Deposit']` collision** — The sheet has two sources of data for `Security Deposit`: one from the URL params (property listing context) and one from the lease generation step. The column mapping resolves to the same column name, so the lease-generated value overwrites the property listing value (or vice versa depending on order). The `switch/case` in `processApplication()` has explicit `case 'Security Deposit'` which maps to `formData['Security Deposit']` (the URL param value), but the lease step also writes to this column. This needs careful review.

---

## PHASE 2: APPLICATION FORM AUDIT

### Strengths
- Clear 6-step progressive disclosure
- Auto-save to localStorage (30-second intervals + on-input debounce)
- Property context pre-fill from URL params
- Bilingual support (EN/ES) via i18n data attributes
- Mobile-first layout
- Real-time field validation
- Co-applicant/guarantor section with role selection
- Application ID in success state with dashboard link
- Reapplication protection policy disclosed upfront
- 15-20 minute time estimate shown

### Issues Found

#### Form Logic Issues

**ISSUE-F01: Employment fields required for unemployed/student/retired applicants**
- Step 3 requires `Employer`, `Job Title`, `Employment Duration`, `Supervisor Name`, and `Supervisor Phone` for all applicants.
- If someone selects "Unemployed", "Retired", or "Student" as their employment status, they cannot complete these required fields truthfully.
- **Fix:** Conditionally hide/unrequire employment detail fields when status is Unemployed, Retired, or Student. For "Student," show institution name instead of employer.

**ISSUE-F02: Month-to-month lease term creates downstream calculation error**
- The form offers "Month-to-month" as a lease term option.
- `calculateLeaseEndDate()` in the backend defaults to `+1 month` for month-to-month.
- The lease agreement's early termination clause cites `earlyTermNoticeDays` (up to 60 days for some states), which is longer than the entire calculated term.
- **Fix:** Month-to-month should be treated as "ongoing from start date, no fixed end date" in the lease document. The end date field should display "Month-to-Month (no fixed end)" rather than a calculated date.

**ISSUE-F03: Reference relationship field not required but name/phone are**
- Reference 1 Name and Reference 1 Phone are required, but Reference 1 Relationship is optional.
- A reference with no relationship context is significantly less useful during review.
- **Fix:** Make Reference 1 Relationship required as well.

**ISSUE-F04: Supervisor contact required for self-employed applicants**
- Self-employed applicants have no supervisor. The field is required but has no conditional skip.
- **Fix:** When Employment Status is "Self-employed," hide Supervisor Name/Phone and replace with "Business Name" and "Business Phone" (already partially captured via `Employer`).

**ISSUE-F05: Income field accepts free text with no formatting**
- `Monthly Income` accepts any text input (e.g., "four thousand"). No numeric validation occurs on the frontend or backend.
- The admin notification email attempts `parseFloat(data['Monthly Income'])` which returns NaN for non-numeric entries, silently rendering it as "Not specified".
- **Fix:** Use `type="number"` or enforce numeric-only input with a currency mask.

**ISSUE-F06: Residency duration is free text rather than structured input**
- "How long at this address?" accepts text like "2 years 3 months". There is no way to sort or filter applications by residency length.
- **Fix:** Replace with two dropdowns: Years (0–20+) and Months (0–11), or a structured text input with clear format hint.

**ISSUE-F07: No photo ID or income document upload visible in the form**
- The backend stores a `Document URL` column and `DriveApp.createFile()` handles uploads, but there is no visible file upload field in the form's HTML for income verification, ID, or pay stubs.
- The file upload is likely tied to a removed or hidden element managed by `setupFileUploads()` in JavaScript.
- **Fix:** Add a clearly labeled optional file upload field (e.g., "Upload supporting documents: pay stubs, ID, bank statements") in Step 3 or Step 6.

**ISSUE-F08: Privacy Policy and Terms of Service links go to `#`**
- The footer links for "Privacy Policy" and "Terms of Service" are `href="#"` — dead links.
- The "I agree to the terms and conditions" checkbox at Step 6 has no link to the actual terms.
- **Fix:** Either create actual policy pages, or link to a hosted document. At minimum, update the checkbox label to say "I agree that the information provided is accurate" rather than referencing non-existent terms.

**ISSUE-F09: No bankruptcy or criminal history question**
- Professional rental applications typically ask: "Have you ever filed for bankruptcy?" and "Have you ever been convicted of a crime?"
- These are standard screening questions in the industry and can affect the review decision.
- **Fix:** Add to Step 2 (Background Questions) alongside the existing eviction and smoking questions. These should be optional with a "prefer not to say" option to avoid fair housing issues.

**ISSUE-F10: Co-applicant section has no required field enforcement when checked**
- When "I have a co-applicant or guarantor" is checked, the co-applicant First Name, Last Name, Email, and Phone fields are shown but not required.
- An admin could receive an application with a co-applicant checkbox checked but no co-applicant information.
- **Fix:** When the checkbox is checked, require First Name, Last Name, Email, and Phone for the co-applicant.

**ISSUE-F11: No minimum age validation on Date of Birth**
- The DOB field (`type="date"`) accepts any date. Someone could enter a date that makes them 5 years old and the form would accept it.
- **Fix:** Validate that the applicant is at least 18 years old on the frontend and backend.

**ISSUE-F12: No duplicate email detection before submission**
- An applicant with the same email address can submit multiple applications. The second submission generates a new App ID and creates a second row.
- **Fix:** Backend should check for an existing application with the same email address for the same property and either reject, update, or warn the admin.

#### UX/Content Issues

**ISSUE-F13: "How this application works" accordion is open by default**
- The `<details open>` element shows the process explainer expanded on load. Repeat or returning visitors will see this on every page load and it takes up significant screen space.
- **Fix:** Consider defaulting to closed after first visit (localStorage flag) or reducing to a compact banner.

**ISSUE-F14: Step 6 fee display is hardcoded to "$50" in HTML**
- The fee display in Step 6 (`<h4>Application Fee: $50.00</h4>`) is static in the HTML. However, the JS reads the fee from a URL param and stores it in `this.state.applicationFee`. The static display won't update if a different fee is passed via URL.
- **Fix:** The JavaScript should also update the Step 6 fee display when it reads the URL param fee.

**ISSUE-F15: "Terms and Conditions" checkbox links to nothing**
- The final submission checkbox says "I agree to the terms and conditions" with no link. Users cannot read what they are agreeing to.
- **Fix:** Change wording to explicitly state what the user is certifying (e.g., "I agree that all information provided is accurate and authorize Choice Properties to verify it"). Remove the vague "terms and conditions" reference until actual T&C pages exist.

---

## PHASE 3: COMMUNICATION & TEMPLATE SYSTEM AUDIT

### Complete Template Inventory

| # | Template | Trigger | Status |
|---|---|---|---|
| 1 | Applicant Confirmation | On form submission | ✅ Active |
| 2 | Admin New Application Alert | On form submission | ✅ Active |
| 3 | Payment Confirmation | Admin clicks "Mark Paid" | ✅ Active |
| 4 | Status Update — Approved | Admin approves application | ✅ Active |
| 5 | Status Update — Denied | Admin denies application | ✅ Active |
| 6 | Lease Sent | Admin generates lease | ✅ Active |
| 7 | Lease Signed — Tenant | Tenant signs lease | ✅ Active |
| 8 | Lease Signed — Admin Alert | Tenant signs lease | ✅ Active |
| 9 | Admin OTP Login | Admin requests login code | ✅ Active |
| 10 | Save & Resume | Applicant clicks "Email me my progress" | ✅ Active |
| 11 | Holding Fee Requested | Admin clicks "Request Hold Fee" | ✅ Active |

### Missing Templates

**MISSING-T01: Holding Fee Received Confirmation (Tenant)**
- When the admin clicks "Mark Holding Fee Paid," the tenant receives no email.
- The tenant has no confirmation that their holding fee was received and credited.
- **Fix:** Create a holding fee confirmation email sent to the tenant when `markHoldingFeePaid()` is called. Include the amount, property, and updated move-in balance.

**MISSING-T02: Lease Signing Reminder (48-Hour Follow-up)**
- The lease sent email states "sign within 48 hours" but nothing follows up if the tenant doesn't sign.
- **Fix:** A GAS time-based trigger should send a reminder if `Lease Status` remains "sent" for 24–48 hours. This is a GAS-native feature (installable triggers).

**MISSING-T03: Application Fee Follow-up Reminder**
- If an applicant hasn't been contacted for payment within 48 hours, no automated reminder exists.
- **Fix:** A time-based trigger checking for applications with `Payment Status = 'unpaid'` older than 48 hours, sending a gentle follow-up to the admin.

**MISSING-T04: Move-In Reminder (Pre-Move-In)**
- No email is sent to the tenant in the days before their move-in date.
- A professional landlord system should send a move-in guide 5–7 days before the date.
- **Fix:** Create a "Move-In Preparation" email template, triggered by a GAS daily cron that checks for leases with start dates 7 days away.

**MISSING-T05: Denial with Reapplication Offer**
- The current denial email mentions "Other Properties" and encourages reapplication but does not reference the 30-day reapplication protection window disclosed on the application success screen.
- **Fix:** Add explicit language: "Your application file and screening results remain valid for 60 days. If you wish to apply for another available property within 30 days, no new application fee will be required. Please contact our team to discuss alternative options."

**MISSING-T06: Admin Application Review Summary (Pre-Decision)**
- After payment is confirmed, there is no internal admin notification summarizing the full application for review (the initial admin alert was sent before payment was confirmed).
- **Fix:** When `markAsPaid()` is called, send admins a full application data summary email to use for the review decision.

### Template Quality Issues

**ISSUE-T01: Save & Resume email uses a different visual style**
- The save & resume email uses a dark blue header (`background:#1B3A5C`) and card-based design that is inconsistent with the other 10 templates, which use the shared `EMAIL_BASE_CSS` system (white header, blue accent border).
- **Fix:** Refactor the save & resume email to use `EMAIL_BASE_CSS` and `buildEmailHeader()` + `EMAIL_FOOTER` for visual consistency.

**ISSUE-T02: Admin OTP email uses emoji in subject line (`🔐`)**
- All other admin/operational emails have clean subjects. The OTP email subject contains `🔐 Your Admin Login Code — Choice Properties`.
- This is minor but inconsistent with the professional tone of other system emails.
- **Fix:** Remove emoji from the OTP subject line.

**ISSUE-T03: Admin notification email subject contains emoji (`🔔 NEW APPLICATION`)**
- Same issue as above: the admin notification subject contains `🔔`.
- Email clients on some enterprise domains strip or flag emoji in subjects.
- **Fix:** Use plain text subjects for all admin/operational emails.

**ISSUE-T04: "What Happens Next" steps are slightly inconsistent across templates**
- The applicant confirmation email says "review within 2–3 business days of payment."
- The payment confirmation email says "2–3 business days."
- The approved email says "lease within 1–2 business days."
- These timelines should be explicit constants, not embedded in template strings, so they can be updated globally.
- **Fix:** Define these as named GAS script properties or constants at the top of `code.gs`.

**ISSUE-T05: Denial email does not cite the reason even when one exists**
- `EmailTemplates.statusUpdate()` receives a `reason` parameter. When no reason is provided, the callout says "After review, the primary reason..." with the reason blank. This reads as an incomplete sentence.
- **Fix:** Only include the reason sentence if `reason` is non-empty. Otherwise use: "Our decision is based on our standard review criteria."

**ISSUE-T06: Lease signed email to tenant lacks the signed lease document**
- The tenant receives a confirmation that they signed, but no copy of the actual signed lease agreement.
- Best practice is to attach or link a PDF of the executed lease.
- **Fix:** At minimum, provide a link to the lease page (`?path=lease&id=APP_ID`) in the confirmation email with language: "You may view a read-only copy of your executed lease at any time via the link below." (The page shows "Lease Already Signed" for already-signed leases, which serves as a record.)

### Voice & Tone Assessment

The email templates are generally well-written — professional, clear, and warm without being overly casual. The shared `EMAIL_BASE_CSS` system produces consistent visual output.

**Standard to maintain:**
- Salutation: "Dear [First Name],"
- Closing: "Choice Properties Leasing Team"
- Tagline: "Your trust is our standard."
- Contact: Text 707-706-3137 · choicepropertygroup@hotmail.com

**Inconsistency found:** The admin notification uses "New Application Alert," as the greeting (not a real person's name). This is fine for admin emails, but should say "Leasing Team," for consistency with the lease-signed admin alert which uses "Leasing Team,".

---

## PHASE 4: LEASE FLOW & DOCUMENT AUDIT

### Strengths
- 25 comprehensive clauses covering all major residential lease topics
- Dynamic jurisdiction engine (21 states + DEFAULT fallback)
- E-signature compliance with state UETA + federal E-SIGN Act
- Live cursive signature preview using Google Fonts
- 4-checkbox confirmation flow (terms, binding, financial, ownership)
- IP address capture via ipify.org for audit trail
- Audit trail written to Admin Notes column on every action
- Holding fee credit system in the financial calculations
- Pet deposit and monthly pet rent fields
- Unit-specific details (unit type, bedrooms, bathrooms, parking)

### Lease Document Issues

**ISSUE-L01: No landlord/management countersignature**
- The current lease is signed only by the tenant. Most residential leases require a signature from the landlord or authorized management agent.
- Without a management signature, the lease is a one-sided agreement that could be challenged.
- **Fix (High Priority):** Add a management countersignature block. Since the lease is electronic, the admin should have a "Countersign Lease" button in the admin panel that records the admin's name, timestamp, and IP as the management signature. This should be stored in new columns: `Management Signature`, `Management Signature Date`, `Management Signature IP`.

**ISSUE-L02: No PDF download of the executed lease**
- After signing, the tenant sees a confirmation page and receives an email, but has no way to download a PDF of the executed lease agreement.
- GAS `HtmlService` cannot generate PDFs natively.
- **Fix (Medium Priority):** Options in order of effort:
  1. Provide a `window.print()` button on the lease page that produces a clean print-formatted version (cheapest).
  2. Use Google Docs API: copy a template Doc, fill in fields, and export as PDF via `DriveApp.createFile()`.
  3. The `lease_confirm` page already has a "Print This Page" button — enhance it with proper print CSS to make it look like a formal document.

**ISSUE-L03: Lease "as of" date vs. start date confusion**
- The lease header says: "This Residential Lease Agreement is entered into as of **[todayStr]**" (today's date — the day it was prepared/signed).
- The Commencement Date in Article II is the `Lease Start Date` (a future date set by the admin).
- These two dates are different and this is legally correct, but the distinction should be clarified in the document.
- **Fix:** Change the opening clause to: "...entered into as of **[todayStr]** (the 'Execution Date'), with a Lease Commencement Date of **[startDate]** as set forth in Article II."

**ISSUE-L04: Month-to-month lease end date is incorrect**
- `calculateLeaseEndDate()` returns `startDate + 1 month - 1 day` for month-to-month terms.
- The lease document then shows this calculated date as the "Expiration Date."
- A month-to-month tenancy has no fixed expiration date — displaying one is legally misleading.
- **Fix:** If term is month-to-month, set `Lease End Date` to "Month-to-Month — No Fixed Expiration" in the sheet and handle this display case in `renderLeaseSigningPage()`.

**ISSUE-L05: Early termination notice period (60 days) exceeds month-to-month tenancy duration**
- For states with `earlyTermNoticeDays: 60` (CA, FL, GA, IL, NJ, MI, VA), a month-to-month tenant would need to give 60 days' notice to terminate a tenancy that refreshes monthly. This is technically valid under state law but confusing.
- **Fix:** For month-to-month tenancies, the early termination clause should reference `mtmNoticeDays` instead of `earlyTermNoticeDays`.

**ISSUE-L06: Lead Paint Disclosure (Clause 20) references a form that doesn't exist**
- Clause 20 states: "Tenant acknowledges receipt of the federal Lead-Based Paint Disclosure form, where applicable."
- No such form is delivered, signed, or recorded anywhere in the system.
- For pre-1978 properties, this is a federal requirement (HUD form 9530-A). Claiming receipt of something not delivered is a legal liability.
- **Fix:** Either remove the "acknowledges receipt" language and replace with "has been informed of and understands the potential presence of lead-based paint," or create an actual Lead Paint Disclosure addendum.

**ISSUE-L07: Pet Addendum referenced but non-existent**
- Clause 4 (Pets) references "a separate Pet Addendum, which must be signed prior to move-in."
- No pet addendum exists in the system — there is no way to generate or sign one.
- **Fix:** Either remove the addendum reference and incorporate pet terms fully into the main lease body, or create a pet addendum generation flow in the admin panel.

**ISSUE-L08: Renter's Insurance is optional, should be required**
- Clause 13 says tenants are "strongly encouraged" to obtain renter's insurance.
- Most professional property managers now require it.
- **Fix:** Change to "required" and add a 5th confirmation checkbox to the lease signing flow: "I confirm that I will obtain and maintain renter's insurance for the duration of the lease term."

**ISSUE-L09: Admin can send lease without entering all required financial fields**
- `generateAndSendLease()` accepts `undefined` or empty values and defaults: rent defaults to 0, deposit defaults to 0, late fee defaults to $50.
- An admin who clicks "Send Lease" without filling all fields could send a lease showing "$0.00/month" rent.
- **Fix:** Add server-side validation: reject lease generation if `monthlyRent` is 0 or falsy, or if `securityDeposit` is not provided.

**ISSUE-L10: `app['Property Address']` used in lease but may be applicant-typed**
- The property address in the lease is whatever the applicant typed in the form (or what was pre-filled from the URL param). Admins don't validate or correct this before sending.
- A typo in the application form could appear in the executed lease.
- **Fix:** Add an editable "Property Address" field in the admin's "Send Lease" modal so the admin can verify and correct the address before it goes into the legal document.

---

## PHASE 5: PAYMENT FLOW AUDIT

### Strengths
- Multiple payment method preferences captured (primary + 2 backups)
- "Other" payment method option with text entry
- Payment method logic resolves "Other" to actual text before storing
- Payment confirmation email sends when admin marks paid
- Holding fee system with credit tracking on the lease
- Application fee is a single constant (`APPLICATION_FEE = 50`) on the backend

### Payment Flow Issues

**ISSUE-P01: Application fee amount in UI is not dynamically updated from URL params**
- Step 6 displays "$50.00" hardcoded in HTML. The JS reads the fee from the URL param and stores it in `this.state.applicationFee`, and translations reference it, but the Step 6 heading is static.
- **Fix:** The JS `_readApplicationFee()` method should also update the Step 6 fee heading element.

**ISSUE-P02: Holding fee requested — no notification deadline given to tenant**
- When the admin requests a holding fee (`requestHoldingFee()`), an email is sent to the tenant. However, no deadline for payment is stated in the email or the lease.
- The tenant sees "Holding Fee Pending" on the lease signing page but doesn't know how long they have.
- **Fix:** Add a deadline field to the holding fee request (e.g., "Due within 24/48/72 hours"). Include this deadline in the tenant email and on the lease page.

**ISSUE-P03: Holding fee received confirmation has no email to the tenant**
- `markHoldingFeePaid()` updates the sheet but does not call any email function.
- The tenant has no confirmation that their holding fee was received.
- **Fix:** Call `sendHoldingFeeReceivedEmail()` (a new template — see MISSING-T01) from within `markHoldingFeePaid()`.

**ISSUE-P04: No payment receipt document**
- When the admin marks the application fee as paid, a payment confirmation email is sent. However, there is no formal receipt document (with amount, date, App ID, and property) that the applicant can save.
- **Fix:** The payment confirmation email should include a "Receipt Summary" section clearly formatted with all payment details, styled as a mini-receipt.

**ISSUE-P05: Manual payment process has no internal tracking of collection method**
- The admin marks an application as "paid" but there is no field to record which payment method was actually used, how much was collected, or any transaction reference.
- If the applicant's preferred method was "Venmo" and the admin collected via Zelle instead, this is not recorded anywhere.
- **Fix:** Add optional fields to the "Mark as Paid" modal: `Actual Payment Method Used`, `Transaction Reference / Note`, `Amount Collected`. These should write to the sheet.

**ISSUE-P06: Payment status is "unpaid" / "paid" binary — no "refunded" state**
- If an application is denied after fee collection, the payment status remains "paid." There is no "refunded" state, even though applicants may request refunds.
- **Fix:** Add "refunded" as a valid payment status. Add a "Mark as Refunded" admin action.

**ISSUE-P07: Application fee amount could be manipulated via URL param**
- The applicant-facing fee display can be set to any amount via `?fee=X`. If this is manipulated to show `$0`, the applicant email would say "$0.00" but the admin still expects $50.
- The backend correctly uses `APPLICATION_FEE = 50` as the server-side source of truth, so no actual financial impact occurs, but it creates confusing email records.
- **Fix:** The `Application Fee` column in the sheet should always record the canonical `APPLICATION_FEE` constant, not the URL-param value passed through the form's hidden input.

---

## PHASE 6: END-TO-END FLOW INTEGRITY

### Current Flow Map

```
[1] Property listing (choice-properties-site.pages.dev)
        ↓ (click "Apply" with URL params)
[2] Application form (this system) — 6 steps
        ↓ (submit)
[3] GAS processApplication() — stores to sheet
        ↓ (auto)
[4a] Email → Applicant: "Application Received" (with dashboard link)
[4b] Email → Admin: "New Application Alert" (with contact info)
        ↓ (admin manually contacts applicant)
[5] Admin collects $50 fee → clicks "Mark Paid"
        ↓ (auto)
[6] Email → Applicant: "Payment Confirmed — Under Review"
        ↓ (admin reviews 2–3 business days)
[7] Admin clicks "Approve" or "Deny"
        ↓ (auto)
[8] Email → Applicant: "Approved" or "Denied"
        ↓ (if approved — admin opens Send Lease modal)
[9] Admin fills lease terms → clicks "Send Lease"
        ↓ (auto)
[10] Email → Applicant: "Lease Ready to Sign" (48-hour window)
        ↓ (applicant opens lease link, reads, signs)
[11] GAS signLease() — records signature, timestamp, IP
        ↓ (auto)
[12a] Email → Applicant: "Lease Executed — Welcome"
[12b] Email → Admin: "Lease Signed — Collect Move-In Payment"
        ↓ (admin manually collects move-in total)
[13] Admin coordinates key handoff
```

### Flow Gaps Identified

**GAP-1: No feedback loop between steps 4 and 5 (fee collection)**
- If the admin never contacts the applicant (or contacts them and they don't respond), nothing happens. No automated follow-up.
- **Fix:** GAS time-based trigger: if `Payment Status = 'unpaid'` and submission was 72+ hours ago, send admin a reminder.

**GAP-2: No confirmation that admin has contacted the applicant**
- After step 4, the system has no way to know if the admin has called/texted the applicant. There is no "Contacted" flag or timestamp.
- **Fix:** Add a "Mark as Contacted" action in the admin panel. This records a timestamp and prevents the automated reminder from firing repeatedly.

**GAP-3: Nothing happens after approval (step 8) if the admin forgets to send the lease**
- An application can sit in "approved, paid" state indefinitely without a lease being sent.
- **Fix:** GAS time-based trigger: if `Status = 'approved'` and `Lease Status = 'none'` for 24+ hours, notify admin.

**GAP-4: 48-hour lease signing window has no enforcement**
- The lease email says "sign within 48 hours" but no automation follows up or enforces this.
- **Fix:** GAS time-based trigger: if `Lease Status = 'sent'` for 24 hours, send tenant a reminder email. After 48 hours with no signature, notify admin.

**GAP-5: After lease signing, no move-in preparation communication exists**
- Once the lease is signed, the next communication is entirely manual. The tenant has no move-in guide, utility setup instructions, or property-specific information.
- **Fix:** Create a "Move-In Preparation" email template (MISSING-T04) triggered automatically when `signLease()` completes. This should include: move-in payment details, what to bring on move-in day, how to report maintenance issues (text 707-706-3137), and general property information.

**GAP-6: Applicant Dashboard is GAS-only (no Cloudflare Pages path)**
- The applicant dashboard (`?path=dashboard`) is served from the GAS URL, not the Cloudflare Pages URL. The application form's "Track My Application" button links to `?path=dashboard`, which is the GAS URL.
- This creates a split-domain experience: applicants start on one domain and then jump to a GAS-generated page with a different URL.
- **Fix:** Maintain the current architecture (it's intentional given the project rules), but ensure all `?path=dashboard` links use the GAS URL consistently. Add a clear "You are now viewing your dashboard" header to the GAS-served pages to orient the user.

**GAP-7: No "application withdrawn" state**
- An applicant cannot withdraw their application. There is no mechanism for an applicant to say "I found another place, please disregard my application."
- **Fix:** Add a "Withdraw" button on the applicant dashboard that sends a withdrawal request to the admin (triggering a simple notification email). The admin would then update status to "withdrawn" in the admin panel.

**GAP-8: Denied applicants see no path forward on the dashboard**
- When an application is denied, the dashboard shows "Denied" status. There is no message or call to action helping the applicant understand next steps or their reapplication option.
- **Fix:** When status is "denied," the dashboard should display the reapplication protection message and a contact prompt.

---

## PHASE 7: FINAL DELIVERABLES

### 7.1 — Full Audit Summary

**Critical Issues (Immediate Action Required)**
1. Admin credentials hardcoded in plaintext in source code (CRITICAL SECURITY)
2. No landlord countersignature on lease (LEGAL RISK)
3. Lead Paint Disclosure acknowledges receipt of a non-existent form (LEGAL RISK)
4. Employment fields required for unemployed/retired/student applicants (BLOCKS SUBMISSIONS)
5. Month-to-month lease end date is calculated incorrectly (LEGAL INACCURACY)

**High Priority Issues**
6. No PDF copy of executed lease for tenant records
7. Lease can be sent with $0 rent if admin forgets to fill in amount
8. Holding fee received — no confirmation email to tenant
9. No duplicate application detection
10. Privacy Policy and Terms of Service links are dead
11. Photo/document upload field missing from the form UI

**Medium Priority Issues**
12. Missing: 4 email templates (lease signing reminder, move-in prep, fee follow-up, holding fee received)
13. Missing: 3 automated GAS triggers (lease signing reminder, fee follow-up, post-approval lease reminder)
14. Pet Addendum referenced in lease but doesn't exist
15. Renter's insurance should be required, not optional
16. Denial email missing reapplication protection details
17. Payment has no method/transaction tracking
18. No "application withdrawn" state

**Low Priority / Enhancement Issues**
19. Email subjects use emoji (admin + OTP emails)
20. Save & Resume email has inconsistent visual style
21. Resume/applicant email visual inconsistencies in wording
22. Residency duration free-text field vs. structured input
23. `code.gs` monolith — modularization recommended
24. Application ID generation has no uniqueness check
25. No post-move-in communications

---

### 7.2 — Recommended System Design

#### Optimized Email Flow Architecture

```
STAGE 1 — SUBMISSION
  → Applicant Confirmation (existing, keep)
  → Admin New Application Alert (existing, keep)

STAGE 2 — FEE COLLECTION
  → [Auto, 72h] Admin Fee Follow-up Reminder (NEW)
  → [Admin action] Payment Confirmation to Applicant (existing, keep)
  → [Admin action] Admin Review Summary (NEW — sent to admin on fee payment)

STAGE 3 — REVIEW & DECISION
  → [Admin action] Status Update — Approved (existing, improve)
  → [Admin action] Status Update — Denied with Reapplication Details (existing + improve)

STAGE 4 — LEASE
  → [Admin action] Lease Sent (existing, keep)
  → [Auto, 24h] Lease Signing Reminder (NEW)
  → [Auto, 48h] Lease Expiry Warning to Admin (NEW)
  → [Tenant action] Lease Signed — Tenant (existing, keep)
  → [Tenant action] Lease Signed — Admin Alert (existing, keep)

STAGE 5 — MOVE-IN
  → [Auto, on sign] Move-In Preparation Guide (NEW)
  → [Auto, 7 days before] Move-In Reminder (NEW)

STAGE 6 — HOLDING FEE (parallel track)
  → [Admin action] Holding Fee Requested (existing, improve with deadline)
  → [Admin action] Holding Fee Received Confirmation (NEW)

SYSTEM EMAILS
  → Save & Resume (existing, needs style fix)
  → Admin OTP Login (existing, minor cleanup)
```

#### Recommended GAS Triggers (Installable)

| Trigger | Function | Frequency |
|---|---|---|
| Fee follow-up reminder | Check unpaid > 72h → email admin | Daily |
| Lease signing reminder | Check lease_status=sent > 24h → email tenant | Daily |
| Lease expiry warning | Check lease_status=sent > 48h → email admin | Daily |
| Post-approval reminder | Check status=approved, lease=none > 24h → email admin | Daily |
| Move-in reminder | Check start_date = today+7 → email tenant | Daily |

---

### 7.3 — Implementation Plan

#### Priority 1: Security & Legal (Do First)

**Task 1.1: Remove hardcoded credentials from source**
- File: `backend/code.gs`, line 527–528
- Remove the literal username and password from `setupAdminPassword()`
- Replace with: `Logger.log('Run this manually with your credentials — do not leave them in source.')` and a commented example
- Ensure `ADMIN_USERNAME` and `ADMIN_PASSWORD_HASH` are only ever set via the GAS editor manually

**Task 1.2: Add management countersignature to lease**
- Add columns to sheet: `Management Signature`, `Management Signature Date`, `Management Signer Name`
- Add "Countersign Lease" button to admin panel (appears only when `Lease Status = 'signed'`)
- Add management signature block at the bottom of the lease document rendering
- Add `managementCountersign(appId, adminName)` function to GAS backend

**Task 1.3: Fix Lead Paint Disclosure clause**
- File: `backend/code.gs` — lease rendering, Clause 20
- Change from "acknowledges receipt of" to "has been informed of and understands the potential presence of lead-based paint in properties built before 1978, and should inquire about the construction date with Management prior to move-in."
- Remove the reference to a specific form that doesn't exist

**Task 1.4: Fix month-to-month lease end date**
- File: `backend/code.gs` — `calculateLeaseEndDate()` and `renderLeaseSigningPage()`
- If term is "Month-to-month," set `Lease End Date` to the string "Month-to-Month — No Fixed Expiration"
- Update lease document Article II to display appropriately

#### Priority 2: Form Logic Fixes

**Task 2.1: Conditional employment fields**
- File: `js/script.js` — `setupConditionalFields()`
- When `#employmentStatus` changes:
  - If "Unemployed": hide Employer, Job Title, Duration, Supervisor Name/Phone. Show no alternative.
  - If "Retired": hide Supervisor fields. Show "Former Employer (Optional)" if desired.
  - If "Student": change "Employer" label to "School/Institution", hide Supervisor Name/Phone.
  - If "Self-employed": change Supervisor Name/Phone to "Business Name / Contact Number"
- Update validation logic accordingly

**Task 2.2: Age validation on Date of Birth**
- File: `js/script.js` — `setupRealTimeValidation()`
- When `#dob` changes, calculate age. If under 18, show error: "Applicant must be at least 18 years of age."
- Add GAS backend validation as well.

**Task 2.3: Make co-applicant fields required when checkbox is checked**
- File: `js/script.js` — `setupConditionalFields()`
- When `#hasCoApplicant` is checked, add `required` attribute to: `#coFirstName`, `#coLastName`, `#coEmail`, `#coPhone`
- When unchecked, remove the `required` attribute

**Task 2.4: Fix Reference 1 Relationship field**
- File: `index.html` — Step 4
- Add `required` attribute to `#ref1Relationship`
- Update validation logic

**Task 2.5: Fix Step 6 fee display**
- File: `js/script.js` — `_readApplicationFee()`
- After reading the fee, also update `document.querySelector('.fee-amount')` and the fee heading text to display the correct amount
- Update Spanish translations for the fee amount

**Task 2.6: Fix dead links**
- File: `index.html` — footer links
- Change Privacy Policy `href="#"` to either a real URL or remove the link
- Change Terms of Service `href="#"` similarly
- Change the checkbox label from "I agree to the terms and conditions" to "I certify that all information provided is accurate and authorize verification"

#### Priority 3: Email Templates

**Task 3.1: Create Holding Fee Received email template**
- Add `holdingFeeReceived` to `EmailTemplates` object
- Add call to `sendHoldingFeeReceivedEmail()` inside `markHoldingFeePaid()`
- Template should include: amount credited, property, updated move-in balance, App ID, dashboard link

**Task 3.2: Update denial email**
- File: `backend/code.gs` — `EmailTemplates.statusUpdate()`
- When `isApproved === false`:
  - Fix the partial-sentence when no reason provided (see ISSUE-T05)
  - Add reapplication protection language: 30-day window, 60-day valid results

**Task 3.3: Fix email subjects — remove emoji from operational emails**
- `sendAdminNotification()`: remove `🔔` from subject
- `sendAdminOTP()`: remove `🔐` from subject
- Keep emoji in applicant-facing transactional emails (✅, 📋) if desired — these are more consumer-facing

**Task 3.4: Standardize Save & Resume email**
- Refactor the save/resume template to use `EMAIL_BASE_CSS`, `buildEmailHeader()`, and `EMAIL_FOOTER`
- This makes it visually match all other templates

**Task 3.5: Add payment method tracking to Mark as Paid**
- Modify the admin panel "Mark Paid" confirmation modal to collect: actual payment method used, transaction reference/note
- Pass these values to `markAsPaid()` function and write to sheet columns
- Include these details in the Payment Confirmation email

#### Priority 4: Lease Improvements

**Task 4.1: Add print/save option to lease confirmation page**
- File: `backend/code.gs` — `renderLeaseConfirmPage()`
- Enhance the existing "Print This Page" button with proper `@media print` CSS that hides navigation and formats the page as a clean document
- Add a note: "We recommend printing or saving this page as a PDF for your records."

**Task 4.2: Add editable property address to Send Lease modal**
- File: `backend/code.gs` — `renderAdminPanel()`, the lease modal form
- Add a "Property Address (verify/correct before sending)" text input pre-filled from the sheet
- Pass this corrected address to `generateAndSendLease()` and store it

**Task 4.3: Add lease generation validation**
- File: `backend/code.gs` — `generateAndSendLease()`
- Validate: `monthlyRent > 0`, `securityDeposit >= 0`, `leaseStartDate` is not empty and is a future date
- Return descriptive error if validation fails

#### Priority 5: GAS Automated Triggers

**Task 5.1: Create trigger management functions**
- Create `installTriggers()` function in `code.gs` (run manually once in GAS editor)
- Creates daily time-based triggers calling: `checkFeeFollowUp()`, `checkLeaseSigning()`, `checkPostApproval()`, `checkMoveInReminders()`
- Document trigger installation in comments

**Task 5.2: Implement trigger handler functions**
- `checkFeeFollowUp()`: query sheet for `Payment Status = 'unpaid'` rows older than 72 hours → email admin list
- `checkLeaseSigning()`: query for `Lease Status = 'sent'` rows:
  - 24h without signature → email tenant reminder
  - 48h without signature → email admin alert
- `checkPostApproval()`: query for `Status = 'approved'` AND `Lease Status = 'none'` rows older than 24h → email admin
- `checkMoveInReminders()`: query for `Lease Status = 'signed'` AND `Lease Start Date = today + 7` → email tenant move-in preparation guide

---

### 7.4 — Template System Blueprint (Complete)

#### Template 1: Applicant Confirmation
- **Trigger:** On form submission (auto)
- **To:** Applicant
- **Subject:** `Application Received — [Property] | Choice Properties (Ref: [AppID])`
- **Content:** Application summary, payment steps, dashboard link, App ID callout
- **Status:** ✅ Exists — keep, minor cleanup

#### Template 2: Admin New Application Alert
- **Trigger:** On form submission (auto)
- **To:** All admin emails (from Settings sheet)
- **Subject:** `New Application: [AppID] — [Name] | [Property]`
- **Content:** Applicant overview, contact info, payment preferences, quick action buttons
- **Status:** ✅ Exists — remove emoji from subject

#### Template 3: Payment Confirmation
- **Trigger:** Admin clicks "Mark Paid" (manual admin action)
- **To:** Applicant
- **Subject:** `Payment Confirmed — Application [AppID] Now Under Review`
- **Content:** Payment receipt, review timeline, dashboard link
- **Status:** ✅ Exists — add payment method/reference fields

#### Template 4: Admin Review Summary (NEW)
- **Trigger:** Admin clicks "Mark Paid" (alongside Template 3)
- **To:** All admin emails
- **Subject:** `Application Ready for Review — [AppID] | [Name]`
- **Content:** Full application data dump (all fields), decision prompt
- **Status:** ❌ Missing — create

#### Template 5: Status Update — Approved
- **Trigger:** Admin clicks "Approve" (manual admin action)
- **To:** Applicant
- **Subject:** `Your Application Has Been Approved — [AppID] | Choice Properties`
- **Content:** Approval congratulations, lease timeline (1–2 business days), 48-hour response urgency
- **Status:** ✅ Exists — keep

#### Template 6: Status Update — Denied
- **Trigger:** Admin clicks "Deny" (manual admin action)
- **To:** Applicant
- **Subject:** `Application Update — [AppID] | Choice Properties`
- **Content:** Respectful denial, reason (if provided), reapplication protection (30-day/60-day), alternative properties offer
- **Status:** ✅ Exists — improve reapplication language, fix partial-sentence bug

#### Template 7: Lease Sent
- **Trigger:** Admin generates lease (manual admin action)
- **To:** Applicant
- **Subject:** `Action Required: Your Lease is Ready to Sign — [AppID] (48 Hours)`
- **Content:** Lease summary, financial breakdown, 48-hour urgency, direct lease link
- **Status:** ✅ Exists — keep

#### Template 8: Lease Signing Reminder (NEW)
- **Trigger:** Auto, 24 hours after lease sent without signature
- **To:** Applicant
- **Subject:** `Reminder: Your Lease Awaits Your Signature — [AppID]`
- **Content:** Gentle reminder, direct link, urgency note about unit availability
- **Status:** ❌ Missing — create

#### Template 9: Lease Expiry Admin Alert (NEW)
- **Trigger:** Auto, 48 hours after lease sent without signature
- **To:** Admin
- **Subject:** `Alert: Unsigned Lease — [AppID] — [Name]`
- **Content:** Tenant has not signed after 48 hours, contact info, suggested action
- **Status:** ❌ Missing — create

#### Template 10: Lease Signed — Tenant
- **Trigger:** Tenant signs lease (auto)
- **To:** Applicant
- **Subject:** `Welcome to Choice Properties — Lease Executed — [AppID]`
- **Content:** Tenancy confirmation, financial summary, next steps (move-in payment, key handoff), dashboard link
- **Status:** ✅ Exists — add read-only lease link

#### Template 11: Lease Signed — Admin Alert
- **Trigger:** Tenant signs lease (auto)
- **To:** Admin
- **Subject:** `Lease Signed — Collect Move-In Payment — [AppID] | [Name]`
- **Content:** Execution details, required actions checklist, quick-action buttons
- **Status:** ✅ Exists — keep

#### Template 12: Move-In Preparation Guide (NEW)
- **Trigger:** Auto, immediately after lease signature (or 7 days before move-in date)
- **To:** Applicant
- **Subject:** `Your Move-In Guide — [Property] — [AppID]`
- **Content:** Move-in payment total and collection process, what to bring, utility setup instructions, maintenance contact, key handoff coordination, parking info, 707-706-3137 save prompt
- **Status:** ❌ Missing — create

#### Template 13: Holding Fee Requested
- **Trigger:** Admin clicks "Request Hold Fee" (manual admin action)
- **To:** Applicant
- **Subject:** `Holding Fee Request — [Property] — [AppID]`
- **Content:** Amount requested, why it's needed, payment deadline, payment method instructions
- **Status:** ✅ Exists — add payment deadline

#### Template 14: Holding Fee Received Confirmation (NEW)
- **Trigger:** Admin clicks "Mark Holding Fee Paid" (manual admin action)
- **To:** Applicant
- **Subject:** `Holding Fee Received — [Property] — [AppID]`
- **Content:** Amount received, how it will be credited at move-in, updated move-in balance
- **Status:** ❌ Missing — create

#### Template 15: Save & Resume
- **Trigger:** Applicant clicks "Save & Email My Progress" (manual)
- **To:** Applicant
- **Subject:** `Resume Your Choice Properties Application`
- **Content:** Progress saved notice, resume link, device/browser note
- **Status:** ✅ Exists — needs visual style alignment

#### Template 16: Admin OTP Login Code
- **Trigger:** Admin requests login code
- **To:** Admin
- **Subject:** `Your Admin Login Code — Choice Properties`
- **Content:** 6-digit code, 10-minute expiry, security warning
- **Status:** ✅ Exists — remove emoji from subject

---

## ADDITIONAL RECOMMENDATIONS

### A. Admin Panel UX Improvements
1. Add a "Contacted" toggle per application so admin can mark when they've called/texted the applicant
2. Add color-coded age indicator (how many days since submission) to application rows
3. Add ability to flag/star applications for follow-up
4. Add search/filter by property address and submission date range
5. Provide a "Send Test Lease" feature for admins to preview the lease before sending

### B. Applicant Dashboard Improvements
1. When status is "denied," show the reapplication protection message prominently
2. Add a "Contact Us" button that pre-fills a text message to 707-706-3137
3. When status is "approved" and lease is "sent," show a prominent "Sign Your Lease" button with a countdown timer
4. Show the full lease summary (rent, deposit, start date, end date) once the lease is signed

### C. Data Quality Improvements
1. Add a `Last Updated` timestamp column to the sheet, updated on every admin action
2. Add a `Source` column (e.g., "Direct URL", "Listing: [PropertyName]") for tracking where applicants came from
3. Add phone number normalization in the backend (store all phones in E.164 format: +15551234567)

### D. Security Improvements
1. Remove hardcoded credentials from source (CRITICAL — Task 1.1)
2. Add server-side validation for all required fields (not just the 4 currently checked)
3. Add file upload type validation (only accept: PDF, JPG, PNG, DOCX — check MIME type, not just extension)
4. Consider rate-limiting via a GAS Script Property counter per IP per hour (approximate, but better than none)
5. Consider adding a honeypot field to the application form to detect bots

### E. Fair Housing Compliance
- Ensure all screening criteria (income thresholds, employment requirements, credit check decisions) are applied consistently and documented
- The denial email's "reason" field should use pre-defined categories rather than free text to ensure fair housing consistency
- Consider adding to the denial email: required adverse action notices for applications that involve credit-based decisions (FCRA compliance)

---

*End of Audit Report*

**Report compiled by:** Replit Agent
**System analyzed:** Choice Properties Rental Application System — Full codebase audit
**Files reviewed:** `index.html` (1,097 lines), `js/script.js` (2,326 lines), `backend/code.gs` (6,161 lines), `css/style.css` (2,300+ lines)
