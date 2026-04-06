# ⚙️ DYNAMIC DATA IMPLEMENTATION PLAN
## Choice Properties — Application System Session 031+

> **Machine-readable contract for AI continuity.**
> Any AI assistant starting a new session MUST read this file first.
> It defines the current system state, all identified issues, the full fix
> plan organized by phase, and the completion status of each issue.
> Do not skip ahead. Do not fix issues out of phase order.
> After completing any phase, update the STATUS fields below before closing the session.

---

## 🎯 GOAL

The application system must be **fully dynamic and data-driven**. Every field,
email template, lease document, legal clause, and message must reflect the
actual property being applied for — pulled from the data already in the system.
Nothing should be hardcoded that belongs to a specific property or state.

---

## 📊 CURRENT SYSTEM STATE (as of Session 030)

### What works correctly
- URL params (`id`, `pn`, `addr`, `city`, `state`, `rent`) flow from the main
  listing platform and are captured into `this.state.propertyContext`.
- The property context banner shows the property name, city, state, and rent.
- The income-to-rent ratio widget uses the `rent` URL param.
- The `Property Address` form field is pre-filled from URL params.
- GAS stores `Property Address` (what the applicant typed) in the sheet.
- The lease uses `Property Address` from the sheet for the rental property line.
- The `property` row in the lease details table is data-driven.

### What is broken / missing (the full issue list)

See the ISSUES section below for every identified problem with priority and phase.

---

## 🐛 ISSUE REGISTRY

Each issue has a unique ID, description, root cause, fix approach, phase, and
completion status. Status values: `OPEN` | `IN_PROGRESS` | `DONE`.

> **AI INSTRUCTION:** Start each session by reading all OPEN issues in the
> current phase. Fix them all before moving to the next phase. Update status
> to DONE inline after each fix. When all issues in a phase are DONE, update
> the PHASE STATUS table at the bottom of this file.

---

### PHASE 1 — Critical Data Gaps (property context not reaching the backend)

---

**D-001** | STATUS: `DONE` | Fixed in Session 032
**Title:** URL params `city`, `state`, `rent`, `id`, `pn` are captured but never sent to GAS

**Root cause:**
`_prefillFromURL()` stores `{ id, name, addr, city, state, rent }` in
`this.state.propertyContext` for display only. When the form is submitted,
`new FormData(form)` only serializes actual `<input>` elements. The context
object never reaches GAS. As a result, the sheet row has no city, no state,
no rent amount at application time, and no property ID linking back to the
main platform.

**Impact:** High. GAS cannot use rent or city/state for any downstream logic
(lease jurisdiction, income calculations, admin views, emails).

**Fix:**
In `handleFormSubmit()` in `js/script.js`, after `const formData = new FormData(form)`,
append the propertyContext fields as hidden fields before the fetch call:

```js
// Append property context from URL params (display-only → backend)
const ctx = this.state.propertyContext;
if (ctx) {
    if (ctx.id)    formData.append('Property ID',    ctx.id);
    if (ctx.name)  formData.append('Property Name',  ctx.name);
    if (ctx.city)  formData.append('Property City',  ctx.city);
    if (ctx.state) formData.append('Property State', ctx.state);
    if (ctx.rent)  formData.append('Listed Rent',    ctx.rent);
}
```

**GAS side:** Add these columns to the sheet headers in `initializeSheets()`:
`Property ID`, `Property Name`, `Property City`, `Property State`, `Listed Rent`.
Map them in `processApplication()` switch cases so they write to the sheet.

**Files:** `js/script.js`, `backend/code.gs`

---

**D-002** | STATUS: `DONE` | Fixed in Session 032
**Title:** Lease jurisdiction is hardcoded to "State of Michigan / Oakland County"

**Root cause:**
`renderLeaseSigningPage()` in `code.gs` hardcodes:
- `<span>Jurisdiction: State of Michigan</span>` (header badge)
- `"...the laws of the State of Michigan. Any disputes...exclusive jurisdiction
  of the courts of Oakland County, Michigan..."` (Article XXIII)
