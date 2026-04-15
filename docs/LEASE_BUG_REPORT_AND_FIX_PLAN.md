# Lease System — Bug Report & Fix Plan

**Scanned:** `backend/code.gs` (8,169 lines)
**Scope:** All lease-related functions — `generateAndSendLease`, `calculateLeaseEndDate`, `signLease`, `getLeaseSummary`, `renderLeaseSigningPage`, `renderLeaseConfirmPage`, `checkUnsignedLeases`, `setupLeaseReminderTrigger`, admin lease UI (`showLeaseModal`, `submitLease`), and all lease email dispatchers.

---

## Bug Summary

| # | Severity | Area | Title |
|---|----------|------|-------|
| B-01 | 🔴 Critical | `calculateLeaseEndDate` | Substring matching causes wrong lease duration for non-standard terms |
| B-02 | 🔴 Critical | `checkUnsignedLeases` | 24-hour reminder window is too narrow — reminder is routinely skipped |
| B-03 | 🔴 Critical | `checkUnsignedLeases` + `addMissingLeaseColumns` | `Lease Link` column never written to sheet — reminder emails have blank signing link |
| B-04 | 🟠 High | `generateAndSendLease` | Pet deposit excluded from stored `Move-in Costs` — dashboard and emails show wrong total |
| B-05 | 🟠 High | `generateAndSendLease` | Lease marked `sent` in sheet before email is sent — silent failure leaves tenant uninformed |
| B-06 | 🟠 High | `generateAndSendLease` | No guard against re-sending a lease that is already in `sent` status |
| B-07 | 🟡 Medium | `renderLeaseConfirmPage` | `Monthly Rent` and `Lease Start Date` displayed raw/unformatted |
| B-08 | 🟡 Medium | `submitLease` (admin UI) | Deposit field accepts non-numeric/zero input with no validation error |
| B-09 | 🟡 Medium | `sendLeaseEmail` + `sendLeaseSignedAdminAlert` | `replyTo` missing — tenant/admin replies go to wrong address |
| B-10 | 🟡 Medium | `renderLeaseSigningPage` | Ordinal suffix logic wrong for 21st, 22nd, 23rd (shows "21th", "22th", "23th") |
| B-11 | 🟡 Medium | `renderLeaseSigningPage` | `APP_EMAIL` exposed in client-side HTML source — PII leak in page source |
| B-12 | 🟢 Low | `checkUnsignedLeases` | Uses `Property Address` for reminder, ignores `Verified Property Address` |
| B-13 | 🟢 Low | `renderLeaseSigningPage` | Sign button sub-text says "6 checkboxes" but there are actually 6 total (1 pre-read + 5 confirm) — count is accurate but confusing |

---

## Detailed Bug Analysis

---

### B-01 — `calculateLeaseEndDate`: Wrong Duration for Non-Standard Terms
**Severity:** 🔴 Critical
**Location:** Lines 1981–1994

**Code:**
```js
if      (term.includes('6'))  end.setMonth(end.getMonth() + 6);
else if (term.includes('12')) end.setMonth(end.getMonth() + 12);
else if (term.includes('18')) end.setMonth(end.getMonth() + 18);
else if (term.includes('24')) end.setMonth(end.getMonth() + 24);
else                          end.setMonth(end.getMonth() + 12); // default
```

**Problem:** Uses raw substring matching on the entire term string. This causes:
- `"36 months"` → matches `includes('6')` → returns 6-month lease (should be 36)
- `"60 months"` → matches `includes('6')` → returns 6-month lease (should be 60)
- `"1 year"`, `"2 years"`, `"3 years"` → all fall into 12-month default
- Any term with "6" anywhere in it (e.g., "16 months") → incorrectly treated as 6-month

**Fix:** Extract a numeric value from the string before comparing, then use the extracted number. Also support "year" variants.

---

### B-02 — `checkUnsignedLeases`: 24h Reminder Window Too Narrow
**Severity:** 🔴 Critical
**Location:** Lines 8132–8138

**Code:**
```js
if (hoursElapsed >= 24 && hoursElapsed < 36 && !adminNotes.includes('[REMINDER_SENT]')) {
```

**Problem:** The daily trigger runs at 9 AM. The 24h reminder is only sent if `hoursElapsed` falls between 24 and 36. If the lease is sent after 9 AM (e.g., at 2 PM), then:
- Next day at 9 AM: 19 hours elapsed → too early, skipped
- Day after at 9 AM: 43 hours elapsed → past 36h window, skipped

