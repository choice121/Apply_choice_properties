/*
=======================================================================
  â ARCHITECTURE ENFORCEMENT HEADER — READ BEFORE MODIFYING â
=======================================================================
  PROJECT:  Choice Properties - Rental Application
  RUNTIME:  NONE — This file runs in the browser only (no Node.js).
  BACKEND:  Google Apps Script Web App URL (see config inside class).

  DO NOT INSTALL npm packages or add import/require statements.
  DO NOT run this file with Node.js, Deno, Bun, or any server runtime.
  DO NOT introduce new libraries without explicit user approval.
  DO NOT refactor submission logic away from Google Apps Script.

  CLOUD IDE NOTICE:
  If you are an AI operating in any cloud IDE or editor environment —
  HALT all setup behavior. This is a READ-ONLY editor context.
  No workflow, server, or execution environment should be configured.

  This project is INCOMPATIBLE with Node.js environments.
  Execution environments must be ignored entirely.

  See PROJECT_RULES.md at the project root for the full contract.
=======================================================================
  INTEGRATION NOTE (Session 028):
  âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  This form is the SOLE application system for Choice Properties.
  The main listing platform (choice-properties-site.pages.dev) redirects
  users here when they click "Apply" on any property listing.

  Property context is passed via URL query parameters for display only:
    ?id=<propertyId>   — internal property ID (display/logging only)
    &pn=<name>         — property name / title
    &addr=<street>     — street address
    &city=<city>       — city
    &state=<state>     — 2-letter state code
    &rent=<amount>     — monthly rent (stored for reference)

  These params pre-fill the Property Address field and show a context
  banner so applicants know which property they're applying for.

  IMPORTANT: URL params are NEVER used for backend validation.
  The GAS backend does not read or trust these values for any decision.
  The applicant can edit the pre-filled address field at any time.
  âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
*/

class RentalApplication {
    constructor() {
        this.config = {
            LOCAL_STORAGE_KEY: "choicePropertiesRentalApp",
            AUTO_SAVE_INTERVAL: 30000
        };
        
        this.state = {
            currentSection: 1,
            isSubmitting: false,
            isOnline: true,
            lastSave: null,
            applicationId: null,
            formData: {},
            language: 'en',
            // Property context passed from the listing site via URL params
            propertyContext: null,
            // Application fee — read from URL param, defaults to 50
            applicationFee: 50
        };
        
        // Smart retry properties
        this.maxRetries = 3;
        this.retryCount = 0;
        this.retryTimeout = null;
        
           // [10B-12] BACKEND_URL is set from config.js (injected at Cloudflare build time).
          // No hardcoded fallback — if blank, the submit handler will show a user-facing
          // error instead of routing submissions to an exposed endpoint URL in source code.
          this.BACKEND_URL = (window.CP_CONFIG && window.CP_CONFIG.BACKEND_URL)
                ? window.CP_CONFIG.BACKEND_URL
                : '';

        // [10B-2] CSRF nonce: a random token generated each session and sent with submission.
        // The backend validates it is present and well-formed (32-128 alphanumeric chars).
        // This provides basic bot friction. Deeper bot protection is server-side via
        // honeypot validation in doPost().

        this.initialize();
    }

    // ---------- SSN toggle ----------
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