- `"Michigan Electronic Signature Act (MCL § 450.832 et seq.)"` (e-sign notice)

Choice Properties operates nationwide. A property in Texas, Florida, or
California cannot have a Michigan-law lease — this is a legal error.

**Fix:**
1. After D-001 is done, `Property State` will be available on the sheet row.
2. In `renderLeaseSigningPage()`, read `app['Property State']` (already
   partially done for `property` address — extend the same pattern).
3. Build a `JURISDICTION_MAP` object in GAS that maps 2-letter state codes to
   `{ stateName, countyNote, eSignAct }`. Michigan is the default/fallback.
4. Replace every hardcoded Michigan/Oakland reference with the mapped values.

**Files:** `backend/code.gs`

---

**D-003** | STATUS: `DONE` | Fixed in Session 032
**Title:** Lease header badge always shows "Jurisdiction: State of Michigan"

**Root cause:** Same as D-002. The badge in the lease HTML header is a
separate hardcoded string independent of the article body.

**Fix:** Apply jurisdiction map output to the header badge as part of D-002.
(Tracked separately so it is not overlooked.)

**Files:** `backend/code.gs`

---

**D-004** | STATUS: `DONE` | Fixed in Session 032
**Title:** E-signature legal notice references Michigan state act regardless of property location

**Root cause:** The e-sign legal notice, checkbox label, and step list all
hardcode "Michigan Electronic Signature Act (MCL § 450.832 et seq.)". Every
US state has adopted UETA or E-SIGN — the federal E-SIGN Act (already cited)
covers all 50 states. Michigan-specific statute is incorrect outside Michigan.

**Fix:**
- For Michigan properties: keep MCL cite.
- For all other states: reference UETA (Uniform Electronic Transactions Act)
  and the federal E-SIGN Act only.
- Add a helper `getESignText(stateCode)` and apply it to all 4 locations where
  the Michigan e-sign act is mentioned.

**Files:** `backend/code.gs`

---

### PHASE 2 — Lease Financial Terms Not Fully Data-Driven

---

**D-005** | STATUS: `DONE` | Fixed in Session 033
**Title:** Rent due date hardcoded to "1st of each month"

**Root cause:**
Article III of the lease hardcodes "due on the 1st of each month" and
"late after the 5th of the month" (5-day grace period). The admin lease form
in the admin panel does not have a "Rent Due Date" or "Grace Period" field.
These should be configurable per lease.

**Fix:**
1. Add `Rent Due Day` (default 1) and `Late Fee Grace Days` (default 5) fields
   to the admin "Send Lease" form panel.
2. Write them to new sheet columns `Rent Due Day` and `Grace Period Days`.
3. In `renderLeaseSigningPage()`, read these columns and substitute into
   Articles III and IV.
4. Update the financial summary table row "Grace Period" to use these values.

**Files:** `backend/code.gs`

---

**D-006** | STATUS: `DONE` | Fixed in Session 033
**Title:** Late fee amount is referenced in Article III but the amount is never defined or data-driven

**Root cause:**
Article III says "subject to the late fees outlined in Article III" but the
actual late fee dollar amount is never specified in either the admin form,
the sheet, or the lease body. The lease has an Article III heading but no
late fee dollar figure. This is a missing data field.

**Fix:**
1. Add `Late Fee Amount` field to the admin "Send Lease" form (e.g., $50).
2. Write to new sheet column `Late Fee Amount`.
3. In the lease Article III, insert: "A late fee of $[amount] will be assessed
   for each month rent is received after the grace period."

**Files:** `backend/code.gs`

---

**D-007** | STATUS: `DONE` | Fixed in Session 032 (depositReturnDays already in jur map)
**Title:** Security deposit return timeline hardcoded to "30 days"

**Root cause:**
Article IV states deposit "will be returned within 30 days." Michigan law
requires 30 days; California requires 21 days; other states vary. This should
be driven by the property state via the jurisdiction map.