The reminder is **never sent** for leases sent after 9 AM. Given a 9 AM trigger, only leases sent between midnight and 9 AM are guaranteed a reminder. Most leases are sent during business hours.

**Fix:** Widen the window. Instead of `< 36`, use `< 48`. This ensures the daily 9 AM trigger catches leases sent any time the previous day.

---

### B-03 — `Lease Link` Never Written to Sheet — Reminder Has Blank Link
**Severity:** 🔴 Critical
**Location:** Lines 8126–8134 (`checkUnsignedLeases`), Lines 409–448 (`addMissingLeaseColumns`), Lines 1911–1969 (`generateAndSendLease`)

**Problem:**
1. `checkUnsignedLeases` reads `col['Lease Link']` from the sheet row to populate the reminder email.
2. `generateAndSendLease` constructs `leaseLink` (line 1951) and emails it, but **never writes it to the sheet**.
3. `addMissingLeaseColumns` does not include a `'Lease Link'` column.

Result: `col['Lease Link']` is always `undefined`, so `row[undefined - 1]` = `row[NaN]` = `undefined`. The `leaseLink` variable passed to `sendLeaseSigningReminder` is always empty. Reminder emails contain a blank, broken signing link — the tenant cannot sign from the reminder.

**Fix:**
1. Add `'Lease Link'` to `addMissingLeaseColumns`.
2. In `generateAndSendLease`, write `leaseLink` to `col['Lease Link']` after constructing it.

---

### B-04 — Pet Deposit Excluded from Stored `Move-in Costs`
**Severity:** 🟠 High
**Location:** Lines 1904–1918 (`generateAndSendLease`), Lines 2259 (`renderLeaseSigningPage`)

**Problem:**
```js
// generateAndSendLease:
const moveInCosts = rent + deposit;   // pet deposit NOT included
sheet.getRange(..., col['Move-in Costs']).setValue(moveInCosts);

// renderLeaseSigningPage (later):
const moveInCostWithPet = moveInCost + petDeposit;  // pet deposit added on-the-fly
```

The value stored in the sheet does not include the pet deposit. Any place that reads `Move-in Costs` directly from the sheet (dashboard, emails, `renderLeaseConfirmPage`) will show the wrong (lower) total. Only `renderLeaseSigningPage` compensates for this — everything else is wrong.

Additionally, the lease notification email (`sendLeaseEmail`) receives `moveInCosts` without pet deposit, so the email shows the wrong total.

**Fix:** Include `petDeposit` in `moveInCosts` at the time of calculation in `generateAndSendLease`, and store the correct total.

---

### B-05 — Lease Marked `sent` Before Email — Silent Failure
**Severity:** 🟠 High
**Location:** Lines 1912–1969 (`generateAndSendLease`)

**Problem:** The sheet is updated (status → `'sent'`, dates, amounts, etc.) before `sendLeaseEmail` is called. `sendLeaseEmail` wraps `MailApp.sendEmail` in a try/catch and returns `false` on failure — but the caller (`generateAndSendLease`) does not check the return value and returns `{ success: true }` regardless.

If the email fails (quota exceeded, invalid address, GAS MailApp error), the lease is permanently marked `sent` in the sheet but the tenant never receives the email. There is no error returned to the admin.

**Fix:** Check the return value of `sendLeaseEmail`. If it returns `false`, include a warning in the response (`{ success: true, warning: 'Lease saved but email failed to send...' }`). Optionally, log the email failure more prominently.

---

### B-06 — Re-Sending Lease in `sent` Status Is Not Blocked
**Severity:** 🟠 High
**Location:** Lines 1878–1879 (`generateAndSendLease`)

**Code:**
```js
if (currentLeaseStatus === 'signed') throw new Error('Lease already signed by tenant.');
// No guard for currentLeaseStatus === 'sent'
```

**Problem:** An admin who clicks "Send Lease" a second time (by mistake, or after an apparent email failure) will overwrite all lease financial terms (rent, deposit, dates, notes) and send a second copy of the lease email to the tenant. This could cause confusion and legal inconsistency if the terms change between sends.

**Fix:** Add a guard for `currentLeaseStatus === 'sent'` and require an explicit override (or at minimum return an error with a warning message rather than silently re-sending).

---

