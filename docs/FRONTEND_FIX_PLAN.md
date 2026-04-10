# FRONTEND FIX PLAN — Choice Properties Application Form
# =========================================================
# Generated: April 9, 2026
# Triggered by: Systematic frontend audit (see AUDIT_REPORT.md for full findings)
# Scope: index.html + js/script.js ONLY. Backend (code.gs) is NOT touched.
# Status tracking: Each issue has a checkbox — [ ] PENDING or [x] DONE
#
# =========================================================
# HOW TO USE THIS DOCUMENT (FOR ANY AI READING THIS)
# =========================================================
#
# This document is the authoritative fix plan for the frontend audit findings.
# It supersedes any prior "phase complete" declarations in PROJECT_STATUS.md
# with respect to these specific frontend issues.
#
# MANDATORY READING ORDER before touching any code:
#   1. PROJECT_RULES.md         — architecture constraints (DO NOT violate)
#   2. PROJECT_STATUS.md        — current session status
#   3. docs/ARCHITECTURE.md     — system structure and file map
#   4. THIS FILE                — what to fix, how, and what's done
#
# WORKFLOW:
#   - Work one phase at a time, in order (Phase 1 first).
#   - Within a phase, fix all issues before moving on.
#   - After completing each issue: mark its checkbox [x] DONE in this file.
#   - After completing a full phase: update PROJECT_STATUS.md.
#   - STOP after each phase and wait for the user to type "continue".
#   - Do NOT implement Phase 2 until the user approves Phase 1 as complete.
#
# KEY CONSTRAINT REMINDER:
#   - All edits go to: index.html and/or js/script.js ONLY
#   - No npm, no Node.js, no new files (unless a new file is explicitly required
#     and justified in this plan)
#   - No backend changes (backend/code.gs is read-only for this plan)
#   - Cloudflare Pages compatible static HTML/CSS/JS only
#
# =========================================================
# SYSTEM CONTEXT (so any AI can understand without human explanation)
# =========================================================
#
# This is a 6-step multi-page rental application form. It is a single HTML page
# (index.html) with a large vanilla JavaScript class (RentalApplication in
# js/script.js, ~2754 lines). There is no framework, no build step.
#
# The form:
#   - Collects applicant data across 6 steps (sections 1–6)
#   - Supports English/Spanish language toggle
#   - Saves progress to localStorage automatically
#   - Accepts URL params from the main listing site to pre-fill property context
#   - Submits via fetch() to a Google Apps Script (GAS) backend URL
#   - Shows a success state after submission
#
# The RentalApplication class is instantiated once at DOMContentLoaded:
#   window.app = new RentalApplication();   (js/script.js line 2750)
#
# The constructor calls initialize() which runs all setup methods in sequence.
# The INITIALIZATION ORDER in initialize() is critical — several bugs stem
# from methods being called in the wrong order.
#
# The translation system works as follows:
#   - this.translations = { en: {...}, es: {...} } is built inside setupLanguageToggle()
#   - getTranslations() returns this.translations[this.state.language]
#   - The language toggle button click handler applies translations to [data-i18n] elements
#   - There is NO automatic application of translations on page load
#
# =========================================================

---

## PHASE 1 — CRITICAL CRASHES & BLOCKERS
**Priority:** Highest — these break the form for all users or a large subset
**Status:** [x] DONE

These must be fixed first. They cause JavaScript TypeErrors, block form progression,
or silently lose user state.

---

### ISSUE C1 — TypeError crash: `getTranslations()` called before translations exist
**Status:** [x] DONE
**Severity:** CRITICAL — crashes on every page load (affects all textareas)
**Files:** `js/script.js`

#### Root Cause
`setupCharacterCounters()` is called at line 146 in `initialize()`.
Inside it, `updateCounter()` is called immediately (not just registered as a listener).
`updateCounter()` calls `this.getTranslations()` at line 1309.
`getTranslations()` does: `return this.translations[this.state.language] || this.translations['en']`
BUT `this.translations` is only assigned inside `setupLanguageToggle()`, which is called at line 164
— 18 lines AFTER `setupCharacterCounters()`.
Result: `this.translations` is `undefined` → TypeError → init chain may break.

#### Exact Problem Location
```
js/script.js line 146:  this.setupCharacterCounters();   ← calls getTranslations() NOW
js/script.js line 164:  this.setupLanguageToggle();      ← sets this.translations HERE
js/script.js line 1309: const tC = this.getTranslations(); ← crashes inside setupCharacterCounters
js/script.js line 2602: getTranslations() { return this.translations[this.state.language] ... }
```