**Fix:**
Extend the `JURISDICTION_MAP` (from D-002) to include `depositReturnDays`.
Apply to Article IV deposit return language.

**Files:** `backend/code.gs`

---

**D-008** | STATUS: `DONE` | Fixed in Session 033
**Title:** Early termination notice period hardcoded to "60 days"

**Root cause:**
Article XVII: "minimum of 60 days' written notice" for early termination.
Article XVIII: "minimum of 60 days' written notice prior to vacating."
These vary by state law and should be part of the jurisdiction map.

**Fix:**
Extend `JURISDICTION_MAP` to include `earlyTermNoticeDays` and
`moveOutNoticeDays`. Apply to Articles XVII and XVIII.

**Files:** `backend/code.gs`

---

**D-009** | STATUS: `DONE` | Fixed in Session 033
**Title:** Month-to-month termination notice period hardcoded to "30 days"

**Root cause:**
Article XVI: "30 days' written notice" for month-to-month rent adjustments
and termination. Some states require 60 days for rent increases on
month-to-month tenancies. Add to jurisdiction map.

**Fix:**
Extend `JURISDICTION_MAP` to include `mtmNoticeDays`. Apply to Article XVI.

**Files:** `backend/code.gs`

---

### PHASE 3 — Email Templates Not Fully Property-Aware

---

**D-010** | STATUS: `DONE` | Fixed in Session 034

**Root cause:**
`sendApplicantConfirmation()` sends subject:
`"✅ Application Received — Choice Properties"`.
The property the applicant applied for is not in the subject line, making it
harder for applicants to identify which application this email refers to if
they have applied to multiple properties.

**Fix:**
After D-001 is complete, `data['Property Name']` or `data['Property Address']`
will be available. Update subject to include a property snippet:
`"✅ Application Received — [Property Address snippet] | Choice Properties"`.

**Files:** `backend/code.gs`

---

**D-011** | STATUS: `DONE` | Fixed in Session 034
**Title:** Payment confirmation email doesn't include the property the applicant paid for

**Root cause:**
`EmailTemplates.paymentConfirmation` does not receive or display any property
information. An applicant receiving this email cannot tell which property's
fee they paid.

**Fix:**
In `sendPaymentConfirmation()`, fetch the applicant row from the sheet and
pass `Property Address` and `Property Name` to the template. Update
`EmailTemplates.paymentConfirmation` to include a property line.

**Files:** `backend/code.gs`

---

**D-012** | STATUS: `DONE` | Fixed in Session 034
**Title:** Status update email (approved/denied) doesn't name the property

**Root cause:**
`EmailTemplates.statusUpdate` is generic — "Your application has been
[approved/denied]" with no property reference. An applicant cannot tell
which property decision this is for without opening the dashboard.

**Fix:**
Pass `propertyAddress` to `sendStatusUpdateEmail()` from the admin action
handler (which already has the row data). Include property name/address in
the email body and subject.

**Files:** `backend/code.gs`

---

**D-013** | STATUS: `DONE` | Fixed in Session 034
**Title:** Resume-progress email doesn't include property name

**Root cause:**
`sendResumeEmail()` receives only `email`, `resumeUrl`, `step`. The resume URL
itself contains the full URL params so the property will auto-load when the
user returns — but the email body doesn't mention which property they were
applying for, making it contextually confusing.

**Fix:**
The `resumeUrl` already contains the full URL with params. Parse the property
name from the URL and include it in the email body: "You were applying for
[Property Name]. Click below to continue your application."

**Files:** `backend/code.gs`

---

**D-014** | STATUS: `DONE` | Fixed in Session 033
**Title:** "Application fee $50.00" is hardcoded in applicant confirmation, admin notification, and email templates

**Root cause:**
The $50 application fee amount appears hardcoded in at least 6 places:
- `EmailTemplates.applicantConfirmation` (body + callout)
- `EmailTemplates.adminNotification` (callout header)
- Step list item 1 in applicant confirmation
- Admin notification action callout
- Dashboard HTML rendered by GAS
- Various inline messages