### B-07 — `renderLeaseConfirmPage`: Unformatted Rent and Start Date
**Severity:** 🟡 Medium
**Location:** Lines 3153–3154, 3203 (`renderLeaseConfirmPage`)

**Code:**
```js
const rent      = app['Monthly Rent']      || '';   // raw number e.g. 1500
const startDate = app['Lease Start Date']  || '';   // raw Date object or string

// In HTML:
<span class="detail-value">$${rent}</span>        // shows "$1500" not "$1,500"
<span class="detail-value">${startDate}</span>    // shows raw Date string like "Sat Jan 01 2027..."
```

**Problem:** Unlike `renderLeaseSigningPage` which uses `parseFloat().toLocaleString()` and `Utilities.formatDate()`, the confirmation page displays raw values. Rent shows without comma formatting; the start date may render as an unformatted JavaScript Date string.

**Fix:** Apply `parseFloat(rent).toLocaleString()` for rent and `Utilities.formatDate(new Date(startDate), ...)` for the start date, matching the pattern in `renderLeaseSigningPage`.

---

### B-08 — `submitLease` (Admin UI): Deposit Not Validated Numerically
**Severity:** 🟡 Medium
**Location:** Lines 7536–7538

**Code:**
```js
if (!rent || !deposit || !startDate) {
  alertArea.innerHTML = '<div class="alert alert-danger">Please fill in all required fields.</div>';
  return;
}
```

**Problem:** The validation only checks truthiness. If an admin types "abc" for deposit, `!deposit` is false (non-empty string), so it passes. The backend then does `parseFloat("abc") || 0` = 0, silently creating a $0 security deposit on the lease with no error.

**Fix:** Add numeric validation in `submitLease`: `isNaN(parseFloat(deposit)) || parseFloat(deposit) < 0` should trigger an error. Also validate `rent > 0` explicitly.

---

### B-09 — `sendLeaseEmail` and `sendLeaseSignedAdminAlert`: Missing `replyTo`
**Severity:** 🟡 Medium
**Location:** Lines 4611–4621, 4639–4654

**Problem:** Most email functions in the system correctly set `replyTo: 'choicepropertygroup@hotmail.com'`. However:
- `sendLeaseEmail` (the initial "Your Lease is Ready" email) does not set `replyTo`.
- `sendLeaseSignedAdminAlert` does not set `replyTo`.

If a tenant replies to the lease email, or an admin replies to the signed notification, replies will route to Google's default sender address rather than the company inbox.

**Fix:** Add `replyTo: 'choicepropertygroup@hotmail.com'` to both `MailApp.sendEmail` calls.

---

### B-10 — Ordinal Suffix Wrong for 21st, 22nd, 23rd
**Severity:** 🟡 Medium
**Location:** Lines 2211, 2215 (`renderLeaseSigningPage`)

**Code:**
```js
const rentDueSuffix = rentDueDay === 1 ? 'st' : rentDueDay === 2 ? 'nd' : rentDueDay === 3 ? 'rd' : 'th';
```

**Problem:** This logic only checks for exactly `1`, `2`, `3`. It produces:
- Day 21 → "21th" (should be "21st")
- Day 22 → "22th" (should be "22nd")
- Day 23 → "23th" (should be "23rd")

This appears in the legal lease document body and in checkbox text, which is unprofessional on a legal document.

**Fix:** Use proper ordinal logic:
```js
function ordinal(n) {
  const s = ['th','st','nd','rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
```

---

### B-11 — Tenant Email Exposed in Client-Side HTML (`APP_EMAIL`)
**Severity:** 🟡 Medium
**Location:** Line 2958 (`renderLeaseSigningPage`)

**Code:**
```js
const APP_EMAIL = '${app['Email']}'; // pre-filled from server for identity verification
```

**Problem:** The applicant's email address is embedded verbatim in the `<script>` block of the HTML page served to the browser. Anyone who views the page source can see the tenant's email address. While the server-side identity check in `signLease` is correct and secure, exposing PII in page source is a privacy issue and unnecessary.

**Fix:** Remove the pre-filled `APP_EMAIL` from the script block. The email verification is fully server-side; there is no need for the client to have a copy of the expected email. The `signerEmail` input already collects the email from the tenant to send to `signLease()`.

---

### B-12 — Reminder Uses Unverified Property Address
**Severity:** 🟢 Low
**Location:** Line 8126 (`checkUnsignedLeases`)

**Code:**
```js
const property = col['Property Address'] ? row[col['Property Address'] - 1] : '';
```