#### Fix Instructions
**Option A (Recommended — minimal change, safest):**
Add a null guard to `getTranslations()` so it never crashes even if called early:

```js
// CURRENT (line 2602):
getTranslations() {
    return this.translations[this.state.language] || this.translations['en'];
}

// REPLACE WITH:
getTranslations() {
    if (!this.translations) return {};
    return this.translations[this.state.language] || this.translations['en'];
}
```

**Option B (Alternative — fix initialization order):**
Move `this.setupLanguageToggle()` to before `this.setupCharacterCounters()` in `initialize()`.
WARNING: `setupLanguageToggle()` reads `this.state.applicationFee` to build fee-aware strings
in translations. This means `_readApplicationFee()` (line 163) must also move before it.
Correct order would be:
  1. `_readApplicationFee()`    ← reads fee from URL
  2. `setupLanguageToggle()`    ← builds translations using fee
  3. `setupCharacterCounters()` ← can now safely call getTranslations()

Option A is preferred because it is a single-line change with no ripple risk.

#### Verification
After fix: open the form in a browser, open DevTools console. There should be zero
TypeErrors on load. Textareas (e.g., pet details in Step 2, additional notes in Step 5)
should show a character counter like "0/500 characters".

---

### ISSUE C2 — Saved Spanish language preference is always lost on page reload
**Status:** [x] DONE
**Severity:** CRITICAL — breaks language persistence for all Spanish-speaking returning users
**Files:** `js/script.js`

#### Root Cause
`restoreSavedProgress()` (called ~line 152) correctly reads `_language` from localStorage
and sets `this.state.language = 'es'` if the user had switched to Spanish.
BUT then `setupLanguageToggle()` (line 164) ALWAYS runs this line:
```js
this.state.language = 'en';   // line 1978 — unconditional reset
```
This overwrites the restored language. The toggle button then shows "Español" (English mode)
even though the user's saved preference was Spanish. The form renders in English.

#### Exact Problem Location
```
js/script.js line 1365: if (data._language) this.state.language = data._language; ← sets 'es'
js/script.js line 1978: this.state.language = 'en';  ← OVERWRITES IT unconditionally
```

#### Fix Instructions
**Step 1:** In `setupLanguageToggle()`, change the unconditional language reset to a conditional:

```js
// CURRENT (line 1978):
this.state.language = 'en';

// REPLACE WITH:
if (!this.state.language) this.state.language = 'en';
```

**Step 2:** After the `setupLanguageToggle()` call in `initialize()` (after line 164),
add logic to apply Spanish translations to the DOM if the restored language is Spanish.
The cleanest way is to programmatically trigger the same DOM update logic the button uses.

Add this block immediately after `this.setupLanguageToggle();` in `initialize()`:

```js
// Apply restored language to DOM if not English
if (this.state.language === 'es' && this.translations) {
    const t = this.translations['es'];
    const HTML_KEYS = new Set(['spamWarning']);
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key] !== undefined) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                if (el.placeholder !== undefined) el.placeholder = t[key];
            } else if (el.tagName === 'OPTION') {
                el.textContent = t[key];
            } else if (HTML_KEYS.has(key)) {
                el.innerHTML = t[key];
            } else {
                el.textContent = t[key];
            }
        }
    });
    document.documentElement.setAttribute('lang', 'es');
    document.title = t.pageTitle;
    const langText = document.getElementById('langText');
    if (langText) langText.textContent = t.langText;
}
```

NOTE: This block MUST run after `setupLanguageToggle()` sets `this.translations`.
It MUST also run after `restoreSavedProgress()` sets `this.state.language`.
Since the current order is: restoreSavedProgress (line 152) → setupLanguageToggle (line 164),
adding this block at line 165 satisfies both conditions.

#### Verification
1. Load the form fresh.
2. Click the language toggle to switch to Spanish.
3. Fill in a visible field (so autosave fires) or wait 30 seconds.
4. Reload the page.
5. Expected: form renders in Spanish, toggle button shows "English".
6. Current (broken): form renders in English.

---

### ISSUE C3 — Co-applicant validation blocks on optional fields
**Status:** [x] DONE
**Severity:** CRITICAL — prevents any user with a co-applicant from advancing past Step 1
**Files:** `js/script.js`

#### Root Cause
In `validateStep(1)` (line 857), when the co-applicant section is visible, the code
at lines 888–924 iterates over ALL inputs in the co-applicant section and fails validation
if any text/select field is empty — even optional fields like `coEmployer`, `coJobTitle`,
`coMonthlyIncome`, and `coEmploymentDuration`.