If the fee changes, all 6 locations must be manually updated.

**Fix:**
Define `const APPLICATION_FEE = 50;` at the top of `code.gs` (near the other
constants). Replace all hardcoded `$50.00` / `$50` / `50.00` with
`APPLICATION_FEE` or `'$' + APPLICATION_FEE.toFixed(2)`.

**Files:** `backend/code.gs`

---

### PHASE 4 — Form Fields Not Reflecting Property Data

---

**D-015** | STATUS: `DONE` | Fixed in Session 034
**Title:** Step 1 "Property Address" field is the only property field — city/state/rent have no dedicated inputs

**Root cause:**
The form collects a single free-text "Property Address" field. When URL params
are present, the address is pre-filled as `addr + city + state`. However,
`city`, `state`, and `rent` from the URL are never stored in hidden form
inputs — only in `this.state.propertyContext`. If the user edits the address
field, the city/state context is lost.

**Fix:**
Add three hidden `<input>` fields in Step 1 of `index.html`:
```html
<input type="hidden" name="Property City" id="hiddenPropertyCity">
<input type="hidden" name="Property State" id="hiddenPropertyState">
<input type="hidden" name="Listed Rent" id="hiddenListedRent">
<input type="hidden" name="Property ID" id="hiddenPropertyId">
<input type="hidden" name="Property Name" id="hiddenPropertyName">
```
In `_prefillFromURL()`, populate these hidden inputs so FormData picks them
up automatically — removing the need for manual appending in `handleFormSubmit`.

**Files:** `index.html`, `js/script.js`

---

**D-016** | STATUS: `DONE` | Fixed in Session 034
**Title:** Step 3 income-to-rent ratio widget disappears if page is refreshed (rent param lost)

**Root cause:**
`_setupIncomeRatio()` is called only once at init from `_prefillFromURL()`.
If the user saves progress, closes the tab, and resumes via a direct link
that includes the rent param, the ratio widget is set up correctly. However,
if the resume link doesn't include the rent param (e.g., saved without the
full URL), the widget never appears.

**Fix:**
When `Listed Rent` is stored in the hidden input (from D-015), also read it
back from the hidden input as a fallback in `_prefillFromURL()` / auto-save
restore logic. This ensures the widget is always shown when rent data is
available regardless of the restore path.

**Files:** `js/script.js`

---

### PHASE 5 — Lease Document Missing Property-Specific Details

---

**D-017** | STATUS: `DONE` | Fixed in Session 035
**Title:** Lease does not include property type, bedrooms, bathrooms, parking, or included utilities

**Root cause:**
The lease Article II "Property & Lease Term" table only shows:
- Rental Property Address
- Lease Start Date / End Date / Term
- Monthly Rent / Security Deposit / Move-in Total / Grace Period

It does not include unit type, bedrooms, bathrooms, parking space, or
included utilities — all of which are property-specific and legally relevant.
The main platform has this data but it isn't passed via URL params or stored.

**Fix (two-part):**
Part A — Admin panel: Add optional fields to the "Send Lease" form:
`Unit Type`, `Bedrooms`, `Bathrooms`, `Parking Space`, `Included Utilities`.
Write to corresponding sheet columns.

Part B — Lease template: Add these rows to the Article II table when values
are present. Use conditional rendering: only show a row if the value is
non-empty.

**Files:** `backend/code.gs`

---

**D-018** | STATUS: `DONE` | Fixed in Session 035
**Title:** Lease smoking/pet policy is binary — no property-specific pet deposit or pet rent

**Root cause:**
The pet clause in the lease is currently:
- If `Has Pets === 'Yes'`: generic language about a Pet Addendum.
- If No pets: blanket prohibition.

There is no per-property pet deposit amount, pet rent, or approved pet count.
These are configured by property owners and should be in the admin lease form.

