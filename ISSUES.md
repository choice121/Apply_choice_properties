# Choice Properties Application System â Issue Tracker

  > **AI AGENT INSTRUCTIONS:** This file is the source of truth for all known issues.
  > Before making ANY code change, read this file top to bottom.
  > When you fix an issue, change its status from `[ ]` to `[x]` and add the date.
  > Do NOT close an issue unless you have tested and confirmed the fix works.
  > Phase order matters â complete Phase A before starting Phase B, etc.

  ---

  **System:** Choice Properties Rental Application System  
  **Scan Date:** April 8, 2026  
  **Total Issues:** 18  
  **Fixed:** 14  
  **Remaining:** 4

  ---

  ## Issue Status Key

  - `[ ]` â Open (not started)
  - `[~]` â In Progress
  - `[x]` â Fixed and verified
  - `[!]` â Blocked / needs decision

  ---

  ## ð´ CRITICAL ISSUES (C-series)

  ### [C1] Duplicate `Security Deposit` Case in `processApplication()`
  - **Status:** `[x]`
  - **File:** `backend/code.gs`
  - **Lines:** ~1179 and ~1205
  - **Severity:** CRITICAL â data loss risk
  - **Problem:** Two `case 'Security Deposit':` entries exist in the switch statement inside `processApplication()`. The first (line ~1179) correctly saves the value from `formData['Security Deposit']`. The second (line ~1205, in the lease columns section) overwrites it with `''` (empty string). Currently the first match wins, but if column ordering in the sheet ever changes, the empty string case can win and silently erase the deposit value.
  - **Fix:** Find the second `case 'Security Deposit':` entry (the one that pushes an empty string) and remove it entirely. It belongs to the lease columns block where it should not override the property-context Security Deposit.
  - **Test:** Submit a test application and verify the Security Deposit column in the sheet contains the passed value, not blank.

  ---

  ### [C2] Eight New Property Context Fields Missing Explicit Handling in GAS Switch
  - **Status:** `[x]`
  - **File:** `backend/code.gs`
  - **Lines:** `processApplication()` switch block (~1170â1220)
  - **Severity:** CRITICAL â silent data loss on schema change
  - **Problem:** The following hidden form fields are sent by the frontend but have NO explicit `case` in the switch statement. They fall through to `default: rowData.push(formData[header] || '')` which works only if the Google Sheet column header exactly matches the form field name:
    - `Garage Spaces`
    - `EV Charging`
    - `Laundry Type`
    - `Heating Type`
    - `Cooling Type`
    - `Last Months Rent`
    - `Admin Fee`
    - `Move-in Special`
  - **Fix:** Add explicit case statements for all eight fields, following the same pattern as the fields around them. Example:
    ```javascript
    case 'Garage Spaces':    rowData.push(formData['Garage Spaces']    || ''); break;
    case 'EV Charging':      rowData.push(formData['EV Charging']      || ''); break;
    case 'Laundry Type':     rowData.push(formData['Laundry Type']     || ''); break;
    case 'Heating Type':     rowData.push(formData['Heating Type']     || ''); break;
    case 'Cooling Type':     rowData.push(formData['Cooling Type']     || ''); break;
    case 'Last Months Rent': rowData.push(formData['Last Months Rent'] || ''); break;
    case 'Admin Fee':        rowData.push(formData['Admin Fee']        || ''); break;
    case 'Move-in Special':  rowData.push(formData['Move-in Special']  || ''); break;
    ```
    Add these inside the switch block, after the existing `Parking Fee` case and before the property owner cases.
  - **Test:** Submit a test application from a property with garage spaces, EV charging, and a move-in special. Verify each value appears in the correct column in the Sheet.

  ---

  ### [C3] Misleading `Property Address URL` Field Name
  - **Status:** `[ ]`
  - **File:** `index.html` (line 272), `backend/code.gs` (multiple references)
  - **Severity:** MODERATE (maintenance risk, no data loss)
  - **Problem:** The hidden input `id="hiddenPropertyAddress"` has `name="Property Address URL"` but stores a street address, not a URL. The GAS backend stores this in a column also called `Property Address URL`. Anyone reading the spreadsheet or the code assumes a URL is stored here.
  - **Fix:** This is a rename â it touches the HTML hidden input name, the GAS sheet column name (via `addMissingLeaseColumns`), all `case 'Property Address URL':` references in `processApplication()`, and all display references in email templates. Since this is a column rename, existing rows in the sheet will NOT be automatically updated. Approach:
    1. Change `name="Property Address URL"` to `name="Property Address Source"` in `index.html`
    2. Change `case 'Property Address URL':` to `case 'Property Address Source':` in `backend/code.gs`
    3. Add `'Property Address Source'` to the `addMissingLeaseColumns` list with a note that old data lives in `'Property Address URL'`
    4. Update all display code to check both column names: `app['Property Address Source'] || app['Property Address URL']`
  - **Note:** Can defer this rename if it's too disruptive â lower priority than C1 and C2.
  - **Test:** Submit a test app, verify the new column has the address and the label makes sense.

  ---

  ## ð  IMPORTANT ISSUES (I-series)

  ### [I1] No Validation That Property ID Exists in the Listing Platform
  - **Status:** `[x]`
  - **File:** `backend/code.gs`
  - **Function:** `processApplication()`
  - **Severity:** IMPORTANT â applications for non-existent/rented properties get through
  - **Problem:** When `formData['Property ID']` is present, the system never checks whether that property actually exists in Supabase or is still `active`. Users could arrive with a crafted URL and submit an application for a property that is rented or doesn't exist.
  - **Fix:** After the duplicate check and before row insertion in `processApplication()`, add a Supabase property status check:
    ```javascript
    // Validate property is still active in the listing platform
    if (formData['Property ID']) {
      const props = PropertiesService.getScriptProperties();
      const supabaseUrl = props.getProperty('SUPABASE_URL');
      const serviceKey  = props.getProperty('SUPABASE_SERVICE_KEY');
      if (supabaseUrl && serviceKey) {
        try {
          const url = supabaseUrl.replace(/\/$/,'') + '/rest/v1/properties?id=eq.'
            + encodeURIComponent(formData['Property ID']) + '&select=id,status';
          const resp = UrlFetchApp.fetch(url, {
            method: 'GET',
            headers: { 'apikey': serviceKey, 'Authorization': 'Bearer ' + serviceKey },
            muteHttpExceptions: true
          });
          if (resp.getResponseCode() === 200) {
            const rows = JSON.parse(resp.getContentText());
            if (!rows || rows.length === 0) {
              return { success: false, error: 'This property could not be found. Please return to the listings page and apply from an active listing.' };
            }
            if (rows[0].status !== 'active') {
              return { success: false, error: 'This property is no longer available for applications. Please check our listings for other available properties.' };
            }
          }
          // If Supabase unreachable, fall through (graceful degradation)
        } catch(e) {
          console.warn('Property validation check failed (non-blocking):', e.toString());
        }
      }
    }
    ```
  - **Test:** Manually set a property to `rented` in Supabase. Try to submit an application with that property ID. Should be rejected.

  ---

  ### [I2] Geoapify API Key Exposed in Client-Side JavaScript
  - **Status:** `[ ]`
  - **File:** `js/script.js` (~line 450 in `setupGeoapify()`)
  - **Severity:** IMPORTANT â API quota abuse risk
  - **Problem:** The key `bea2afb13c904abea5cb2c2693541dcf` is hardcoded and publicly readable.
  - **Fix (No Code Change Needed):** Log into the Geoapify dashboard and add HTTP referrer restrictions for the key, allowing only `apply-choice-properties.pages.dev` and `localhost`. This is a dashboard setting, not a code fix.
  - **Test:** Try using the key from a different origin. It should be rejected.

  ---

  ### [I3] Save & Resume Link Only Works on Same Device/Browser
  - **Status:** `[x]` — Fixed April 8, 2026
  - **Files:** `js/script.js` (`setupSaveResume()`), `backend/code.gs` (`sendResumeEmail()`)
  - **Severity:** IMPORTANT â misleading UX
  - **Problem:** The resume email implies users can continue on any device, but form data is in `localStorage`. Opening the link on a different device shows a blank form.
  - **Fix:** Update the email template in `sendResumeEmail()` to add a clear note:
    ```
    â ï¸ Important: This link must be opened in the same browser on the same device where you started your application.
    ```
    Also add this note to the in-form modal text in `setupSaveResume()` in `js/script.js`:
    ```javascript
    // In the modal HTML string, add after the description paragraph:
    '<p style="font-size:12px;color:#e74c3c;margin-top:8px;"><i class="fas fa-exclamation-triangle"></i> The resume link only works on the same browser and device where you started your application.</p>'
    ```
  - **Test:** Send a resume email, open the link on a different browser. Verify the disclaimer is visible.

  ---

  ### [I4] File Upload Size Config Inconsistency
  - **Status:** `[x]` — Fixed April 8, 2026
  - **File:** `js/script.js`
  - **Severity:** IMPORTANT â potential submission timeouts
  - **Problem:** `this.config.MAX_FILE_SIZE` is 10MB but `setupFileUploads()` enforces 4MB. Base64 encoding inflates 4 files Ã 4MB = ~21MB total payload, which is within GAS limits but can cause timeout failures on slow connections.
  - **Fix:**
    1. Remove `MAX_FILE_SIZE: 10 * 1024 * 1024` from the `config` object (it's misleading and unused)
    2. Reduce `MAX_SIZE` in `setupFileUploads()` from 4MB to 2MB: `const MAX_SIZE = 2 * 1024 * 1024;`
    3. Update the user-facing alert message from "4 MB" to "2 MB"
    4. Add a try/catch with a specific "upload failed" error message in the submission handler to distinguish upload timeouts from other errors
  - **Test:** Try uploading a 3MB file. Should be rejected with the 2MB message. Try a 1.5MB file. Should work.

  ---

  ### [I5] Duplicate Detection Uses Address String Instead of Property ID
  - **Status:** `[x]`
  - **File:** `backend/code.gs`, `processApplication()` (~line 1108â1125)
  - **Severity:** IMPORTANT â duplicate applications can be submitted
  - **Problem:** The duplicate check compares `formData['Property Address'].toLowerCase().trim()` against stored addresses. The property address field is user-editable, so "123 Main St" vs "123 Main Street" bypasses it.
  - **Fix:** Modify the duplicate check to use Property ID as the primary key when available:
    ```javascript
    const incomingEmail    = (formData['Email'] || '').toLowerCase().trim();
    const incomingPropertyId = (formData['Property ID'] || '').trim();
    const incomingProperty   = (formData['Property Address'] || '').toLowerCase().trim();
    
    if (incomingEmail && (incomingPropertyId || incomingProperty)) {
      const allData = sheet.getDataRange().getValues();
      const emailColIdx    = (col['Email']       || 1) - 1;
      const propIdColIdx   = (col['Property ID'] || 1) - 1;
      const propertyColIdx = (col['Property Address'] || 1) - 1;
      const statusColIdx   = (col['Status']      || 1) - 1;
      const appIdColIdx    = (col['App ID']       || 1) - 1;
      
      for (let i = 1; i < allData.length; i++) {
        const rowEmail    = (allData[i][emailColIdx]    || '').toString().toLowerCase().trim();
        const rowPropId   = (allData[i][propIdColIdx]   || '').toString().trim();
        const rowProperty = (allData[i][propertyColIdx] || '').toString().toLowerCase().trim();
        const rowStatus   = (allData[i][statusColIdx]   || '').toString().toLowerCase();
        const rowAppId    = allData[i][appIdColIdx]     || '';
        
        if (rowEmail !== incomingEmail) continue;
        if (rowStatus === 'denied' || rowStatus === 'withdrawn') continue;
        
        // Primary match: use Property ID if both sides have it
        const idMatch = incomingPropertyId && rowPropId && incomingPropertyId === rowPropId;
        // Fallback match: use address string
        const addrMatch = !incomingPropertyId && incomingProperty && rowProperty === incomingProperty;
        
        if (idMatch || addrMatch) {
          return {
            success: false, duplicate: true, existingAppId: rowAppId,
            error: 'You already have an active application for this property (Ref: ' + rowAppId + '). Log in to your dashboard to check your status.'
          };
        }
      }
    }
    ```
  - **Test:** Submit an application. Try to submit again for the same property. Should be blocked. Try slightly modifying the address â should still be blocked (because Property ID matches).

  ---

  ### [I6] Content-Security-Policy Does Not Allow External Images
  - **Status:** `[x]` — Fixed April 8, 2026
  - **File:** `_headers`
  - **Severity:** LOW-MEDIUM â future feature blocker
  - **Problem:** `img-src 'self' data:` will block any property images from the listing platform's CDN if they are ever displayed in the property context banner.
  - **Fix:** Add the listing platform's image domains to `img-src`. The listing platform uses ImageKit and Supabase storage. Update to:
    ```
    img-src 'self' data: https://*.imagekit.io https://*.supabase.co;
    ```
  - **Test:** Add an image from ImageKit to the form. Verify it loads without CSP errors in the browser console.

  ---

  ## ð¡ MODERATE ISSUES (M-series)

  ### [M1] No Clear Guidance When Applicant Lands Without Property Context
  - **Status:** `[x]` — Fixed April 8, 2026
  - **File:** `js/script.js`, `_showNoContextPrompt()` (called from `_prefillFromURL()`)
  - **Severity:** MODERATE â bad UX
  - **Problem:** When a user lands directly without URL params, `_showNoContextPrompt()` is called but the message and guidance are unclear â no link back to the listings page.
  - **Fix:** Implement or update `_showNoContextPrompt()` to show a clear banner:
    ```javascript
    _showNoContextPrompt() {
      const banner = document.getElementById('noContextBanner');
      if (banner) {
        banner.style.display = 'block';
        banner.innerHTML = \`
          <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:16px;margin-bottom:20px;display:flex;gap:12px;align-items:flex-start;">
            <i class="fas fa-exclamation-triangle" style="color:#e67e22;margin-top:2px;flex-shrink:0;"></i>
            <div>
              <strong>No property selected.</strong>
              <p style="margin:6px 0 0;font-size:14px;">You arrived here without selecting a property. 
              Please <a href="https://choice-properties-site.pages.dev/listings.html" style="color:#0066cc;font-weight:600;">browse our listings</a> 
              and click <strong>Apply Now</strong> on the property you want.</p>
            </div>
          </div>\`;
      }
    }
    ```
    Also add `<div id="noContextBanner" style="display:none;"></div>` to `index.html` before the form sections.
  - **Test:** Open the form URL with no query params. Verify the banner appears with the listing link.

  ---

  ### [M2] Admin Session Token Stored in localStorage with 30-Day TTL
  - **Status:** `[x]` — Fixed April 8, 2026
  - **File:** `backend/code.gs`, `doGet()` landing page inline script
  - **Severity:** MODERATE â security risk
  - **Problem:** Admin session stored in `localStorage` for 30 days. LocalStorage is accessible to any JS on the page (XSS risk) and has no secure/httpOnly flag.
  - **Fix:** Reduce TTL to 8 hours (`8 * 60 * 60 * 1000` ms). Change in the inline script inside `doGet()`'s landing HTML:
    ```javascript
    // Change from:
    if (sess && sess.token && (Date.now()-sess.savedAt < 30*24*60*60*1000) && sess.fp === _fp()) {
    // Change to:
    if (sess && sess.token && (Date.now()-sess.savedAt < 8*60*60*1000) && sess.fp === _fp()) {
    ```
    Also update the corresponding save logic if it exists. 30 â 8 hours.
  - **Test:** Log in as admin. Wait (or manually set the timestamp back 9 hours in DevTools localStorage). Verify you're required to log in again.

  ---

  ### [M3] SSN Last 4 Digits Stored as Plain Text
  - **Status:** `[!]`
  - **Requires Decision:** Decide whether SSN last 4 is necessary. If yes, decide on hashing approach.
  - **File:** `js/script.js`, `backend/code.gs`
  - **Severity:** MODERATE â compliance risk
  - **Problem:** Last 4 digits of SSN is collected in a password-style input but stored as plain text in Google Sheets. This is PII.
  - **Recommendation:** If the SSN last 4 is used only for identity verification, hash it before storage using `Utilities.computeDigest()` in GAS, or eliminate collection entirely and use it only for display purposes without persisting it.

  ---

  ### [M4] No CSRF Protection on GAS `doPost()` Endpoint
  - **Status:** `[x]` — Fixed April 8, 2026
  - **File:** `js/script.js`, `backend/code.gs`
  - **Severity:** MODERATE â spam/abuse risk
  - **Problem:** GAS `doPost` accepts requests from any origin with no CSRF token. The honeypot and rate-limiting help, but a determined attacker can script around them.
  - **Fix:** On form initialization, generate a one-time token and store it in `sessionStorage`. Include it in the `FormData` on submission. In `doPost()`, validate the token format (not full CSRF, but adds friction):
    ```javascript
    // In initialize() in script.js:
    const csrfToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
    sessionStorage.setItem('_csrf', csrfToken);
    
    // In handleFormSubmit(), before fetch():
    formData.append('_csrf', sessionStorage.getItem('_csrf') || '');
    
    // In doPost() in code.gs, add after honeypot check:
    const csrf = formData['_csrf'] || '';
    if (!csrf || csrf.length < 10) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Invalid request.' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    ```
  - **Test:** Use a REST client (Postman/curl) to POST without the `_csrf` field. Should get "Invalid request." response.

  ---

  ### [M5] Property Status NOT Reversed When Application Withdrawn After Approval
  - **Status:** `[x]`
  - **File:** `backend/code.gs`, `updateStatus()` function
  - **Severity:** IMPORTANT â listing platform gets stuck showing rented
  - **Problem:** `_syncPropertyStatusToSupabase(propertyId, 'rented')` is called when status â `approved`. But when status changes from `approved` to `withdrawn` or back to `denied`, the property stays `rented` in Supabase indefinitely.
  - **Fix:** In `updateStatus()`, add reverse sync logic:
    ```javascript
    // After the existing forward sync (approved â rented):
    if (newStatus === 'approved' && col['Property ID']) {
      const propertyId = sheet.getRange(rowIndex, col['Property ID']).getValue();
      _syncPropertyStatusToSupabase(propertyId, 'rented');
    }
    
    // ADD THIS: Reverse sync when an approved application is reversed
    if ((newStatus === 'withdrawn' || newStatus === 'denied') 
        && currentStatus === 'approved' 
        && col['Property ID']) {
      const propertyId = sheet.getRange(rowIndex, col['Property ID']).getValue();
      if (propertyId) {
        _syncPropertyStatusToSupabase(propertyId, 'active');
        console.log('Reversed property status to active for property ' + propertyId);
      }
    }
    ```
  - **Test:** Approve an application. Verify property shows as rented in the listing platform. Then withdraw it. Verify property shows as active again.

  ---

  ### [M6] Empty `catch` Blocks Swallow Errors Silently
  - **Status:** `[x]`
  - **File:** `js/script.js`
  - **Severity:** MODERATE â makes debugging impossible in production
  - **Problem:** Multiple `catch (e) {}` blocks with no logging. When something breaks, there's zero trace of what happened.
  - **Fix:** Replace all `catch (e) {}` with `catch (e) { console.warn('[CP]', e); }`. In critical paths (fee reading, URL prefill, form restore), add a user-facing note if the error affects the experience.
    Search for: `} catch (e) {}` or `} catch (_) {}` and replace each one.
  - **Test:** Introduce a deliberate error in the fee parsing code. Verify it shows in the browser console.

  ---

  ## ðµ INTEGRATION ISSUES (B-series)

  ### [B1] GAS Backend URL Hardcoded in Two Separate Repos
  - **Status:** `[x]` — Fixed April 8, 2026
  - **Files:** `js/script.js` (this repo, line 74), `js/cp-api.js` (Choice repo â `CONFIG.APPLY_FORM_URL`), `admin/applications.html` (Choice repo)
  - **Severity:** IMPORTANT â maintenance hazard
  - **Problem:** The GAS Web App URL `https://script.google.com/macros/s/AKfycbwqctrCLYOPaz1nZeMS5SXuqK7FRXbN5Bf0dSx3-3leyp_B7Bfr4HPC8YZaZ9wZVxtn/exec` appears hardcoded in `script.js`. If a new GAS version is deployed with a different URL, both repos must be updated manually.
  - **Fix:** In the listing platform (Choice repo), the `CONFIG.APPLY_FORM_URL` is already the right pattern. In this repo's `script.js`, consider reading `BACKEND_URL` from a global config rather than hardcoding:
    ```javascript
    // In script.js constructor, replace the hardcoded URL with:
    this.BACKEND_URL = window.CP_CONFIG?.BACKEND_URL 
      || 'https://script.google.com/macros/s/AKfycbwqctrCLYOPaz1nZeMS5SXuqK7FRXbN5Bf0dSx3-3leyp_B7Bfr4HPC8YZaZ9wZVxtn/exec';
    ```
    Then add a small config block in `index.html` before `script.js` loads:
    ```html
    <script>
      window.CP_CONFIG = {
        BACKEND_URL: 'https://script.google.com/macros/s/AKfycbwqctrCLYOPaz1nZeMS5SXuqK7FRXbN5Bf0dSx3-3leyp_B7Bfr4HPC8YZaZ9wZVxtn/exec'
      };
    </script>
    ```
    This means future URL changes only require one edit in `index.html`.
  - **Test:** Change the `CP_CONFIG.BACKEND_URL` to a different value. Verify `this.BACKEND_URL` picks it up.

  ---

  ### [B2] URL Param String May Exceed Browser Limits on Data-Rich Listings
  - **Status:** `[ ]`
  - **File:** `js/cp-api.js` (Choice repo), `buildApplyURL()`
  - **Severity:** MODERATE â edge case failure
  - **Problem:** The `buildApplyURL()` function adds 30+ parameters. Modern browsers support ~8000 chars, but some mobile browsers and proxies truncate at ~2000 chars. A fully-populated listing with all pet, parking, utility, and fee params can approach limits.
  - **Fix:** Add a URL length check in `buildApplyURL()` in the Choice repo:
    ```javascript
    const finalUrl = base + '?' + p.toString();
    if (finalUrl.length > 7000) {
      console.warn('buildApplyURL: URL length ' + finalUrl.length + ' chars may be truncated on some browsers');
    }
    return finalUrl;
    ```
    Long-term: consider a short-lived token stored in a lightweight backend that the application form fetches.
  - **Test:** Create a property with every field filled. Log the URL length. Verify params are not truncated.

  ---

  ### [B3] No Health Check Between Systems
  - **Status:** `[x]`
  - **Files:** `backend/code.gs`, `js/cp-api.js` (Choice repo)
  - **Severity:** MODERATE â no proactive failure detection
  - **Problem:** If the GAS backend goes down (quota exceeded, script error, service outage), the listing platform's Apply button silently redirects users to a broken form with no indication anything is wrong.
  - **Fix (GAS):** Add a health route to `doGet()`:
    ```javascript
    } else if (path === 'health') {
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    ```
  - **Fix (Apply form):** Add a check in `handleFormSubmit()` before submission â if the health endpoint returns an error, show a user-friendly message instead of letting the full submission fail after a long wait.
  - **Fix (Listing platform â Choice repo):** Optionally, check the health endpoint before the Apply button redirects the user.
  - **Test:** Hit the `?path=health` endpoint. Should return `{"status":"ok"}`.

  ---

  ## Fix History Log

  | Date | Issue | Fixed By | Notes |
  |------|-------|----------|-------|
  | â | â | â | No fixes applied yet |
  