The main step validation loop (line 874) correctly checks `input.hasAttribute('required')`
before validating. The co-applicant validation loop does NOT — it uses a raw
`if (!input.value.trim())` check for ALL non-radio, non-checkbox inputs.

`setupConditionalFields()` marks only 4 co-applicant fields as `required`:
`['coFirstName', 'coLastName', 'coEmail', 'coPhone']`
The other co-applicant fields (`coEmployer`, `coJobTitle`, `coMonthlyIncome`,
`coEmploymentDuration`) have no `required` attribute and should be optional.

#### Exact Problem Location
```
js/script.js lines 911–920 — the else branch validates all text inputs regardless of required:
    } else {
        if (!input.value.trim()) {
            this.showError(input, ...);
            isStepValid = false;           ← blocks on optional fields
```

#### Fix Instructions
In the co-applicant validation block (lines 888–924), change the `else` branch to
respect the `required` attribute, matching the pattern used in the main loop:

```js
// FIND this block (starting around line 908):
} else {
    if (!input.value.trim()) {
        this.showError(input, this.state.language === 'en' ? 'Required' : 'Campo obligatorio');
        input.classList.add('is-invalid');
        isStepValid = false;
        if (!firstInvalidField) firstInvalidField = input;
    } else {
        if (!this.validateField(input)) {
            isStepValid = false;
            if (!firstInvalidField) firstInvalidField = input;
        }
    }
}

// REPLACE WITH:
} else {
    if (input.hasAttribute('required') && !input.value.trim()) {
        this.showError(input, this.state.language === 'en' ? 'Required' : 'Campo obligatorio');
        input.classList.add('is-invalid');
        isStepValid = false;
        if (!firstInvalidField) firstInvalidField = input;
    } else if (input.value.trim()) {
        if (!this.validateField(input)) {
            isStepValid = false;
            if (!firstInvalidField) firstInvalidField = input;
        }
    }
}
```

#### Verification
1. Reach Step 1 of the form.
2. Check "I have a co-applicant or guarantor".
3. Fill in First Name, Last Name, Email, Phone for the co-applicant.
4. Leave Employer, Job Title, Monthly Income, Employment Duration blank.
5. Click "Next Step".
6. Expected: form advances to Step 2.
7. Current (broken): form stays on Step 1 with errors on optional fields.

---

## PHASE 2 — TRANSLATION SYSTEM FIXES
**Priority:** High — breaks the Spanish experience for all users
**Status:** [x] DONE
**Prerequisite:** Phase 1 must be complete and approved before starting Phase 2.

---