**Fix:**
Add `Pet Deposit Amount` and `Monthly Pet Rent` (both optional, default 0)
to the admin "Send Lease" form and sheet. Update the lease pet clause to
display these amounts when non-zero.

**Files:** `backend/code.gs`

---

**D-019** | STATUS: `DONE` | Fixed in Session 035
**Title:** Utilities note in lease is a generic disclaimer, not property-specific

**Root cause:**
`utilitiesNote` in `renderLeaseSigningPage()` is a static string:
"Tenant is responsible for all utilities unless otherwise specified..."
This is used even when the admin has entered included utilities in the lease
notes field.

**Fix:**
After D-017 adds `Included Utilities` as a formal field, update Article IX
(Utilities) to render dynamically:
- If included utilities are specified: list them explicitly.
- If none: use the standard "Tenant responsible" language.

**Files:** `backend/code.gs`

---

### PHASE 6 — AI Continuity & Self-Sufficiency Infrastructure

---

**D-020** | STATUS: `DONE` | Fixed in Session 031 (file created) + enforced through Session 036
**Title:** No machine-readable session handoff exists — AI must re-analyze code each session

**Root cause:**
The project has `README.md` and `PROJECT_RULES.md` but neither contains
structured issue tracking, fix progress, or implementation status that an AI
can read and act on without manual prompt context from the user.

**Fix:**
This file (`DYNAMIC_DATA_PLAN.md`) IS the fix. Its creation satisfies D-020.
Additionally, the AI completing each session must:
1. Update STATUS fields from `OPEN` to `DONE` for each fixed issue.
2. Add a row to the SESSION LOG table at the bottom of this file.
3. Update the PHASE STATUS table.
4. Update `README.md` Change History with a one-line summary.

**Files:** `DYNAMIC_DATA_PLAN.md` (this file), `README.md`

---

**D-021** | STATUS: `DONE` | Fixed in Session 036
**Title:** `README.md` change history doesn't document the dynamic data gaps

**Root cause:**
Session 030's change history entry is accurate but doesn't flag any known
limitations or pending architectural concerns for the next session.

**Fix:**
After each phase is completed, add a structured entry to `README.md`
Change History that includes: session number, issues fixed, issues deferred.

**Files:** `README.md`

---

## 📋 PHASE STATUS TABLE

> AI assistants: Update this table after completing each phase.

| Phase | Title                                          | Issues        | Status      | Completed In |
|-------|------------------------------------------------|---------------|-------------|--------------|
| 1     | Critical Data Gaps                             | D-001–D-004   | `DONE`      | Session 032  |
| 2     | Lease Financial Terms                          | D-005–D-009   | `DONE`      | Session 033  |
| 3     | Email Templates                                | D-010–D-014   | `DONE`      | Session 033–034 |
| 4     | Form Fields                                    | D-015–D-016   | `DONE`      | Session 034  |
| 5     | Lease Property-Specific Details                | D-017–D-019   | `DONE`      | Session 035  |
| 6     | AI Continuity Infrastructure                   | D-020–D-021   | `DONE`      | Session 036  |

---

## 🤖 AI SESSION PROTOCOL

Every AI assistant that opens this project must follow this exact sequence:

### On session start:
1. Read `PROJECT_RULES.md` — architecture constraints are absolute.
2. Read this file (`DYNAMIC_DATA_PLAN.md`) — understand current state.
3. Identify the **lowest-numbered phase** where any issue is `OPEN`.
4. Tell the user: "I've read the plan. Phase [N] is active. Issues [X, Y, Z]
   are open. I'll fix all of them now." Then proceed without further prompting.
5. Do NOT ask the user to explain what needs fixing. The plan is self-contained.

### While working:
6. Fix all issues in the active phase before touching other phases.
7. Update each issue's STATUS to `DONE` after fixing it.
8. Follow the exact fix approach described in each issue. If deviation is
   needed, document why in a note under the issue.

