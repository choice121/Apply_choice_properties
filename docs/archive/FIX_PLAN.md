# Choice Properties Application System — Fix Implementation Plan

  > **AI AGENT INSTRUCTIONS — READ THIS FIRST:**
  > This file contains the exact step-by-step implementation plan for all 18 known issues.
  > All issues are tracked in `ISSUES.md` with status checkboxes.
  > Complete Phase A fully before starting Phase B. The phases are ordered by risk and dependency.
  > After each fix, update `ISSUES.md` to mark the issue resolved.
  > Never modify files outside the scope listed for each fix.

  **Source repos:**
  - Application System: `choice121/Apply_choice_properties`
  - Listing Platform: `choice121/Choice`

  **GAS Backend URL:** `https://script.google.com/macros/s/AKfycbwqctrCLYOPaz1nZeMS5SXuqK7FRXbN5Bf0dSx3-3leyp_B7Bfr4HPC8YZaZ9wZVxtn/exec`

  ---

  ## ⚙️ Technical Context (Read Before Coding)

  **Stack:** Pure static HTML/CSS/Vanilla JS + Google Apps Script (GAS) backend + Google Sheets
  - `index.html` — The single-page application form
  - `js/script.js` — All frontend logic (~2500 lines, class-based: `RentalApplication`)
  - `css/style.css` — All styles
  - `backend/code.gs` — Google Apps Script backend (~7500 lines)
    - `doPost(e)` — Receives all form submissions and routes them
    - `processApplication(formData, fileBlob)` — Core application handler
    - `updateStatus(appId, newStatus, notes)` — Admin status changes + Supabase sync
    - `_syncPropertyStatusToSupabase(propertyId, status)` — Updates listing platform DB

  **Connection Flow:**
  1. User browses **Choice** listing platform (Supabase + Cloudflare Pages)
  2. Clicks "Apply Now" → `buildApplyURL()` in `cp-api.js` builds a URL with 30+ params
  3. Browser redirects to `apply-choice-properties.pages.dev` (this repo)
  4. `_prefillFromURL()` in `script.js` reads URL params, populates hidden fields
  5. User fills out 5-section form, submits
  6. `handleFormSubmit()` POSTs `FormData` to GAS `BACKEND_URL`
  7. GAS `doPost()` routes to `processApplication()`
  8. Application saved to Google Sheet, confirmation emails sent
  9. Admin uses GAS admin panel to manage applications
  10. On approval, `updateStatus()` calls `_syncPropertyStatusToSupabase()` to mark listing as rented

  ---

  ## Phase A — Critical Data Integrity (Do First)

  **Estimated time:** 1.5 hours  
  **Files:** `backend/code.gs` only  
  **Risk:** Low — targeted surgical changes

  ### A1 — Fix Duplicate Security Deposit Case [C1]

  **Goal:** Remove the second `case 'Security Deposit':` that overwrites with empty string.

  **Steps:**
  1. Open `backend/code.gs`
  2. Search for `case 'Security Deposit':` — there are exactly 2 occurrences
  3. The FIRST one (around line 1179) reads:
     ```javascript
     case 'Security Deposit':    rowData.push(formData['Security Deposit']    || ''); break;
     ```
     **Keep this one.**
  4. The SECOND one (around line 1205) is in the "Lease columns" section and reads:
     ```javascript
     case 'Security Deposit':      rowData.push(''); break;
     ```
     **Delete this entire line.**
  5. Save and redeploy the GAS script.

  **Verify:** Search for `case 'Security Deposit':` — should appear exactly once.

  ---

  ### A2 — Add Explicit Cases for 8 Missing Property Fields [C2]

  **Goal:** Add explicit `case` statements for 8 fields that currently fall to `default`.

  **Steps:**
  1. Open `backend/code.gs`, find `processApplication()`
  2. Find this block (around line 1195):
     ```javascript
     case 'Parking Fee':         rowData.push(formData['Parking Fee']         || ''); break;
     // ── Ownership columns ──
     case 'Property Owner':
     ```
  3. Insert the following 8 lines BETWEEN `Parking Fee` and `Property Owner`:
     ```javascript
     case 'Garage Spaces':       rowData.push(formData['Garage Spaces']       || ''); break;
     case 'EV Charging':         rowData.push(formData['EV Charging']         || ''); break;
     case 'Laundry Type':        rowData.push(formData['Laundry Type']        || ''); break;
     case 'Heating Type':        rowData.push(formData['Heating Type']        || ''); break;
     case 'Cooling Type':        rowData.push(formData['Cooling Type']        || ''); break;
     case 'Last Months Rent':    rowData.push(formData['Last Months Rent']    || ''); break;
     case 'Admin Fee':           rowData.push(formData['Admin Fee']           || ''); break;
     case 'Move-in Special':     rowData.push(formData['Move-in Special']     || ''); break;
     ```
  4. Save and redeploy.

  **Verify:** The switch statement should now have no data fields relying on the `default` fallthrough.

  ---

  ### A3 — Use Property ID for Duplicate Detection [I5]

  **Goal:** Make the duplicate application check use Property ID as the primary key.

  **Steps:**
  1. Open `backend/code.gs`, find `processApplication()`
  2. Find the block that starts with:
     ```javascript
     const incomingEmail    = (formData['Email'] || '').toLowerCase().trim();
     const incomingProperty = (formData['Property Address'] || '').toLowerCase().trim();
     if (incomingEmail && incomingProperty) {
     ```
  3. Replace the entire duplicate-check block (from `const incomingEmail` through the closing `}` of the outer `if`) with:
     ```javascript
     const incomingEmail      = (formData['Email']            || '').toLowerCase().trim();
     const incomingPropertyId = (formData['Property ID']      || '').trim();
     const incomingProperty   = (formData['Property Address'] || '').toLowerCase().trim();
     
     if (incomingEmail && (incomingPropertyId || incomingProperty)) {
       const allData        = sheet.getDataRange().getValues();
       const emailColIdx    = (col['Email']           || 1) - 1;
       const propIdColIdx   = (col['Property ID']     || 1) - 1;
       const propertyColIdx = (col['Property Address']|| 1) - 1;
       const statusColIdx   = (col['Status']          || 1) - 1;
       const appIdColIdx    = (col['App ID']           || 1) - 1;
       
       for (let i = 1; i < allData.length; i++) {
         const rowEmail    = (allData[i][emailColIdx]    || '').toString().toLowerCase().trim();
         const rowPropId   = (allData[i][propIdColIdx]   || '').toString().trim();
         const rowProperty = (allData[i][propertyColIdx] || '').toString().toLowerCase().trim();
         const rowStatus   = (allData[i][statusColIdx]   || '').toString().toLowerCase();
         const rowAppId    =  allData[i][appIdColIdx]    || '';
         
         if (rowEmail !== incomingEmail) continue;
         if (rowStatus === 'denied' || rowStatus === 'withdrawn') continue;
         
         const idMatch   = incomingPropertyId && rowPropId && (incomingPropertyId === rowPropId);
         const addrMatch = !incomingPropertyId && incomingProperty && (rowProperty === incomingProperty);
         
         if (idMatch || addrMatch) {
           return {
             success: false, duplicate: true, existingAppId: rowAppId,
             error: 'You already have an active application for this property (Ref: ' + rowAppId + '). Log in to your dashboard to check your status.'
           };
         }
       }
     }
     ```
  4. Save and redeploy.

  ---

  ### A4 — Add Reverse Property Status Sync on Status Reversal [M5]

  **Goal:** When an approved application is withdrawn or denied, reset the listing platform property to active.

  **Steps:**
  1. Open `backend/code.gs`, find `updateStatus()`
  2. Find this existing block near the end of the function:
     ```javascript
     if (newStatus === 'approved' && col['Property ID']) {
       const propertyId = sheet.getRange(rowIndex, col['Property ID']).getValue();
       _syncPropertyStatusToSupabase(propertyId, 'rented');
     }
     ```
  3. Add the reverse sync block IMMEDIATELY AFTER it:
     ```javascript
     // Reverse sync: if an approved application is later reversed, restore listing to active
     if ((newStatus === 'withdrawn' || newStatus === 'denied')
         && currentStatus === 'approved'
         && col['Property ID']) {
       const propertyId = sheet.getRange(rowIndex, col['Property ID']).getValue();
       if (propertyId) {
         _syncPropertyStatusToSupabase(propertyId, 'active');
         console.log('updateStatus: Restored property ' + propertyId + ' to active after reversal from approved');
       }
     }
     ```
  4. Note: The variable `currentStatus` is already read earlier in `updateStatus()` as:
     `const currentStatus = sheet.getRange(rowIndex, col['Status']).getValue();`
     Confirm this line exists before your addition.
  5. Save and redeploy.

  ---

  ## Phase B — Connection Reliability

  **Estimated time:** 1.5 hours  
  **Files:** `backend/code.gs`, `js/script.js`

  ### B1 — Add Property Existence Validation [I1]

  **Goal:** Reject applications for non-existent or non-active properties.

  **Steps:**
  1. Open `backend/code.gs`, find `processApplication()`
  2. Find the duplicate check block you just updated in A3. Add the property validation IMMEDIATELY AFTER the duplicate check block and BEFORE the line `const appId = formData.appId || generateUniqueAppId(...)`:
     ```javascript
     // Validate property exists and is active in the listing platform
     if (formData['Property ID']) {
       const scriptProps  = PropertiesService.getScriptProperties();
       const supabaseUrl  = scriptProps.getProperty('SUPABASE_URL');
       const serviceKey   = scriptProps.getProperty('SUPABASE_SERVICE_KEY');
       if (supabaseUrl && serviceKey) {
         try {
           const validationUrl = supabaseUrl.replace(/\/$/, '')
             + '/rest/v1/properties?id=eq.' + encodeURIComponent(formData['Property ID'])
             + '&select=id,status&limit=1';
           const validationResp = UrlFetchApp.fetch(validationUrl, {
             method: 'GET',
             headers: { 'apikey': serviceKey, 'Authorization': 'Bearer ' + serviceKey },
             muteHttpExceptions: true
           });
           if (validationResp.getResponseCode() === 200) {
             const propRows = JSON.parse(validationResp.getContentText());
             if (!propRows || propRows.length === 0) {
               return { success: false, error: 'This property could not be found. Please return to our listings page and apply from an active listing.' };
             }
             if (propRows[0].status !== 'active') {
               return { success: false, error: 'This property is no longer accepting applications. Please check our listings for other available homes.' };
             }
           }
           // If Supabase returns non-200, log and fall through (graceful degradation)
         } catch (validErr) {
           console.warn('processApplication: Property validation skipped (non-blocking):', validErr.toString());
         }
       }
     }
     ```
  3. Save and redeploy.

  ---

  ### B2 — Add GAS Health Endpoint [B3]

  **Goal:** Expose `?path=health` for the listing platform to check backend status.

  **Steps:**
  1. Open `backend/code.gs`, find `doGet(e)`
  2. Find the `} else if (path === 'lease_confirm' && id) {` block
  3. Add the health route IMMEDIATELY BEFORE the final `} else {` block:
     ```javascript
     } else if (path === 'health') {
       return ContentService
         .createTextOutput(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString(), version: '10.0' }))
         .setMimeType(ContentService.MimeType.JSON);
     }
     ```
  4. Save and redeploy.
  5. Test: Visit `<GAS_URL>?path=health` in browser — should return `{"status":"ok",...}`

  ---

  ### B3 — Fix Empty Error Catch Blocks [M6]

  **Goal:** Replace all silent `catch(e){}` blocks with at minimum a `console.warn`.

  **Steps:**
  1. Open `js/script.js`
  2. Search for all occurrences of `} catch (e) {}` and `} catch (_) {}`
  3. Replace each one with `} catch (e) { console.warn('[CP App]', e); }`
  4. For the critical paths (`_readApplicationFee`, `_prefillFromURL`, `restoreSavedProgress`), also add:
     ```javascript
     } catch (e) { console.warn('[CP App] Non-critical error in <functionName>:', e); }
     ```
  5. Do NOT add alerts or user-visible errors for these — they are non-critical recovery paths.
  6. Save and push to repo. The Cloudflare Pages auto-deploy will pick it up.

  ---

  ## Phase C — Form & UX Fixes

  **Estimated time:** 2 hours  
  **Files:** `js/script.js`, `index.html`, `backend/code.gs`

  ### C1 — Add "No Context" Banner for Direct Arrivals [M1]

  **Goal:** Show a helpful banner when applicant lands without property context.

  **Steps:**
  1. Open `index.html`
  2. Find the `<form id="rentalApplication"` opening tag
  3. Add this div IMMEDIATELY BEFORE the form tag:
     ```html
     <div id="noContextBanner" style="display:none;" role="alert"></div>
     ```
  4. Open `js/script.js`, find `_showNoContextPrompt()`
  5. Replace or update its body to:
     ```javascript
     _showNoContextPrompt() {
       const banner = document.getElementById('noContextBanner');
       if (!banner) return;
       banner.style.display = 'block';
       banner.innerHTML = \`<div style="background:#fff8e1;border-left:4px solid #f59e0b;border-radius:6px;padding:14px 18px;margin-bottom:20px;display:flex;gap:12px;align-items:flex-start;font-size:14px;">
         <i class="fas fa-exclamation-triangle" style="color:#d97706;margin-top:2px;flex-shrink:0;font-size:18px;"></i>
         <div>
           <strong style="color:#92400e;">No property selected.</strong>
           <p style="margin:6px 0 0;color:#78350f;line-height:1.5;">You opened this form without selecting a property from our listings.
           Please <a href="https://choice-properties-site.pages.dev/listings.html" style="color:#2563eb;font-weight:600;text-decoration:underline;">browse available properties</a>
           and click <strong>Apply Now</strong> on the home you want to apply for.<br>
           <span style="font-size:12px;opacity:.8;">You can still fill out this form, but you'll need to enter the property address manually in Section 1.</span></p>
         </div>
       </div>\`;
     }
     ```
  6. Save and push.

  ---

  ### C2 — Fix Save & Resume Cross-Device Limitation Warning [I3]

  **Goal:** Clearly warn users the resume link only works on the same device.

  **Steps:**
  1. Open `js/script.js`, find `setupSaveResume()`
  2. Find the modal HTML string (the inner `modal.innerHTML = \`...\`` block)
  3. Find the description paragraph (`<p data-i18n="saveResumeDesc">...`
  4. AFTER that paragraph, add:
     ```html
     <p style="font-size:12px;color:#dc2626;background:#fef2f2;padding:8px 10px;border-radius:5px;margin-top:6px;margin-bottom:0;border-left:3px solid #dc2626;">
       <i class="fas fa-exclamation-triangle"></i>
       <strong>Same device only.</strong> This link must be opened in the same browser on this device.
     </p>
     ```
  5. Open `backend/code.gs`, find `sendResumeEmail()`
  6. In the email HTML body, find the resume link display area and add a note near the button:
     ```html
     <p style="font-size:12px;color:#6b7280;text-align:center;margin-top:8px;">
       ⚠️ Open this link on the same browser and device where you started your application.
     </p>
     ```
  7. Save and redeploy GAS. Save and push `js/script.js`.

  ---

  ### C3 — Fix File Upload Size Inconsistency [I4]

  **Goal:** Make the file size limit consistent and less likely to cause timeouts.

  **Steps:**
  1. Open `js/script.js`, find the `config` object in the constructor:
     ```javascript
     this.config = {
       LOCAL_STORAGE_KEY: "choicePropertiesRentalApp",
       AUTO_SAVE_INTERVAL: 30000,
       MAX_FILE_SIZE: 10 * 1024 * 1024   // ← DELETE THIS LINE
     };
     ```
     Remove the `MAX_FILE_SIZE` line entirely.
  2. Find `setupFileUploads()`. Change:
     ```javascript
     const MAX_SIZE  = 4 * 1024 * 1024;
     ```
     To:
     ```javascript
     const MAX_SIZE  = 2 * 1024 * 1024; // 2MB max to avoid GAS timeout on base64 encoding
     ```
  3. Find the alert message that says "4 MB" and change it to "2 MB":
     ```javascript
     alert(`"${file.name}" is larger than 4 MB and was not added.`);
     // Change to:
     alert(`"${file.name}" exceeds the 2 MB file size limit and was not added.`);
     ```
  4. Save and push.

  ---

  ## Phase D — Security Hardening

  **Estimated time:** 1.5 hours  
  **Files:** `js/script.js`, `backend/code.gs`, Geoapify dashboard

  ### D1 — Restrict Geoapify API Key by HTTP Referrer [I2]

  **No code change needed for this fix.**

  **Steps:**
  1. Log into the Geoapify dashboard at https://myprojects.geoapify.com
  2. Find the API key `bea2afb13c904abea5cb2c2693541dcf`
  3. Add referrer restrictions:
     - `https://apply-choice-properties.pages.dev/*`
     - `http://localhost:*` (for local development)
  4. Save changes.

  ---

  ### D2 — Reduce Admin Session Token TTL [M2]

  **Goal:** Reduce admin session from 30 days to 8 hours.

  **Steps:**
  1. Open `backend/code.gs`, find `doGet()`
  2. Find the inline JavaScript inside the landing page HTML. Look for:
     ```javascript
     if (sess && sess.token && (Date.now()-sess.savedAt < 30*24*60*60*1000) && sess.fp === _fp()) {
     ```
  3. Change `30*24*60*60*1000` to `8*60*60*1000`:
     ```javascript
     if (sess && sess.token && (Date.now()-sess.savedAt < 8*60*60*1000) && sess.fp === _fp()) {
     ```
  4. Save and redeploy.

  ---

  ### D3 — Add Basic CSRF Token Friction [M4]

  **Goal:** Make scripted POST requests slightly harder by requiring a session token.

  **Steps:**
  1. Open `js/script.js`, find `initialize()`
  2. Near the top of `initialize()`, add:
     ```javascript
     // Generate a lightweight session request token (not full CSRF, but adds bot friction)
     const _t = Math.random().toString(36).slice(2) + Date.now().toString(36);
     sessionStorage.setItem('_cpr', _t);
     ```
  3. Find `handleFormSubmit()`, in the section right before the `fetch()` call. After the formData is built and files are appended, add:
     ```javascript
     formData.append('_cpr', sessionStorage.getItem('_cpr') || '');
     ```
  4. Open `backend/code.gs`, find `doPost()`
  5. AFTER the honeypot check and BEFORE the rate limit check, add:
     ```javascript
     // Lightweight request token check — blocks scripted submissions without a session token
     const requestToken = formData['_cpr'] || '';
     if (!requestToken || requestToken.length < 8) {
       return ContentService
         .createTextOutput(JSON.stringify({ success: false, error: 'Invalid request. Please reload the page and try again.' }))
         .setMimeType(ContentService.MimeType.JSON);
     }
     ```
  6. Save both files, redeploy GAS, push `js/script.js`.

  ---

  ## Phase E — Infrastructure Resilience

  **Estimated time:** 1 hour  
  **Files:** `index.html`, `js/script.js`, `_headers`, `js/cp-api.js` (Choice repo)

  ### E1 — Centralize GAS Backend URL in Config [B1]

  **Goal:** Single place to update the GAS URL.

  **Steps:**
  1. Open `index.html`
  2. Find the `<script src="js/script.js"` tag
  3. Add BEFORE it (inside `<head>` or just before that script tag):
     ```html
     <script>
       window.CP_CONFIG = {
         BACKEND_URL: 'https://script.google.com/macros/s/AKfycbwqctrCLYOPaz1nZeMS5SXuqK7FRXbN5Bf0dSx3-3leyp_B7Bfr4HPC8YZaZ9wZVxtn/exec'
       };
     </script>
     ```
  4. Open `js/script.js`, find the constructor where `this.BACKEND_URL` is set:
     ```javascript
     this.BACKEND_URL = 'https://script.google.com/macros/s/...';
     ```
     Change to:
     ```javascript
     this.BACKEND_URL = (window.CP_CONFIG && window.CP_CONFIG.BACKEND_URL)
       ? window.CP_CONFIG.BACKEND_URL
       : 'https://script.google.com/macros/s/AKfycbwqctrCLYOPaz1nZeMS5SXuqK7FRXbN5Bf0dSx3-3leyp_B7Bfr4HPC8YZaZ9wZVxtn/exec';
     ```
  5. Save and push. Future GAS URL changes only require editing `index.html`.

  ---

  ### E2 — Fix CSP to Allow Listing Platform Images [I6]

  **Goal:** Allow property images from Supabase and ImageKit CDN.

  **Steps:**
  1. Open `_headers`
  2. Find the `Content-Security-Policy` line
  3. Update the `img-src` directive from:
     ```
     img-src 'self' data:;
     ```
     To:
     ```
     img-src 'self' data: https://*.supabase.co https://*.imagekit.io;
     ```
  4. Save and push.

  ---

  ## Phase F — Choice Repo Fixes (Listing Platform)

  **Estimated time:** 45 minutes  
  **Files:** `js/cp-api.js` in `choice121/Choice` repo  
  **Note:** Push to Choice repo, not Apply_choice_properties repo.

  ### F1 — Add URL Length Warning in buildApplyURL [B2]

  **Goal:** Warn when Apply URL approaches browser length limits.

  **Steps:**
  1. Open `js/cp-api.js` in the Choice repo
  2. Find `buildApplyURL()`, near the end where it returns the URL:
     ```javascript
     return `${base}?${p.toString()}`;
     ```
  3. Change to:
     ```javascript
     const finalUrl = base + '?' + p.toString();
     if (finalUrl.length > 6000) {
       console.warn('[CP] buildApplyURL: URL is ' + finalUrl.length + ' chars — may be truncated on older browsers/proxies. Consider moving to token-based context passing.');
     }
     return finalUrl;
     ```
  4. Save and push to Choice repo.

  ---

  ## Completion Checklist

  After all phases are done, verify:

  - [ ] Phase A: All 4 GAS backend fixes applied and GAS redeployed
  - [ ] Phase B: Health endpoint working, catch blocks logging, property validation active
  - [ ] Phase C: No-context banner visible, file limits at 2MB, save/resume warning present
  - [ ] Phase D: Geoapify key restricted, admin session 8hr, CSRF token in place
  - [ ] Phase E: CSP updated, backend URL in config
  - [ ] Phase F: URL length warning in Choice repo
  - [ ] `ISSUES.md` updated with all resolved items marked `[x]`
  - [ ] `PROJECT_STATUS.md` Phase 10 section updated with completion date
  