### ISSUE T1 — Page load does not apply translations for returning Spanish users
**Status:** [x] DONE
**Severity:** HIGH — Spanish language preference is visually lost on reload
**Files:** `js/script.js`
**Note:** This is partially resolved if C2 is fixed (C2's Step 2 adds DOM translation on load).
If C2 was fixed correctly, T1 may already be resolved. Verify before implementing separately.

#### Root Cause
See C2 description. The fix for C2 (Step 2) covers this issue.
If C2 fix is complete, mark T1 as DONE without additional changes.

#### Verification (same as C2 verification above)
After the C2 fix, if the form renders in Spanish on reload, T1 is resolved.

---

### ISSUE T2 — `_readApplicationFee()` uses hardcoded English strings
**Status:** [x] DONE
**Severity:** HIGH — fee display ignores language preference; never translates to Spanish
**Files:** `js/script.js`

#### Root Cause
`_readApplicationFee()` (lines 192–211) directly sets `textContent` to hardcoded English:
```js
if (feeTitle)  feeTitle.textContent  = 'Application Fee: Free';  // hardcoded
if (feeAmount) feeAmount.textContent = 'Free';                    // hardcoded
```
These overwrite the `data-i18n` based content but do NOT use the translation system.
When the language toggle runs, it updates `[data-i18n]` elements, but since these
were set via `.textContent` directly (overwriting the original `data-i18n` content),
the toggle will re-apply the translation key — WHICH IS CORRECT. So the toggle itself
handles it. The only problem is on initial load when:
  - Language is Spanish (restored from localStorage)
  - `_readApplicationFee()` runs and writes English

The C2 fix (which applies translations on load) runs AFTER `_readApplicationFee()` so
the Spanish translation would overwrite the hardcoded English. Verify C2 fix covers this.

If C2 fix is in place and the fee title shows correctly in Spanish on load, T2 is resolved.
If not, update `_readApplicationFee()` to use `this.getTranslations()` for the strings.

#### Exact Element Targets (for verification)
- `[data-i18n="feeTitle"]` — fee title in Step 6
- `.fee-amount` — fee dollar amount display

#### Verification
1. Switch to Spanish, wait for autosave.
2. Reload page.
3. Check the Step 6 (Review & Submit) fee title.
4. Expected: "Tarifa de Solicitud: Gratis" or "Tarifa de Solicitud: $50.00" in Spanish.
5. If it shows English, implement the additional fix below.

#### Additional Fix (only if C2 fix doesn't cover this)
In `_readApplicationFee()`, after setting `textContent`, also update `data-i18n` to
ensure the toggle can re-apply it later:
```js
// After setting feeTitle.textContent, also set a data attribute so toggle re-reads it
if (feeTitle) feeTitle.setAttribute('data-fee-set', 'true');
```
Then in the language toggle handler, add special handling for fee elements that re-reads
the fee from `this.state.applicationFee` and rebuilds the string using the current language.

---

### ISSUE T3 — Language toggle rebuilds Next/Prev button HTML, structural fragility
**Status:** [x] DONE
**Severity:** MEDIUM — can produce inconsistent button DOM on repeated toggles
**Files:** `js/script.js`

#### Root Cause
Lines 2006–2023: when language toggles, `.btn-next` and `.btn-prev` are rebuilt:
```js
b.innerHTML = '';
const textSpan = document.createElement('span');
...
b.appendChild(textSpan);
if (icon) b.appendChild(icon);
```
This wipes then rebuilds the button. If the button has any other child elements
(e.g., `.btn-hint` spans, other icons), they are lost. The `b.querySelector('i')` picks
only the FIRST icon, which may not be the arrow icon on `.btn-prev` (where the icon
comes first in HTML, but in the rebuild the text goes first for `.btn-prev`).

Also: after the rebuild, `textSpan` has `data-i18n` set, so the NEXT toggle call
will update `textSpan.textContent` via the `querySelectorAll('[data-i18n]')` loop
AND rebuild the button again — resulting in double updates.

#### Fix Instructions
Instead of rebuilding button innerHTML, just find the text span and update its text:

```js
// REPLACE the .btn-next rebuild block (lines 2006–2023) WITH:
document.querySelectorAll('.btn-next').forEach(b => {
    const textSpan = b.querySelector('[data-i18n="nextStep"]') || b.querySelector('span');
    if (textSpan) textSpan.textContent = t.nextStep;
});
document.querySelectorAll('.btn-prev').forEach(b => {
    const textSpan = b.querySelector('[data-i18n="prevStep"]') || b.querySelector('span');
    if (textSpan) textSpan.textContent = t.prevStep;
});
```

This is safe because the HTML buttons already contain `<span data-i18n="nextStep">` and
`<span data-i18n="prevStep">` elements. The `querySelectorAll('[data-i18n]')` loop above
this block would already handle them. So the safest fix is to simply REMOVE the btn-next
and btn-prev rebuild blocks entirely (lines 2006–2023), since the `[data-i18n]` loop
already covers `nextStep` and `prevStep` key translations.

#### Verification
1. Click the language toggle 5 times back and forth.
2. Verify "Next Step"/"Siguiente Paso" and "Previous"/"Anterior" text updates correctly.
3. Verify buttons still work (click Next to advance a step).
4. Verify the `.btn-hint` field-count hints below buttons are not lost.

---

### ISSUE T4 — Property context banner has hardcoded English strings
**Status:** [x] DONE
**Severity:** MEDIUM — "Applying for" and "View listing" never translate
**Files:** `js/script.js`

#### Root Cause
In `_showPropertyBanner()` (lines 372–450), the banner HTML is built with hardcoded strings:
- `'<div class="pcb-label">Applying for</div>'` (line 428) — not translated
- `'<i class="fas fa-arrow-left"></i> View listing'` (line 414) — not translated

The `"Managed by"` text uses `data-i18n="managedBy"` so it IS translated by the toggle.

#### Fix Instructions
Add two new translation keys to both `en` and `es` objects in `setupLanguageToggle()`:

In the `en` translations object, add:
```js
applyingFor: 'Applying for',
viewListing: 'View listing',
```

In the `es` translations object, add:
```js
applyingFor: 'Solicitando para',
viewListing: 'Ver anuncio',
```

Then in `_showPropertyBanner()`, replace the hardcoded strings:

```js
// FIND (line 428):
'<div class="pcb-label">Applying for</div>' +

// REPLACE WITH:
'<div class="pcb-label" data-i18n="applyingFor">Applying for</div>' +
```

```js
// FIND (line 413–415 in the backLinkHtml):
'<i class="fas fa-arrow-left"></i> View listing' +

// REPLACE WITH:
'<i class="fas fa-arrow-left"></i> <span data-i18n="viewListing">View listing</span>' +
```

#### Verification
1. Access form with URL params (e.g., `?id=1&pn=Test+Property&addr=123+Main&city=Napa&state=CA&rent=1500`).
2. Verify property banner appears with "Applying for" text.
3. Click language toggle to Spanish.
4. Expected: "Applying for" → "Solicitando para", "View listing" → "Ver anuncio".

---

### ISSUE T5 — `updateBilingualLabels()` is an empty stub
**Status:** [x] DONE
**Severity:** LOW — dead code, no functional impact but causes confusion
**Files:** `js/script.js`

#### Root Cause
Line 2715: `updateBilingualLabels(t) {}` — empty method. Was likely meant to update
dynamically-set labels (e.g., employment field labels set by `toggleEmployerSection`).
The `toggleEmployerSection` function already handles re-labeling when called from the
language toggle handler (lines 2031–2036). So this stub is purely dead code.

#### Fix Instructions
Remove the empty method entirely:
```js
// DELETE this line (line 2715):
updateBilingualLabels(t) {}
```

Check that `updateBilingualLabels` is not called anywhere else in the file before deleting.
If it IS called somewhere, add a `// TODO` comment explaining it's a no-op.

#### Verification
Search `js/script.js` for `updateBilingualLabels`. If found only at line 2715 (definition)
and nowhere else (no call sites), delete safely.

---

## PHASE 3 — VALIDATION FIXES
**Priority:** Medium-High — affects data quality and user experience
**Status:** [x] DONE
**Prerequisite:** Phase 1 complete and approved.

---

### ISSUE V1 — `ref1Relationship` is required in HTML but has no visual required indicator
**Status:** [x] DONE
**Severity:** MEDIUM — confusing UX; users don't know it's required until they hit the error
**Files:** `index.html`

#### Root Cause
The `ref1Relationship` input has `required` attribute (index.html line 799) but its
`<label>` has no `class="required"` (which adds the red asterisk via CSS).
All other required fields have `<label class="required">`. This one was missed.

#### Fix Instructions
In `index.html`, find the ref1Relationship label (around line 798):
```html
<!-- FIND: -->
<label for="ref1Relationship" data-i18n="ref1RelationshipLabel">Relationship to Reference 1</label>

<!-- REPLACE WITH: -->
<label class="required" for="ref1Relationship" data-i18n="ref1RelationshipLabel">Relationship to Reference 1</label>
```

#### Verification
Step 4 of the form: "Relationship to Reference 1" label should show a red asterisk.

---

### ISSUE V4+V5 — Timezone bug in date validation (move-in date and date of birth)
**Status:** [x] DONE
**Severity:** MEDIUM — causes false "date in the past" or "must be 18+" errors for some users
**Files:** `js/script.js`

#### Root Cause
`new Date("2025-05-01")` (string-based Date constructor with a YYYY-MM-DD string) parses
the date as UTC midnight. When the user is in a timezone west of UTC (e.g., US Pacific = UTC-7),
UTC midnight is 5pm the previous day locally. So "today" parsed this way is "yesterday" locally.

This affects:
- Move-in date validation (lines 681–691): a date entered as "today" fails the `< today` check
- DOB validation (lines 663–679): age can be calculated as 1 year younger on birthday

#### Fix Instructions
Create a helper method that safely parses YYYY-MM-DD date strings as local dates:

Add this method to the RentalApplication class (place it near other utility methods,
e.g., after `debounce()` at line 1406):

```js
// Parse a YYYY-MM-DD date string as a LOCAL date (not UTC)
_parseLocalDate(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    return isNaN(d.getTime()) ? null : d;
}
```

Then update `validateField()`:

For move-in date (replace lines 681–691):
```js
} else if (field.id === 'requestedMoveIn') {
    const moveInDate = this._parseLocalDate(field.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!field.value) {
        isValid = false;
        errorMessage = this.state.language === 'en' ? 'Please select a move-in date.' : 'Por favor seleccione una fecha de mudanza.';
    } else if (!moveInDate || moveInDate < today) {
        isValid = false;
        errorMessage = this.state.language === 'en' ? 'Move-in date cannot be in the past.' : 'La fecha de mudanza no puede ser en el pasado.';
    }
```

For DOB (replace the `new Date(field.value)` call around line 664):
```js
} else if (field.id === 'dob' || field.id === 'coDob') {
    const birthDate = this._parseLocalDate(field.value);
    const today = new Date();
    if (!field.value) {
        isValid = false;
        errorMessage = this.state.language === 'en' ? 'Please enter your date of birth.' : 'Por favor ingrese su fecha de nacimiento.';
    } else if (!birthDate) {
        isValid = false;
        errorMessage = this.state.language === 'en' ? 'Please enter a valid date of birth (18+ required).' : 'Por favor ingrese una fecha válida (18+ requerido).';
    } else {
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
        if (age < 18) {
            isValid = false;
            errorMessage = this.state.language === 'en' ? 'Applicants must be at least 18 years old.' : 'Los solicitantes deben tener al menos 18 años.';
        }
    }
```

#### Verification
1. Enter today's date as the move-in date. It should NOT show "date in the past".
2. Enter a DOB exactly 18 years ago today. It should pass the 18+ check.
3. Test in a browser with timezone set to US/Pacific (or use `new Date('2025-01-01')` in
   DevTools console — it should show Jan 1, not Dec 31 the day before).

---

### ISSUE V6 — Co-applicant consent checkbox is never validated (references non-existent ID)
**Status:** [x] DONE
**Severity:** MEDIUM — users can skip authorization of co-applicant verification
**Files:** `js/script.js`, `index.html`

#### Root Cause
In `validateStep(1)` (line 903), the co-applicant validation checks for `input.id === 'coConsent'`:
```js
if (input.id === 'coConsent' && !input.checked) {
    this.showError(input, 'You must authorize verification');
```
But searching `index.html` reveals no element with `id="coConsent"`. The checkbox for
co-applicant consent has `name="Co-Applicant Consent"` but no `id` attribute.
Result: this validation branch NEVER runs. Co-applicant consent is never validated.

#### Fix Instructions — Two-part fix

**Part 1: Add the missing ID in `index.html`**

Find the co-applicant consent checkbox in `index.html` (it will be in the coApplicantSection,
has `name="Co-Applicant Consent"`). Add `id="coConsent"` to it:

```html
<!-- FIND (in coApplicantSection, exact line may vary): -->
<input type="checkbox" name="Co-Applicant Consent" ...>

<!-- REPLACE WITH: -->
<input type="checkbox" id="coConsent" name="Co-Applicant Consent" ...>
```

**Part 2: Ensure the consent label is visible**
The checkbox needs a `<label for="coConsent">` tied to it. Verify the label exists.
The translation key `coConsentLabel` is defined in translations, so the label should
have `data-i18n="coConsentLabel"`.

#### Verification
1. Check the co-applicant checkbox to show the co-applicant section.
2. Fill in all required co-applicant fields (first name, last name, email, phone).
3. Leave the consent checkbox UNCHECKED.
4. Click "Next Step".
5. Expected: error "You must authorize verification" (or Spanish equivalent) appears.
6. Check the consent checkbox, click Next. Expected: form advances.

---

## PHASE 4 — LOGIC & FLOW FIXES
**Priority:** Medium — affects data quality and form usability
**Status:** [x] DONE
**Prerequisite:** Phase 1 complete and approved.

---

### ISSUE L1 — Step 6 summary shows only last selected contact method (multi-checkbox bug)
**Status:** [x] DONE
**Severity:** MEDIUM — review summary is inaccurate for users with multiple contact methods
**Files:** `js/script.js`

#### Root Cause
`generateApplicationSummary()` (line 2614) has its own local FormData collection loop:
```js
formData.forEach((value, key) => {
    if (value && key !== 'Application ID') {
        data[key] = value;   // ← overwrites duplicate keys
    }
});
```
When "Preferred Contact Method" has both "Text Message" AND "Email" checked, FormData
yields two entries with the same key. The loop overwrites the first with the second.
Only the last-checked value appears in the Step 6 summary.

The submission itself is NOT affected (it uses `new FormData(form)` directly which
handles duplicates). Only the visual summary in Step 6 is wrong.

The `getAllFormData()` method (line 1390) correctly accumulates duplicates into arrays.
`generateApplicationSummary()` should use it instead of its own loop.

#### Fix Instructions
In `generateApplicationSummary()`, replace the local FormData collection with a call
to `this.getAllFormData()`:

```js
// FIND (lines 2618–2626):
const form = document.getElementById('rentalApplication');
const formData = new FormData(form);
const data = {};
formData.forEach((value, key) => {
    if (value && key !== 'Application ID') {
        data[key] = value;
    }
});

// REPLACE WITH:
const data = this.getAllFormData();
// getAllFormData() returns arrays for multi-checkbox fields.
// When displaying values, join arrays for readability:
Object.keys(data).forEach(key => {
    if (Array.isArray(data[key])) {
        data[key] = data[key].join(', ');
    }
});
```

#### Verification
1. In Step 5, select both "Text Message" AND "Email" as contact methods.
2. Navigate to Step 6 (Review & Submit).
3. Find the "Contact Preferences" section in the summary.
4. Expected: shows "Text Message, Email" (both methods).
5. Current (broken): shows only "Email" (the last one).

---

### ISSUE L2 — Editing from Step 6 summary bypasses validation on return
**Status:** [x] DONE
**Severity:** LOW-MEDIUM — a user can break a valid step and still submit
**Files:** `js/script.js`

#### Root Cause
In Step 6, each summary group has an `onclick="window.app.goToSection(N)"` that
calls `goToSection()`. This method directly navigates without validating the current step:
```js
goToSection(sectionNumber) {
    this.hideSection(this.getCurrentSection());
    this.showSection(sectionNumber);
    this.updateProgressBar();
}
```
If a user is on Step 6 and clicks "Edit Section" for Step 2, they go to Step 2,
make a field invalid, and then click "Next" through to Step 6 — but `handleFormSubmit()`
runs `validateStep()` for steps 1–5 before submitting (line 2277), so this actually
IS caught at submission. The risk is lower than initially assessed.

However, if they edit Step 3 and click "Next" from Step 3, validation runs for Step 3,
but they can skip Step 4 and Step 5 entirely via `goToSection(6)` called from the
browser's back button behavior. The submission validator covers this.

#### Decision
This is acceptable as-is given the submission validator catches invalid steps.
Document as KNOWN ACCEPTABLE BEHAVIOR.

Mark as WONTFIX for now. Add a comment in the code at `goToSection()`:
```js
goToSection(sectionNumber) {
    // NOTE: This method bypasses step validation intentionally.
    // Used only from the Step 6 "Edit Section" summary links.
    // Submission validation in handleFormSubmit() re-validates all steps 1-5
    // before allowing final submit, so data integrity is still enforced.
    this.hideSection(this.getCurrentSection());
    this.showSection(sectionNumber);
    this.updateProgressBar();
}
```

---

### ISSUE L4 — Current step position not saved/restored (always resets to Step 1 on reload)
**Status:** [x] DONE
**Severity:** LOW-MEDIUM — interrupting long sessions forces restart from Step 1
**Files:** `js/script.js`

#### Root Cause
`saveProgress()` (line 1370) saves all field values to localStorage but does NOT save
the current step number. When the page reloads, `restoreSavedProgress()` refills all
field values, but the active section is always reset to Step 1 (by the DOMContentLoaded
handler adding `active` class to `section1`).

#### Fix Instructions

**Step 1: Save current step in `saveProgress()`**
```js
// In saveProgress() (around line 1374), add:
data._currentStep = this.getCurrentSection();
```

**Step 2: Restore step in `restoreSavedProgress()`**
After the existing field restoration loop (after line 1366), add:
```js
// After field restoration:
if (data._currentStep && data._currentStep > 1) {
    const stepNum = parseInt(data._currentStep, 10);
    if (stepNum >= 1 && stepNum <= 6) {
        // Defer to after DOMContentLoaded handler adds section1.active
        setTimeout(() => {
            document.querySelectorAll('.form-section').forEach(s => s.classList.remove('active'));
            const targetSection = document.getElementById('section' + stepNum);
            if (targetSection) {
                targetSection.classList.add('active');
                this.updateProgressBar();
            }
        }, 10);
    }
}
```

NOTE: The `setTimeout` with 10ms defers until after the DOMContentLoaded handler
adds `active` to section1, then immediately corrects it. This avoids a flash.

Also add `'_currentStep'` to the `SKIP` set in `restoreSavedProgress()` so it's
not treated as a form field name:
```js
const SKIP = new Set(['SSN', 'Co-Applicant SSN', 'Application ID', '_last_updated',
                      '_language', 'DOB', 'Co-Applicant DOB', '_currentStep']);
```

#### Verification
1. Navigate to Step 4 of the form. Fill in some fields.
2. Wait for autosave (30 seconds) or fill a field to trigger the debounced save.
3. Reload the page.
4. Expected: form reopens at Step 4 with fields pre-filled.
5. Current: form always opens at Step 1.

---

## PHASE 5 — CODE QUALITY & CONSISTENCY
**Priority:** Low — no user-facing functional impact, but important for maintainability
**Status:** [x] DONE
**Prerequisite:** Phases 1-3 complete and approved.

---

### ISSUE Q4 — Co-applicant SSN field has no show/hide eye toggle
**Status:** [x] DONE
**Severity:** LOW — inconsistent UX between primary and co-applicant SSN fields
**Files:** `js/script.js`

#### Root Cause
`setupSSNToggle()` (lines 87–110) only adds the eye icon toggle to `#ssn`.
The co-applicant SSN field `#coSsn` is `type="password"` but has no toggle button.
Users cannot verify what they typed for the co-applicant's SSN.

#### Fix Instructions
Extend `setupSSNToggle()` to handle both fields. The simplest approach:

```js
setupSSNToggle() {
    ['ssn', 'coSsn'].forEach(fieldId => {
        const ssnInput = document.getElementById(fieldId);
        if (!ssnInput) return;
        const container = ssnInput.parentElement;
        let toggle = container.querySelector('.ssn-toggle');
        if (!toggle) {
            toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.className = 'ssn-toggle';
            if (fieldId === 'ssn') toggle.id = 'ssnToggle';
            toggle.innerHTML = '<i class="fas fa-eye"></i>';
            container.appendChild(toggle);
        }
        ssnInput.type = 'password';
        toggle.addEventListener('click', () => {
            if (ssnInput.type === 'password') {
                ssnInput.type = 'text';
                toggle.innerHTML = '<i class="fas fa-eye-slash"></i>';
            } else {
                ssnInput.type = 'password';
                toggle.innerHTML = '<i class="fas fa-eye"></i>';
            }
        });
    });
}
```

#### Verification
Open the co-applicant section. The SSN (Last 4) field should show an eye icon button.
Clicking it toggles between masked and visible input.

---

### ISSUE Q5 — CSRF comment is incorrect (says "removed" but it's still sent)
**Status:** [x] DONE
**Severity:** LOW — misleading for future developers/AI
**Files:** `js/script.js`

#### Root Cause
Lines 80–82 say:
```
// [10B-2] CSRF token removed: client-generated tokens provide no real protection.
// Bot protection is handled server-side via honeypot validation in doPost().
```
But lines 138–139 generate and store a CSRF nonce, and line 2340 appends it to FormData.
The comment is from an older session and was not updated when the token was re-added.

#### Fix Instructions
Update the comment to be accurate:
```js
// [10B-2] CSRF nonce: a random token generated each session and sent with submission.
// The backend validates it is present and well-formed (32-128 alphanumeric chars).
// This provides basic bot friction. Deeper bot protection is server-side via
// honeypot validation in doPost().
```

---

## COMPLETION CHECKLIST

### Phase 1 — Critical (Must do first)
- [x] C1: Fix `getTranslations()` null guard / initialization order
- [x] C2: Fix saved language preference being overwritten on reload
- [x] C3: Fix co-applicant validation blocking on optional fields

### Phase 2 — Translation System
- [x] T1: Verify C2 fix covers load-time translation (no separate fix likely needed)
- [x] T2: Verify C2 fix covers fee title translation (may need additional fix)
- [x] T3: Fix language toggle button rebuild (remove redundant HTML rebuild)
- [x] T4: Add translation keys for "Applying for" and "View listing" in banner
- [x] T5: Remove `updateBilingualLabels()` dead stub

### Phase 3 — Validation
- [x] V1: Add `class="required"` to ref1Relationship label in index.html
- [x] V4+V5: Add `_parseLocalDate()` helper and update date validation
- [x] V6: Add `id="coConsent"` to co-applicant consent checkbox in index.html

### Phase 4 — Logic & Flow
- [x] L1: Fix `generateApplicationSummary()` to use `getAllFormData()`
- [x] L2: WONTFIX — add explanatory comment to `goToSection()`
- [x] L4: Save and restore current step in localStorage

### Phase 5 — Code Quality
- [x] Q4: Add SSN eye toggle to co-applicant field
- [x] Q5: Fix outdated CSRF comment

---

## POST-COMPLETION TASKS

After all phases are done:
1. Update `PROJECT_STATUS.md` to reflect these fixes as complete
2. Update `docs/ARCHITECTURE.md` if any new methods were added (`_parseLocalDate`)
3. Update `replit.md` with a summary of changes made
4. The Cloudflare Pages deployment is automatic on git push to main
   (No build step needed — pure static files)

---

## CHANGE LOG
| Date | Phase | Action | Author |
|------|-------|--------|--------|
| 2026-04-09 | — | Plan created from audit findings | AI Agent |