**Problem:** The 24h reminder email uses `Property Address` (the applicant-entered address). If the admin used `verifiedPropertyAddress` when generating the lease, the reminder email will show a different (potentially incorrect or incomplete) address compared to the actual lease document.

**Fix:** Use `Verified Property Address` with a fallback to `Property Address`:
```js
const property = (col['Verified Property Address'] && row[col['Verified Property Address'] - 1])
               || (col['Property Address'] && row[col['Property Address'] - 1])
               || '';
```

---

## Fix Plan

### Priority Order

Fixes are ordered by severity and inter-dependency.

---

### FIX-01 — Fix `calculateLeaseEndDate` (B-01)
**File:** `backend/code.gs` ~line 1981
**Change:** Replace substring matching with numeric extraction.

```js
function calculateLeaseEndDate(startDate, termString) {
  const term = (termString || '').toLowerCase().trim();
  if (!term) return null;
  if (/month[- ]?to[- ]?month|mtm/.test(term)) return null;

  const end = new Date(startDate);

  // Extract the leading number (e.g., "12" from "12 months" or "12-month")
  const numMatch = term.match(/^(\d+(?:\.\d+)?)/);
  if (numMatch) {
    const months = Math.round(parseFloat(numMatch[1]));
    end.setMonth(end.getMonth() + months);
    end.setDate(end.getDate() - 1);
    return end;
  }

  // Handle "1 year", "2 years", etc.
  const yearMatch = term.match(/(\d+)\s*year/);
  if (yearMatch) {
    end.setFullYear(end.getFullYear() + parseInt(yearMatch[1], 10));
    end.setDate(end.getDate() - 1);
    return end;
  }

  // Default to 12 months
  end.setMonth(end.getMonth() + 12);
  end.setDate(end.getDate() - 1);
  return end;
}
```

---

### FIX-02 — Fix `checkUnsignedLeases` Reminder Window (B-02)
**File:** `backend/code.gs` ~line 8133
**Change:** Widen the upper bound from 36 to 48.

```js
// Before:
if (hoursElapsed >= 24 && hoursElapsed < 36 && !adminNotes.includes('[REMINDER_SENT]')) {
// After:
if (hoursElapsed >= 24 && hoursElapsed < 48 && !adminNotes.includes('[REMINDER_SENT]')) {
```

---

### FIX-03 — Add `Lease Link` Column and Write It in `generateAndSendLease` (B-03)
**File:** `backend/code.gs`

**Step 1** — `addMissingLeaseColumns` (~line 438): Add `'Lease Link'` to the new-columns list.

**Step 2** — `generateAndSendLease` (~line 1914): After constructing `leaseLink`, write it to the sheet.
```js
if (col['Lease Link']) sheet.getRange(rowIndex, col['Lease Link']).setValue(leaseLink);
```

---

### FIX-04 — Include Pet Deposit in Stored `Move-in Costs` (B-04)
**File:** `backend/code.gs` ~lines 1905–1918

**Change:** Add `petDeposit` to `moveInCosts` before writing to sheet.
```js
const petDeposit    = parseFloat(petDeposit)    || 0;
const monthlyPetRent= parseFloat(monthlyPetRent) || 0;
const moveInCosts   = rent + deposit + petDeposit;   // was: rent + deposit
```

Remove the redundant pet-deposit-on-the-fly addition in `renderLeaseSigningPage` (line 2259), since the stored value is now correct.

---

### FIX-05 — Warn Admin When Email Fails in `generateAndSendLease` (B-05)
**File:** `backend/code.gs` ~line 1953

**Change:**
```js
const emailSent = sendLeaseEmail(appId, tenantEmail, firstName + ' ' + lastName, phone, leaseLink, { ... });

logEmail('lease_sent', tenantEmail, emailSent ? 'success' : 'failed', appId);
return {
  success: true,
  message: 'Lease sent to ' + tenantEmail,
  leaseLink: leaseLink,
  emailWarning: emailSent ? null : 'Lease was saved but the email failed to send. Please resend manually.'
};
```

Update `submitLease` in the admin UI to display `result.emailWarning` as a toast/alert if present.

---

### FIX-06 — Block Re-Sending a `sent` Lease (B-06)
**File:** `backend/code.gs` ~line 1878