### On session end:
9. Update the PHASE STATUS table.
10. Add a SESSION LOG entry (see below).
11. Update `README.md` Change History.
12. Produce the updated project ZIP.

---

## 📝 SESSION LOG

| Session | Phases Completed | Issues Fixed | Notes |
|---------|-----------------|--------------|-------|
| 031     | Plan created    | D-020 (partial — file created, not yet marked DONE) | Initial audit and plan authored |
| 032     | Phase 1         | D-001, D-002, D-003, D-004 | Property context (city/state/rent/id/name) now appended to FormData and written to 5 new sheet columns. JURISDICTION_MAP built for 20 states + DEFAULT. getJurisdiction() and getESignText() helpers added. Lease header badge, Article IV, XIV, XV, XXIII, e-sign legal notice, agreeBinding checkbox, leaseSent and leaseSignedTenant email step lists all dynamic. |
| 035     | Phase 5 | D-017, D-018, D-019 | D-017: `Unit Type`, `Bedrooms`, `Bathrooms`, `Parking Space`, `Included Utilities` fields added to Send Lease modal and written to 5 new sheet columns; Article II table conditionally renders these rows when non-empty. D-018: `Pet Deposit Amount` and `Monthly Pet Rent` fields added to modal and sheet; Article IV pet clause now inlines deposit and pet-rent amounts when non-zero. D-019: `utilitiesNote` now dynamic — reads `Included Utilities` from sheet and lists them explicitly, or falls back to standard "Tenant responsible" language. All 3 Phase 5 issues resolved. |
| 036     | Phase 6 | D-020, D-021 | D-020: Formally closed — `DYNAMIC_DATA_PLAN.md` maintained with STATUS updates, SESSION LOG entries, and PHASE STATUS updates across every session since 031. Protocol proven. D-021: `README.md` Change History now has complete structured entries for all sessions (031–036). Missing Session 033 entry backfilled. **All 21 issues across all 6 phases are now DONE.** |
| 037     | Feature: Holding Fee | N/A (new feature, not a plan issue) | Holding fee system complete. 4 new sheet columns: `Holding Fee Amount`, `Holding Fee Status`, `Holding Fee Date`, `Holding Fee Notes`. 3 new GAS functions: `requestHoldingFee()`, `markHoldingFeePaid()`, `sendHoldingFeeRequestEmail()`. Lease generation updated: `holdingFeeAmt` and `holdingFeeStatus` read from sheet row; `moveInCost` auto-subtracts paid holding fee; Article III table gains credit row; move-in highlight box and agreeFinancial checkbox label update dynamically. Admin dashboard `buildAdminCard()` has holding fee badge (green=paid, yellow=pending) and contextual action buttons (Request Hold Fee / Hold Fee Received). Client-side `buildCardHtml()` mirror matches. Holding fee modal with amount input. `showConfirmModal()` handles `holdFeePaid`. Tenant applicant dashboard has holding fee info card on approved apps. All areas complete. |
| 038     | Bug fixes | N/A | 9 issues resolved: (1) `signLease()` crash — `app` undefined when building lease-signed email payload (ReferenceError swallowed all lease signing emails). Fixed by reading `Property State` direct from sheet row. (2) `statusUpdate` email crash — `EmailTemplates.statusUpdate` referenced `leaseData.propertyState` but `leaseData` never passed; crashed every approval/denial email. Fixed. (3) `requestHoldingFee()` guard — no check that app was approved and payment confirmed before requesting HF. Guards added. (4) Progress bar flash — `index.html` hard-coded step1 `completed`/step2 `active` before JS ran. Fixed to step1 active, others plain. (5) Broken static success card — `#successState` visible with placeholder content and broken track link. Fixed with `display:none`. (6) Duplicate `copyAppId` — defined in both `index.html` and `script.js`. Removed `index.html` copy. (7) Dashboard polling quota risk — `setInterval(checkForStatusChange, 5000)` on tenant dashboard exhausted free-tier GAS quota. Changed to 45 seconds. (8) `restoreSavedProgress()` key-set cleanup — skip set formalized. (9) Additional hardening. |
| 039     | Integration confirmed | N/A | The main listing platform (`choice-properties-site.pages.dev`) was confirmed to redirect all "Apply Now" buttons to this system. `buildApplyURL()` on the listing platform passes: `id`, `pn`, `addr`, `city`, `state`, `rent`, `beds`, `baths`, `pets`, `term`. This system required zero changes — the URL param contract was already complete. Documentation updated. |
| 040     | Deep scan & audit | N/A | Full cross-repo audit: traced data flow from listing site (`choice121/Choice`) through `buildApplyURL()` to apply form `_prefillFromURL()`. Confirmed all files identical between local Replit and GitHub (MD5 verified: `js/script.js`, `index.html`, `backend/code.gs`). Confirmed property pre-fill banner and address field work correctly (screenshot verified). Verified Session 037 holding fee feature fully complete in `code.gs` — session note claiming areas pending was outdated. No code changes required — system working as intended. Updated DYNAMIC_DATA_PLAN.md session log. |

