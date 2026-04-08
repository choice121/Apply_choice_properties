COMPLETED RECORD — Phase 9 is fully done. Do not treat this as active work.
  All items below are marked complete [x]. This file is a historical fix log.
  For current project status, read PROJECT_STATUS.md.

  ---

  # Phase 9 — Bug Fixes & Integration Improvements

  **System:** Choice Properties — Apply_choice_properties (GAS backend + Cloudflare Pages frontend)
  **Companion repo:** choice121/Choice (listing platform — fixes 9A-3, 9B-3, 9B-4 live there)
  **Deep scan completed:** April 8, 2026
  **Status:** ALL PHASES COMPLETE — April 8, 2026

  ---

  ## How to Work From This File

  1. Fix items in strict order: 9A-1, 9A-2, 9A-3, then 9B-1 through 9B-4, then 9C-1 through 9C-3
  2. Mark each checkbox [ ] → [x] when done
  3. Each item below contains: what is broken, exactly where it is, and exactly how to fix it
  4. After completing a phase group (9A, 9B, 9C), update PROJECT_STATUS.md and push to GitHub
  5. Never skip to 9C without completing 9A and 9B first
  6. Architecture constraints in PROJECT_RULES.md are non-negotiable — re-read before touching code.gs

  ---

  ## Phase 9A — Critical (Fix First)

  These three bugs cause active operational failures right now.

  ---

  ### 9A-1 — Admin cannot deny unpaid applicants

  - [x] **Status:** Fixed — April 8, 2026
  - **File:** `backend/code.gs`
  - **Function:** `updateStatus(appId, newStatus, notes)`
  - **Severity:** Critical — workflow blocker

  **What is broken:**

  The payment guard at the top of `updateStatus()` throws an error for ANY status change
  if payment is not yet `'paid'`. This means an admin cannot deny an unqualified applicant
  who has not paid the application fee. Those applicants are stuck in `pending` forever
  with no way to close the record from the admin panel.

  **Locate the bug:**

  ```javascript
  // In updateStatus() — this block appears BEFORE any status change logic:
  if (sheet.getRange(rowIndex, col['Payment Status']).getValue() !== 'paid') {
    throw new Error('Cannot change status until payment is received');
  }
  ```

  **Exact fix:**

  Wrap the payment guard so it ONLY blocks approval, not denial:

  ```javascript
  // BEFORE (wrong — blocks everything):
  if (sheet.getRange(rowIndex, col['Payment Status']).getValue() !== 'paid') {
    throw new Error('Cannot change status until payment is received');
  }

  // AFTER (correct — only blocks approval):
  if (newStatus === 'approved' && sheet.getRange(rowIndex, col['Payment Status']).getValue() !== 'paid') {
    throw new Error('Cannot approve application until payment is received');
  }
  ```

  No other changes needed in this function for this fix.

  ---

  ### 9A-2 — Denying an applicant reverts a rented property back to "available"

  - [x] **Status:** Fixed — April 8, 2026
  - **File:** `backend/code.gs`
  - **Function:** `updateStatus(appId, newStatus, notes)`
  - **Severity:** Critical — corrupts live property listings on the Choice platform

  **What is broken:**

  Near the bottom of `updateStatus()`, after updating the sheet, the Supabase sync fires:

  ```javascript
  const supabaseStatus = (newStatus === 'approved') ? 'rented' : 'active';
  _syncPropertyStatusToSupabase(propertyId, supabaseStatus);
  ```

  The `'active'` branch fires for EVERY non-approved status — including denial.
  Scenario that breaks production:
  1. Applicant A is approved → property status set to `'rented'` ✅
  2. Applicant B (same property, applied earlier) gets denied → sync fires again with `'active'`
  3. Property flips back to available on the listing platform ❌
  4. New applicants can apply for an already-rented unit

  **Exact fix:**

  The sync on denial must be removed. Denial does not change whether a property is available.
  Only approval should trigger a Supabase status change.

  ```javascript
  // BEFORE (wrong — denial sets property to 'active'):
  if (col['Property ID']) {
    const propertyId     = sheet.getRange(rowIndex, col['Property ID']).getValue();
    const supabaseStatus = (newStatus === 'approved') ? 'rented' : 'active';
    _syncPropertyStatusToSupabase(propertyId, supabaseStatus);
  }

  // AFTER (correct — only sync on approval):
  if (newStatus === 'approved' && col['Property ID']) {
    const propertyId = sheet.getRange(rowIndex, col['Property ID']).getValue();
    _syncPropertyStatusToSupabase(propertyId, 'rented');
  }
  ```

  No other changes needed in this function for this fix.

  ---

  ### 9A-3 — Property detail page crashes silently when rent is null

  - [x] **Status:** Fixed — April 8, 2026
  - **File:** `property.html` (in the **choice121/Choice** repo)
  - **Function:** `renderProperty(p)` — OG meta description build
  - **Severity:** Critical — entire property detail page goes blank for any listing with no rent

  **What is broken:**

  ```javascript
  const ogDesc = `... · $${p.monthly_rent.toLocaleString()}/mo · ...`;
  ```

  If `p.monthly_rent` is `null` or `undefined` (draft listings, data entry errors), calling
  `.toLocaleString()` throws a `TypeError`. The outer `loadProperty()` catch block catches it
  and redirects the user to the home page after a 2-second error toast. The property is invisible.

  **Exact fix:**

  Add a null guard inline:

  ```javascript
  // BEFORE:
  const ogDesc = `${beds} · ${p.bathrooms} bath · $${p.monthly_rent.toLocaleString()}/mo · ${p.address}, ${p.city}, ${p.state}`;

  // AFTER:
  const ogDesc = `${beds} · ${p.bathrooms} bath · ${p.monthly_rent != null ? '$' + Number(p.monthly_rent).toLocaleString() + '/mo' : 'Rent TBD'} · ${p.address}, ${p.city}, ${p.state}`;
  ```

  Also check if `monthly_rent` is displayed anywhere else in `renderProperty()` without a null guard
  and apply the same pattern.

  ---

  ## Phase 9B — Important (Fix After 9A Is Complete)

  ---

  ### 9B-1 — Emergency Contact Phone is never normalized

  - [x] **Status:** Fixed — April 8, 2026
  - **File:** `backend/code.gs`
  - **Function:** `processApplication(formData, fileBlob)` — phone normalization block
  - **Severity:** Medium — data integrity issue in Google Sheet

  **What is broken:**

  The phone normalization array uses `'Emergency Phone'` but the HTML form submits the field
  as `name="Emergency Contact Phone"`. The loop does `formData['Emergency Phone']` which is
  always `undefined`. Emergency contact numbers land in the sheet in raw format.

  **Locate the bug:**

  ```javascript
  const phoneFields = [
    'Phone', 'Co-Applicant Phone', 'Supervisor Phone',
    'Reference 1 Phone', 'Reference 2 Phone',
    'Emergency Phone',   // ← WRONG
    'Landlord Phone'
  ];
  ```

  **Exact fix:**

  ```javascript
  // BEFORE:
  'Emergency Phone',

  // AFTER:
  'Emergency Contact Phone',
  ```

  One word change. Verify in `index.html` that the input has `name="Emergency Contact Phone"`
  before committing.

  ---

  ### 9B-2 — Date of Birth saved to browser localStorage

  - [x] **Status:** Fixed — April 8, 2026
  - **File:** `js/script.js`
  - **Functions:** `saveProgress()` and `restoreSavedProgress()`
  - **Severity:** Medium — privacy issue (PII persisted on shared/public devices)

  **What is broken:**

  `saveProgress()` excludes SSN and Co-Applicant SSN but NOT Date of Birth:

  ```javascript
  const sensitiveKeys = ['SSN', 'Application ID', 'Co-Applicant SSN'];
  // DOB and Co-Applicant DOB are missing — they get saved to localStorage
  ```

  `restoreSavedProgress()` also does not skip DOB:

  ```javascript
  const SKIP = new Set(['SSN', 'Co-Applicant SSN', 'Application ID', '_last_updated', '_language']);
  // DOB and Co-Applicant DOB are missing here too
  ```

  **Exact fix — two changes:**

  In `saveProgress()`:
  ```javascript
  // BEFORE:
  const sensitiveKeys = ['SSN', 'Application ID', 'Co-Applicant SSN'];

  // AFTER:
  const sensitiveKeys = ['SSN', 'Application ID', 'Co-Applicant SSN', 'DOB', 'Co-Applicant DOB'];
  ```

  In `restoreSavedProgress()`:
  ```javascript
  // BEFORE:
  const SKIP = new Set(['SSN', 'Co-Applicant SSN', 'Application ID', '_last_updated', '_language']);

  // AFTER:
  const SKIP = new Set(['SSN', 'Co-Applicant SSN', 'Application ID', '_last_updated', '_language', 'DOB', 'Co-Applicant DOB']);
  ```

  ---

  ### 9B-3 — Pets/smoking "false" string treated as truthy

  - [x] **Status:** Verified Safe — April 8, 2026 (no truthy conditional found)
  - **Files:** `js/script.js` (Apply form) and `property.html` in **choice121/Choice**
  - **Severity:** Medium — policy flags can display incorrectly

  **What is broken:**

  `buildApplyURL()` sends boolean values as the literal strings `"true"` or `"false"`:
  ```javascript
  p.set('pets',    property.pets_allowed    ? 'true' : 'false');
  p.set('smoking', property.smoking_allowed ? 'true' : 'false');
  ```

  The string `"false"` is truthy in JavaScript. Any check like `if (pets)` will evaluate to
  `true` even for non-pet-friendly properties. This causes the pet section to display as
  enabled and non-smoking properties to appear as smoking-allowed.

  **Exact fix:**

  In every place `pets` or `smoking` params are read from the URL or used in a conditional,
  replace truthy checks with strict string comparison:

  ```javascript
  // BEFORE (wrong — "false" is truthy):
  if (pets) { ... }
  const petsAllowed = pets;

  // AFTER (correct):
  if (pets === 'true') { ... }
  const petsAllowed = pets === 'true';
  ```

  Search `js/script.js` for all uses of the `pets` and `smoking` variables read from URL params.
  Search `property.html` for any conditional that reads `pets_allowed` or `smoking_allowed` for display.

  ---

  ### 9B-4 — Rent range filter shows empty results with no explanation

  - [x] **Status:** Fixed — April 8, 2026
  - **File:** `listings.html` in **choice121/Choice**
  - **Severity:** Medium — silent UX failure

  **What is broken:**

  If a user sets minimum rent higher than maximum rent (e.g. min $3,000, max $1,000), the
  Supabase query fires with `gte: 3000` and `lte: 1000`, returns zero results, and the
  listings page shows "No properties found" with no explanation.

  **Exact fix:**

  In the filter application logic (before the Supabase query fires), swap the values
  automatically when min exceeds max:

  ```javascript
  // Add this validation before building the Supabase query:
  if (activeMinRent && activeMaxRent && parseFloat(activeMinRent) > parseFloat(activeMaxRent)) {
    // Swap silently so the query always makes sense
    [activeMinRent, activeMaxRent] = [activeMaxRent, activeMinRent];
    // Also update the UI inputs to reflect the swap
    const minEl = document.getElementById('minRentFilter');  // adjust ID if different
    const maxEl = document.getElementById('maxRentFilter');
    if (minEl) minEl.value = activeMinRent;
    if (maxEl) maxEl.value = activeMaxRent;
  }
  ```

  Locate the exact filter input IDs in `listings.html` before applying — verify against the DOM.

  ---

  ## Phase 9C — Improvements (Only After 9A and 9B Are Complete)

  ---

  ### 9C-1 — Application fee must be fully dynamic — no hardcoded default

  - [x] **Status:** Fixed — April 8, 2026
  - **File:** `backend/code.gs`
  - **Function:** `processApplication()` — Application Fee switch case
  - **Severity:** Improvement — fee accuracy

  **What is wrong:**

  The current switch has a fallback to `APPLICATION_FEE` (a hardcoded constant) if no fee
  arrives from the URL:

  ```javascript
  case 'Application Fee': {
    const submittedFee = parseFloat(formData['Application Fee'] || '');
    rowData.push(!isNaN(submittedFee) ? submittedFee : APPLICATION_FEE); // ← wrong fallback
    break;
  }
  ```

  The fee MUST come from the property listing via the `fee` URL param → hidden input →
  `formData['Application Fee']`. There should never be a generic hardcoded fallback because
  different properties will have different fees.

  **buildApplyURL() already sends the fee correctly:**
  ```javascript
  if (property.application_fee != null) p.set('fee', property.application_fee);
  ```

  **Exact fix in code.gs:**

  ```javascript
  // BEFORE:
  case 'Application Fee': {
    const submittedFee = parseFloat(formData['Application Fee'] || '');
    rowData.push(!isNaN(submittedFee) ? submittedFee : APPLICATION_FEE);
    break;
  }

  // AFTER:
  case 'Application Fee': {
    const submittedFee = parseFloat(formData['Application Fee'] || '');
    rowData.push(!isNaN(submittedFee) ? submittedFee : 0);
    break;
  }
  ```

  The fallback becomes `0` (no fee) rather than a hardcoded constant. A fee of `0` is
  explicitly correct for free-to-apply properties, and it makes the missing-fee condition
  visible in the sheet instead of silently applying a wrong amount.

  Additionally, verify that `application_fee` is always set on every property in the Supabase
  `properties` table. If it can be `null`, update `buildApplyURL()` to always include the param:

  ```javascript
  // Ensure fee is always in the URL (even if zero):
  p.set('fee', property.application_fee ?? 0);
  ```

  ---

  ### 9C-2 — Add "Back to listing" link on application success screen

  - [x] **Status:** Fixed — April 8, 2026
  - **Files:** `js/script.js`, `index.html`
  - **Severity:** Improvement — UX

  **What to do:**

  1. In `buildApplyURL()` (Choice/js/cp-api.js), add the current page URL as a `source` param:
     ```javascript
     p.set('source', window.location.href);
     ```

  2. In `_prefillFromURL()` (js/script.js), read and store it:
     ```javascript
     const sourceUrl = p.get('source') || '';
     if (sourceUrl) this.state.sourceUrl = sourceUrl;
     ```

  3. On the success screen render, if `this.state.sourceUrl` exists, show a link:
     ```html
     <a href="{sourceUrl}">← Back to this listing</a>
     ```

  Keep the link text simple and the implementation minimal. Do not validate or transform
  the source URL — just use it as a plain href.

  ---

  ### 9C-3 — Email-based App ID recovery on applicant dashboard

  - [x] **Status:** Fixed — April 8, 2026
  - **File:** `backend/code.gs`
  - **Function:** `renderLoginPage()` and a new `lookupAppIdByEmail()` function
  - **Severity:** Improvement — UX for applicants who lost their App ID email

  **What to do:**

  1. Add a "Forgot your Application ID?" link or section to the rendered login page HTML
  2. When an email is submitted, add a new GAS function `lookupAppIdByEmail(email)` that:
     - Searches the Applications sheet for all rows where Email matches (case-insensitive)
     - Filters out rows with status `'denied'` or `'withdrawn'`
     - Sends a MailApp email to the address listing their active App IDs and dashboard links
     - Returns `{ success: true }` regardless (no confirmation of whether email was found — prevents enumeration)
  3. Wire it up as a new `_action=lookupAppId` route in `doPost()`

  This requires: a new `doPost` route, a new GAS function, and an update to `renderLoginPage()`.
  No frontend JS file changes — everything is server-rendered by GAS.

  ---

  ## Files Changed Per Phase

  | Phase | Files in Apply repo | Files in Choice repo |
  |---|---|---|
  | 9A-1 | `backend/code.gs` | — |
  | 9A-2 | `backend/code.gs` | — |
  | 9A-3 | — | `property.html` |
  | 9B-1 | `backend/code.gs` | — |
  | 9B-2 | `js/script.js` | — |
  | 9B-3 | `js/script.js` | `property.html` |
  | 9B-4 | — | `listings.html` |
  | 9C-1 | `backend/code.gs` | `js/cp-api.js` (verify fee always sent) |
  | 9C-2 | `js/script.js`, `index.html` | `js/cp-api.js` |
  | 9C-3 | `backend/code.gs` | — |

  ---

  ## Architecture Reminders (Read Before Every Edit)

  - GAS backend (`backend/code.gs`) must not use ES module syntax — no `import/export`
  - No npm, no build tools, no new backends
  - Frontend is pure static HTML/CSS/Vanilla JS — deployed on Cloudflare Pages
  - GAS is deployed externally — changes to code.gs require a manual re-deploy in the GAS editor
  - Admin credentials live in GAS Script Properties only — never in source code
  - The only connection GAS has to Supabase is `_syncPropertyStatusToSupabase()` via `UrlFetchApp`
  - `landlord_id` is never passed through the URL — it stays server-side only

  ---

  *Deep scan performed: April 8, 2026*
  *Both repos scanned: choice121/Apply_choice_properties + choice121/Choice*
  