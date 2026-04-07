/*
=======================================================================
  ⛔ ARCHITECTURE ENFORCEMENT HEADER — READ BEFORE MODIFYING ⛔
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
  ─────────────────────────────────────────────────────────────────────
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
  ─────────────────────────────────────────────────────────────────────
*/

class RentalApplication {
    constructor() {
        this.config = {
            LOCAL_STORAGE_KEY: "choicePropertiesRentalApp",
            AUTO_SAVE_INTERVAL: 30000,
            MAX_FILE_SIZE: 10 * 1024 * 1024
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
        
        this.BACKEND_URL = 'https://script.google.com/macros/s/AKfycbwqctrCLYOPaz1nZeMS5SXuqK7FRXbN5Bf0dSx3-3leyp_B7Bfr4HPC8YZaZ9wZVxtn/exec';
        
        this.initialize();
    }

    // ---------- SSN toggle ----------
    setupSSNToggle() {
        const ssnInput = document.getElementById('ssn');
        if (!ssnInput) return;
        const container = ssnInput.parentElement;
        let toggle = container.querySelector('.ssn-toggle');
        if (!toggle) {
            toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.className = 'ssn-toggle';
            toggle.id = 'ssnToggle';
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
        ssnInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').substring(0, 4);
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
        this.setupEventListeners();
        this.setupOfflineDetection();
        this.setupRealTimeValidation();
        this.setupSSNToggle();
        this.setupFileUploads();
        this.setupConditionalFields();
        this.setupCharacterCounters();
        this.restoreSavedProgress();
        this.setupGeoapify();
        this.setupInputFormatting();
        this._readApplicationFee();
        this.setupLanguageToggle();
        this.setupSaveResume();

        this._autoSaveTimer = setInterval(() => this.saveProgress(), this.config.AUTO_SAVE_INTERVAL);

        // Initialise fields-remaining hint for the first section
        setTimeout(() => this.updateFieldsRemainingHint(1), 50);

        // ── Read URL params from listing site and pre-fill form ──
        this._prefillFromURL();
        
        const savedAppId = sessionStorage.getItem('lastSuccessAppId');
        if (savedAppId) {
            document.getElementById('rentalApplication').style.display = 'none';
            this.showSuccessState(savedAppId);
        }
        
        console.log('Rental Application Manager Initialized');
    }


    // ─────────────────────────────────────────────────────────────────────
    // APPLICATION FEE — read from URL param before translations are built.
    // Falls back to 50 if not provided by the listing platform.
    // ─────────────────────────────────────────────────────────────────────
    _readApplicationFee() {
        try {
            const p   = new URLSearchParams(window.location.search);
            const fee = parseFloat(p.get('fee'));
            if (fee && fee > 0) this.state.applicationFee = fee;
        } catch (e) {}
    }

    // ─────────────────────────────────────────────────────────────────────
    // URL PRE-FILL — reads context passed by the main listing platform.
    // Params: id, pn (name), addr, city, state, rent
    // All values are display-only. Backend never uses or validates these.
    // ─────────────────────────────────────────────────────────────────────
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
              const parkingFee = p.get('parking_fee') || '';

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
              setHidden('hiddenPetsAllowed',     pets);
              setHidden('hiddenPetTypes',        petTypes);
              setHidden('hiddenPetWeightLimit',  petWeight);
              setHidden('hiddenPetDeposit',      petDeposit);
              setHidden('hiddenPetDetails',      petDetails);
              setHidden('hiddenSmokingAllowed',  smoking);
              setHidden('hiddenUtilities',       utilities);
              setHidden('hiddenParking',         parking);
              setHidden('hiddenParkingFee',      parkingFee);

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
            this._showPropertyBanner({ id, name, addr, city, state, rent, beds, baths, deposit, avail, terms });

        } catch (err) {
            // Silent — never break the form over a missing URL param
            console.warn('_prefillFromURL error (non-fatal):', err);
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // PROPERTY CONTEXT BANNER — shown between header and progress bar.
    // Lets applicants confirm they're applying for the right property.
    // ─────────────────────────────────────────────────────────────────────
    _showPropertyBanner({ id, name, addr, city, state, rent, beds, baths, deposit, avail, terms }) {
        if (!name && !addr && !city) return;

        const displayName = name || 'Selected Property';
        const locationParts = [city, state].filter(Boolean);
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
        const chipsHtml = chips.length ? '<div class="pcb-chips">' + chips.join('') + '</div>' : '';

        // Back-to-listing link — only shown when a property ID was passed
        const backLinkHtml = id
            ? '<a href="https://choice-properties.pages.dev/property.html?id=' + encodeURIComponent(id) + '" class="pcb-back-link" target="_blank" rel="noopener">' +
                  '<i class="fas fa-arrow-left"></i> View listing' +
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
                        '<div class="pcb-label">Applying for</div>' +
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

    // ─────────────────────────────────────────────────────────────────────
    // NO-CONTEXT PROMPT — shown when the form is opened without URL params.
    // Guides the applicant to manually enter the property address on Step 1.
    // ─────────────────────────────────────────────────────────────────────
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
        const apiKey = "bea2afb13c904abea5cb2c2693541dcf";
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
            const birthDate = new Date(field.value);
            const today = new Date();
            if (!field.value) {
                isValid = false;
                errorMessage = this.state.language === 'en' ? 'Please enter your date of birth.' : 'Por favor ingrese su fecha de nacimiento.';
            } else if (isNaN(birthDate.getTime())) {
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
            const moveInDate = new Date(field.value);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (!field.value) {
                isValid = false;
                errorMessage = this.state.language === 'en' ? 'Please select a move-in date.' : 'Por favor seleccione una fecha de mudanza.';
            } else if (moveInDate < today) {
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
        }
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
                });
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
        setTimeout(() => field.focus(), 600);
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
        if (hasCoApplicantCheck && coApplicantSection) {
            hasCoApplicantCheck.addEventListener('change', (e) => {
                coApplicantSection.style.display = e.target.checked ? 'block' : 'none';
                if (!e.target.checked) {
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

        // ── Employment status: hide/un-require employer fields when not applicable ──
        // Unemployed, Retired, and Student applicants have no employer to list.
        // Hiding these fields prevents a hard block at Step 3 validation.
        const NON_EMPLOYED = ['Unemployed', 'Retired', 'Student'];
        const employerFieldIds = ['employer', 'jobTitle', 'employmentDuration', 'supervisorName', 'supervisorPhone'];

        const toggleEmployerSection = (status) => {
            const isEmployed = !NON_EMPLOYED.includes(status);
            // Track which .form-row elements have already been toggled this pass
            // (employer+jobTitle share one row, supervisorName+Phone share another)
            const rowsSeen = new Set();
            employerFieldIds.forEach(id => {
                const el = document.getElementById(id);
                if (!el) return;
                if (isEmployed) {
                    el.setAttribute('required', 'required');
                    el.classList.remove('is-invalid');
                    this.clearError(el);
                } else {
                    el.removeAttribute('required');
                    el.value = '';
                    el.classList.remove('is-invalid');
                    this.clearError(el);
                }
                // Hide/show the parent .form-row (covers 2-column rows correctly)
                const row = el.closest('.form-row') || el.closest('.form-group');
                if (row && !rowsSeen.has(row)) {
                    row.style.display = isEmployed ? '' : 'none';
                    rowsSeen.add(row);
                }
            });
        };

        const empStatusEl = document.getElementById('employmentStatus');
        if (empStatusEl) {
            empStatusEl.addEventListener('change', () => toggleEmployerSection(empStatusEl.value));
            // Apply on load in case saved/pre-filled state is non-employed
            toggleEmployerSection(empStatusEl.value);
        }
    }

    setupFileUploads() {}

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
            this.saveProgress();
            // Build a resume URL with the saved data encoded as a param
            const savedKey = this.config.LOCAL_STORAGE_KEY;
            const currentParams = new URLSearchParams(window.location.search);
            currentParams.set('resume', '1');
            const resumeUrl = window.location.origin + window.location.pathname + '?' + currentParams.toString();
            // Send via GAS backend (fire-and-forget, no blocking)
            const payload = new FormData();
            payload.append('_action', 'sendResumeEmail');
            payload.append('email', email);
            payload.append('resumeUrl', resumeUrl);
            payload.append('step', this.getCurrentSection());
            fetch(this.BACKEND_URL, { method: 'POST', body: payload }).catch(() => {});
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
            const parent = textarea.parentElement;
            const counter = document.createElement('div');
            counter.className = 'character-count';
            counter.style.fontSize = '11px';
            counter.style.textAlign = 'right';
            counter.style.color = '#7f8c8d';
            parent.appendChild(counter);
            const updateCounter = () => {
                const len = textarea.value.length;
                const max = textarea.getAttribute('maxlength') || 500;
                const tC = this.getTranslations();
                counter.textContent = `${len}/${max} ${tC.charCount}`;
            };
            textarea.addEventListener('input', updateCounter);
            updateCounter();
        });
    }

    restoreSavedProgress() {
        const saved = localStorage.getItem(this.config.LOCAL_STORAGE_KEY);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                const SKIP = new Set(['SSN', 'Co-Applicant SSN', 'Application ID', '_last_updated', '_language']);
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
                        firstEl.checked = !!(value);
                    } else {
                        firstEl.value = value;
                    }
                });
                if (data._language) this.state.language = data._language;
            } catch (e) {}
        }
    }

    saveProgress() {
        const data = this.getAllFormData();
        const sensitiveKeys = ['SSN', 'Application ID', 'Co-Applicant SSN'];
        sensitiveKeys.forEach(key => delete data[key]);
        data._last_updated = new Date().toISOString();
        data._language = this.state.language || 'en';
        localStorage.setItem(this.config.LOCAL_STORAGE_KEY, JSON.stringify(data));
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
        formData.forEach((value, key) => { data[key] = value; });
        return data;
    }

    debounce(func, wait) {
        let timeout;
        return function() {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, arguments), wait);
        };
    }

    // ---------- Language toggle ----------
    setupLanguageToggle() {
        const fee = this.state.applicationFee;
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
                paymentRequiredTitle: 'Payment Required Before Review',
                paymentRequiredDesc: `Our team will contact you shortly at the phone number provided to arrange the $${fee} application fee.`,
                completePaymentTitle: 'Complete Payment',
                completePaymentDesc: `Your application is not complete until the $${fee} fee has been paid. We'll discuss payment options you're familiar with.`,
                reviewBeginsTitle: 'Review Begins',
                reviewBeginsDesc: 'Once payment is confirmed, your application enters the formal review process. You can track status online with your ID.',
                importantNote: 'Important:',
                paymentUrgentText: `Your application is not complete until the $${fee} fee has been paid. Please keep your phone nearby.`,
                yourPreferences: 'Your Preferences',
                contactMethod: 'Contact Method:',
                bestTimes: 'Best Times:',
                paymentPref: 'Payment Preferences:',
                preferenceNote: 'We\'ll use these for non-urgent follow-up after your payment is complete.',
                questions: 'Questions? Call or text',
                helpText: 'we\'re here to help.',
                spamWarning: '📧 A confirmation email has been sent to you. If you don\'t see it within a few minutes, please check your <strong>spam or junk folder</strong>.',
                trackStatus: 'Track My Application',
                newApplication: 'New Application',
                reapplicationPolicyTitle: 'Reapplication Protection',
                reapplicationPolicyText: 'If your application is denied, you may apply for any other available property within 30 days — no new application fee. Your screening results remain valid for 60 days.',
                step1YouSubmit: '1. You Submit',
                step1Desc: 'Fill out your application completely',
                step2PaymentArranged: '2. Payment Arranged',
                step2Desc: `We contact you for the $${fee} fee`,
                step3ReviewBegins: '3. Review Begins',
                step3Desc: 'After payment, we review your application',
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
                paymentIntro: `Tell us which payment services you use. When we contact you about the $${fee} application fee, we'll discuss options you're familiar with.`,
                paymentImportant: 'Payment must be completed before your application can be reviewed. Our team will contact you promptly after submission to arrange this.',
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
                feeTitle: `Application Fee: $${fee}.00`,
                feeDesc: 'This fee is required before review can begin. Our team will contact you immediately after submission to arrange payment.',
                paymentReminderTitle: 'Payment Required Before Review',
                paymentReminderDesc: `Your application is not complete until the $${fee} fee has been paid. Our team will contact you shortly after submission to arrange this.`,
                verificationTitle: 'Verify Your Contact Information',
                verificationDesc: `Please confirm your email and phone number are correct. This is how our team will reach you about the $${fee} fee.`,
                reapplicationPolicyTextShort: 'If denied, apply again within 30 days with no new fee. Screening results valid for 60 days.',
                legalDeclaration: 'Legal Declaration',
                legalCertify: 'I certify that the information provided in this application is true and correct to the best of my knowledge.',
                legalAuthorize: 'I authorize verification of the information provided, including employment, income, and references.',
                termsAgreeLabel: 'I agree to the terms and conditions',
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
                paymentRequiredTitle: 'Pago Requerido Antes de la Revisión',
                paymentRequiredDesc: `Nuestro equipo se comunicará con usted en breve al número proporcionado para coordinar el pago de $${fee}.`,
                completePaymentTitle: 'Completar el Pago',
                completePaymentDesc: `Su solicitud no está completa hasta que se haya pagado la tarifa de $${fee}. Discutiremos opciones de pago que conozca.`,
                reviewBeginsTitle: 'Comienza la Revisión',
                reviewBeginsDesc: 'Una vez que se confirme el pago, su solicitud entra en el proceso de revisión formal. Puede seguir el estado en línea con su ID.',
                importantNote: 'Importante:',
                paymentUrgentText: `Su solicitud no está completa hasta que se haya pagado la tarifa de $${fee}. Por favor mantenga su teléfono cerca.`,
                yourPreferences: 'Sus Preferencias',
                contactMethod: 'Método de Contacto:',
                bestTimes: 'Mejores Horarios:',
                paymentPref: 'Preferencias de Pago:',
                preferenceNote: 'Usaremos estas para seguimiento no urgente después de que se complete su pago.',
                questions: '¿Preguntas? Llame o envíe un mensaje de texto al',
                helpText: 'estamos aquí para ayudar.',
                spamWarning: '📧 Se le ha enviado un correo de confirmación. Si no lo ve en unos minutos, revise su carpeta de <strong>spam o correo no deseado</strong>.',
                trackStatus: 'Seguir Mi Solicitud',
                newApplication: 'Nueva Solicitud',
                reapplicationPolicyTitle: 'Protección de Reaplicación',
                reapplicationPolicyText: 'Si su solicitud es denegada, puede solicitar cualquier otra propiedad disponible dentro de los 30 días sin pagar otra tarifa de solicitud. Sus resultados de evaluación siguen siendo válidos por 60 días.',
                step1YouSubmit: '1. Usted Envía',
                step1Desc: 'Complete su solicitud completamente',
                step2PaymentArranged: '2. Pago Acordado',
                step2Desc: `Lo contactamos para la tarifa de $${fee}`,
                step3ReviewBegins: '3. Comienza la Revisión',
                step3Desc: 'Después del pago, revisamos su solicitud',
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
                ssnLabel: 'Número de Seguro Social (Últimos 4 dígitos)',
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
                coSsnLabel: 'SSN (Últimos 4)',
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
                paymentIntro: `Díganos qué servicios de pago utiliza. Cuando lo contactemos acerca de la tarifa de solicitud de $${fee}, discutiremos opciones con las que esté familiarizado.`,
                paymentImportant: 'El pago debe completarse antes de que su solicitud pueda ser revisada. Nuestro equipo lo contactará rápidamente después del envío para organizar esto.',
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
                feeTitle: `Tarifa de Solicitud: $${fee}.00`,
                feeDesc: 'Esta tarifa es requerida antes de que la revisión pueda comenzar. Nuestro equipo lo contactará inmediatamente después del envío para organizar el pago.',
                paymentReminderTitle: 'Pago Requerido Antes de la Revisión',
                paymentReminderDesc: `Su solicitud no está completa hasta que se haya pagado la tarifa de $${fee}. Nuestro equipo lo contactará poco después del envío para organizar esto.`,
                verificationTitle: 'Verifique Su Información de Contacto',
                verificationDesc: `Por favor confirme que su correo electrónico y número de teléfono sean correctos. Así es como nuestro equipo lo contactará acerca de la tarifa de $${fee}.`,
                reapplicationPolicyTextShort: 'Si es denegado, puede aplicar nuevamente dentro de 30 días sin nueva tarifa. Resultados de evaluación válidos por 60 días.',
                legalDeclaration: 'Declaración Legal',
                legalCertify: 'Certifico que la información proporcionada en esta solicitud es verdadera y correcta a mi leal saber y entender.',
                legalAuthorize: 'Autorizo la verificación de la información proporcionada, incluyendo empleo, ingresos y referencias.',
                termsAgreeLabel: 'Acepto los términos y condiciones',
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
                serverError: 'Nuestro sistema está temporalmente no disponible. Por favor intente de nuevo en unos minutos, o contáctenos al 707-706-3137.',
                copied: '¡Copiado!',
                pageTitle: 'Solicitud de Arrendamiento — Choice Properties'
            }
        };

        this.translations = translations;
        this.state.language = 'en';
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
                    const icon = b.querySelector('i');
                    const textSpan = document.createElement('span');
                    textSpan.setAttribute('data-i18n', 'nextStep');
                    textSpan.textContent = t.nextStep;
                    b.innerHTML = '';
                    b.appendChild(textSpan);
                    if (icon) b.appendChild(icon);
                });
                document.querySelectorAll('.btn-prev').forEach(b => {
                    const icon = b.querySelector('i');
                    const textSpan = document.createElement('span');
                    textSpan.setAttribute('data-i18n', 'prevStep');
                    textSpan.textContent = t.prevStep;
                    b.innerHTML = '';
                    if (icon) b.appendChild(icon);
                    b.appendChild(textSpan);
                });

                this.updateProgressBar();

                if (this.getCurrentSection() === 6) {
                    this.generateApplicationSummary();
                }

                this.saveProgress();
            });
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
                this.handleFormSubmit(new Event('submit'));
            }, delay);
            return;
        }

        // Permanent error or max retries reached
        msgEl.innerHTML = errorMessage;
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

    // ---------- MODIFIED: handleFormSubmit with retry reset ----------
    async handleFormSubmit(e) {
        e.preventDefault();
        const t = this.getTranslations();

        // ── Duplicate submission guard ──────────────────────────────
        // Block if already mid-submission
        if (this.state.isSubmitting) return;
        // Block if this session already produced a successful appId
        if (sessionStorage.getItem('lastSuccessAppId')) {
            const existingId = sessionStorage.getItem('lastSuccessAppId');
            this.showSuccessState(existingId);
            const form = document.getElementById('rentalApplication');
            if (form) form.style.display = 'none';
            return;
        }
        // ────────────────────────────────────────────────────────────

        this.retryCount = 0;
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
        if (!certify.checked || !authorize.checked || !terms.checked) {
            alert(t.pleaseAgreeDeclarations);
            const submitBtn = document.getElementById('mainSubmitBtn');
            if (submitBtn) {
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
            }
            this.setState({ isSubmitting: false });
            return;
        }

        for (let i = 1; i <= 5; i++) {
            if (!this.validateStep(i)) {
                this.showSection(i);
                this.updateProgressBar();
                return;
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

            this.updateSubmissionProgress(2, t.validating);

            let response;
            try {
                response = await fetch(this.BACKEND_URL, {
                    method: 'POST',
                    body: formData
                });
            } catch (networkErr) {
                const netErr = new Error(t.networkError);
                netErr.isTransient = true;
                throw netErr;
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
                throw new Error(result.error || 'Submission failed');
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

        const dashboardLink = `${this.BACKEND_URL}?path=dashboard&id=${appId}`;
        
        successState.style.display = 'block';
        successState.innerHTML = `
            <div class="success-card">
                <div class="success-header">
                    <i class="fas fa-check-circle"></i>
                    <h2>${t.successTitle}</h2>
                    <p class="success-subtitle">${t.successText}</p>
                    ${propertyLine}
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
        return this.translations[this.state.language] || this.translations['en'];
    }

    clearSavedProgress() {
        localStorage.removeItem(this.config.LOCAL_STORAGE_KEY);
        if (this._autoSaveTimer) {
            clearInterval(this._autoSaveTimer);
            this._autoSaveTimer = null;
        }
    }

    generateApplicationSummary() {
        const summaryContainer = document.getElementById('applicationSummary');
        if (!summaryContainer) return;

        const form = document.getElementById('rentalApplication');
        const formData = new FormData(form);
        const data = {};
        formData.forEach((value, key) => {
            if (value && key !== 'Application ID') {
                data[key] = value;
            }
        });

        const t = this.getTranslations();

        const groups = [
            { id: 1, name: t.summaryPropertyApplicant, fields: [
                'Property Address', 'Requested Move-in Date', 'Desired Lease Term',
                'First Name', 'Last Name', 'Email', 'Phone', 'DOB', 'SSN'
            ]},
            { id: 1, name: t.summaryCoApplicant, fields: [
                'Has Co-Applicant', 'Additional Person Role',
                'Co-Applicant First Name', 'Co-Applicant Last Name',
                'Co-Applicant Email', 'Co-Applicant Phone',
                'Co-Applicant DOB', 'Co-Applicant SSN',
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
                    groupFieldsHtml += `
                        <div class="summary-item">
                            <div class="summary-label">${displayLabel}</div>
                            <div class="summary-value">${value}</div>
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

    goToSection(sectionNumber) {
        this.hideSection(this.getCurrentSection());
        this.showSection(sectionNumber);
        this.updateProgressBar();
    }

    updateBilingualLabels(t) {}
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
// NOTE: test-fill functionality was removed — see git history if needed.

document.addEventListener('DOMContentLoaded', () => {
    window.app = new RentalApplication();
    const s1 = document.getElementById('section1');
    if (s1) s1.classList.add('active');
});
