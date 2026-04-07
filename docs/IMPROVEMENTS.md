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
The 6,161-line monolithic `code.gs` is functional but difficult to maintain. Google Apps Script supports library linking, which would allow splitting the code into logical modules (auth, email, lease, admin, data). This cannot be done without a significant refactor and is deferred until the current fix phases are complete.

**Recommendation: Use GAS Script Properties for all configuration**
Currently, constants like `APPLICATION_FEE`, admin emails, and the backend URL are hardcoded. These should be moved to `PropertiesService.getScriptProperties()` so they can be changed without modifying and redeploying code. Phase 1 begins this process with credentials, but all operational constants should follow.

**Recommendation: Add a test/staging GAS deployment**
Currently, every change to `code.gs` is deployed directly to production. A second "staging" deployment of the same script would allow testing changes before they go live. GAS supports multiple deployments from one project.

### Security

**Recommendation: Add a honeypot field to the application form**
A hidden field (e.g., `<input name="website" type="text" style="display:none">`) that bots will fill but real users won't. If this field has a value on submission, silently reject the application. This is simple, zero-cost bot protection.

**Recommendation: Add request origin validation in `doPost()`**
GAS cannot fully validate CORS origins, but can check the `Referer` header as a basic sanity check. While not foolproof, it adds a layer of protection against casual abuse.

**Recommendation: Implement GAS execution quotas monitoring**
GAS has daily quotas (emails sent, URL fetch calls, spreadsheet writes). Add a `checkQuotaUsage()` function that logs current usage to a monitoring sheet. Set an alert if approaching limits.

### Data

**Recommendation: Add a full application audit log sheet**
Every change to application status, payment status, or any admin action should be written to a separate "Audit Log" sheet with: timestamp, appId, action, changed_by, old_value, new_value. This provides a complete history of every record change for dispute resolution.

**Recommendation: Move admin emails to Settings sheet only**
Admin emails are currently hardcoded in the function comment and also fetched from Settings. Remove the hardcoded fallback values to enforce Settings-only management.

### Fair Housing Compliance

**Recommendation: Define screening criteria in writing**
All approval/denial decisions should be based on published criteria (minimum income multiple, credit score range, etc.). These criteria should be documented and applied consistently. Consider adding a "Denial Reason" dropdown with pre-defined categories instead of free text.

**Recommendation: Review adverse action notice requirements**
If any denial is based on information in a consumer report (credit check, background check), FCRA requires a specific adverse action notice. The current denial email does not include the required notice. Consult with legal counsel before adding credit/background screening to the system.

---

## Phase 1 Improvements

*(To be populated after Phase 1 is completed)*

---

## Phase 2 Improvements

*(To be populated after Phase 2 is completed)*

---

## Phase 3 Improvements

*(To be populated after Phase 3 is completed)*

---

## Phase 4 Improvements

*(To be populated after Phase 4 is completed)*

---

## Phase 5 Improvements

*(To be populated after Phase 5 is completed)*

---

## Phase 6 Improvements

*(To be populated after Phase 6 is completed)*

---

## Phase 7 Improvements

*(To be populated after Phase 7 is completed)*

---

## Phase 8 Improvements

*(To be populated after Phase 8 is completed)*