**Change:**
```js
if (currentLeaseStatus === 'signed') throw new Error('Lease already signed by tenant.');
if (currentLeaseStatus === 'sent') {
  return { success: false, error: 'A lease has already been sent to this applicant and is awaiting signature. To resend, first reset the lease status in the sheet.' };
}
```

---

### FIX-07 — Format Rent and Date in `renderLeaseConfirmPage` (B-07)
**File:** `backend/code.gs` ~lines 3153–3154

**Change:**
```js
const rentRaw   = parseFloat(app['Monthly Rent']) || 0;
const rentFmt   = '$' + rentRaw.toLocaleString() + '.00';
const startRaw  = app['Lease Start Date'] || '';
let startFmt    = startRaw;
try {
  const d = new Date(startRaw);
  if (!isNaN(d.getTime())) startFmt = Utilities.formatDate(d, Session.getScriptTimeZone(), 'MMMM dd, yyyy');
} catch(e) {}

// In HTML: use rentFmt and startFmt instead of ${rent} and ${startDate}
```

---

### FIX-08 — Validate Deposit Numerically in Admin `submitLease` (B-08)
**File:** `backend/code.gs` ~line 7536 (inside admin panel `<script>`)

**Change:**
```js
const rentVal    = parseFloat(rent);
const depositVal = parseFloat(deposit);
if (!rent || isNaN(rentVal) || rentVal <= 0) {
  alertArea.innerHTML = '<div class="alert alert-danger">Monthly rent must be a number greater than $0.</div>';
  return;
}
if (!deposit || isNaN(depositVal) || depositVal < 0) {
  alertArea.innerHTML = '<div class="alert alert-danger">Security deposit must be a valid number (enter 0 if no deposit).</div>';
  return;
}
if (!startDate) {
  alertArea.innerHTML = '<div class="alert alert-danger">Please enter a lease start date.</div>';
  return;
}
```

---

### FIX-09 — Add `replyTo` to Lease Emails (B-09)
**File:** `backend/code.gs` ~lines 4611–4621, 4639–4654

**Change:** Add `replyTo: 'choicepropertygroup@hotmail.com'` to both `MailApp.sendEmail` call objects.

---

### FIX-10 — Fix Ordinal Suffix Logic (B-10)
**File:** `backend/code.gs` ~lines 2211, 2215

**Change:** Replace hardcoded suffix with a proper ordinal function and apply it everywhere a day number needs a suffix.

```js
function ordinalSuffix(n) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return n + 'th';
  switch (n % 10) {
    case 1: return n + 'st';
    case 2: return n + 'nd';
    case 3: return n + 'rd';
    default: return n + 'th';
  }
}
// Use: ordinalSuffix(rentDueDay), ordinalSuffix(graceLateDay)
```

---

### FIX-11 — Remove `APP_EMAIL` from Client-Side HTML (B-11)
**File:** `backend/code.gs` ~line 2958

**Change:** Remove the line `const APP_EMAIL = '${app['Email']}';` from the `<script>` block. Since email verification is server-side, this variable is not needed in the browser.

---

### FIX-12 — Use Verified Address in Reminder (B-12)
**File:** `backend/code.gs` ~line 8126

**Change:**
```js
const property = (col['Verified Property Address'] && row[col['Verified Property Address'] - 1])
               || (col['Property Address'] && row[col['Property Address'] - 1])
               || '';
```

---

## Implementation Order

| Step | Fixes | Notes |
|------|-------|-------|
| 1 | FIX-03 (Lease Link column) | Do first — enables FIX-02 to work correctly |
| 2 | FIX-01 (calculateLeaseEndDate) | Core logic, no dependencies |
| 3 | FIX-04 (pet deposit in move-in costs) | Core data integrity fix |
| 4 | FIX-06 (block re-send) | Prevents data integrity issues before fixing emails |
| 5 | FIX-05 (email failure warning) | Depends on nothing |
| 6 | FIX-02 (reminder window) | Depends on FIX-03 being deployed |
| 7 | FIX-07 (confirm page formatting) | UI only |
| 8 | FIX-08 (admin deposit validation) | UI only |
| 9 | FIX-09 (replyTo) | Email config |
| 10 | FIX-10 (ordinal suffix) | Display only |
| 11 | FIX-11 (remove APP_EMAIL) | Security/privacy |
| 12 | FIX-12 (verified address in reminder) | Low priority |

**After applying all fixes, re-deploy `backend/code.gs` to Google Apps Script and run `setupLeaseReminderTrigger()` once from the GAS IDE to refresh the daily trigger.**
