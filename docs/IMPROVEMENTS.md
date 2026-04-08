# Choice Properties — Improvements & Recommendations Log

  This file is updated after every phase with:
  - Recommended improvements beyond the current fix scope
  - Better architectural approaches identified during implementation
  - Optimization opportunities
  - Risks and concerns

  ---

  ## Pre-Phase Baseline Recommendations

  *Identified during the full codebase audit before any fixes began.*

  ### Architecture

  **Recommendation: Modularize `code.gs` using GAS libraries**
  The monolithic `code.gs` is functional but difficult to maintain. Google Apps Script supports
  library linking, which would allow splitting the code into logical modules (auth, email, lease,
  admin, data). This cannot be done without a significant refactor and is deferred until the
  current fix phases are complete.

  **Recommendation: Use GAS Script Properties for all configuration**
  Constants like `APPLICATION_FEE`, admin emails, and the backend URL are hardcoded. These should
  be moved to `PropertiesService.getScriptProperties()` so they can be changed without modifying
  and redeploying code. Phase 1 begins this process with credentials, but all operational constants
  should follow.

  **Recommendation: Add a test/staging GAS deployment**
  Currently, every change to `code.gs` is deployed directly to production. A second "staging"
  deployment of the same script would allow testing changes before they go live. GAS supports
  multiple deployments from one project.

  ### Security

  **Recommendation: Add a honeypot field to the application form**
  A hidden field that bots will fill but real users won't. If it has a value on submission,
  silently reject the application. Simple, zero-cost bot protection.

  **Recommendation: Add request origin validation in `doPost()`**
  GAS cannot fully validate CORS origins, but can check the `Referer` header as a basic sanity
  check. While not foolproof, it adds a layer of protection against casual abuse.

  **Recommendation: Implement GAS execution quota monitoring**
  GAS has daily quotas (emails sent, URL fetch calls, spreadsheet writes). Add a
  `checkQuotaUsage()` function that logs current usage to a monitoring sheet. Set an alert if
  approaching limits.

  ### Data

  **Recommendation: Add a full application audit log sheet**
  Every change to application status, payment status, or any admin action should be written to a
  separate "Audit Log" sheet with: timestamp, appId, action, changed_by, old_value, new_value.

  **Recommendation: Move admin emails to Settings sheet only**
  Admin emails are currently hardcoded in function comments and also fetched from Settings.
  Remove the hardcoded fallback values to enforce Settings-only management.

  ### Fair Housing Compliance

  **Recommendation: Define screening criteria in writing**
  All approval/denial decisions should be based on published criteria (minimum income multiple,
  credit score range, etc.). Consider adding a "Denial Reason" dropdown with pre-defined
  categories instead of free text.

  **Recommendation: Review adverse action notice requirements**
  If any denial is based on consumer report information, FCRA requires a specific adverse action
  notice. The current denial email does not include this notice. Consult legal counsel before
  adding credit/background screening.

  ---

  ## Phase 1 Improvements

  *Phase 1: Critical — Security & Legal (5 tasks). Completed April 7, 2026.*

  **Credentials in Script Properties**
  Hardcoded admin credentials were removed and replaced with `PropertiesService` lookups.
  Improvement: add a `docs/SETUP_CREDENTIALS.md` that documents the exact property key names
  and setup steps, so a new admin can complete first-time setup without reading source code.
  Also consider adding an annual credential rotation reminder as a comment in `setupAdminPassword()`.

  **Management Countersignature**
  The countersignature system was added to GAS and the lease document.
  Improvement: when an admin countersigns, automatically send a "Fully Executed Lease"
  confirmation email to the tenant with a link to view the final document. Currently the tenant
  only learns about countersigning if they return to their dashboard.

  **Lead Paint Disclosure**
  The false "acknowledges receipt of the federal form" language was removed.
  Improvement: add a property-age field to the listing platform so the disclosure clause can
  be conditionally included only for pre-1978 properties. Serving the clause to every tenant
  regardless of the property year creates unnecessary paperwork and applicant confusion.

  **Month-to-Month End Date**
  The end date now correctly shows "Month-to-Month (No Fixed Expiration Date)".
  Improvement: `mtmNoticeDays` (the required notice period to terminate) is still hardcoded at
  30 days inside `code.gs`. This varies by state — expose it as a configurable GAS Script Property
  that admin can set per state rather than requiring a code change.

  **Lease Generation Validation**
  Validation now rejects leases with $0 rent or missing start date.
  Improvement: extend the validation to also reject missing security deposit and leases where
  the start date is in the past. Currently only rent and start date are checked.

  ---

  ## Phase 2 Improvements

  *Phase 2: Core Form Logic Fixes (8 tasks). Completed April 7, 2026.*

  **Employment Conditional Fields**
  Non-employed applicants can now complete Step 3 without filling employer/supervisor fields.
  Improvement: self-employed applicants would benefit from an "Income Verification Method"
  dropdown (Bank Statements, Tax Returns / 1099, Accountant Letter) to help admin understand
  what documentation to request. This is a one-field addition with no backend change needed.

  **Co-Applicant Required Fields**
  Co-applicant Name, Email, and Phone are now required when the co-applicant section is enabled.
  Improvement: a full co-applicant background check requires DOB and SSN Last 4 as well.
  Adding those two fields to the co-applicant section (with the same sensitive-key exclusion
  from localStorage that the primary applicant's fields have) would make the application
  more complete for credit screening.

  **Minimum Age Validation**
  Age ≥ 18 is now enforced on both the frontend and backend.
  Improvement: the frontend and backend implementations use independent date arithmetic.
  If timezone differences cause an off-by-one error on boundary dates, the two layers could
  disagree. Add a shared `ageFromDOB(dobString)` utility and unit-test it with edge-case
  dates (today's birthday, one day before 18th birthday).

  **Reference 1 Relationship Required**
  The Relationship field for Reference 1 is now required.
  Improvement: requiring only one reference relationship while allowing a second reference
  without one is inconsistent. Apply the same required pattern to Reference 2 Relationship
  for completeness.

  **Step 6 Fee Display**
  The fee heading in Step 6 now reflects the `?fee=` URL param.
  Improvement: add a brief note below the fee amount explaining what it covers: "The
  application fee covers credit and background screening. It is non-refundable once submitted."
  This reduces the most common pre-submission support inquiry.

  **Dead Footer Links**
  Footer links now resolve correctly. Consent checkbox has honest, accurate wording.
  Improvement: link the Privacy Policy and Terms of Service footer links directly to the
  main listing platform's `/privacy.html` and `/terms.html` pages rather than mailto.
  Those pages now exist (added April 2026). A cross-domain link is architecturally clean
  and requires no backend change.

  **Denial Email Partial-Sentence Bug**
  The denial email now reads correctly with or without a reason.
  Improvement: add a structured "Denial Reason" dropdown to the admin denial UI
  (Insufficient Income, Credit History, Rental History, Incomplete Application, Other)
  instead of a free-text field. This prevents future partial-sentence bugs and produces
  consistent, auditable denial records.

  **Denial Reapplication Language**
  Denial email now includes the 30-day reapplication protection and 60-day valid-results window.
  Improvement: add a direct "Browse Available Properties" button in the denial email linking
  to the main listing platform. Applicants who are denied but qualified for a different unit
  have a clear path forward without calling or emailing.

  ---

  ## Phase 3 Improvements

  *Phase 3: Data Integrity & Backend Validation (5 tasks). Completed April 7, 2026.*

  **Server-Side Field Validation**
  Backend now validates DOB (age ≥ 18) and phone format (minimum 10 digits).
  Improvement: add an income range sanity check — reject submissions where Monthly Income
  is less than $100 (data entry error) or greater than $50,000/month (likely a typo).
  These are not real rejections; log a warning in the Admin Notes column and continue
  processing so admin can review the value manually.

  **Duplicate Application Detection**
  Same email + same property combination is now detected and returned to the applicant
  with their existing App ID.
  Improvement: extend detection to same phone number + same property — an applicant could
  re-apply with a different email address. Also consider flagging (but not blocking) the
  same email applying for multiple different properties simultaneously, as this is useful
  information for admin.

  **App ID Uniqueness Check**
  App ID generation now retries up to 5 times if a collision is detected.
  Improvement: log a GAS warning if a collision is detected at all — the probability is
  extremely low and a collision would be a notable event worth investigating. Add:
  `Logger.log('App ID collision detected, retrying: ' + candidate);`

  **Application Fee Column Security**
  The Application Fee stored in Google Sheets is now always the backend constant, not the
  client-supplied value.
  Improvement: `APPLICATION_FEE` is still hardcoded in `code.gs`. Move it to GAS Script
  Properties (`PropertiesService.getScriptProperties().getProperty('APPLICATION_FEE')`)
  so the fee can be updated without a GAS redeployment. This also allows per-property fee
  overrides if the listing platform sends a `?fee=` param (which it now does via Phase 9C).

  **Phone Number Normalization**
  All phone fields are now normalized to digit-only format before storing.
  Improvement: store phone numbers in E.164 format (`+12025551234`) rather than raw digits.
  E.164 is the international standard and ensures compatibility if SMS or VoIP services are
  added in the future. The normalization function only needs one additional line: prepend
  `+1` for 10-digit US numbers.

  ---

  ## Phase 4 Improvements

  *Phase 4: Email Templates & Communication System (9 tasks). Completed April 7, 2026.*

  **Holding Fee Received Email**
  Tenants now receive a confirmation email when their holding fee is recorded as paid.
  Improvement: generate a formal receipt document at `GAS_URL?path=receipt&id=APP_ID`
  so applicants can access their holding fee receipt independently of email — useful on
  shared devices or if the email is lost.

  **Lease Signing Reminder Template**
  The lease reminder email template is ready.
  Improvement: Phase 7 automation was permanently cancelled, so this template is only
  called manually. Add a one-click "Send Reminder" button to the admin panel's lease row
  that calls `sendLeaseSigningReminder()` directly — no trigger infrastructure needed.
  This makes the template genuinely useful without requiring automation.

  **Lease Expiry Admin Alert Template**
  The admin alert template for unsigned leases is ready.
  Improvement: same as above — a "Lease Unsigned 48h" admin badge on the application
  dashboard row (day count since lease was sent, highlighted in red if > 48 hours) would
  allow admin to spot and act on unsigned leases without needing email automation.

  **Move-In Preparation Guide**
  Tenants now receive a move-in preparation email after signing the lease.
  Improvement: add a property-specific checklist section that admin can customize in the
  "Send Lease" modal (utility provider, parking space number, trash day, key handoff
  location). Currently the guide is generic. Even a free-text "Additional Notes" field
  passed through to the template would add significant value per unit.

  **Admin Review Summary on Fee Confirmation**
  Admin now receives a full application data table when payment is marked confirmed.
  Improvement: add a configurable "delay" option — some admins prefer to batch-review
  rather than act immediately. A "Review by [date]" line in the summary email (calculated
  as submission date + 5 business days) would create a soft deadline without automation.

  **Save & Resume Email Style Standardized**
  Resume email now uses the shared `EMAIL_BASE_CSS` / header / footer system.
  Improvement: add an explicit session expiry warning to the resume email — localStorage
  data is cleared when the browser clears site data. The email should say: "Your saved
  progress is stored in your current browser. Switching browsers or devices will start
  from the beginning."

  **Emoji Removed from Admin Email Subjects**
  Admin-facing email subjects (`New Application:`, `Admin Login Code —`) no longer use emoji.
  Improvement: track email open rates via a 1x1 GAS-served image pixel in admin emails.
  GAS can log a timestamp when the pixel is fetched, giving a record of whether admin
  review emails were opened. This is optional and requires a new GAS `doGet` route for the pixel.

  **Admin Review Summary Email**
  Admin now receives a complete application data table after fee confirmation.
  Improvement: add a simple scoring row at the top of the summary: income-to-rent ratio,
  employment duration in months, number of references provided. These are available from
  the submitted data and require no external check. Even a calculated snapshot helps
  admin make faster, more consistent decisions.

  ---

  ## Phase 5 Improvements

  *Phase 5: Lease System Improvements (6 tasks). Completed April 7, 2026.*

  **Print/PDF Enhancement for Lease Confirmation**
  The lease confirmation page now has proper `@media print` CSS and a "Save or Print (PDF)" button.
  Improvement: browser print-to-PDF quality varies. A GAS-generated PDF via `DriveApp.createFile()`
  (using HTML service output rendered to a blob) would be more reliable and produce a fixed-layout
  document. This is a significant implementation effort but would make the lease archive-quality.

  **Admin Address Verification in Send Lease Modal**
  Admin can now review and correct the property address before sending a lease.
  Improvement: integrate the Google Maps Geocoding API (free tier) via `UrlFetchApp` in
  `generateAndSendLease()` to validate the verified address. Return a warning (not a block)
  if the address cannot be geocoded. This catches obvious typos before a lease is sent.

  **Pet Addendum Cross-Reference Removed**
  Clause 4 no longer references a non-existent Pet Addendum document.
  Improvement: if the property allows pets, create a real Pet Addendum as an additional
  GAS-rendered document at `GAS_URL?path=pet_addendum&id=APP_ID`. This restores the
  legal completeness of the clause while making the referenced document real. The
  `pets` URL param is already passed through to the application — the data is available.

  **Renter's Insurance: Now Required**
  Renter's insurance is now required with a 5th checkbox in the lease signing flow.
  Improvement: add a field in the admin panel (post-lease-execution) for the tenant to
  submit their insurance policy number and carrier. Store in new columns `Insurance Carrier`
  and `Policy Number`. This closes the loop and gives admin a record of compliance.

  **Month-to-Month Notice Period**
  The early termination clause now correctly uses `mtmNoticeDays` for month-to-month leases.
  Improvement: `mtmNoticeDays` is hardcoded at 30 days. Required notice periods vary by state
  (California: 30 days if tenancy < 1 year, 60 days otherwise; Michigan: 1 rental period).
  Expose this as a per-state configurable via the `getJurisdictionData(state)` function that
  already exists in `code.gs`.

  **Lease Copy Link in Tenant Signed Email**
  The lease-signed confirmation email now includes a link back to the lease.
  Improvement: the link renders the signing page (`?path=lease`), which shows the signing
  form again for already-signed leases. Add a separate `?path=lease_view&id=APP_ID` route
  to `doGet()` that renders a read-only version with signatures filled in — no form controls,
  no action buttons. This is the correct "view executed lease" experience.

  ---

  ## Phase 6 Improvements

  *Phase 6: Payment Flow Improvements (4 tasks). Completed April 7, 2026.*

  **Payment Method Tracking**
  Admin can now record the actual payment method and transaction reference when marking an
  application as paid.
  Improvement: display the business's collection details (Venmo handle, Zelle email/phone,
  mailing address for checks) directly in the payment confirmation email rather than
  requiring the applicant to call. This reduces payment-related support contacts significantly.

  **Refunded Payment Status**
  A "refunded" payment status now exists and admin can mark applications as refunded.
  Improvement: add a refund confirmation email template that notifies the applicant when their
  payment is marked refunded. Include the refund method ("via original payment method" or
  a specific note) and expected processing time. Currently no communication is sent.

  **Holding Fee Deadline**
  Holding fee requests now include a deadline (24h, 48h, 72h, or 7 days).
  Improvement: add a visible countdown timer on the applicant dashboard when a holding fee
  is pending. The deadline is already stored in the sheet — surfacing it as a live countdown
  ("2 days, 4 hours remaining") creates appropriate urgency without requiring admin follow-up.

  **Enhanced Payment Receipt**
  Payment confirmation emails now include payment method, transaction reference, and a
  formal receipt block.
  Improvement: make the receipt available as a standalone page at `GAS_URL?path=receipt&id=APP_ID`
  so applicants can access it from their dashboard anytime, not just from the email. Include
  an "Add to Wallet" link (Google Wallet / Apple Wallet) for the most tech-forward applicants.

  ---

  ## Phase 7 Improvements

  *Phase 7: GAS Automation (Triggers). Permanently cancelled — all emails and status updates are admin-initiated.*

  **Context**
  Phase 7 was permanently cancelled as a deliberate architectural decision. All trigger handler
  functions (`checkFeeFollowUp`, `checkLeaseSigning`, `checkPostApproval`, `checkMoveInReminders`)
  and their associated email templates were built in Phases 4 and partially in the relevant
  functional phases, but the GAS trigger installation step was not performed.

  **Improvement: Admin-initiated batch review**
  Instead of automated triggers, add a "Run Status Check" button to the admin panel that
  calls all four handler functions on demand. This gives admin the same operational visibility
  as triggers (unpaid applications > 72h, unsigned leases > 48h, etc.) without the
  infrastructure risk of unmonitored daily GAS executions. The functions already exist —
  wiring them to a single admin button is minimal work.

  **Improvement: Application age indicators**
  The application age indicator added in Phase 8 partially addresses the trigger-driven use case.
  Extend it to include a "⚠ Lease not sent" badge (approved but Lease Status = 'none' for > 24h)
  and a "⚠ Lease unsigned" badge (Lease Status = 'sent' for > 48h) so admin can see at a glance
  where manual follow-up is needed.

  ---

  ## Phase 8 Improvements

  *Phase 8: UX & Flow Completion (5 tasks). Completed April 7, 2026.*

  **Denied Dashboard State**
  Denied applicants now see a compassionate message with reapplication options and contact links.
  Improvement: track which denied applicants click "Discuss Other Options" by logging a click
  event to a GAS endpoint. Even a lightweight `logDashboardAction(appId, action)` function
  would provide data on how many denied applicants actively explore alternatives — valuable
  for business development.

  **Document Upload Field**
  A file upload field now exists in the application form.
  Improvement: add frontend file-type and size validation before upload (not just at the GAS
  level) to provide immediate feedback. Validate MIME type, not just file extension, to prevent
  disguised files. Also add an upload progress indicator — large files over a cellular connection
  take time, and no feedback creates anxiety.

  **Mark as Contacted**
  Admin can now record that an applicant has been contacted.
  Improvement: add a contact notes field alongside the "Mark as Contacted" action so admin
  can log what was discussed (e.g. "Left voicemail re: payment"). A single free-text note
  stored in the `Contact Timestamp` column (or a new `Contact Notes` column) would make the
  contact record meaningful, not just a timestamp.

  **Application Age Indicator**
  Admin panel now shows a colour-coded age badge (green/yellow/red) for each application.
  Improvement: add a priority sort option to the admin panel — "Sort by: Oldest First" — so
  admin can surface the most time-sensitive applications without scrolling. The age data is
  already calculated for the badge; sorting by it is one additional comparator.

  **Application Withdrawal Flow**
  Applicants can now withdraw their application with a confirmation dialog.
  Improvement: ask for a withdrawal reason via a short dropdown (Found housing elsewhere,
  Financial circumstances changed, Application submitted in error, Other) before confirming
  withdrawal. This data is anonymously valuable for product improvement and requires no
  architectural change — just a select element in the confirmation dialog that is passed
  to `withdrawApplication()`.

  ---

  ## Phase 9 Improvements

  *Phase 9: Bug Fixes & Integration Improvements (10 items across 9A/9B/9C). Completed April 8, 2026.*

  **Admin Denial of Unpaid Applicants (9A-1)**
  The payment guard now only blocks approval, not denial.
  Improvement: add a visual indicator in the admin panel when an application is denied but
  unpaid — this is a valid and now-supported state, but it may look like an error to admin
  who expect payment to always precede action. A small badge ("Denied — fee not collected")
  makes the state self-explanatory.

  **Supabase Property Sync on Denial (9A-2)**
  The Supabase sync now only fires on approval — denial no longer resets a property to "active".
  Improvement: add a "Manual Sync" button to the admin panel for edge cases where the
  Supabase status gets out of sync through other means (Supabase direct edit, failed GAS call,
  etc.). A one-click `_syncPropertyStatusToSupabase(propertyId, status)` call from the admin
  UI would give admin a safe recovery path without requiring code access.

  **Property Detail Null Rent Crash (9A-3)**
  Properties with null rent no longer crash the detail page.
  Improvement: null rent should surface in the Supabase admin dashboard as a data quality flag.
  Add a GAS or frontend check that queries for properties where `monthly_rent IS NULL` and
  displays them with a "Rent TBD" badge on the listing page — making the incomplete data
  visible to admin before applicants see it.

  **Emergency Contact Phone Normalization (9B-1)**
  The field name mismatch (`'Emergency Phone'` vs `'Emergency Contact Phone'`) is now fixed.
  Improvement: add a `validateFormFieldNames()` GAS utility that compares the keys in a
  received `formData` object against `SHEET_HEADERS` and logs any key that does not match.
  This would have caught 9B-1 immediately and will catch similar mismatches in the future if
  new fields are added.

  **Date of Birth Excluded from localStorage (9B-2)**
  DOB and Co-Applicant DOB are now excluded from auto-saved browser progress.
  Improvement: display a brief notice near the DOB field ("For your security, this field
  is not auto-saved") so applicants know they will need to re-enter it if they return to
  a saved session. This sets expectations rather than causing confusion when the field is blank.

  **Pets/Smoking String Boolean Handling (9B-3)**
  Verified that truthy checks on `"true"`/`"false"` strings are handled correctly.
  Improvement: standardize all boolean URL params to use `1`/`0` instead of `"true"`/`"false"`
  across the listing platform's `buildApplyURL()` function. Numeric `1` and `0` are falsy/truthy
  as expected in JavaScript without string comparison, eliminating the entire class of bug.

  **Rent Range Filter Empty Results (9B-4)**
  Min/max rent values are now automatically swapped if entered in the wrong order.
  Improvement: show a subtle "We swapped your rent range for you" notification when the
  values are swapped — silent correction is user-friendly but a note prevents the user from
  thinking the filter broke. A dismissible inline message (`min-rent swap notice`) adds
  clarity with minimal UI impact.

  **Application Fee Fully Dynamic (9C-1)**
  The fee fallback is now `0` (no fee) instead of the hardcoded `APPLICATION_FEE` constant.
  Improvement: ensure the Supabase `properties` table has a NOT NULL constraint (or a
  default value of 50) on `application_fee`. A null fee results in a $0 application, which
  is technically correct per the fix but operationally undesirable. Data-level enforcement
  is more reliable than code-level fallbacks.

  **"Back to Listing" Link on Success Screen (9C-2)**
  Applicants now see a "← Back to this listing" link on the submission success screen.
  Improvement: add the same back link to Step 1 (before the applicant has started) as a
  "← View this listing" link in the property context banner. Applicants who arrive via a
  redirect sometimes want to review the listing details before beginning — this gives them
  a clear path back without using the browser's Back button.

  **Email-Based App ID Recovery (9C-3)**
  Applicants who lost their App ID can now request it via email on the dashboard login page.
  Improvement: add rate limiting to the lookup endpoint (max 3 lookup requests per email
  per hour, tracked in the Settings sheet or via `CacheService`) to prevent enumeration of
  the applicant email list. The feature is valuable but the endpoint currently has no
  abuse protection.
  