    // ---------- Event listeners ----------
    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('.btn-next') || e.target.closest('.btn-next')) {
                const section = this.getCurrentSection();
                this.nextSection(section);
            }
            if (e.target.matches('.btn-prev') || e.target.closest('.btn-prev')) {
                const section = this.getCurrentSection();
                this.previousSection(section);
            }
        });
        document.addEventListener('input', this.debounce(() => {
            this.saveProgress();
        }, 1000));
        const form = document.getElementById('rentalApplication');
        if (form) {
            form.addEventListener('submit', (e) => {
                this.handleFormSubmit(e);
            });
        }
    }

    // ---------- Initialization ----------
    initialize() {
        // Generate and store a CSRF nonce for the session — required by the backend
        this._csrfToken = this.generateCsrfNonce();
        sessionStorage.setItem('_cp_csrf', this._csrfToken);
        this.setupEventListeners();
        this.setupOfflineDetection();
        this.setupRealTimeValidation();
        this.setupSSNToggle();
        this.setupFileUploads();
        this.setupConditionalFields();
        this.setupCharacterCounters();
        // [L4 fix] If URL has a server-side resume token, restore from backend; else use localStorage
          const _resumeParam = new URLSearchParams(window.location.search).get('resume');
          if (_resumeParam && _resumeParam !== '1') {
              this._restoreFromServer(_resumeParam);
          } else {
              this.restoreSavedProgress();
          }
          // [10A-1] Re-run employer field toggle after progress restore so that a
          // saved employment status (e.g. Unemployed) immediately shows/hides the
          // correct fields without requiring the user to interact with the dropdown.
          if (this._toggleEmployerSection) {
              const _empEl = document.getElementById('employmentStatus');
              if (_empEl) this._toggleEmployerSection(_empEl.value);
          }
          this.setupGeoapify();
        this.setupInputFormatting();
        this._readApplicationFee();
        this.setupLanguageToggle();
        this.setupSaveResume();

        this._autoSaveTimer = setInterval(() => this.saveProgress(), this.config.AUTO_SAVE_INTERVAL);

        // Initialise fields-remaining hint for the first section
        setTimeout(() => this.updateFieldsRemainingHint(1), 50);

        // ââ Read URL params from listing site and pre-fill form ââ
        this._prefillFromURL();
        
        const savedAppId = sessionStorage.getItem('lastSuccessAppId');
        if (savedAppId) {
            document.getElementById('rentalApplication').style.display = 'none';
            this.showSuccessState(savedAppId);
        }
        
        console.log('Rental Application Manager Initialized');
    }


    // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    // APPLICATION FEE — read from URL param before translations are built.
    // Falls back to 50 if the param is absent from the URL.
    // Zero-fee fix: fee=0 is a valid value (free application). The old
    // check `if (fee && fee > 0)` treated 0 as falsy and fell back to $50,
    // so applicants for free-application properties saw the wrong fee.
    // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    _readApplicationFee() {
        try {
            const p      = new URLSearchParams(window.location.search);
            const rawFee = p.get('fee');
            if (rawFee === null) return; // param absent — keep default of 50
            const fee = parseFloat(rawFee);
            if (isNaN(fee)) return;      // unparseable — keep default
            this.state.applicationFee = fee;
            const feeTitle  = document.querySelector('[data-i18n="feeTitle"]');
            const feeAmount = document.querySelector('.fee-amount');
            if (fee <= 0) {
                if (feeTitle)  feeTitle.textContent  = 'Application Fee: Free';
                if (feeAmount) feeAmount.textContent = 'Free';
            } else {
                const formatted = '$' + fee.toFixed(2);
                if (feeTitle)  feeTitle.textContent  = 'Application Fee: ' + formatted;
                if (feeAmount) feeAmount.textContent = '$' + fee.toFixed(0);
            }
        } catch (e) { console.warn('[CP App] Non-critical error in _readApplicationFee:', e); }
    }

    // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    // URL PRE-FILL — reads context passed by the main listing platform.
    // Params: id, pn (name), addr, city, state, rent
    // All values are display-only. Backend never uses or validates these.
    // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    _prefillFromURL() {
        try {
            const p     = new URLSearchParams(window.location.search);
            const id    = p.get('id')    || '';
            const name  = p.get('pn')   || '';
            const addr  = p.get('addr') || '';
            const city  = p.get('city') || '';
            const state = p.get('state') || '';
            const rent  = p.get('rent') || '';

            // Nothing useful in the URL — show manual-entry prompt and return
            if (!id && !name && !addr && !city) { this._showNoContextPrompt(); return; }

            // Store context on instance for later use (success page, etc.)
            this.state.propertyContext = { id, name, addr, city, state, rent };

            // Populate hidden inputs so FormData serialises them automatically
            const setHidden = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
            setHidden('hiddenPropertyId',    id);
            setHidden('hiddenPropertyName',  name);
            setHidden('hiddenPropertyCity',  city);
            setHidden('hiddenPropertyState', state);
            setHidden('hiddenListedRent',    rent);
              // Additional property context params
              const zip        = p.get('zip')         || '';
              const deposit    = p.get('deposit')     || '';
              const fee        = p.get('fee')         || '';
              const beds       = p.get('beds')        || '';
              const baths      = p.get('baths')       || '';
              const avail      = p.get('avail')       || '';
              const terms      = p.get('terms')       || '';
              const minMonths  = p.get('min_months')  || '';
              const pets       = p.get('pets')        || '';
              const petTypes   = p.get('pet_types')   || '';
              const petWeight  = p.get('pet_weight')  || '';
              const petDeposit = p.get('pet_deposit') || '';
              const petDetails = p.get('pet_details') || '';
              const smoking    = p.get('smoking')     || '';
              const utilities  = p.get('utilities')   || '';
              const parking    = p.get('parking')     || '';
              const parkingFee     = p.get('parking_fee')     || '';
              const garageSpaces  = p.get('garage_spaces')   || '';
              const evCharging    = p.get('ev_charging')     || '';
              const laundryType   = p.get('laundry_type')    || '';
              const heatingType   = p.get('heating_type')    || '';
              const coolingType   = p.get('cooling_type')    || '';
              const lastMonthsRent = p.get('last_months_rent') || '';
              const adminFee      = p.get('admin_fee')       || '';
              const moveInSpecial = p.get('move_in_special')  || '';

              setHidden('hiddenPropertyZip',     zip);
              setHidden('hiddenPropertyAddress', addr);
              setHidden('hiddenSecurityDeposit', deposit);
              setHidden('hiddenApplicationFee',  fee);
              setHidden('hiddenBedrooms',        beds);
              setHidden('hiddenBathrooms',       baths);
              setHidden('hiddenAvailableDate',   avail);
              // Enforce available date as minimum move-in date so users can't
              // select a date before the property is actually available
              if (avail) {
                  const moveInField = document.getElementById('requestedMoveIn');
                  if (moveInField) moveInField.min = avail;
              }
              setHidden('hiddenLeaseTerms',      terms);
              setHidden('hiddenMinLeaseMonths',  minMonths);
              // Fix: Populate "Desired Lease Term" dropdown with allowed options from URL params
                if (terms) {
                    const termsList = terms.split('|').map(t => t.trim()).filter(Boolean);
                    const leaseSelect = document.getElementById('desiredLeaseTerm');
                    if (leaseSelect && termsList.length) {
                        // Remove all options except the placeholder
                        while (leaseSelect.options.length > 1) leaseSelect.remove(1);
                        termsList.forEach(term => {
                            const opt = document.createElement('option');
                            opt.value = term;
                            opt.textContent = term;
                            leaseSelect.appendChild(opt);
                        });
                        // Auto-select when only one term is available (no manual choice needed)
                        if (termsList.length === 1) {
                            leaseSelect.value = termsList[0];
                            leaseSelect.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    }
                }
              // 9C-2: store source URL so success screen can link back to the original listing
              const source = p.get('source') || '';
              if (source) this.state.sourceUrl = source;

              setHidden('hiddenPetsAllowed',     pets);
              setHidden('hiddenPetTypes',        petTypes);
              setHidden('hiddenPetWeightLimit',  petWeight);
              setHidden('hiddenPetDeposit',      petDeposit);
              setHidden('hiddenPetDetails',      petDetails);
              setHidden('hiddenSmokingAllowed',  smoking);
              // ── Phase 1 fix 1.2: Enforce pet policy from URL param ──
              if (pets && pets.toLowerCase() !== 'true') {
                  const petsNoRadio = document.getElementById('petsNo');
                  const petsYesRadio = document.getElementById('petsYes');
                  if (petsNoRadio) { petsNoRadio.checked = true; petsNoRadio.dispatchEvent(new Event('change', { bubbles: true })); }
                  if (petsYesRadio) petsYesRadio.disabled = true;
                  if (petsNoRadio) petsNoRadio.disabled = true;
                  const petDetailsGroup = document.getElementById('petDetailsGroup');
                  if (petDetailsGroup) petDetailsGroup.style.display = 'none';
              }

              // ── Phase 1 fix 1.3: Enforce smoking policy from URL param ──
              if (smoking && smoking.toLowerCase() !== 'true') {
                  const smokeNoRadio = document.getElementById('smokeNo');
                  const smokeYesRadio = document.getElementById('smokeYes');
                  if (smokeNoRadio) { smokeNoRadio.checked = true; smokeNoRadio.dispatchEvent(new Event('change', { bubbles: true })); }
                  if (smokeYesRadio) smokeYesRadio.disabled = true;
                  if (smokeNoRadio) smokeNoRadio.disabled = true;
              }


              setHidden('hiddenUtilities',       utilities);
              setHidden('hiddenParking',         parking);
              setHidden('hiddenParkingFee',      parkingFee);
              setHidden('hiddenGarageSpaces',    garageSpaces);
              setHidden('hiddenEvCharging',      evCharging);
              setHidden('hiddenLaundryType',     laundryType);
              setHidden('hiddenHeatingType',     heatingType);
              setHidden('hiddenCoolingType',     coolingType);
              setHidden('hiddenLastMonthsRent',  lastMonthsRent);
              setHidden('hiddenAdminFee',        adminFee);
              setHidden('hiddenMoveInSpecial',   moveInSpecial);

            // Build a formatted address string for the property address field
            const streetParts = [addr, city, state].filter(Boolean);
            const formattedAddr = streetParts.length
                ? streetParts.join(', ')
                : name; // fallback: use property name if no address parts

            // Pre-fill the property address field (Step 1) — URL params always take priority
            const addrField = document.getElementById('propertyAddress');
            if (addrField && formattedAddr) {
                addrField.value = formattedAddr;
                addrField.dispatchEvent(new Event('input', { bubbles: true }));
            }

            // Show the property context banner (with extended listing details)
            this._showPropertyBanner({ id, name, addr, city, state, rent, beds, baths, deposit, avail, terms, lastMonthsRent, adminFee, moveInSpecial, laundryType, heatingType, coolingType, garageSpaces, evCharging, parkingFee });

        } catch (err) {
            // Silent — never break the form over a missing URL param
            console.warn('_prefillFromURL error (non-fatal):', err);
        }
    }

    // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    // PROPERTY CONTEXT BANNER — shown between header and progress bar.
    // Lets applicants confirm they're applying for the right property.
    // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    _showPropertyBanner({ id, name, addr, city, state, rent, beds, baths, deposit, avail, terms, lastMonthsRent, adminFee, moveInSpecial, laundryType, heatingType, coolingType, garageSpaces, evCharging, parkingFee }) {
        if (!name && !addr && !city) return;

        const displayName = name || 'Selected Property';
        const locationParts = [city, state].filter(Boolean).map(s => this._escHtml(s));
        const locationLine = locationParts.length ? locationParts.join(', ') : '';
        const rentLine = rent
            ? '$' + parseFloat(rent).toLocaleString('en-US') + '/mo'
            : '';

        const metaParts = [locationLine, rentLine].filter(Boolean);
        const metaLine = metaParts.join(' &nbsp;·&nbsp; ');

        // Build listing detail chips (beds / baths / deposit / available / lease terms)
        const chips = [];
        if (beds)    chips.push('<span class="pcb-chip"><i class="fas fa-bed"></i> ' + this._escHtml(beds) + ' Bed</span>');
        if (baths)   chips.push('<span class="pcb-chip"><i class="fas fa-bath"></i> ' + this._escHtml(baths) + ' Bath</span>');
        if (deposit) chips.push('<span class="pcb-chip"><i class="fas fa-dollar-sign"></i> $' + parseFloat(deposit).toLocaleString('en-US') + ' Deposit</span>');
        if (avail)   chips.push('<span class="pcb-chip"><i class="fas fa-calendar-check"></i> Avail ' + this._escHtml(avail) + '</span>');
        if (terms) {
            const termsList = terms.split('|').map(function(t) { return t.trim(); }).filter(Boolean);
            if (termsList.length) {
                const termsLabel = termsList.map(function(t) {
                    return t.replace(/(\d+)\s*months?/i, '$1-mo');
                }).join(', ');
                chips.push('<span class="pcb-chip"><i class="fas fa-file-contract"></i> ' + this._escHtml(termsLabel) + '</span>');
            }
        }
        if (lastMonthsRent) chips.push('<span class="pcb-chip"><i class="fas fa-calendar-alt"></i> $' + parseFloat(lastMonthsRent).toLocaleString('en-US') + ' Last Mo. Rent</span>');
        if (adminFee)       chips.push('<span class="pcb-chip"><i class="fas fa-receipt"></i> $' + parseFloat(adminFee).toLocaleString('en-US') + ' Admin Fee</span>');
        if (moveInSpecial)  chips.push('<span class="pcb-chip pcb-chip-promo"><i class="fas fa-tag"></i> ' + this._escHtml(moveInSpecial) + '</span>');
        if (laundryType)    chips.push('<span class="pcb-chip"><i class="fas fa-shirt"></i> ' + this._escHtml(laundryType) + '</span>');
        if (heatingType)    chips.push('<span class="pcb-chip"><i class="fas fa-fire"></i> ' + this._escHtml(heatingType) + '</span>');
        if (coolingType)    chips.push('<span class="pcb-chip"><i class="fas fa-snowflake"></i> ' + this._escHtml(coolingType) + '</span>');
        if (garageSpaces)   chips.push('<span class="pcb-chip"><i class="fas fa-car-side"></i> ' + this._escHtml(garageSpaces) + ' Space(s)</span>');
        if (evCharging && evCharging !== 'none') chips.push('<span class="pcb-chip"><i class="fas fa-charging-station"></i> EV: ' + this._escHtml(evCharging) + '</span>');
        if (parkingFee)     chips.push('<span class="pcb-chip"><i class="fas fa-dollar-sign"></i> $' + parseFloat(parkingFee).toLocaleString('en-US') + '/mo Parking</span>');
        const chipsHtml = chips.length ? '<div class="pcb-chips">' + chips.join('') + '</div>' : '';

        // Back-to-listing link — only shown when a property ID was passed
        const backLinkHtml = id
            ? '<a href="' + (window.CP_CONFIG && window.CP_CONFIG.LISTING_SITE_URL ? window.CP_CONFIG.LISTING_SITE_URL : 'https://choice-properties-site.pages.dev') + '/property.html?id=' + encodeURIComponent(id) + '" class="pcb-back-link" target="_blank" rel="noopener">' +
                  '<i class="fas fa-arrow-left"></i> <span data-i18n="viewListing">View listing</span>' +
              '</a>'
            : '';

        const banner = document.createElement('div');
        banner.id = 'propertyContextBanner';
        banner.className = 'property-context-banner';
        banner.setAttribute('role', 'note');
        banner.setAttribute('aria-label', 'Property you are applying for');
        banner.innerHTML =
            '<div class="pcb-inner">' +
                '<div class="pcb-left">' +
                    '<div class="pcb-icon"><i class="fas fa-home"></i></div>' +
                    '<div class="pcb-text">' +
                        '<div class="pcb-label" data-i18n="applyingFor">Applying for</div>' +
                        '<div class="pcb-name">' + this._escHtml(displayName) + '</div>' +
                        (metaLine ? '<div class="pcb-meta">' + metaLine + '</div>' : '') +
                        chipsHtml +
                    '</div>' +
                '</div>' +
                '<div class="pcb-right">' +
                    '<div class="pcb-managed">' +
                        '<i class="fas fa-shield-alt"></i>' +
                        '<span><span data-i18n="managedBy">Managed by</span> <strong>Choice Properties</strong></span>' +
                    '</div>' +
                    backLinkHtml +
                '</div>' +
            '</div>';

        // Insert before the progress bar
        const progressContainer = document.querySelector('.progress-container');
        if (progressContainer && progressContainer.parentNode) {
            progressContainer.parentNode.insertBefore(banner, progressContainer);
        } else {
            const container = document.querySelector('.container');
            if (container) container.insertBefore(banner, container.firstChild);
        }
    }

    // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    // NO-CONTEXT PROMPT — shown when the form is opened without URL params.
    // Guides the applicant to manually enter the property address on Step 1.
    // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    _showNoContextPrompt() {
        const banner = document.createElement('div');
        banner.id = 'noContextBanner';
        banner.className = 'no-context-banner';
        banner.setAttribute('role', 'note');
        banner.setAttribute('aria-label', 'Property address required');
        const tNc = this.getTranslations();
        banner.innerHTML =
            '<div class="ncb-inner">' +
                '<div class="ncb-icon"><i class="fas fa-map-marker-alt"></i></div>' +
                '<div class="ncb-text">' +
                    '<div class="ncb-title" data-i18n="noContextTitle">' + tNc.noContextTitle + '</div>' +
                    '<div class="ncb-sub" data-i18n="noContextSub">' + tNc.noContextSub + '</div>' +
                    '<a href="' + (window.CP_CONFIG && window.CP_CONFIG.LISTING_SITE_URL ? window.CP_CONFIG.LISTING_SITE_URL : 'https://choice-properties-site.pages.dev') + '/listings.html" class="ncb-browse-link" data-i18n="browseListings">' +
                        '<i class="fas fa-search"></i>Browse Available Listings' +
                    '</a>' +
                '</div>' +
            '</div>';

        const progressContainer = document.querySelector('.progress-container');
        if (progressContainer && progressContainer.parentNode) {
            progressContainer.parentNode.insertBefore(banner, progressContainer);
        } else {
            const container = document.querySelector('.container');
            if (container) container.insertBefore(banner, container.firstChild);
        }

        // Softly highlight the property address field when it is visible
        const addrField = document.getElementById('propertyAddress');
        if (addrField) {
            addrField.style.borderColor = '#c9a04a';
            addrField.style.boxShadow   = '0 0 0 3px rgba(201,160,74,0.18)';
            addrField.addEventListener('input', function onInput() {
                addrField.style.borderColor = '';
                addrField.style.boxShadow   = '';
                addrField.removeEventListener('input', onInput);
            }, { once: true });
        }
    }

    // Simple HTML escaper used in the property banner
    _escHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // ---------- Offline detection ----------

    setupOfflineDetection() {
        window.addEventListener('online', () => {
            this.setState({ isOnline: true });
        });
        window.addEventListener('offline', () => {
            this.setState({ isOnline: false });
        });
        this.setState({ isOnline: navigator.onLine });
    }

    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.updateUIState();
    }

    updateUIState() {
        const offlineIndicator = document.getElementById('offlineIndicator');
        if (offlineIndicator) {
            offlineIndicator.style.display = this.state.isOnline ? 'none' : 'block';
        }
        const submitBtn = document.getElementById('mainSubmitBtn');
        if (submitBtn) {
            submitBtn.disabled = !this.state.isOnline;
            submitBtn.title = this.state.isOnline ? '' : 'You are offline';
        }
    }

    // ---------- Geoapify ----------
    setupGeoapify() {
        const apiKey = (window.CP_CONFIG && window.CP_CONFIG.GEOAPIFY_API_KEY) || '';
          if (!apiKey) {
              console.warn('[CP] GEOAPIFY_API_KEY not configured — address autocomplete disabled');
              return;
          }
        const fields = ['propertyAddress', 'currentAddress'];
        fields.forEach(id => {
            const input = document.getElementById(id);
            if (!input) return;
            const container = document.createElement('div');
            container.style.position = 'relative';
            input.parentNode.insertBefore(container, input);
            container.appendChild(input);
            const dropdown = document.createElement('div');
            dropdown.className = 'autocomplete-dropdown';
            dropdown.style.cssText = 'position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #ddd; z-index: 1000; display: none; max-height: 200px; overflow-y: auto; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-radius: 4px;';
            container.appendChild(dropdown);
            input.addEventListener('input', this.debounce(async (e) => {
                const text = e.target.value;
                if (text.length < 3) {
                    dropdown.style.display = 'none';
                    return;
                }
                try {
                    const response = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(text)}&apiKey=${apiKey}`);
                    const data = await response.json();
                    if (data.features && data.features.length > 0) {
                        dropdown.innerHTML = '';
                        data.features.forEach(feature => {
                            const item = document.createElement('div');
                            item.style.cssText = 'padding: 10px; cursor: pointer; border-bottom: 1px solid #eee; font-size: 14px;';
                            item.textContent = feature.properties.formatted;
                            item.addEventListener('mouseover', () => item.style.background = '#f0f7ff');
                            item.addEventListener('mouseout', () => item.style.background = 'white');
                            item.addEventListener('click', () => {
                                input.value = feature.properties.formatted;
                                dropdown.style.display = 'none';
                                this.saveProgress();
                            });
                            dropdown.appendChild(item);
                        });
                        dropdown.style.display = 'block';
                    } else {
                        dropdown.style.display = 'none';
                    }
                } catch (err) {
                    console.error('Geocoding error:', err);
                }
            }, 300));
            document.addEventListener('click', (e) => {
                if (!container.contains(e.target)) dropdown.style.display = 'none';
            });
        });
    }

    // ---------- Input formatting (phone, SSN) ----------
    setupInputFormatting() {
        const phoneFields = ['phone', 'landlordPhone', 'supervisorPhone', 'ref1Phone', 'ref2Phone', 'emergencyPhone', 'coPhone'];
        phoneFields.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', (e) => {
                    let x = e.target.value.replace(/\D/g, '').match(/(\d{0,3})(\d{0,3})(\d{0,4})/);
                    e.target.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
                });
            }
        });
        const ssnEl = document.getElementById('ssn');
        if (ssnEl) {
            ssnEl.addEventListener('input', (e) => {
                let val = e.target.value.replace(/\D/g, '');
                if (val.length > 4) val = val.substring(0, 4);
                e.target.value = val;
                if (val.length === 4) this.clearError(ssnEl);
            });
            ssnEl.addEventListener('blur', () => this.validateField(ssnEl));
        }
        const coSsnEl = document.getElementById('coSsn');
        if (coSsnEl) {
            coSsnEl.addEventListener('input', (e) => {
                let val = e.target.value.replace(/\D/g, '');
                if (val.length > 4) val = val.substring(0, 4);
                e.target.value = val;
                if (val.length === 4) this.clearError(coSsnEl);
            });
        }
    }

    // ---------- Real-time validation ----------
    setupRealTimeValidation() {
        const form = document.getElementById('rentalApplication');
        if (!form) return;
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            const refresh = () => {
                // Only validate if the field has been touched (has a value or is losing focus)
                if (input.value.trim() || input.checked) this.validateField(input);
                const activeSection = this.getCurrentSection();
                this.updateFieldsRemainingHint(activeSection);
            };
            input.addEventListener('input', refresh);
            input.addEventListener('change', refresh);
            input.addEventListener('blur', () => {
                this.validateField(input);
                const activeSection = this.getCurrentSection();
                this.updateFieldsRemainingHint(activeSection);
            });
        });
    }

    // ---------- Validation logic ----------
    validateField(field) {
        let isValid = true;
        let errorMessage = 'Required';
        if (field.id === 'ssn' || field.id === 'coSsn') {
            const ssnVal = field.value.replace(/\D/g, '');
            if (!ssnVal) {
                isValid = false;
                errorMessage = this.state.language === 'en' ? 'Please enter the last 4 digits of your SSN.' : 'Por favor ingrese los últimos 4 dígitos de su SSN.';
            } else if (ssnVal.length < 4) {
                isValid = false;
                errorMessage = this.state.language === 'en' ? 'SSN must contain 4 digits.' : 'El SSN debe contener 4 dígitos.';
            } else if (/[^0-9]/.test(field.value)) {
                isValid = false;
                errorMessage = this.state.language === 'en' ? 'SSN must contain numbers only.' : 'El SSN debe contener solo números.';
            }
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
        } else if (field.hasAttribute('required')) {
            if (field.type === 'checkbox') {
                isValid = field.checked;
            } else if (!field.value.trim()) {
                isValid = false;
            }
            if (!isValid) {
                errorMessage = this.state.language === 'en' ? 'Required' : 'Campo obligatorio';
            }
        }
        if (isValid && field.value.trim()) {
            if (field.type === 'email') {
                const email = field.value.trim();
                if (!email.includes('@')) {
                    isValid = false;
                    errorMessage = this.state.language === 'en' ? 'Email must include an @ symbol.' : 'El correo debe incluir un símbolo @.';
                } else {
                    const parts = email.split('@');
                    if (!parts[1] || !parts[1].includes('.')) {
                        isValid = false;
                        errorMessage = this.state.language === 'en' ? 'Add a valid domain (e.g., gmail.com).' : 'Agregue un dominio válido (ej. gmail.com).';
                    } else {
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        isValid = emailRegex.test(email);
                        if (!isValid) {
                            errorMessage = this.state.language === 'en' ? 'Enter a valid email (example: name@email.com).' : 'Ingrese un correo válido (ejemplo: nombre@email.com).';
                        }
                    }
                }
            } else if (field.type === 'tel') {
                const phoneDigits = field.value.replace(/\D/g, '');
                isValid = phoneDigits.length >= 10;
                if (!isValid) {
                    errorMessage = this.state.language === 'en' ? 'Invalid phone' : 'Teléfono inválido';
                }
            }
        }
        if (isValid) {
            this.clearError(field);
            field.classList.add('is-valid');
            field.classList.remove('is-invalid');
        } else {
            this.showError(field, errorMessage);
            field.classList.add('is-invalid');
            field.classList.remove('is-valid');
            field.classList.add('shake');
            setTimeout(() => field.classList.remove('shake'), 400);
        }
        return isValid;
    }

    showError(field, message) {
        field.classList.add('error');
        const errorMsg = field.closest('.form-group')?.querySelector('.error-message');
        if (errorMsg) {
            errorMsg.textContent = message;
            errorMsg.style.display = 'block';
        }
    }

    clearError(field) {
        field.classList.remove('error');
        const errorMsg = field.closest('.form-group')?.querySelector('.error-message');
        if (errorMsg) {
            errorMsg.style.display = 'none';
        }
    }

    // ---------- Section navigation ----------
    getCurrentSection() {
        const activeSection = document.querySelector('.form-section.active');
        return activeSection ? parseInt(activeSection.id.replace('section', '')) : 1;
    }

    nextSection(currentSection) {
        if (!this.validateStep(currentSection)) return;
        this.hideSection(currentSection);
        this._slideDir = 'forward';
        this.showSection(currentSection + 1);
        this.updateProgressBar();
        if (currentSection + 1 === 6) this.generateApplicationSummary();
    }

    previousSection(currentSection) {
        if (currentSection > 1) {
            this.hideSection(currentSection);
            this._slideDir = 'back';
            this.showSection(currentSection - 1);
            this.updateProgressBar();
        }
    }

    hideSection(sectionNumber) {
        const section = document.getElementById(`section${sectionNumber}`);
        if (section) section.classList.remove('active', 'slide-back');
    }

    showSection(sectionNumber) {
        const section = document.getElementById(`section${sectionNumber}`);
        if (section) {
            section.classList.remove('slide-back');
            if (this._slideDir === 'back') section.classList.add('slide-back');
            this._slideDir = null;
            section.classList.add('active');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            this.updateFieldsRemainingHint(sectionNumber);
            this._updateStartOverBtn(sectionNumber);
        }
    }

    // ---------- Start Over ----------
    _updateStartOverBtn(sectionNumber) {
        const btn = document.getElementById('startOverBtn');
        if (!btn) return;
        btn.classList.toggle('visible', sectionNumber > 1);
    }

    _openClearSheet() {
        document.getElementById('clearFormOverlay').classList.add('open');
        document.getElementById('clearFormSheet').classList.add('open');
    }

    _closeClearSheet() {
        document.getElementById('clearFormOverlay').classList.remove('open');
        document.getElementById('clearFormSheet').classList.remove('open');
    }

    _clearForm() {
        try { localStorage.removeItem(this.config.LOCAL_STORAGE_KEY); } catch(e) {}
        location.reload();
    }

    // ---------- Fields-remaining hint on Next button ----------
    updateFieldsRemainingHint(sectionNumber) {
        const section = document.getElementById(`section${sectionNumber}`);
        if (!section) return;
        const nextBtn = section.querySelector('.btn-next');
        if (!nextBtn) return;

        let hint = nextBtn.parentElement.querySelector('.btn-hint');
        if (!hint) {
            hint = document.createElement('span');
            hint.className = 'btn-hint';
            nextBtn.parentElement.appendChild(hint);
        }

        const inputs = section.querySelectorAll('input[required], select[required], textarea[required]');
        let emptyCount = 0;
        inputs.forEach(input => {
            if (input.type === 'checkbox') {
                if (!input.checked) emptyCount++;
            } else if (!input.value.trim()) {
                emptyCount++;
            }
        });

        if (emptyCount > 0) {
            hint.textContent = emptyCount === 1
                ? '1 required field still needs to be filled'
                : `${emptyCount} required fields still need to be filled`;
            hint.classList.add('has-remaining');
        } else {
            hint.textContent = '';
            hint.classList.remove('has-remaining');
        }
    }

    updateProgressBar() {
        const currentSection = this.getCurrentSection();
        const progress = ((currentSection - 1) / 5) * 100;
        const progressFill = document.getElementById('progressFill');
        if (progressFill) progressFill.style.width = `${progress}%`;
        const progressContainer = document.querySelector('.progress-container');
        const t = this.getTranslations();
        const stepNames = [t.step1Label, t.step2Label, t.step3Label, t.step4Label, t.step5Label, t.step6Label];
        const progressText = `${t.stepPrefix} ${currentSection} ${t.stepOf} 6: ${stepNames[currentSection-1]}`;
        if (progressContainer) progressContainer.setAttribute('data-progress-text', progressText);
        for (let i = 1; i <= 6; i++) {
            const step = document.getElementById(`step${i}`);
            if (step) {
                step.classList.remove('active', 'completed');
                if (i < currentSection) step.classList.add('completed');
                if (i === currentSection) step.classList.add('active');
            }
        }
    }

    // ---------- Step validation ----------
    validateStep(stepNumber) {
        if (stepNumber === 5) {
            const isUnique = this.validatePaymentSelections();
            if (!isUnique) {
                const warning = document.getElementById('paymentDuplicateWarning');
                if (warning) {
                    warning.classList.add('shake');
                    setTimeout(() => warning.classList.remove('shake'), 400);
                }
                return false;
            }
        }
        const section = document.getElementById(`section${stepNumber}`);
        if (!section) return true;
        const inputs = section.querySelectorAll('input, select, textarea');
        let isStepValid = true;
        let firstInvalidField = null;
        inputs.forEach(input => {
            // Skip inputs inside hidden containers (e.g. co-applicant section when not checked)
            if (input.type !== 'hidden' && !input.offsetParent) return;
            if (input.hasAttribute('required')) {
                if (!this.validateField(input)) {
                    isStepValid = false;
                    if (!firstInvalidField) firstInvalidField = input;
                }
            }
        });
        if (stepNumber === 1) {
            const hasCoApplicant = document.getElementById('hasCoApplicant');
            const coSection = document.getElementById('coApplicantSection');
            if (hasCoApplicant && hasCoApplicant.checked && coSection && coSection.style.display !== 'none') {
                const coInputs = coSection.querySelectorAll('input, select, textarea');
                coInputs.forEach(input => {
                    if (input.type === 'radio') {
                        const name = input.name;
                        const radios = coSection.querySelectorAll(`input[name="${name}"]`);
                        const checked = Array.from(radios).some(r => r.checked);
                        if (!checked) {
                            this.showError(radios[0], this.state.language === 'en' ? 'Please select a role' : 'Por favor seleccione un rol');
                            radios[0].classList.add('is-invalid');
                            isStepValid = false;
                            if (!firstInvalidField) firstInvalidField = radios[0];
                        } else {
                            radios.forEach(r => this.clearError(r));
                        }
                    } else if (input.type === 'checkbox') {
                        if (input.id === 'coConsent' && !input.checked) {
                            this.showError(input, this.state.language === 'en' ? 'You must authorize verification' : 'Debe autorizar la verificación');
                            input.classList.add('is-invalid');
                            isStepValid = false;
                            if (!firstInvalidField) firstInvalidField = input;
                        } else {
                            this.clearError(input);
                        }
                    } else {
                        if (input.hasAttribute('required') && !input.value.trim()) {
                            this.showError(input, this.state.language === 'en' ? 'Required' : 'Campo obligatorio');
                            input.classList.add('is-invalid');
                            isStepValid = false;
                            if (!firstInvalidField) firstInvalidField = input;
                        } else {
                            if (input.value.trim() && !this.validateField(input)) {
                                isStepValid = false;
                                if (!firstInvalidField) firstInvalidField = input;
                            } else {
                                this.clearError(input);
                            }
                        }
                    }
                });
            }
        }
        if (stepNumber === 5) {
              // Validate "Preferred Contact Method" — at least one checkbox required
              const _contactChecked = section.querySelectorAll('input[name="Preferred Contact Method"]:checked');
              const _contactErrEl   = document.getElementById('contactMethodError');
              if (_contactChecked.length === 0) {
                  const _firstContact = section.querySelector('input[name="Preferred Contact Method"]');
                  const _contactMsg   = this.state.language === 'en'
                      ? 'Please select at least one contact method'
                      : 'Por favor seleccione al menos un método de contacto';
                  if (_contactErrEl) { _contactErrEl.textContent = _contactMsg; _contactErrEl.style.display = 'block'; }
                  if (_firstContact) { _firstContact.classList.add('is-invalid'); }
                  isStepValid = false;
                  if (!firstInvalidField) firstInvalidField = _firstContact || _contactErrEl;
              } else {
                  if (_contactErrEl) _contactErrEl.style.display = 'none';
                  section.querySelectorAll('input[name="Preferred Contact Method"]').forEach(cb => cb.classList.remove('is-invalid'));
              }

              // Validate "Preferred Time" — at least one checkbox required
              const _timeChecked = section.querySelectorAll('input[name="Preferred Time"]:checked');
              const _timeErrEl   = document.getElementById('preferredTimeError');
              if (_timeChecked.length === 0) {
                  const _firstTime = section.querySelector('input[name="Preferred Time"]');
                  const _timeMsg   = this.state.language === 'en'
                      ? 'Please select at least one availability window'
                      : 'Por favor seleccione al menos una ventana de disponibilidad';
                  if (_timeErrEl) { _timeErrEl.textContent = _timeMsg; _timeErrEl.style.display = 'block'; }
                  if (_firstTime) { _firstTime.classList.add('is-invalid'); }
                  isStepValid = false;
                  if (!firstInvalidField) firstInvalidField = _firstTime || _timeErrEl;
              } else {
                  if (_timeErrEl) _timeErrEl.style.display = 'none';
                  section.querySelectorAll('input[name="Preferred Time"]').forEach(cb => cb.classList.remove('is-invalid'));
              }
          }
        if (!isStepValid && firstInvalidField) this.scrollToInvalidField(firstInvalidField);
        return isStepValid;
    }

    validatePaymentSelections() {
        const s1 = document.getElementById('primaryPayment').value;
        const s2 = document.getElementById('secondaryPayment').value;
        const s3 = document.getElementById('thirdPayment').value;
        const warning = document.getElementById('paymentDuplicateWarning');
        let hasDuplicate = false;
        const values = [s1, s2, s3].filter(v => v && v !== 'Other');
        const uniqueValues = new Set(values);
        if (values.length !== uniqueValues.size) hasDuplicate = true;
        if (warning) warning.style.display = hasDuplicate ? 'block' : 'none';
        return !hasDuplicate;
    }

    scrollToInvalidField(field) {
        const scrollTarget = field.closest('.form-group') || field;
        scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
        field.classList.add('shake', 'highlight-field');
        setTimeout(() => field.focus(), 100);
        setTimeout(() => field.classList.remove('shake', 'highlight-field'), 2000);
    }

    // ---------- Conditional fields ----------
    setupConditionalFields() {
        const paymentSelectors = ['primaryPayment', 'secondaryPayment', 'thirdPayment'];
        paymentSelectors.forEach(id => {
            const select = document.getElementById(id);
            if (select) {
                select.addEventListener('change', (e) => {
                    const otherContainer = document.getElementById(`${id}OtherContainer`);
                    const otherInput = document.getElementById(`${id}Other`);
                    const isOther = e.target.value === 'Other';
                    if (otherContainer) otherContainer.style.display = isOther ? 'block' : 'none';
                    if (otherInput) {
                        if (isOther) {
                            otherInput.setAttribute('required', 'required');
                            otherInput.focus();
                        } else {
                            otherInput.removeAttribute('required');
                            otherInput.value = '';
                        }
                    }
                    this.validatePaymentSelections();
                });
            }
        });
        const petsRadio = document.getElementsByName('Has Pets');
        const petGroup = document.getElementById('petDetailsGroup');
        if (petsRadio && petGroup) {
            petsRadio.forEach(r => r.addEventListener('change', (e) => {
                petGroup.style.display = e.target.value === 'Yes' ? 'block' : 'none';
            }));
        }
        const hasCoApplicantCheck = document.getElementById('hasCoApplicant');
        const coApplicantSection = document.getElementById('coApplicantSection');
        const coRequiredIds = ['coFirstName', 'coLastName', 'coEmail', 'coPhone'];
        if (hasCoApplicantCheck && coApplicantSection) {
            hasCoApplicantCheck.addEventListener('change', (e) => {
                coApplicantSection.style.display = e.target.checked ? 'block' : 'none';
                if (e.target.checked) {
                    coRequiredIds.forEach(id => {
                        const el = document.getElementById(id);
                        if (el) el.setAttribute('required', 'required');
                    });
                } else {
                    coRequiredIds.forEach(id => {
                        const el = document.getElementById(id);
                        if (el) { el.removeAttribute('required'); el.value = ''; }
                    });
                    const inputs = coApplicantSection.querySelectorAll('input, select, textarea');
                    inputs.forEach(input => this.clearError(input));
                }
            });
        }
        const vehicleYes = document.getElementById('vehicleYes');
        const vehicleNo = document.getElementById('vehicleNo');
        const vehicleDetails = document.getElementById('vehicleDetailsSection');
        if (vehicleYes && vehicleNo && vehicleDetails) {
            const toggleVehicle = () => {
                vehicleDetails.style.display = vehicleYes.checked ? 'block' : 'none';
            };
            vehicleYes.addEventListener('change', toggleVehicle);
            vehicleNo.addEventListener('change', toggleVehicle);
        }

        // ââ Employment status: conditionally show/label/require employer fields ââ
        // Each status type shows different fields with different labels.
        const toggleEmployerSection = (status) => {
            const lang = this.state.language || 'en';
            const getLabel = (id) => document.querySelector(`label[for="${id}"]`);
            const rowsSeen = new Set();

            const showField = (id, required, labelEn, labelEs) => {
                const el = document.getElementById(id);
                if (!el) return;
                if (required) el.setAttribute('required', 'required');
                else el.removeAttribute('required');
                el.classList.remove('is-invalid');
                this.clearError(el);
                const lbl = getLabel(id);
                if (lbl && labelEn) lbl.textContent = lang === 'es' ? labelEs : labelEn;
                const col = el.closest('.form-col') || el.closest('.form-group');
                if (col && !rowsSeen.has(col)) { col.style.display = ''; rowsSeen.add(col); }
            };

            const hideField = (id) => {
                const el = document.getElementById(id);
                if (!el) return;
                el.removeAttribute('required');
                el.value = '';
                el.classList.remove('is-invalid');
                this.clearError(el);
                const col = el.closest('.form-col') || el.closest('.form-group');
                if (col && !rowsSeen.has(col)) { col.style.display = 'none'; rowsSeen.add(col); }
            };

            if (status === 'Unemployed') {
                hideField('employer');
                hideField('jobTitle');
                hideField('employmentDuration');
                hideField('supervisorName');
                hideField('supervisorPhone');
            } else if (status === 'Retired') {
                showField('employer', false, 'Former Employer (Optional)', 'Empleador Anterior (Opcional)');
                showField('jobTitle', false, 'Former Job Title (Optional)', 'Cargo Anterior (Opcional)');
                showField('employmentDuration', false, 'How long at this job?', '¿Cuánto tiempo en este trabajo?');
                hideField('supervisorName');
                hideField('supervisorPhone');
            } else if (status === 'Student') {
                showField('employer', false, 'School / Institution Name (Optional)', 'Escuela / Institución (Opcional)');
                showField('jobTitle', false, 'Program / Field of Study (Optional)', 'Programa / Campo de Estudio (Opcional)');
                showField('employmentDuration', false, 'Years at Institution', 'Años en la institución');
                hideField('supervisorName');
                hideField('supervisorPhone');
            } else if (status === 'Self-employed') {
                showField('employer', true, 'Business Name', 'Nombre del Negocio');
                showField('jobTitle', true, 'Your Role / Title', 'Su Rol / Cargo');
                showField('employmentDuration', true, 'How long in business?', '¿Cuánto tiempo en el negocio?');
                hideField('supervisorName');
                hideField('supervisorPhone');
            } else {
                showField('employer', true, 'Employer', 'Empleador');
                showField('jobTitle', true, 'Job Title', 'Puesto');
                showField('employmentDuration', true, 'How long at this job?', '¿Cuánto tiempo en este trabajo?');
                showField('supervisorName', true, 'Supervisor Name', 'Nombre del supervisor');
                showField('supervisorPhone', true, 'Supervisor Phone', 'Teléfono del supervisor');
            }
        };

        const empStatusEl = document.getElementById('employmentStatus');
        if (empStatusEl) {
            empStatusEl.addEventListener('change', () => toggleEmployerSection(empStatusEl.value));
            toggleEmployerSection(empStatusEl.value);
        }
        this._toggleEmployerSection = toggleEmployerSection;
    }

    setupFileUploads() {
        this._uploadedFiles = [];
        const input = document.getElementById('docUpload');
        const zone  = document.getElementById('uploadZone');
        const list  = document.getElementById('uploadedFiles');
        if (!input || !zone || !list) return;

        const MAX_SIZE  = 1 * 1024 * 1024; // [10A-3] 1 MB per file — keeps total base64 payload safe
        const MAX_FILES = 4;

        const renderList = () => {
            list.innerHTML = this._uploadedFiles.map((f, i) => `
                <div class="upload-file-item">
                    <i class="fas fa-file-alt" style="color:var(--secondary);flex-shrink:0;"></i>
                    <span class="upload-file-name">${f.name}</span>
                    <span class="upload-file-size">(${(f.size / 1024).toFixed(0)} KB)</span>
                    <button type="button" class="upload-remove-btn" data-remove-idx="${i}" aria-label="Remove ${f.name}"><i class="fas fa-xmark"></i></button>
                </div>`).join('');
        };
        list.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-remove-idx]');
            if (btn) {
                const idx = parseInt(btn.getAttribute('data-remove-idx'), 10);
                this._uploadedFiles.splice(idx, 1);
                renderList();
            }
        });

        const _showUploadErr = (msg) => {
              const _ue = document.getElementById('uploadError');
              if (_ue) { _ue.textContent = msg; _ue.style.display = 'block'; setTimeout(() => { _ue.style.display = 'none'; }, 5000); }
          };
  
        const handleFiles = (files) => {
            Array.from(files).forEach(file => {
                if (this._uploadedFiles.length >= MAX_FILES) {
                    _showUploadErr(`Maximum ${MAX_FILES} files allowed.`); return;
                }
                if (file.size > MAX_SIZE) {
                    _showUploadErr(`"${file.name}" exceeds the 1 MB limit and was not added.`); return;
                }
                if (this._uploadedFiles.some(f => f.name === file.name)) return;
                this._uploadedFiles.push(file);
            });
            renderList();
        };

        input.addEventListener('change', () => { handleFiles(input.files); input.value = ''; });
        zone.addEventListener('dragover',  e => { e.preventDefault(); zone.classList.add('drag-over'); });
        zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
        zone.addEventListener('drop', e => {
            e.preventDefault(); zone.classList.remove('drag-over');
            handleFiles(e.dataTransfer.files);
        });

    }

    // ---------- Save & Resume Later ----------
    setupSaveResume() {
        // Inject the modal HTML once
        if (!document.getElementById('saveResumeModal')) {
            const modal = document.createElement('div');
            modal.id = 'saveResumeModal';
            modal.className = 'save-resume-modal';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('aria-label', 'Save progress and resume later');
            modal.innerHTML = `
                <div class="save-resume-card">
                    <h3><i class="fas fa-bookmark" style="color:var(--secondary);margin-right:8px;"></i><span data-i18n="saveResumeLater">Save &amp; Resume Later</span></h3>
                    <p data-i18n="saveResumeDesc">Enter your email and we'll send you a link to resume your application exactly where you left off.</p>
                    <p style="font-size:12px;color:#27ae60;margin:4px 0 0;"><i class="fas fa-check-circle"></i> Your progress is saved for 7 days. The link works on any device or browser.</p>
                    <div class="form-group">
                        <input type="email" id="resumeEmailInput" placeholder="your@email.com" autocomplete="email" />
                    </div>
                    <div class="save-resume-actions">
                        <button class="btn-send-link" id="sendResumeLinkBtn">
                            <i class="fas fa-paper-plane"></i> <span data-i18n="sendLink">Send Link</span>
                        </button>
                        <button class="btn-cancel-resume" id="cancelResumeBtn" data-i18n="cancel">Cancel</button>
                    </div>
                    <div class="save-resume-success" id="saveResumeSuccess">
                        <i class="fas fa-check-circle"></i> <span data-i18n="linkSent">Link sent! Check your inbox.</span>
                    </div>
                </div>`;
            document.body.appendChild(modal);
        }

        // Inject "Save & Resume" bar below each step's nav buttons
        document.querySelectorAll('.form-section').forEach(section => {
            if (section.querySelector('.save-resume-bar')) return;
            const bar = document.createElement('div');
            bar.className = 'save-resume-bar';
            bar.innerHTML = `<button type="button" class="btn-save-resume save-resume-trigger">
                <i class="fas fa-bookmark"></i> <span data-i18n="saveResumeLater">Save &amp; Resume Later</span>
            </button>`;
            section.appendChild(bar);
        });

        // Open modal
        document.addEventListener('click', (e) => {
            if (e.target.matches('.save-resume-trigger') || e.target.closest('.save-resume-trigger')) {
                const emailField = document.getElementById('rentalApplication')?.querySelector('#email');
                const prefill = emailField ? emailField.value.trim() : '';
                const input = document.getElementById('resumeEmailInput');
                if (input && prefill && !input.value) input.value = prefill;
                document.getElementById('saveResumeModal').classList.add('open');
                const successEl = document.getElementById('saveResumeSuccess');
                if (successEl) successEl.classList.remove('show');
                if (input) input.focus();
            }
        });

        // Close modal
        document.getElementById('cancelResumeBtn')?.addEventListener('click', () => {
            document.getElementById('saveResumeModal').classList.remove('open');
        });
        document.getElementById('saveResumeModal')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) e.currentTarget.classList.remove('open');
        });

        // Send link
        document.getElementById('sendResumeLinkBtn')?.addEventListener('click', () => {
              const emailInput = document.getElementById('resumeEmailInput');
              const email = emailInput ? emailInput.value.trim() : '';
              if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                  emailInput.style.borderColor = '#e74c3c';
                  emailInput.focus();
                  return;
              }
              emailInput.style.borderColor = '';

              // [L4 fix] Generate a unique resume token for cross-device/browser support
              const token = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

              // Save progress locally (fast path) and collect snapshot
              this.saveProgress();
              const rawData = this.getAllFormData();
              ['SSN', 'Application ID', 'Co-Applicant SSN', 'DOB', 'Co-Applicant DOB'].forEach(k => delete rawData[k]);
              rawData._last_updated = new Date().toISOString();
              const progressJson = JSON.stringify(rawData);

              // Build resume URL with token — works on any device or browser
              const currentParams = new URLSearchParams(window.location.search);
              currentParams.set('resume', token);
              const resumeUrl = window.location.origin + window.location.pathname + '?' + currentParams.toString();

              // Save progress server-side (fire-and-forget)
              const savePayload = new FormData();
              savePayload.append('_action', 'saveResumeProgress');
              savePayload.append('token', token);
              savePayload.append('progressJson', progressJson);
              fetch(this.BACKEND_URL, { method: 'POST', body: savePayload }).catch(() => {});

              // Send resume email with token-based URL
              const emailPayload = new FormData();
              emailPayload.append('_action', 'sendResumeEmail');
              emailPayload.append('email', email);
              emailPayload.append('resumeUrl', resumeUrl);
              emailPayload.append('step', this.getCurrentSection());
              fetch(this.BACKEND_URL, { method: 'POST', body: emailPayload }).catch(() => {});

              const successEl = document.getElementById('saveResumeSuccess');
              if (successEl) successEl.classList.add('show');
              setTimeout(() => {
                  document.getElementById('saveResumeModal').classList.remove('open');
                  if (successEl) successEl.classList.remove('show');
              }, 2500);
          });
    }

    setupCharacterCounters() {
        const textareas = document.querySelectorAll('textarea');
        textareas.forEach(textarea => {
            if (!textarea.hasAttribute('maxlength')) {
                textarea.setAttribute('maxlength', '500');
            }
            const parent = textarea.parentElement;
            const counter = document.createElement('div');
            counter.className = 'character-count';
            counter.style.fontSize = '11px';
            counter.style.textAlign = 'right';
            counter.style.color = '#7f8c8d';
            parent.appendChild(counter);
            const updateCounter = () => {
                const len = textarea.value.length;
                const max = textarea.getAttribute('maxlength');
                const tC = this.getTranslations();
                counter.textContent = `${len}/${max} ${tC.charCount}`;
            };
            textarea.addEventListener('input', updateCounter);
            updateCounter();
        });
    }

    // [L4 fix] Fetches saved progress from the server by token, falls back to localStorage
      async _restoreFromServer(token) {
          try {
              const resp = await fetch(this.BACKEND_URL + '?path=loadProgress&token=' + encodeURIComponent(token));
              const result = await resp.json();
              if (result.success && result.data) {
                  // Store in localStorage so restoreSavedProgress() can read it
                  try { localStorage.setItem(this.config.LOCAL_STORAGE_KEY, result.data); } catch (e) {}
                  this.restoreSavedProgress();
                  return;
              }
          } catch (e) {
              console.warn('[CP App] Server-side resume fetch failed, falling back to localStorage:', e);
          }
          // Fallback to whatever is in localStorage
          this.restoreSavedProgress();
      }

      restoreSavedProgress() {
          const saved = (() => { try { return localStorage.getItem(this.config.LOCAL_STORAGE_KEY); } catch(e) { return null; } })();
        if (saved) {
            try {
                const data = JSON.parse(saved);

                // Property-context guard: if the current URL is for a different property
                // than what was saved, wipe the stale data and start fresh.
                // This prevents a half-filled application for Property A from loading
                // when the user clicks "Apply" on Property B.
                const _curP = new URLSearchParams(window.location.search);
                const _curFingerprint = _curP.get('id') || _curP.get('addr') || '';
                const _savedFingerprint = data._propertyFingerprint || '';
                if (_curFingerprint && _savedFingerprint && _curFingerprint !== _savedFingerprint) {
                    try { localStorage.removeItem(this.config.LOCAL_STORAGE_KEY); } catch(e) {}
                    return; // Different property — start completely fresh
                }

                const SKIP = new Set(['SSN', 'Co-Applicant SSN', 'Application ID', '_last_updated', '_language', 'DOB', 'Co-Applicant DOB', '_currentStep', '_propertyFingerprint']);
                const form = document.getElementById('rentalApplication');
                if (!form) return;

                Object.keys(data).forEach(key => {
                    if (SKIP.has(key)) return;
                    const value = data[key];
                    if (value === undefined || value === null) return;
                    const escaped = key.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
                    const els = form.querySelectorAll(`[name="${escaped}"]`);
                    if (!els.length) return;
                    const firstEl = els[0];
                    if (firstEl.type === 'radio') {
                        els.forEach(el => { if (el.value === value) el.checked = true; });
                    } else if (firstEl.type === 'checkbox') {
                          // [L1 fix] Handle array (multi-checkbox group) and single values
                          if (Array.isArray(value)) {
                              els.forEach(el => { el.checked = value.includes(el.value); });
                          } else {
                              els.forEach(el => { el.checked = (el.value === value); });
                          }
                      } else {
                          firstEl.value = value;
                    }
                });
                if (data._language) this.state.language = data._language;
                if (data._currentStep && data._currentStep > 1) {
                    const stepNum = parseInt(data._currentStep, 10);
                    if (stepNum >= 1 && stepNum <= 6) {
                        setTimeout(() => {
                            document.querySelectorAll('.form-section').forEach(s => s.classList.remove('active'));
                            const targetSection = document.getElementById('section' + stepNum);
                            if (targetSection) {
                                targetSection.classList.add('active');
                                this.updateProgressBar();
                                this._updateStartOverBtn(stepNum);
                            }
                        }, 10);
                    }
                }
            } catch (e) { console.warn('[CP App] Non-critical error in restoreSavedProgress:', e); }
        }
    }

    saveProgress() {
        const data = this.getAllFormData();
        const sensitiveKeys = ['SSN', 'Application ID', 'Co-Applicant SSN', 'DOB', 'Co-Applicant DOB'];
        sensitiveKeys.forEach(key => delete data[key]);
        data._last_updated = new Date().toISOString();
        data._language = this.state.language || 'en';
        data._currentStep = this.getCurrentSection();
        // Save property fingerprint so restore can detect a different-property session.
        // Uses the property ID URL param (most specific), falling back to the address param.
        const _urlP = new URLSearchParams(window.location.search);
        data._propertyFingerprint = _urlP.get('id') || _urlP.get('addr') || '';
        try { localStorage.setItem(this.config.LOCAL_STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
        this._flashAutoSave();
    }

    _flashAutoSave() {
        const indicator = document.getElementById('autoSaveIndicator');
        if (!indicator) return;
        clearTimeout(this._autoSaveFlashTimer);
        indicator.classList.add('visible');
        this._autoSaveFlashTimer = setTimeout(() => {
            indicator.classList.remove('visible');
        }, 2200);
    }

    getAllFormData() {
          const form = document.getElementById('rentalApplication');
          const formData = new FormData(form);
          const data = {};
          // [L1 fix] Collect duplicate keys (multi-checkboxes like Preferred Contact Method / Preferred Time) into arrays
          formData.forEach((value, key) => {
              if (Object.prototype.hasOwnProperty.call(data, key)) {
                  if (!Array.isArray(data[key])) data[key] = [data[key]];
                  data[key].push(value);
              } else {
                  data[key] = value;
              }
          });
          return data;
      }

    debounce(func, wait) {
        let timeout;
        return function() {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, arguments), wait);
        };
    }

    _parseLocalDate(dateStr) {
        if (!dateStr) return null;
        const parts = dateStr.split('-');
        if (parts.length !== 3) return null;
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return isNaN(d.getTime()) ? null : d;
    }

    // ---------- Language toggle ----------
    setupLanguageToggle() {
        const fee     = this.state.applicationFee;
        const freeApp = fee <= 0; // zero-fee: no payment step needed
        const translations = {
            en: {
                langText: 'Español',
                logoText: 'Choice Properties',
                tagline: 'Professional Property Management Solutions',
                confidentialStamp: 'CONFIDENTIAL & SECURE',
                trustIndicator: 'Your information is encrypted and protected',
                timeEstimate: 'Estimated time: 15-20 minutes',
                step1Label: 'Property & Applicant',
                step2Label: 'Residency & Occupancy',
                step3Label: 'Employment & Income',
                step4Label: 'References & Emergency Contact',
                step5Label: 'Payment Preferences',
                step6Label: 'Review & Submit',
                stepPrefix: 'Step',
                stepOf: 'of',
                processing: 'Processing',
                validating: 'Validating',
                submitting: 'Submitting',
                complete: 'Complete',
                submittingTitle: 'Submitting Your Application',
                submissionMessage: "Please don't close this window. This may take a few moments...",
                successTitle: 'Application Received',
                successText: 'Thank you for choosing Choice Properties',
                appId: 'Your Application ID',
                clickToCopy: 'Copy ID',
                immediateNextSteps: 'Immediate Next Steps',
                paymentRequiredTitle: freeApp ? 'No Application Fee' : 'Payment Required Before Review',
                paymentRequiredDesc: freeApp
                    ? 'Great news — there is no application fee for this property. Your application will go straight to review.'
                    : `Our team will contact you shortly at the phone number provided to arrange the $${fee} application fee.`,
                completePaymentTitle: freeApp ? 'Application Complete' : 'Complete Payment',
                completePaymentDesc: freeApp
                    ? 'No payment is needed. Your application will be reviewed as submitted.'
                    : `Your application is not complete until the $${fee} fee has been paid. We'll discuss payment options you're familiar with.`,
                reviewBeginsTitle: 'Review Begins',
                reviewBeginsDesc: freeApp
                    ? 'Your application has been received and will enter the formal review process right away. You can track status online with your ID.'
                    : 'Once payment is confirmed, your application enters the formal review process. You can track status online with your ID.',
                importantNote: 'Important:',
                paymentUrgentText: freeApp
                    ? 'There is no application fee for this property — your application goes straight to review.'
                    : `Your application is not complete until the $${fee} fee has been paid. Please keep your phone nearby.`,
                yourPreferences: 'Your Preferences',
                contactMethod: 'Contact Method:',
                bestTimes: 'Best Times:',
                paymentPref: 'Payment Preferences:',
                preferenceNote: 'We\'ll use these for non-urgent follow-up after your payment is complete.',
                questions: 'Questions? Call or text',
                helpText: 'we\'re here to help.',
                spamWarning: 'ð§ A confirmation email has been sent to you. If you don\'t see it within a few minutes, please check your <strong>spam or junk folder</strong>.',
                trackStatus: 'Track My Application',
                newApplication: 'New Application',
                reapplicationPolicyTitle: 'Reapplication Protection',
                reapplicationPolicyText: 'If your application is denied, you may apply for any other available property within 30 days — no new application fee. Your screening results remain valid for 60 days.',
                step1YouSubmit: '1. You Submit',
                step1Desc: 'Fill out your application completely',
                step2PaymentArranged: freeApp ? '2. Application Received' : '2. Payment Arranged',
                step2Desc: freeApp ? 'No fee required — review starts right away' : `We contact you for the $${fee} fee`,
                step3ReviewBegins: '3. Review Begins',
                step3Desc: freeApp ? 'We review your application promptly' : 'After payment, we review your application',
                propertyHeader: 'Property & Applicant Details',
                propertyInfo: 'Property Information',
                propertyAddressLabel: 'Property Address Applying For',
                propertyAddressPlaceholder: 'Street address, city, state, zip',
                errAddress: 'Please enter the property address',
                moveInLabel: 'Requested Move-in Date',
                errRequired: 'Required',
                leaseTermLabel: 'Desired Lease Term',
                selectTerm: 'Select term...',
                months6: '6 Months',
                months12: '12 Months',
                months18: '18 Months',
                months24: '24 Months',
                monthToMonth: 'Month-to-month',
                primaryApplicantInfo: 'Primary Applicant Information',
                firstNameLabel: 'First Name',
                lastNameLabel: 'Last Name',
                emailLabel: 'Email Address',
                emailPlaceholder: 'email@example.com',
                emailHint: 'Make sure the provided email is correct and accessible. Confirmation and updates sent here.',
                errEmail: 'Invalid email',
                phoneLabel: 'Phone Number',
                phonePlaceholder: '(555) 000-0000',
                phoneHint: 'Our team will contact you here.',
                errPhone: 'Invalid phone',
                dobLabel: 'Date of Birth',
                ssnLabel: 'Social Security Number (Last 4 Digits)',
                ssnHint: 'Only last 4 digits required',
                ssnPlaceholder: '1234',
                coApplicantCheckbox: 'I have a co-applicant or guarantor',
                coApplicantInfo: 'Co-Applicant / Guarantor Information',
                coRoleLabel: 'Role (Select one)',
                roleCoApplicant: 'Co-applicant (will live in the unit)',
                roleGuarantor: 'Guarantor (financial backup only)',
                coFirstNameLabel: 'First Name',
                coLastNameLabel: 'Last Name',
                coEmailLabel: 'Email',
                coPhoneLabel: 'Phone',
                coDobLabel: 'Date of Birth',
                coSsnLabel: 'SSN (Last 4)',
                employmentIncome: 'Employment & Income',
                coEmployerLabel: 'Employer',
                coJobTitleLabel: 'Job Title',
                coMonthlyIncomeLabel: 'Gross Monthly Income ($)',
                coMonthlyIncomePlaceholder: 'e.g., 4000',
                coEmploymentDurationLabel: 'Length of Employment',
                coEmploymentDurationPlaceholder: 'e.g., 2 years',
                coConsentLabel: 'I authorize verification of the information provided for this additional person, including credit and background check.',
                contactPrefsHeader: 'Contact Preferences',
                prefContactMethod: 'Preferred Contact Method',
                contactMethodText: 'Text Message',
                contactMethodEmail: 'Email',
                contactMethodHint: 'You can select both methods',
                availabilityLabel: 'Availability',
                weekdays: 'Weekdays',
                timeMorning: 'Morning (8am-11am)',
                timeMidday: 'Midday (11am-2pm)',
                timeAfternoon: 'Afternoon (2pm-5pm)',
                eveningsWeekends: 'Evenings & Weekends',
                timeEarlyEvening: 'Early Evening (5pm-8pm)',
                timeLateEvening: 'Late Evening (8pm-10pm)',
                timeWeekend: 'Weekend',
                flexible: 'Flexible',
                timeAnytime: 'Anytime — I\'m flexible',
                additionalNotesLabel: 'Additional Notes (Optional)',
                additionalNotesPlaceholder: 'e.g., Best after 7pm, avoid Wednesdays',
                preferencesNote: 'These preferences are for non-urgent follow-up after your payment is complete.',
                nextStep: 'Next Step',
                prevStep: 'Previous',
                editSection: 'Edit Section',
                residencyHeader: 'Residency & Occupancy',
                currentResidence: 'Current Residence',
                currentAddressLabel: 'Current Address',
                currentAddressPlaceholder: 'Street, Unit #, City, State, Zip',
                residencyStartLabel: 'How long at this address?',
                residencyStartPlaceholder: 'e.g., 2 years 3 months',
                rentAmountLabel: 'Current Rent/Mortgage Amount',
                rentAmountPlaceholder: '$',
                reasonLeavingLabel: 'Reason for leaving',
                landlordNameLabel: 'Current Landlord/Property Manager Name',
                landlordPhoneLabel: 'Landlord/Property Manager Phone',
                occupantsPets: 'Occupants & Pets',
                totalOccupantsLabel: 'Number of total occupants (including children)',
                occupantNamesLabel: 'Names and ages of all other occupants',
                occupantNamesPlaceholder: 'List names, ages, and relationship (e.g., Jane Doe, 7, daughter)',
                hasPetsLabel: 'Do you have any pets?',
                yes: 'Yes',
                no: 'No',
                petDetailsLabel: 'Pet details (type, breed, weight)',
                petDetailsPlaceholder: 'Describe your pets...',
                vehicleInfo: 'Vehicle Information',
                hasVehicleLabel: 'Do you have a vehicle?',
                vehicleMakeLabel: 'Make',
                vehicleModelLabel: 'Model',
                vehicleYearLabel: 'Year',
                vehicleYearPlaceholder: 'e.g., 2020',
                vehiclePlateLabel: 'License Plate (Optional)',
                employmentHeader: 'Employment & Income',
                currentEmployment: 'Current Employment',
                employmentStatusLabel: 'Employment Status',
                selectStatus: 'Select status...',
                fullTime: 'Full-time',
                partTime: 'Part-time',
                selfEmployed: 'Self-employed',
                student: 'Student',
                retired: 'Retired',
                unemployed: 'Unemployed',
                employerLabel: 'Employer',
                jobTitleLabel: 'Job Title',
                employmentDurationLabel: 'How long at this job?',
                employmentDurationPlaceholder: 'e.g., 3 years',
                supervisorNameLabel: 'Supervisor Name',
                supervisorPhoneLabel: 'Supervisor Phone',
                incomeVerification: 'Income Information',
                monthlyIncomeLabel: 'Gross Monthly Income',
                monthlyIncomePlaceholder: '$',
                incomeHint: 'Before taxes and deductions',
                otherIncomeLabel: 'Additional Monthly Income (Optional)',
                otherIncomePlaceholder: '$',
                otherIncomeHint: 'Child support, disability, etc.',
                financialHeader: 'References & Emergency Contact',
                personalReferences: 'Personal References',
                referencesHint: 'Please provide two references who are not related to you',
                ref1NameLabel: 'Reference 1 Name',
                ref1PhoneLabel: 'Reference 1 Phone',
                ref2NameLabel: 'Reference 2 Name (Optional)',
                ref2PhoneLabel: 'Reference 2 Phone (Optional)',
                emergencyInfo: 'Emergency Contact',
                emergencyNameLabel: 'Emergency Contact Name',
                emergencyPhoneLabel: 'Emergency Contact Phone',
                emergencyRelationshipLabel: 'Relationship to you',
                emergencyRelationshipPlaceholder: 'e.g., Spouse, Parent, Friend',
                additionalInfo: 'Additional Information',
                evictedLabel: 'Have you ever been evicted?',
                smokerLabel: 'Do you smoke?',
                paymentHeader: 'Payment Preferences',
                paymentIntro: freeApp
                    ? 'There is no application fee for this property. Please share your contact preferences so our team can reach you during the review process.'
                    : `Tell us which payment services you use. When we contact you about the $${fee} application fee, we'll discuss options you're familiar with.`,
                paymentImportant: freeApp
                    ? 'There is no application fee — your application will be reviewed promptly after submission.'
                    : 'Payment must be completed before your application can be reviewed. Our team will contact you promptly after submission to arrange this.',
                primaryPref: 'Primary Preference',
                mainPaymentMethod: 'Your Main Payment Method',
                mainPaymentDesc: 'Which payment service do you use most often?',
                selectPrimary: '— Select your primary method —',
                other: 'Other',
                otherPaymentPlaceholder: 'Enter payment method',
                backupPref: 'Backup Options (Optional)',
                otherMethods: 'Other Methods You Use',
                otherMethodsDesc: 'If your primary isn\'t available, what else works for you?',
                secondaryMethod: 'Secondary Method',
                selectBackup: '— Select a backup (optional) —',
                thirdMethod: 'Third Method (Optional)',
                selectAnother: '— Select another (optional) —',
                duplicateWarning: 'Please select different payment methods for each choice.',
                reviewHeader: 'Review & Submit',
                feeTitle: freeApp ? 'Application Fee: Free' : `Application Fee: $${fee}.00`,
                feeDesc: freeApp
                    ? 'Great news — this property has no application fee. Your application goes straight to review.'
                    : 'This fee is required before review can begin. Our team will contact you immediately after submission to arrange payment.',
                paymentReminderTitle: freeApp ? 'No Application Fee' : 'Payment Required Before Review',
                paymentReminderDesc: freeApp
                    ? 'This property has no application fee. Your submission is complete and will go straight to review.'
                    : `Your application is not complete until the $${fee} fee has been paid. Our team will contact you shortly after submission to arrange this.`,
                verificationTitle: 'Verify Your Contact Information',
                verificationDesc: freeApp
                    ? 'Please confirm your email and phone number are correct. This is how our team will contact you during the review process.'
                    : `Please confirm your email and phone number are correct. This is how our team will reach you about the $${fee} fee.`,
                reapplicationPolicyTextShort: 'If denied, apply again within 30 days with no new fee. Screening results valid for 60 days.',
                legalDeclaration: 'Legal Declaration',
                legalCertify: 'I certify that the information provided in this application is true and correct to the best of my knowledge.',
                legalAuthorize: 'I authorize verification of the information provided, including employment, income, and references.',
                termsAgreeLabel: 'I certify that all information provided in this application is accurate and complete, and I authorize Choice Properties to verify it.',
                submitBtn: 'Submit Application',
                submitDisclaimer: 'By clicking submit, your application will be securely transmitted to Choice Properties.',
                privacyPolicy: 'Privacy Policy',
                termsOfService: 'Terms of Service',
                contactSupport: 'Contact Support',
                progressSaved: 'Progress Saved',
                offlineMessage: 'You are currently offline. Progress will be saved locally.',
                notSpecified: 'Not specified',
                notSelected: 'Not selected',
                retry: 'Retry',
                offlineError: 'You are offline. Please check your internet connection and try again.',
                submissionFailed: 'Submission failed. Please try again.',
                backgroundQuestions: 'Background Questions',
                ref1RelationshipLabel: 'Relationship to Reference 1',
                ref1RelationshipPlaceholder: 'e.g., Former Landlord, Employer, Coworker, Friend',
                ref2RelationshipLabel: 'Relationship to Reference 2 (Optional)',
                ref2RelationshipPlaceholder: 'e.g., Former Landlord, Employer, Coworker, Friend',
                saveResumeLater: 'Save & Resume Later',
                saveResumeDesc: "Enter your email and we'll send you a link to resume your application exactly where you left off.",
                sendLink: 'Send Link',
                cancel: 'Cancel',
                linkSent: 'Link sent! Check your inbox.',
                ratioQualifies: 'Qualifies',
                ratioBorderline: 'Borderline',
                ratioLow: 'Low',
                noContextTitle: 'Which property are you applying for?',
                noContextSub: 'Please enter the full property address in Step 1 below so we can match your application to the correct listing.',
                managedBy: 'Managed by',
                applyingFor: 'Applying for',
                viewListing: 'View listing',
                browseListings: 'Browse Available Listings',
                charCount: 'characters',
                summaryPropertyApplicant: 'Property & Applicant',
                summaryCoApplicant: 'Co-Applicant',
                summaryResidency: 'Residency',
                summaryOccupancy: 'Occupancy & Vehicles',
                summaryEmployment: 'Employment & Income',
                summaryFinancial: 'References & Emergency Contact',
                summaryPayment: 'Payment Preferences',
                retryIn: 'in',
                retryAttempt: 'attempt',
                pleaseAgreeDeclarations: 'Please agree to all legal declarations before submitting.',
                networkError: 'Unable to reach our servers. Please check your connection and try again.',
                networkExhausted: 'We could not confirm your submission due to a connection issue. Your application may have been received — please check your email for a confirmation. If you did not receive one, contact us at 707-706-3137 or try submitting again.',
                serverError: 'Our system is temporarily unavailable. Please try again in a few minutes, or contact us at 707-706-3137.',
                copied: 'Copied!',
                pageTitle: 'Rental Application — Choice Properties'
            },
            es: {
                langText: 'English',
                logoText: 'Choice Properties',
                tagline: 'Soluciones Profesionales de Administración de Propiedades',
                confidentialStamp: 'CONFIDENCIAL & SEGURO',
                trustIndicator: 'Su información está encriptada y protegida',
                timeEstimate: 'Tiempo estimado: 15-20 minutos',
                step1Label: 'Propiedad y Solicitante',
                step2Label: 'Residencia y Ocupación',
                step3Label: 'Empleo e Ingresos',
                step4Label: 'Referencias y Contacto de Emergencia',
                step5Label: 'Preferencias de Pago',
                step6Label: 'Revisar y Enviar',
                stepPrefix: 'Paso',
                stepOf: 'de',
                processing: 'Procesando',
                validating: 'Validando',
                submitting: 'Enviando',
                complete: 'Completo',
                submittingTitle: 'Enviando su Solicitud',
                submissionMessage: 'Por favor no cierre esta ventana. Puede tomar unos momentos...',
                successTitle: 'Solicitud Recibida',
                successText: 'Gracias por elegir Choice Properties',
                appId: 'Su ID de Solicitud',
                clickToCopy: 'Copiar ID',
                immediateNextSteps: 'Próximos Pasos Inmediatos',
                paymentRequiredTitle: freeApp ? 'Sin Tarifa de Solicitud' : 'Pago Requerido Antes de la Revisión',
                paymentRequiredDesc: freeApp
                    ? 'Buenas noticias: no hay tarifa de solicitud para esta propiedad. Su solicitud pasará directamente a revisión.'
                    : `Nuestro equipo se comunicará con usted en breve al número proporcionado para coordinar el pago de $${fee}.`,
                completePaymentTitle: freeApp ? 'Solicitud Completa' : 'Completar el Pago',
                completePaymentDesc: freeApp
                    ? 'No se requiere pago. Su solicitud será revisada tal como fue enviada.'
                    : `Su solicitud no está completa hasta que se haya pagado la tarifa de $${fee}. Discutiremos opciones de pago que conozca.`,
                reviewBeginsTitle: 'Comienza la Revisión',
                reviewBeginsDesc: freeApp
                    ? 'Su solicitud ha sido recibida y entrará de inmediato al proceso de revisión formal. Puede seguir el estado en línea con su ID.'
                    : 'Una vez que se confirme el pago, su solicitud entra en el proceso de revisión formal. Puede seguir el estado en línea con su ID.',
                importantNote: 'Importante:',
                paymentUrgentText: freeApp
                    ? 'No hay tarifa de solicitud para esta propiedad — su solicitud pasa directamente a revisión.'
                    : `Su solicitud no está completa hasta que se haya pagado la tarifa de $${fee}. Por favor mantenga su teléfono cerca.`,
                yourPreferences: 'Sus Preferencias',
                contactMethod: 'Método de Contacto:',
                bestTimes: 'Mejores Horarios:',
                paymentPref: 'Preferencias de Pago:',
                preferenceNote: 'Usaremos estas para seguimiento no urgente después de que se complete su pago.',
                questions: '¿Preguntas? Llame o envíe un mensaje de texto al',
                helpText: 'estamos aquí para ayudar.',
                spamWarning: 'ð§ Se le ha enviado un correo de confirmación. Si no lo ve en unos minutos, revise su carpeta de <strong>spam o correo no deseado</strong>.',
                trackStatus: 'Seguir Mi Solicitud',
                newApplication: 'Nueva Solicitud',
                reapplicationPolicyTitle: 'Protección de Reaplicación',
                reapplicationPolicyText: 'Si su solicitud es denegada, puede solicitar cualquier otra propiedad disponible dentro de los 30 días sin pagar otra tarifa de solicitud. Sus resultados de evaluación siguen siendo válidos por 60 días.',
                step1YouSubmit: '1. Usted Envía',
                step1Desc: 'Complete su solicitud completamente',
                step2PaymentArranged: freeApp ? '2. Solicitud Recibida' : '2. Pago Acordado',
                step2Desc: freeApp ? 'Sin tarifa — la revisión comienza de inmediato' : `Lo contactamos para la tarifa de $${fee}`,
                step3ReviewBegins: '3. Comienza la Revisión',
                step3Desc: freeApp ? 'Revisamos su solicitud de inmediato' : 'Después del pago, revisamos su solicitud',
                propertyHeader: 'Detalles de la Propiedad y el Solicitante',
                propertyInfo: 'Información de la Propiedad',
                propertyAddressLabel: 'Dirección de la Propiedad que Solicita',
                propertyAddressPlaceholder: 'Calle, ciudad, estado, código postal',
                errAddress: 'Por favor ingrese la dirección de la propiedad',
                moveInLabel: 'Fecha de Mudanza Solicitada',
                errRequired: 'Obligatorio',
                leaseTermLabel: 'Plazo de Arrendamiento Deseado',
                selectTerm: 'Seleccionar plazo...',
                months6: '6 Meses',
                months12: '12 Meses',
                months18: '18 Meses',
                months24: '24 Meses',
                monthToMonth: 'Mes a mes',
                primaryApplicantInfo: 'Información del Solicitante Principal',
                firstNameLabel: 'Nombre',
                lastNameLabel: 'Apellido',
                emailLabel: 'Correo Electrónico',
                emailPlaceholder: 'email@ejemplo.com',
                emailHint: 'Asegúrese de que el correo proporcionado sea correcto y accesible. La confirmación y actualizaciones se enviarán aquí.',
                errEmail: 'Correo inválido',
                phoneLabel: 'Número de Teléfono',
                phonePlaceholder: '(555) 000-0000',
                phoneHint: 'Nuestro equipo lo contactará aquí.',
                errPhone: 'Teléfono inválido',
                dobLabel: 'Fecha de Nacimiento',
                ssnLabel: 'Número de Seguro Social (Ãltimos 4 dígitos)',
                ssnHint: 'Solo últimos 4 dígitos requeridos',
                ssnPlaceholder: '1234',
                coApplicantCheckbox: 'Tengo un co-solicitante o fiador',
                coApplicantInfo: 'Información de Co-Solicitante / Garante',
                coRoleLabel: 'Rol (Seleccione uno)',
                roleCoApplicant: 'Co-solicitante (vivirá en la unidad)',
                roleGuarantor: 'Fiador (solo respaldo financiero)',
                coFirstNameLabel: 'Nombre',
                coLastNameLabel: 'Apellido',
                coEmailLabel: 'Correo Electrónico',
                coPhoneLabel: 'Teléfono',
                coDobLabel: 'Fecha de Nacimiento',
                coSsnLabel: 'SSN (Ãltimos 4)',
                employmentIncome: 'Empleo e Ingresos',
                coEmployerLabel: 'Empleador',
                coJobTitleLabel: 'Puesto',
                coMonthlyIncomeLabel: 'Ingreso Mensual Bruto ($)',
                coMonthlyIncomePlaceholder: 'ej., 4000',
                coEmploymentDurationLabel: 'Tiempo en el empleo',
                coEmploymentDurationPlaceholder: 'ej., 2 años',
                coConsentLabel: 'Autorizo la verificación de la información proporcionada para esta persona adicional, incluyendo verificación de crédito y antecedentes.',
                contactPrefsHeader: 'Preferencias de Contacto',
                prefContactMethod: 'Método de Contacto Preferido',
                contactMethodText: 'Mensaje de Texto',
                contactMethodEmail: 'Correo Electrónico',
                contactMethodHint: 'Puede seleccionar ambos métodos',
                availabilityLabel: 'Disponibilidad',
                weekdays: 'Días de semana',
                timeMorning: 'Mañana (8am-11am)',
                timeMidday: 'Mediodía (11am-2pm)',
                timeAfternoon: 'Tarde (2pm-5pm)',
                eveningsWeekends: 'Tardes y Fines de Semana',
                timeEarlyEvening: 'Temprano en la tarde (5pm-8pm)',
                timeLateEvening: 'Tarde noche (8pm-10pm)',
                timeWeekend: 'Fin de semana',
                flexible: 'Flexible',
                timeAnytime: 'En cualquier momento — soy flexible',
                additionalNotesLabel: 'Notas Adicionales (Opcional)',
                additionalNotesPlaceholder: 'ej., Mejor después de las 7pm, evitar miércoles',
                preferencesNote: 'Usaremos estas para seguimiento no urgente después de que se complete su pago.',
                nextStep: 'Siguiente Paso',
                prevStep: 'Anterior',
                editSection: 'Editar Sección',
                residencyHeader: 'Residencia y Ocupación',
                currentResidence: 'Residencia Actual',
                currentAddressLabel: 'Dirección Actual',
                currentAddressPlaceholder: 'Calle, Número, Ciudad, Estado, Código Postal',
                residencyStartLabel: '¿Cuánto tiempo en esta dirección?',
                residencyStartPlaceholder: 'ej., 2 años 3 meses',
                rentAmountLabel: 'Monto Actual de Alquiler/Hipoteca',
                rentAmountPlaceholder: '$',
                reasonLeavingLabel: 'Razón para mudarse',
                landlordNameLabel: 'Nombre del Propietario/Administrador Actual',
                landlordPhoneLabel: 'Teléfono del Propietario/Administrador',
                occupantsPets: 'Ocupantes y Mascotas',
                totalOccupantsLabel: 'Número total de ocupantes (incluyendo niños)',
                occupantNamesLabel: 'Nombres y edades de todos los demás ocupantes',
                occupantNamesPlaceholder: 'Lista de nombres, edades y relación (ej., Juan Pérez, 7, hijo)',
                hasPetsLabel: '¿Tiene mascotas?',
                yes: 'Sí',
                no: 'No',
                petDetailsLabel: 'Detalles de la mascota (tipo, raza, peso)',
                petDetailsPlaceholder: 'Describa sus mascotas...',
                vehicleInfo: 'Información del Vehículo',
                hasVehicleLabel: '¿Tiene vehículo?',
                vehicleMakeLabel: 'Marca',
                vehicleModelLabel: 'Modelo',
                vehicleYearLabel: 'Año',
                vehicleYearPlaceholder: 'ej., 2020',
                vehiclePlateLabel: 'Placa (Opcional)',
                employmentHeader: 'Empleo e Ingresos',
                currentEmployment: 'Empleo Actual',
                employmentStatusLabel: 'Estado de Empleo',
                selectStatus: 'Seleccionar estado...',
                fullTime: 'Tiempo completo',
                partTime: 'Medio tiempo',
                selfEmployed: 'Trabajador independiente',
                student: 'Estudiante',
                retired: 'Jubilado',
                unemployed: 'Desempleado',
                employerLabel: 'Empleador',
                jobTitleLabel: 'Puesto',
                employmentDurationLabel: '¿Cuánto tiempo en este trabajo?',
                employmentDurationPlaceholder: 'ej., 3 años',
                supervisorNameLabel: 'Nombre del supervisor',
                supervisorPhoneLabel: 'Teléfono del supervisor',
                incomeVerification: 'Información de Ingresos',
                monthlyIncomeLabel: 'Ingreso Mensual Bruto',
                monthlyIncomePlaceholder: '$',
                incomeHint: 'Antes de impuestos y deducciones',
                otherIncomeLabel: 'Otros Ingresos Mensuales (Opcional)',
                otherIncomePlaceholder: '$',
                otherIncomeHint: 'Pensión alimenticia, discapacidad, etc.',
                financialHeader: 'Referencias y Contacto de Emergencia',
                personalReferences: 'Referencias Personales',
                referencesHint: 'Por favor proporcione dos referencias que no sean parientes',
                ref1NameLabel: 'Nombre de Referencia 1',
                ref1PhoneLabel: 'Teléfono de Referencia 1',
                ref2NameLabel: 'Nombre de Referencia 2 (Opcional)',
                ref2PhoneLabel: 'Teléfono de Referencia 2 (Opcional)',
                emergencyInfo: 'Contacto de Emergencia',
                emergencyNameLabel: 'Nombre de Contacto de Emergencia',
                emergencyPhoneLabel: 'Teléfono de Contacto de Emergencia',
                emergencyRelationshipLabel: 'Relación con usted',
                emergencyRelationshipPlaceholder: 'ej., Cónyuge, Padre, Amigo',
                additionalInfo: 'Información Adicional',
                evictedLabel: '¿Ha sido desalojado alguna vez?',
                smokerLabel: '¿Fuma?',
                paymentHeader: 'Preferencias de Pago',
                paymentIntro: freeApp
                    ? 'No hay tarifa de solicitud para esta propiedad. Por favor comparta sus preferencias de contacto para que nuestro equipo pueda comunicarse con usted durante el proceso de revisión.'
                    : `Díganos qué servicios de pago utiliza. Cuando lo contactemos acerca de la tarifa de solicitud de $${fee}, discutiremos opciones con las que esté familiarizado.`,
                paymentImportant: freeApp
                    ? 'No hay tarifa de solicitud — su solicitud será revisada rápidamente después del envío.'
                    : 'El pago debe completarse antes de que su solicitud pueda ser revisada. Nuestro equipo lo contactará rápidamente después del envío para organizar esto.',
                primaryPref: 'Preferencia Principal',
                mainPaymentMethod: 'Su Método de Pago Principal',
                mainPaymentDesc: '¿Qué servicio de pago usa con más frecuencia?',
                selectPrimary: '— Seleccione su método principal —',
                other: 'Otro',
                otherPaymentPlaceholder: 'Ingrese método de pago',
                backupPref: 'Opciones de Respaldo (Opcional)',
                otherMethods: 'Otros Métodos Que Usa',
                otherMethodsDesc: 'Si su principal no está disponible, ¿qué más le funciona?',
                secondaryMethod: 'Método Secundario',
                selectBackup: '— Seleccione un respaldo (opcional) —',
                thirdMethod: 'Tercer Método (Opcional)',
                selectAnother: '— Seleccione otro (opcional) —',
                duplicateWarning: 'Por favor seleccione diferentes métodos de pago para cada opción.',
                reviewHeader: 'Revisar y Enviar',
                feeTitle: freeApp ? 'Tarifa de Solicitud: Gratis' : `Tarifa de Solicitud: $${fee}.00`,
                feeDesc: freeApp
                    ? 'Buenas noticias: esta propiedad no tiene tarifa de solicitud. Su solicitud pasa directamente a revisión.'
                    : 'Esta tarifa es requerida antes de que la revisión pueda comenzar. Nuestro equipo lo contactará inmediatamente después del envío para organizar el pago.',
                paymentReminderTitle: freeApp ? 'Sin Tarifa de Solicitud' : 'Pago Requerido Antes de la Revisión',
                paymentReminderDesc: freeApp
                    ? 'Esta propiedad no tiene tarifa de solicitud. Su envío está completo y pasará directamente a revisión.'
                    : `Su solicitud no está completa hasta que se haya pagado la tarifa de $${fee}. Nuestro equipo lo contactará poco después del envío para organizar esto.`,
                verificationTitle: 'Verifique Su Información de Contacto',
                verificationDesc: freeApp
                    ? 'Por favor confirme que su correo electrónico y número de teléfono sean correctos. Así es como nuestro equipo lo contactará durante el proceso de revisión.'
                    : `Por favor confirme que su correo electrónico y número de teléfono sean correctos. Así es como nuestro equipo lo contactará acerca de la tarifa de $${fee}.`,
                reapplicationPolicyTextShort: 'Si es denegado, puede aplicar nuevamente dentro de 30 días sin nueva tarifa. Resultados de evaluación válidos por 60 días.',
                legalDeclaration: 'Declaración Legal',
                legalCertify: 'Certifico que la información proporcionada en esta solicitud es verdadera y correcta a mi leal saber y entender.',
                legalAuthorize: 'Autorizo la verificación de la información proporcionada, incluyendo empleo, ingresos y referencias.',
                termsAgreeLabel: 'Certifico que toda la información proporcionada en esta solicitud es exacta y completa, y autorizo a Choice Properties a verificarla.',
                submitBtn: 'Enviar Solicitud',
                submitDisclaimer: 'Al hacer clic en enviar, su solicitud será transmitida de forma segura a Choice Properties.',
                privacyPolicy: 'Política de Privacidad',
                termsOfService: 'Términos de Servicio',
                contactSupport: 'Contactar Soporte',
                progressSaved: 'Progreso Guardado',
                offlineMessage: 'Actualmente está sin conexión. El progreso se guardará localmente.',
                notSpecified: 'No especificado',
                notSelected: 'No seleccionado',
                retry: 'Reintentar',
                offlineError: 'Estás sin conexión. Por favor verifica tu conexión a internet e intenta de nuevo.',
                submissionFailed: 'Error al enviar. Por favor intenta de nuevo.',
                backgroundQuestions: 'Preguntas de Antecedentes',
                ref1RelationshipLabel: 'Relación con Referencia 1',
                ref1RelationshipPlaceholder: 'ej., Propietario anterior, Empleador, Compañero, Amigo',
                ref2RelationshipLabel: 'Relación con Referencia 2 (Opcional)',
                ref2RelationshipPlaceholder: 'ej., Propietario anterior, Empleador, Compañero, Amigo',
                saveResumeLater: 'Guardar y Continuar Después',
                saveResumeDesc: 'Ingrese su correo y le enviaremos un enlace para continuar su solicitud exactamente donde la dejó.',
                sendLink: 'Enviar Enlace',
                cancel: 'Cancelar',
                linkSent: '¡Enlace enviado! Revise su bandeja de entrada.',
                ratioQualifies: 'Califica',
                ratioBorderline: 'Límite',
                ratioLow: 'Bajo',
                noContextTitle: '¿Para qué propiedad está solicitando?',
                noContextSub: 'Por favor ingrese la dirección completa de la propiedad en el Paso 1 para que podamos vincular su solicitud con el listado correcto.',
                managedBy: 'Administrado por',
                applyingFor: 'Solicitando para',
                viewListing: 'Ver anuncio',
                browseListings: 'Ver listados disponibles',
                charCount: 'caracteres',
                summaryPropertyApplicant: 'Propiedad y Solicitante',
                summaryCoApplicant: 'Co-Solicitante',
                summaryResidency: 'Residencia',
                summaryOccupancy: 'Ocupantes y Vehículos',
                summaryEmployment: 'Empleo e Ingresos',
                summaryFinancial: 'Referencias y Contacto de Emergencia',
                summaryPayment: 'Preferencias de Pago',
                retryIn: 'en',
                retryAttempt: 'intento',
                pleaseAgreeDeclarations: 'Por favor acepte todas las declaraciones legales antes de enviar.',
                networkError: 'No es posible conectarse con nuestros servidores. Por favor verifique su conexión e intente de nuevo.',
                networkExhausted: 'No pudimos confirmar su envío por un problema de conexión. Su solicitud puede haber sido recibida — por favor revise su correo electrónico. Si no recibió confirmación, contáctenos al 707-706-3137 o intente enviar de nuevo.',
                serverError: 'Nuestro sistema está temporalmente no disponible. Por favor intente de nuevo en unos minutos, o contáctenos al 707-706-3137.',
                copied: '¡Copiado!',
                pageTitle: 'Solicitud de Arrendamiento — Choice Properties'
            }
        };

        this.translations = translations;
        const _savedLang = (() => {
            try {
                const _s = localStorage.getItem(this.config.LOCAL_STORAGE_KEY);
                return (_s ? (JSON.parse(_s)._language || 'en') : 'en');
            } catch (_e) { return 'en'; }
        })();
        this.state.language = _savedLang;
        const btn = document.getElementById('langToggle');
        const text = document.getElementById('langText');
        
        if (btn && text) {
            btn.addEventListener('click', () => {
                this.state.language = this.state.language === 'en' ? 'es' : 'en';
                const t = translations[this.state.language];
                text.textContent = t.langText;
                
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
                document.documentElement.setAttribute('lang', this.state.language);
                document.title = t.pageTitle;

                document.querySelectorAll('.btn-next').forEach(b => {
                    const span = b.querySelector('[data-i18n="nextStep"]') || b.querySelector('span');
                    if (span) span.textContent = t.nextStep;
                });
                document.querySelectorAll('.btn-prev').forEach(b => {
                    const span = b.querySelector('[data-i18n="prevStep"]') || b.querySelector('span');
                    if (span) span.textContent = t.prevStep;
                });

                this.updateProgressBar();

                if (this.getCurrentSection() === 6) {
                    this.generateApplicationSummary();
                }

                try {
                    const empEl = document.getElementById('employmentStatus');
                    if (empEl && this._toggleEmployerSection) {
                        this._toggleEmployerSection(empEl.value);
                    }
                } catch (_e) { /* Non-fatal: employer label refresh after language toggle */ }

                this.saveProgress();
            });
        }

        if (_savedLang === 'es' && btn && text) {
            const t = translations['es'];
            text.textContent = t.langText;
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
        }
    }

    // ---------- NEW: Distinguish error types ----------
    isTransientError(error) {
        if (error.isTransient) return true;
        const msg = error.message || error.toString();
        return msg.includes('network') || 
               msg.includes('timeout') || 
               msg.includes('Failed to fetch') ||
               msg.includes('ECONNREFUSED') ||
               msg.includes('Internet') ||
               msg.includes('offline') ||
               msg.includes('conexión') ||
               msg.includes('conexion');
    }

    // ---------- MODIFIED: showSubmissionError with auto-retry ----------
    showSubmissionError(error, isTransient = false) {
        const msgEl = document.getElementById('submissionMessage');
        const progressDiv = document.getElementById('submissionProgress');
        const statusArea = document.getElementById('statusArea');
        const spinner = document.getElementById('submissionSpinner');
        if (!msgEl || !progressDiv || !statusArea) return;

        const t = this.getTranslations();
        let errorMessage = error.message || error.toString();

        if (this.retryTimeout) {
            clearTimeout(this.retryTimeout);
            this.retryTimeout = null;
        }

        // Auto-retry logic
        if (isTransient && this.retryCount < this.maxRetries) {
            const delay = Math.pow(2, this.retryCount) * 1000; // 2,4,8 seconds
            this.retryCount++;
            
            msgEl.innerHTML = `${errorMessage} – ${t.retry} ${t.retryIn} ${delay/1000}s (${t.retryAttempt} ${this.retryCount}/${this.maxRetries})`;
            statusArea.classList.add('error');
            if (spinner) {
                spinner.className = 'fas fa-spinner fa-pulse';
                spinner.style.color = '#e74c3c';
            }

            this.retryTimeout = setTimeout(() => {
                this.retryTimeout = null;
                statusArea.classList.remove('error');
                if (spinner) {
                    spinner.className = 'fas fa-spinner fa-pulse';
                    spinner.style.color = '';
                }
                this.updateSubmissionProgress(1, t.processing);
                this.handleFormSubmit(new Event('submit'), true);
            }, delay);
            return;
        }

        // Permanent error or max retries reached
        // If we exhausted auto-retries on a transient (network) error, show the
        // network-exhausted message so users know their submission may have gone through.
        const finalMessage = (isTransient && this.retryCount >= this.maxRetries)
            ? (t.networkExhausted || t.serverError)
            : errorMessage;
        msgEl.innerHTML = finalMessage;
        statusArea.classList.add('error');
        if (spinner) {
            spinner.className = 'fas fa-exclamation-circle';
            spinner.style.color = '#e74c3c';
        }

        const currentStep = this.getCurrentSubmissionStep();
        if (currentStep) {
            const stepItem = document.getElementById(`stepItem${currentStep}`);
            if (stepItem) stepItem.classList.add('error');
        }

        let retryBtn = document.getElementById('submissionRetryBtn');
        if (!retryBtn) {
            retryBtn = document.createElement('button');
            retryBtn.id = 'submissionRetryBtn';
            retryBtn.className = 'btn-retry';
            retryBtn.innerHTML = `<i class="fas fa-redo-alt"></i> ${t.retry}`;
            progressDiv.appendChild(retryBtn);
        }
        retryBtn.style.display = 'inline-flex';

        const newBtn = retryBtn.cloneNode(true);
        retryBtn.parentNode.replaceChild(newBtn, retryBtn);
        newBtn.addEventListener('click', () => {
            newBtn.style.display = 'none';
            statusArea.classList.remove('error');
            if (spinner) {
                spinner.className = 'fas fa-spinner fa-pulse';
                spinner.style.color = '';
            }
            if (currentStep) {
                const stepItem = document.getElementById(`stepItem${currentStep}`);
                if (stepItem) stepItem.classList.remove('error');
            }
            this.retryCount = 0;
            this.updateSubmissionProgress(1, t.processing);
            this.handleFormSubmit(new Event('submit'));
        });
    }

    getCurrentSubmissionStep() {
        for (let i = 1; i <= 4; i++) {
            const seg = document.getElementById(`progressSegment${i}`);
            if (seg && seg.classList.contains('active')) return i;
        }
        return null;
    }

    // ---------- updateSubmissionProgress ----------
    updateSubmissionProgress(step, customMessage) {
        const t = this.getTranslations();
        const messages = {
            1: t.processing,
            2: t.validating,
            3: t.submitting,
            4: t.complete
        };
        const msg = messages[step] || customMessage || '';
        const msgEl = document.getElementById('submissionMessage');
        if (msgEl) msgEl.textContent = msg;

        for (let i = 1; i <= 4; i++) {
            const seg = document.getElementById(`progressSegment${i}`);
            const stepItem = document.getElementById(`stepItem${i}`);
            if (seg) {
                seg.classList.remove('completed', 'active');
                if (i < step) seg.classList.add('completed');
                else if (i === step) seg.classList.add('active');
            }
            if (stepItem) {
                stepItem.classList.remove('completed', 'active', 'error');
                if (i < step) stepItem.classList.add('completed');
                else if (i === step) stepItem.classList.add('active');
            }
        }

        const spinner = document.getElementById('submissionSpinner');
        if (step === 4 && spinner) {
            spinner.className = 'fas fa-check-circle';
            spinner.style.color = '#27ae60';
        } else if (spinner) {
            spinner.className = 'fas fa-spinner fa-pulse';
            spinner.style.color = '';
        }
    }


    // Generates a 64-character hex nonce used as a bot-friction CSRF token.
    // The backend validates format only (32-128 alphanumeric chars); this satisfies that requirement.
    generateCsrfNonce() {
        try {
            const arr = new Uint8Array(32);
            window.crypto.getRandomValues(arr);
            return Array.from(arr, b => ('0' + b.toString(16)).slice(-2)).join('');
        } catch (_) {
            // Fallback for browsers without crypto API (extremely rare)
            let n = '';
            const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
            for (let i = 0; i < 40; i++) n += chars.charAt(Math.floor(Math.random() * chars.length));
            return n;
        }
    }
    // ---------- MODIFIED: handleFormSubmit with retry reset ----------
    async handleFormSubmit(e, isRetry = false) {
        e.preventDefault();
        const t = this.getTranslations();

        // ââ Duplicate submission guard ââââââââââââââââââââââââââââââ
        // Block if already mid-submission
        if (this.state.isSubmitting) return;
          // [10B-12] Guard: if BACKEND_URL was not injected by the build pipeline,
          // show a user-facing error rather than silently failing.
          if (!this.BACKEND_URL) {
              alert('The application system is temporarily unavailable. Please try again or call 707-706-3137.');
              return;
          }
        // Block if this session already produced a successful appId
        if (sessionStorage.getItem('lastSuccessAppId')) {
            const existingId = sessionStorage.getItem('lastSuccessAppId');
            this.showSuccessState(existingId);
            const form = document.getElementById('rentalApplication');
            if (form) form.style.display = 'none';
            return;
        }
        // ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

        if (!isRetry) {
            this.retryCount = 0;
            this._verifyStarted = false;
        }
        if (this.retryTimeout) {
            clearTimeout(this.retryTimeout);
            this.retryTimeout = null;
        }

        if (!navigator.onLine) {
            const t = this.getTranslations();
            this.showSubmissionError(new Error(t.offlineError), false);
            const submitBtn = document.getElementById('mainSubmitBtn');
            if (submitBtn) {
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
            }
            this.setState({ isSubmitting: false });
            return;
        }

        const certify = document.getElementById('certifyCorrect');
        const authorize = document.getElementById('authorizeVerify');
        const terms = document.getElementById('termsAgree');
        const feeAck = document.getElementById('feeAcknowledge');
        const infoAcc = document.getElementById('infoAccuracy');
        const dataConsent = document.getElementById('dataConsent');
        const allDeclarations = [feeAck, infoAcc, dataConsent, certify, authorize, terms].filter(Boolean);
        if (allDeclarations.some(cb => !cb.checked)) {
            // Show inline error instead of alert — scroll to first unchecked declaration
              const _firstUnchecked = allDeclarations.find(cb => !cb.checked);
              const _declErr = document.getElementById('declarationError');
              const _declMsg = t.pleaseAgreeDeclarations || 'Please check all required declarations before submitting.';
              if (_declErr) { _declErr.textContent = _declMsg; _declErr.style.display = 'block'; }
              if (_firstUnchecked) {
                  const _scrollTarget = _firstUnchecked.closest('.custom-checkbox') || _firstUnchecked;
                  _scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  _firstUnchecked.classList.add('shake');
                  setTimeout(() => _firstUnchecked.classList.remove('shake'), 600);
              }
            const submitBtn = document.getElementById('mainSubmitBtn');
            if (submitBtn) {
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
            }
            this.setState({ isSubmitting: false });
            return;
        }
        // Clear any prior declaration error when all boxes are checked
          const _declErrEl = document.getElementById('declarationError');
          if (_declErrEl) _declErrEl.style.display = 'none';

        if (!isRetry) {
            for (let i = 1; i <= 5; i++) {
                if (!this.validateStep(i)) {
                    this.showSection(i);
                    this.updateProgressBar();
                    return;
                }
            }
        }

        const submitBtn = document.getElementById('mainSubmitBtn');
        if (submitBtn) {
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;
        }

        this.setState({ isSubmitting: true });
        this.showSubmissionProgress();

        try {
            this.updateSubmissionProgress(1, t.processing);

            const form = document.getElementById('rentalApplication');
            const formData = new FormData(form);

            // Property context fields are carried by hidden inputs in index.html
            // and serialised automatically by FormData — no manual appending needed.

            // [10A-3] Encode attached documents as base64 and append to form data.
            // Guard: if total raw size > 3 MB the base64-expanded payload risks
            // exceeding the GAS 10 MB content limit and silently failing. In that
            // case we skip file attachment so the application record is never lost.
            if (this._uploadedFiles && this._uploadedFiles.length > 0) {
                const MAX_TOTAL_BYTES = 3 * 1024 * 1024; // 3 MB raw → ~4 MB base64
                const totalBytes = this._uploadedFiles.reduce((sum, f) => sum + f.size, 0);
                if (totalBytes > MAX_TOTAL_BYTES) {
                    console.warn('[CP] Files too large (' + (totalBytes / 1024 / 1024).toFixed(1) + ' MB total) — skipping attachments.');
                    const uploadWarn = document.getElementById('uploadError');
                    if (uploadWarn) {
                        uploadWarn.textContent = 'Your attached files are too large to submit together. They have been removed from this submission. Please email your documents to us separately after submitting.';
                        uploadWarn.style.display = 'block';
                    }
                } else {
                    const encodeFile = (file) => new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                            const b64 = reader.result.split(',')[1];
                            resolve(b64);
                        };
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });
                    const encoded = await Promise.all(this._uploadedFiles.map(encodeFile));
                    encoded.forEach((b64, i) => {
                        formData.append(`_docFile_${i}_name`, this._uploadedFiles[i].name);
                        formData.append(`_docFile_${i}_type`, this._uploadedFiles[i].type || 'application/octet-stream');
                        formData.append(`_docFile_${i}_data`, b64);
                    });
                }
            }

                        this.updateSubmissionProgress(2, t.validating);

            // M4: Attach CSRF token to submission
            formData.append('_cp_csrf', this._csrfToken || sessionStorage.getItem('_cp_csrf') || '');

            let response;
            const _fetchController = new AbortController();
            const _fetchTimer = setTimeout(() => _fetchController.abort(), 55000);
            try {
                response = await fetch(this.BACKEND_URL, {
                    method: 'POST',
                    body: formData,
                    signal: _fetchController.signal
                });
            } catch (networkErr) {
                const netErr = new Error(t.networkError);
                netErr.isTransient = true;
                throw netErr;
            } finally {
                clearTimeout(_fetchTimer);
            }

            // GAS can return HTML error pages (quota exceeded, script error, etc.)
            // Always check content type before parsing as JSON
            let result;
            const contentType = response.headers.get('content-type') || '';
            if (!response.ok || !contentType.includes('application/json')) {
                throw new Error(t.serverError);
            }
            try {
                result = await response.json();
            } catch (parseErr) {
                throw new Error(t.serverError);
            }

            if (result.success) {
                this.updateSubmissionProgress(3, t.submitting);
                await this.delay(500);
                this.updateSubmissionProgress(4, t.complete);
                await this.delay(500);
                this.handleSubmissionSuccess(result.appId);
            } else {
                // GAS returns this error when the form was already submitted successfully
                // but the original response was lost and the frontend retried. The App ID
                // embedded in the message proves the first submission went through — treat
                // it as success so the user sees the confirmation screen, not an error.
                const errMsg = result.error || '';
                if (errMsg.includes('already have an active application')) {
                    // GAS also returns existingAppId directly in the JSON — prefer that,
                    // fall back to parsing the Ref: from the message text
                    const refMatch = errMsg.match(/Ref:\s*([A-Z0-9\-]+)/i);
                    const extractedId = result.existingAppId || result.appId || (refMatch && refMatch[1]) || '';
                    this.updateSubmissionProgress(3, t.submitting);
                    await this.delay(300);
                    this.updateSubmissionProgress(4, t.complete);
                    await this.delay(300);
                    this.handleSubmissionSuccess(extractedId);
                    return;
                }
                throw new Error(errMsg || 'Submission failed');
            }

        } catch (error) {
            console.error('Submission error:', error);
            const submitBtn = document.getElementById('mainSubmitBtn');
            if (submitBtn) {
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
            }
            this.setState({ isSubmitting: false });

            const isTransient = this.isTransientError(error);
            this.showSubmissionError(error, isTransient);

            // After the FIRST network/transient error, immediately check in the background
            // whether GAS already processed the form. GAS often completes successfully
            // on slow connections even when the response never makes it back to the browser.
            // _verifyStarted ensures we only launch one background check per submission attempt.
            if (isTransient && this.retryCount >= 1 && this.BACKEND_URL && !this._verifyStarted) {
                this._verifyStarted = true;
                this._autoVerifySubmission();
            }
        }
    }

    // ---------- _autoVerifySubmission ----------
    // Called in the background immediately after the FIRST network/transient error.
    // Uses a GET request (no GAS redirect chain) to check if a submission for this
    // email was received in the last 30 min. GET is significantly more reliable on
    // poor/mobile connections because GAS returns the response directly.
    // Retries up to 4 times with increasing delays before giving up.
    async _autoVerifySubmission() {
        try {
            const emailEl = document.getElementById('email');
            const email = emailEl ? emailEl.value.trim() : '';
            if (!email || !email.includes('@') || !this.BACKEND_URL) return;

            // Wait 3 seconds — enough for GAS to finish processing the form
            await this.delay(3000);

            // Try up to 4 times with increasing delays (3s, 6s, 12s, 20s between attempts)
            const delays = [0, 3000, 6000, 12000];
            let result = null;
            for (let attempt = 0; attempt < delays.length; attempt++) {
                if (attempt > 0) await this.delay(delays[attempt]);
                try {
                    // GET endpoint — GAS handles this directly with no redirect, making it
                    // reliable even when the main POST submission response was lost.
                    const verifyUrl = this.BACKEND_URL + '?path=checkRecentSubmission&email=' + encodeURIComponent(email);
                    const resp = await fetch(verifyUrl);
                    const ct = resp.headers.get('content-type') || '';
                    if (!resp.ok || !ct.includes('application/json')) continue;
                    const data = await resp.json();
                    if (data && data.found && data.appId) { result = data; break; }
                } catch (_verifyNetErr) {
                    // Network error on this attempt — try again
                }
            }

            if (result && result.found && result.appId) {
                console.log('[CP] Auto-verify: submission confirmed for', email, '— App ID:', result.appId);
                // Cancel any pending auto-retry before showing success
                if (this.retryTimeout) {
                    clearTimeout(this.retryTimeout);
                    this.retryTimeout = null;
                }
                this._verifyStarted = false;
                this.handleSubmissionSuccess(result.appId);
            } else {
                this._verifyStarted = false;
            }
        } catch (e) {
            this._verifyStarted = false;
            // Verification failed silently — user already sees the helpful error message
        }
    }

    // ---------- MODIFIED: show/hide progress with backdrop ----------
    showSubmissionProgress() {
        const progress = document.getElementById('submissionProgress');
        const backdrop = document.getElementById('modalBackdrop');
        const form = document.getElementById('rentalApplication');
        if (progress) progress.style.display = 'block';
        if (backdrop) backdrop.style.display = 'block';
        if (form) form.style.display = 'none';
    }

    hideSubmissionProgress() {
        const progress = document.getElementById('submissionProgress');
        const backdrop = document.getElementById('modalBackdrop');
        const form = document.getElementById('rentalApplication');
        if (progress) progress.style.display = 'none';
        if (backdrop) backdrop.style.display = 'none';
        if (form) form.style.display = 'block';
    }

    // ---------- handleSubmissionSuccess ----------
    handleSubmissionSuccess(appId) {
        this.hideSubmissionProgress();
        const form = document.getElementById('rentalApplication');
        if (form) form.style.display = 'none';
        const backdrop = document.getElementById('modalBackdrop');
        if (backdrop) backdrop.style.display = 'none';
        
        this.showSuccessState(appId);
        this.clearSavedProgress();
        sessionStorage.setItem('lastSuccessAppId', appId);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ---------- showSuccessState ----------
    showSuccessState(appId) {
        const successState = document.getElementById('successState');
        if (!successState) return;

        const t = this.getTranslations();
        
        const getSelectedCheckboxValues = (name) => {
            const checkboxes = document.querySelectorAll(`input[name="${name}"]:checked`);
            return Array.from(checkboxes).map(cb => cb.value);
        };
        
        const contactMethods = getSelectedCheckboxValues('Preferred Contact Method');
        const contactMethodsDisplay = contactMethods.length > 0 ? contactMethods.join(', ') : t.notSpecified;
        
        const contactTimes = getSelectedCheckboxValues('Preferred Time');
        const contactTimesDisplay = contactTimes.length > 0 ? contactTimes.join(', ') : t.notSpecified;
        
        const primaryPayment = document.getElementById('primaryPayment')?.value;
        const secondaryPayment = document.getElementById('secondaryPayment')?.value;
        const thirdPayment = document.getElementById('thirdPayment')?.value;

        let paymentPrefs = primaryPayment ? primaryPayment : t.notSelected;
        if (secondaryPayment && secondaryPayment.trim()) {
            paymentPrefs += `, ${secondaryPayment}`;
        }
        if (thirdPayment && thirdPayment.trim()) {
            paymentPrefs += `, ${thirdPayment}`;
        }
        
        // Property context line for success card (if arrived from listing site)
        const ctx = this.state.propertyContext;
        const propertyLine = (ctx && (ctx.name || ctx.city))
            ? '<div class="success-property-line"><i class="fas fa-home"></i><span>' +
              this._escHtml(ctx.name || [ctx.city, ctx.state].filter(Boolean).join(', ')) +
              '</span></div>'
            : '';

        // 9C-2: 'Back to listing' link if user arrived from a specific property page
        const backLink = this.state.sourceUrl
            ? '<a href="' + this._escHtml(this.state.sourceUrl) + '" style="display:inline-block;margin-top:8px;font-size:0.9rem;color:#1a5276;text-decoration:none;">â Back to this listing</a>'
            : '';

        const dashboardLink = `${this.BACKEND_URL}?path=dashboard&id=${appId}`;
        
        successState.style.display = 'block';
        successState.innerHTML = `
            <div class="success-card">
                <div class="success-header">
                    <i class="fas fa-check-circle"></i>
                    <h2>${t.successTitle}</h2>
                    <p class="success-subtitle">${t.successText}</p>
                    ${propertyLine}
                    ${backLink}
                </div>

                <div class="id-section">
                    <div class="id-label">${t.appId}</div>
                    <div class="id-number" id="successAppId">${appId}</div>
                    <button class="copy-btn" onclick="copyAppId()">
                        <i class="fas fa-copy"></i> ${t.clickToCopy}
                    </button>
                </div>

                <div class="divider"></div>

                <div class="next-steps-box">
                    <h3><i class="fas fa-clock"></i> ${t.immediateNextSteps}</h3>
                    
                    <div class="step-row">
                        <div class="step-number">1</div>
                        <div class="step-content">
                            <strong>${t.paymentRequiredTitle}</strong>
                            <p>${t.paymentRequiredDesc}</p>
                        </div>
                    </div>

                    <div class="step-row">
                        <div class="step-number">2</div>
                        <div class="step-content">
                            <strong>${t.completePaymentTitle}</strong>
                            <p>${t.completePaymentDesc}</p>
                        </div>
                    </div>

                    <div class="step-row">
                        <div class="step-number">3</div>
                        <div class="step-content">
                            <strong>${t.reviewBeginsTitle}</strong>
                            <p>${t.reviewBeginsDesc}</p>
                        </div>
                    </div>
                </div>

                <div class="urgent-notice">
                    <i class="fas fa-exclamation-circle"></i>
                    <p><strong>${t.importantNote}</strong> ${t.paymentUrgentText}</p>
                </div>

                <div class="preference-summary">
                    <h4><i class="fas fa-clipboard-list"></i> ${t.yourPreferences}</h4>
                    <div class="preference-grid">
                        <div class="pref-item">
                            <span class="pref-label">${t.contactMethod}</span>
                            <span class="pref-value">${contactMethodsDisplay}</span>
                        </div>
                        <div class="pref-item">
                            <span class="pref-label">${t.bestTimes}</span>
                            <span class="pref-value">${contactTimesDisplay}</span>
                        </div>
                        <div class="pref-item">
                            <span class="pref-label">${t.paymentPref}</span>
                            <span class="pref-value">${paymentPrefs}</span>
                        </div>
                    </div>
                    <p class="pref-note">${t.preferenceNote}</p>
                </div>

                <div class="policy-box">
                    <i class="fas fa-gem"></i>
                    <div>
                        <strong>${t.reapplicationPolicyTitle}</strong>
                        <p>${t.reapplicationPolicyText}</p>
                    </div>
                </div>

                <div class="action-buttons">
                    <a href="${dashboardLink}" class="btn-track">
                        <i class="fas fa-chart-line"></i> ${t.trackStatus}
                    </a>
                    <button onclick="sessionStorage.removeItem('lastSuccessAppId'); location.reload();" class="btn-new">
                        <i class="fas fa-plus"></i> ${t.newApplication}
                    </button>
                </div>

                <div class="qr-track-section">
                    <div class="qr-track-label">
                        <i class="fas fa-mobile-alt"></i>
                        Scan to track your application on your phone
                    </div>
                    <div id="successQRCode" class="qr-code-box"></div>
                </div>

                <div class="spam-warning-notice" style="background:#fff8e1;border:1px solid #ffe082;border-radius:10px;padding:14px 16px;margin:16px 0;font-size:13.5px;color:#5d4037;line-height:1.5;">
                    ${t.spamWarning}
                </div>

                <div class="help-line">
                    ${t.questions} <strong>707-706-3137</strong> — ${t.helpText}
                </div>
            </div>
        `;
        
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Generate QR code pointing to the applicant dashboard
        try {
            const qrContainer = document.getElementById('successQRCode');
            if (qrContainer && typeof QRCode !== 'undefined') {
                new QRCode(qrContainer, {
                    text: dashboardLink,
                    width: 140,
                    height: 140,
                    colorDark: '#1B3A5C',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.M
                });
            }
        } catch (qrErr) {
            // Non-fatal — QR code is a convenience feature only
            const qrContainer = document.getElementById('successQRCode');
            if (qrContainer) qrContainer.style.display = 'none';
        }
    }

    getTranslations() {
        if (!this.translations) return {};
        return this.translations[this.state.language] || this.translations['en'];
    }

    clearSavedProgress() {
        try { localStorage.removeItem(this.config.LOCAL_STORAGE_KEY); } catch (e) {}
        if (this._autoSaveTimer) {
            clearInterval(this._autoSaveTimer);
            this._autoSaveTimer = null;
        }
    }

    generateApplicationSummary() {
        const summaryContainer = document.getElementById('applicationSummary');
        if (!summaryContainer) return;

        const data = this.getAllFormData();
        Object.keys(data).forEach(key => {
            if (Array.isArray(data[key])) {
                data[key] = data[key].join(', ');
            }
        });

        const t = this.getTranslations();

        const groups = [
            { id: 1, name: t.summaryPropertyApplicant, fields: [
                'Property Address', 'Requested Move-in Date', 'Desired Lease Term',
                'First Name', 'Last Name', 'Email', 'Phone', 'SSN'
            ]},
            { id: 1, name: t.summaryCoApplicant, fields: [
                'Has Co-Applicant', 'Additional Person Role',
                'Co-Applicant First Name', 'Co-Applicant Last Name',
                'Co-Applicant Email', 'Co-Applicant Phone',
                'Co-Applicant SSN',
                'Co-Applicant Employer', 'Co-Applicant Job Title',
                'Co-Applicant Monthly Income', 'Co-Applicant Employment Duration',
                'Co-Applicant Consent'
            ]},
            { id: 2, name: t.summaryResidency, fields: [
                'Current Address', 'Residency Duration', 'Current Rent Amount',
                'Reason for leaving', 'Current Landlord Name', 'Landlord Phone'
            ]},
            { id: 2, name: t.summaryOccupancy, fields: [
                'Total Occupants', 'Additional Occupants', 'Has Pets', 'Pet Details',
                'Has Vehicle', 'Vehicle Make', 'Vehicle Model', 'Vehicle Year', 'Vehicle License Plate'
            ]},
            { id: 3, name: t.summaryEmployment, fields: [
                'Employment Status', 'Employer', 'Job Title', 'Employment Duration',
                'Supervisor Name', 'Supervisor Phone', 'Monthly Income', 'Other Income'
            ]},
            { id: 4, name: t.summaryFinancial, fields: [
                'Emergency Contact Name', 'Emergency Contact Phone', 'Emergency Contact Relationship',
                'Reference 1 Name', 'Reference 1 Phone', 'Reference 2 Name', 'Reference 2 Phone'
            ]},
            { id: 5, name: t.summaryPayment, fields: [
                'Primary Payment Method', 'Primary Payment Method Other',
                'Alternative Payment Method', 'Alternative Payment Method Other',
                'Third Choice Payment Method', 'Third Choice Payment Method Other'
            ]}
        ];

        const displayLabels = {
            'SSN': 'SSN (Last 4 Digits)',
            'Co-Applicant SSN': 'Co-Applicant SSN (Last 4)',
            'Has Co-Applicant': 'Has Co-Applicant/Guarantor',
            'Additional Person Role': 'Role'
        };

        let summaryHtml = '';
        groups.forEach(group => {
            let groupFieldsHtml = '';
            group.fields.forEach(field => {
                const value = data[field];
                const displayLabel = displayLabels[field] || field;
                  if (value && value !== '') {
                      const isSensitive = field === 'SSN' || field === 'Co-Applicant SSN'; // [10B-4/19]
                      const displayValue = isSensitive ? '••••' : value;
                      groupFieldsHtml += `
                          <div class="summary-item">
                              <div class="summary-label">${displayLabel}</div>
                              <div class="summary-value">${displayValue}</div>
                        </div>`;
                }
            });

            if (groupFieldsHtml) {
                summaryHtml += `
                    <div class="summary-group" onclick="window.app.goToSection(${group.id})" role="button" tabindex="0" aria-label="Edit ${group.name}" title="Tap to edit this section" onkeydown="if(event.key==='Enter'||event.key===' ')window.app.goToSection(${group.id})">
                        <div class="summary-header">
                            <span>${group.name}</span>
                            <span class="summary-edit-btn" aria-hidden="true">
                                <i class="fas fa-pencil-alt"></i> ${t.editSection}
                            </span>
                        </div>
                        <div class="summary-content">
                            ${groupFieldsHtml}
                        </div>
                    </div>`;
            }
        });

        summaryContainer.innerHTML = summaryHtml;
    }

    // ================================================================
    // DEV ONLY — Remove before final launch
    // Fills only the fields on the current step so you can test
    // each step individually and experience the form naturally.
    // ================================================================
    _devFillTestData() {
        this._devFillStep(this.getCurrentSection());
    }

    _devFillStep(step) {
        const d   = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
        const chk = (id, c) => { const el = document.getElementById(id); if (el) el.checked = c; };
        const sel = (id, v) => { const el = document.getElementById(id); if (el) { el.value = v; el.dispatchEvent(new Event('change')); } };
        const fire = id => { const el = document.getElementById(id); if (el) el.dispatchEvent(new Event('input')); };

        switch (step) {
            case 1: {
                const moveIn = new Date();
                moveIn.setDate(moveIn.getDate() + 33);
                const pad = n => String(n).padStart(2, '0');
                const moveInStr = `${moveIn.getFullYear()}-${pad(moveIn.getMonth()+1)}-${pad(moveIn.getDate())}`;
                d('propertyAddress', '742 Vineyard Court, Napa, CA 94558');
                d('requestedMoveIn', moveInStr);
                sel('desiredLeaseTerm', '12 months');
                d('firstName', 'Maria');
                d('lastName', 'Rodriguez');
                d('email', 'maria.test@example.com');
                d('phone', '(707) 555-1234');
                d('dob', '1990-06-15');
                d('ssn', '7890');
                break;
            }
            case 2: {
                d('currentAddress', '456 Oak Street, Apt 3B, Napa, CA 94559');
                d('residencyStart', '2 years 4 months');
                d('rentAmount', '1800');
                d('landlordName', 'John Peterson');
                d('landlordPhone', '(707) 555-9876');
                const rl = document.getElementById('reasonLeaving');
                if (rl) rl.value = 'Looking for a larger space closer to work. Great experience with current landlord.';
                d('totalOccupants', '2');
                chk('petsNo', true);
                const vToggle = document.querySelector('input[name="Has Vehicle"][value="Yes"]');
                if (vToggle) { vToggle.checked = true; vToggle.dispatchEvent(new Event('change')); }
                d('vehicleMake', 'Toyota');
                d('vehicleModel', 'Camry');
                d('vehicleYear', '2021');
                d('vehiclePlate', '7ABC123');
                chk('evictedNo', true);
                chk('smokeNo', true);
                break;
            }
            case 3: {
                sel('employmentStatus', 'Full-time');
                d('employer', 'Napa Valley Winery LLC');
                d('jobTitle', 'Marketing Manager');
                d('employmentDuration', '4 years');
                d('supervisorName', 'David Chen');
                d('supervisorPhone', '(707) 555-5432');
                d('monthlyIncome', '5500');
                fire('monthlyIncome');
                break;
            }
            case 4: {
                d('ref1Name', 'Sarah Johnson');
                d('ref1Phone', '(707) 555-2222');
                d('ref1Relationship', 'Former Landlord');
                d('ref2Name', 'Michael Torres');
                d('ref2Phone', '(707) 555-3333');
                d('ref2Relationship', 'Employer');
                d('emergencyName', 'Carlos Rodriguez');
                d('emergencyPhone', '(707) 555-4444');
                d('emergencyRelationship', 'Brother');
                break;
            }
            case 5: {
                sel('primaryPayment', 'Venmo');
                chk('contactMethodEmail', true);
                chk('timeMorning', true);
                chk('timeAfternoon', true);
                break;
            }
            case 6: {
                chk('certifyCorrect', true);
                chk('authorizeVerify', true);
                chk('termsAgree', true);
                chk('feeAcknowledge', true);
                chk('infoAccuracy', true);
                chk('dataConsent', true);
                this.generateApplicationSummary();
                break;
            }
        }

        console.log(`[DEV] Step ${step} filled`);

        const toast = document.createElement('div');
        toast.textContent = `\uD83E\uDDEA Step ${step} filled`;
        toast.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);background:#2ecc71;color:#fff;padding:10px 20px;border-radius:50px;font-size:14px;font-weight:700;z-index:99999;box-shadow:0 4px 14px rgba(0,0,0,0.25);pointer-events:none;';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2200);
    }
    // ================================================================

    goToSection(sectionNumber) {
        // NOTE: This method bypasses step validation intentionally.
        // Used only from the Step 6 "Edit Section" summary links.
        // Submission validation in handleFormSubmit() re-validates all steps 1-5
        // before allowing final submit, so data integrity is still enforced.
        this.hideSection(this.getCurrentSection());
        this.showSection(sectionNumber);
        this.updateProgressBar();
    }

}

// ---------- Global copy function (single authoritative definition) ----------
// Called via onclick="copyAppId()" from the JS-generated success card.
// The duplicate definition that existed in index.html has been removed.
window.copyAppId = function() {
    const el = document.getElementById('successAppId');
    if (!el) return;
    const appId = el.innerText.trim();
    if (!appId) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(appId).then(() => {
            const btn = document.querySelector('.copy-btn');
            if (btn) {
                const original = btn.innerHTML;
                const tCopy = (window.app && window.app.getTranslations) ? window.app.getTranslations() : {};
                btn.innerHTML = `<i class="fas fa-check"></i> ${tCopy.copied || 'Copied!'}`;
                setTimeout(() => { btn.innerHTML = original; }, 2000);
            }
        }).catch(() => {
            // Clipboard API blocked — fall back to prompt
            window.prompt('Copy your Application ID:', appId);
        });
    } else {
        window.prompt('Copy your Application ID:', appId);
    }
};

// ============================================================
// Initialize app
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    window.app = new RentalApplication();
    const s1 = document.getElementById('section1');
    if (s1) s1.classList.add('active');

    // ── Dev / utility button listeners (replaces inline onclick — CSP safe) ──
    const devFillBtn     = document.getElementById('devTestFillBtn');
    const startOverBtn   = document.getElementById('startOverBtn');
    const clearOverlay   = document.getElementById('clearFormOverlay');
    const clearCancel    = document.getElementById('clearFormCancel');
    const clearConfirm   = document.getElementById('clearFormConfirm');

    if (devFillBtn)   devFillBtn.addEventListener('click',   () => window.app._devFillTestData());
    if (startOverBtn) startOverBtn.addEventListener('click', () => window.app._openClearSheet());
    if (clearOverlay) clearOverlay.addEventListener('click', () => window.app._closeClearSheet());
    if (clearCancel)  clearCancel.addEventListener('click',  () => window.app._closeClearSheet());
    if (clearConfirm) clearConfirm.addEventListener('click', () => window.app._clearForm());
});