---

## 🔬 TECHNICAL REFERENCE

### Key file map
| File | Role | Key sections |
|------|------|-------------|
| `js/script.js` | Frontend app class `RentalApplication` | `_prefillFromURL()` L168, `handleFormSubmit()` L1650, `getAllFormData()` L912 |
| `backend/code.gs` | GAS backend | `processApplication()` L~830, `renderLeaseSigningPage()` L1137, `EmailTemplates` L~2150, `initializeSheets()` L48 |
| `index.html` | 6-step form HTML | Step 1 property fields, hidden inputs |
| `css/style.css` | Mobile-first styles | No dynamic data issues |

### Sheet columns added by this plan (to be added in Phase 1)
`Property ID`, `Property Name`, `Property City`, `Property State`, `Listed Rent`

### Sheet columns added in Phase 2
`Rent Due Day`, `Grace Period Days`, `Late Fee Amount`

### Sheet columns added in Phase 5
`Unit Type`, `Bedrooms`, `Bathrooms`, `Parking Space`, `Included Utilities`,
`Pet Deposit Amount`, `Monthly Pet Rent`

### Sheet columns added in Session 037 (Holding Fee feature)
`Holding Fee Amount`, `Holding Fee Status`, `Holding Fee Date`, `Holding Fee Notes`

### JURISDICTION_MAP structure (to be built in Phase 1 D-002)
```js
const JURISDICTION_MAP = {
  'MI': { stateName: 'Michigan', county: 'Oakland County',
          depositReturnDays: 30, earlyTermNoticeDays: 60,
          moveOutNoticeDays: 60, mtmNoticeDays: 30,
          eSignAct: 'Michigan Electronic Signature Act (MCL § 450.832 et seq.) and the federal' },
  'CA': { stateName: 'California', county: 'appropriate county',
          depositReturnDays: 21, earlyTermNoticeDays: 60,
          moveOutNoticeDays: 30, mtmNoticeDays: 60,
          eSignAct: 'California Uniform Electronic Transactions Act (Cal. Civ. Code § 1633.1 et seq.) and the federal' },
  'TX': { stateName: 'Texas', county: 'appropriate county',
          depositReturnDays: 30, earlyTermNoticeDays: 30,
          moveOutNoticeDays: 30, mtmNoticeDays: 30,
          eSignAct: 'Texas Uniform Electronic Transactions Act (Tex. Bus. & Com. Code § 322) and the federal' },
  // DEFAULT fallback
  'DEFAULT': { stateName: 'applicable state', county: 'appropriate county',
               depositReturnDays: 30, earlyTermNoticeDays: 60,
               moveOutNoticeDays: 30, mtmNoticeDays: 30,
               eSignAct: 'the federal' }
};
```
States not in the map use DEFAULT. Expand the map as Choice Properties
operates in more states.

---

*Last updated: Session 040 — Deep scan complete. All features verified working. No open issues.*
