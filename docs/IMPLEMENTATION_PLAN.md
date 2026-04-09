# Implementation Plan — Choice Properties Application System
  > **Machine-readable directive for all future AI assistants.**
  > Read this file FIRST before touching any code.
  > Do not skip phases. Do not start a phase without approval.
  > After completing a phase: update this file, commit, push — then STOP.

  ---

  ## 1. System Overview

  ### Listing Platform (`choice121/Choice`)
  - **Stack:** Supabase (PostgreSQL) + Cloudflare Pages + Vanilla JS
  - **Purpose:** Property browsing, search, filtering. Landlord-facing.
  - **Key files:** `property.html`, `js/cp-api.js`, `listings.html`, `generate-config.js`
  - **Hosted at:** `choice-properties.pages.dev`

  ### Application System (`choice121/Apply_choice_properties`)
  - **Stack:** Google Apps Script (GAS) backend + Google Sheets + Cloudflare Pages + Vanilla JS
  - **Purpose:** Rental application collection, admin management, lease generation.
  - **Key files:** `index.html`, `js/script.js`, `backend/code.gs`, `generate-config.js`
  - **Hosted at:** `apply-choice-properties.pages.dev`

  ### Their Relationship
  The systems are **intentionally separated.** There is no persistent sync or database connection between them.

  The only connection is:
  1. **Outbound only, one-time, user-triggered:** When an applicant clicks "Apply Now" on the Listing Platform, the browser is redirected to the Application System with 30+ property context parameters in the URL.
  2. All subsequent application processing is self-contained in GAS + Google Sheets.

  ---

  ## 2. Architecture Rules (MANDATORY)

  These rules apply to ALL implementation work. Any AI or developer must follow them without exception.

  | Rule | Enforced |
  |------|---------|
  | No system sync between Listing Platform and Application System | ✅ |
  | No Supabase WRITE from GAS | ✅ |
  | Manual admin workflow only — admin takes actions in GAS admin panel | ✅ |
  | GAS handles all application logic, storage, emails, and lease generation | ✅ |
  | No new paid infrastructure or third-party services | ✅ |
  | No breaking changes to existing working functionality | ✅ |
  | Mobile compatible — no desktop-only UI elements | ✅ |
  | Free-tier only — Cloudflare Pages free, GAS free, Supabase free tier | ✅ |

  > ⚠️ **OPEN ARCHITECTURE DECISION — Must resolve before Phase 2**
  >
  > The current `backend/code.gs` contains a function `_syncPropertyStatusToSupabase()` called
  > in 10 places. It sends a PATCH request to Supabase to mark a property as 'rented' when
  > an application is approved, and 'active' when denied or withdrawn.
  >
  > This CONFLICTS with the "No Supabase WRITE from GAS" rule above.
  >
  > **Decision required from the owner before Phase 2 begins:**
  > - **Option A (follows the rule):** Remove `_syncPropertyStatusToSupabase()` entirely.
  >   Admin must manually update property status in both systems after approval.
  > - **Option B (functional exception):** Keep it as a documented exception.
  >   Property status updates automatically on approval/denial — no manual step needed.
  >
  > **Do not touch this function until the owner makes this decision.**

  ---

  ## 3. Issue Breakdown

  ### Phase 1 — Critical Fixes

  > 🎯 Goal: Fix active bugs causing incorrect behavior and data integrity problems.
  > 📁 Files: `backend/code.gs`, `js/script.js`

  - [ ] **1.1 — Fix application fee fallback bug**
    - **File:** `backend/code.gs`
    - **Problem:** `data['Application Fee'] || APPLICATION_FEE` treats fee=0 as falsy. Free-fee properties show "$50" in all outgoing emails.
    - **Fix:** Replace all 7 instances with a null-safe check: `(v !== '' && v !== null && v !== undefined) ? Number(v) : APPLICATION_FEE`
    - **Risk:** Low — targeted replacement only

  - [ ] **1.2 — Enforce pet policy on application form**
    - **File:** `js/script.js → _prefillFromURL()`
    - **Problem:** `pets=false` URL param is stored in a hidden input but never used to lock the form. Applicants on no-pets properties can freely select "Yes, I have pets."
    - **Fix:** If `pets !== 'true'`, set "Has Pets" radio to "No" and disable it. Hide the pet details section.
    - **Risk:** Low

  - [ ] **1.3 — Enforce smoking policy on application form**
    - **File:** `js/script.js → _prefillFromURL()`
    - **Problem:** `smoking=false` URL param is stored but never used to lock the form.
    - **Fix:** If `smoking !== 'true'`, pre-select "No" and disable the smoking field.
    - **Risk:** Low

  - [ ] **1.4 — Add GAS-side lease term validation**
    - **File:** `backend/code.gs → processApplication()`
    - **Problem:** Frontend rebuilds the dropdown from allowed options, but GAS never validates the submitted value against the allowed list.
    - **Fix:** If `formData['Lease Terms']` (hidden input) is non-empty, validate that `formData['Desired Lease Term']` is in the allowed list. Return error if not.
    - **Risk:** Low

  - [ ] **1.5 — Verify and fix Pet Types column name mismatch**
    - **Files:** `index.html` (hidden input) + `backend/code.gs` (column case)
    - **Problem:** Hidden input `name="Pet Types"` may not match GAS column case `'Pet Types Allowed'`.
    - **Fix:** Verify both sides match. Correct whichever is wrong.
    - **Risk:** Very low

  ---

  ### Phase 2 — Security

  > 🎯 Goal: Ensure GAS stores canonical (database-sourced) financial values, not user-supplied URL params.
  > 📁 Files: `backend/code.gs`
  > ⚠️ Requires: Architecture decision on Supabase WRITE (see Section 2)

  - [ ] **2.1 — Fetch canonical fee from Supabase at submission**
    - **File:** `backend/code.gs → processApplication()`
    - **Problem:** Application fee stored in sheet comes from a URL param the user controls. Tamper risk.
    - **Fix:** Extend the existing Supabase validation call to also fetch `application_fee` and `monthly_rent`. Use canonical values for storage.
    - **Note:** Requires `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` in GAS Script Properties.
    - **Risk:** Low — extends an existing call

  - [ ] **2.2 — Remove APPLICATION_FEE constant**
    - **File:** `backend/code.gs`
    - **Problem:** Hardcoded `APPLICATION_FEE = 50` is the root cause of the fee bug and encourages wrong behavior.
    - **Fix:** After 1.1 and 2.1 are done, remove the constant. Fee must come from Supabase (2.1) with 0 as safe default.
    - **Blocked by:** 1.1 must be done first, 2.1 must be done first

  ---

  ### Phase 3 — Cleanup & UX

  > 🎯 Goal: Remove outdated documentation, clean dead code, improve operational usability.

  - [ ] **3.1 — Archive session planning documents**
    - **Files:** `DYNAMIC_DATA_PLAN.md`, `FIX_PLAN.md`, `PHASE9_BUG_FIXES.md`, `ISSUES.md`, `AGENTS.md`, `CLAUDE.md`
    - **Action:** Move all to `/docs/archive/`. Update README to remove references.
    - **Risk:** Zero

  - [ ] **3.2 — Add GAS admin panel link from Listing Platform admin**
    - **File:** Admin area of Listing Platform (`choice121/Choice`)
    - **Action:** Add a clearly labeled button linking to the GAS admin panel.
    - **Risk:** Very low

  - [ ] **3.3 — Server-side move-in date validation in GAS**
    - **File:** `backend/code.gs → processApplication()`
    - **Action:** Validate `Requested Move-In` is on or after `Available Date` if both are present.
    - **Risk:** Low

  - [ ] **3.4 — Consolidate duplicate App ID generator**
    - **File:** `backend/code.gs`
    - **Action:** Confirm `generateAppId()` is only called from `generateUniqueAppId()`. Mark it internal. Remove if redundant.
    - **Risk:** Very low

  ---

  ## 4. Phase Execution Rules

  1. Work **ONE phase at a time.** Do not start Phase 2 while Phase 1 items are open.
  2. After completing ALL items in a phase:
     - Mark completed items with `[x]` in this file
     - Add brief notes on any decisions made
     - Commit with message: `"Phase X complete — [summary]"`
     - Push to GitHub
     - **STOP. Wait for owner review and explicit approval to continue.**
  3. Do not combine phases into a single commit.
  4. Do not fix issues from a later phase while working on an earlier one.
  5. Do not leave commented-out code. Remove it.
  6. Do not leave comments that describe old or removed behavior.
  7. Every change must be backward-compatible. No breaking changes.

  ---

  ## 5. Progress Tracking

  | Phase | Status | Approved By Owner | Notes |
  |-------|--------|-------------------|-------|
  | Phase 1 — Critical Fixes | ✅ Complete | April 9, 2026 | All 5 items fixed and pushed |
  | Phase 2 — Security | ⬜ Not Started | — | Blocked: Supabase WRITE architecture decision |
  | Phase 3 — Cleanup & UX | ⬜ Not Started | — | — |

  ### Phase 1 Checklist

  - [x] 1.1 — Fee fallback bug (`backend/code.gs`) — Fixed April 9, 2026
  - [x] 1.2 — Pet policy enforcement (`js/script.js`) — Fixed April 9, 2026
  - [x] 1.3 — Smoking policy enforcement (`js/script.js`) — Fixed April 9, 2026
  - [x] 1.4 — GAS lease term validation (`backend/code.gs`) — Fixed April 9, 2026
  - [x] 1.5 — Pet Types column name verified — names already match (April 9, 2026)

  ### Phase 2 Checklist

  - [ ] 2.1 — Canonical fee from Supabase (`backend/code.gs`)
  - [ ] 2.2 — Remove APPLICATION_FEE constant (`backend/code.gs`)

  ### Phase 3 Checklist

  - [ ] 3.1 — Archive session planning docs
  - [ ] 3.2 — GAS admin link from Listing Platform
  - [ ] 3.3 — Move-in date GAS validation
  - [ ] 3.4 — Consolidate App ID generator

  ---

  ## 6. Key File Reference

  | File | Repo | Purpose |
  |------|------|---------|
  | `backend/code.gs` | Apply | GAS backend — all server logic, emails, lease, admin |
  | `js/script.js` | Apply | Frontend form logic |
  | `index.html` | Apply | Form HTML, all hidden inputs |
  | `generate-config.js` | Apply | Cloudflare Pages build — sets `BACKEND_URL` |
  | `js/cp-api.js` | Choice | `buildApplyURL()` — constructs the Apply redirect URL |
  | `property.html` | Choice | Property detail page, Apply Now button |
  | `generate-config.js` | Choice | Sets `APPLY_FORM_URL`, `GAS_URL` env vars |
  