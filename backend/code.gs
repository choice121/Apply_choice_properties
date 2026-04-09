// ============================================================
// CHOICE PROPERTIES - RENTAL APPLICATION BACKEND
// Updated: Lease Flow System Added
// ============================================================
// Company: Choice Properties
// Email: choicepropertygroup@hotmail.com
// Phone: 707-706-3137 (TEXT ONLY)
// Address: 2265 Livernois, Suite 500, Troy, MI 48083
// ============================================================

// Sheet configuration
const SHEET_NAME = 'Applications';
const SETTINGS_SHEET = 'Settings';
const LOG_SHEET = 'EmailLogs';
const ADMIN_EMAILS_RANGE = 'AdminEmails';
const APPLICATION_FEE = 50; // D-014: single source of truth for the application fee amount
// Phase 1 fix 1.1: null-safe fee helper — treats 0 as a valid fee (free applications)
function safeFee(val) { const n = parseFloat(val); return (!isNaN(n) && val !== '' && val !== null && val !== undefined) ? n : APPLICATION_FEE; }

// ============================================================
// D-002/D-003/D-004: JURISDICTION MAP
// Maps 2-letter state codes Ã¢ÂÂ lease legal language.
// Used by renderLeaseSigningPage() so the lease reflects the
// correct state law for the property Ã¢ÂÂ not just Michigan.
// Add states as Choice Properties expands into new markets.
// ============================================================
const JURISDICTION_MAP = {
  'AL': { stateName: 'Alabama',       county: 'applicable county', depositReturnDays: 60, earlyTermNoticeDays: 30, moveOutNoticeDays: 30, mtmNoticeDays: 30,
          eSignAct: 'Alabama Uniform Electronic Transactions Act (Ala. Code ÃÂ§ 8-1A-1 et seq.) and the federal' },
  'AK': { stateName: 'Alaska',        county: 'applicable borough', depositReturnDays: 14, earlyTermNoticeDays: 30, moveOutNoticeDays: 30, mtmNoticeDays: 30,
          eSignAct: 'Alaska Uniform Electronic Transactions Act (AS ÃÂ§ 09.80) and the federal' },
  'AZ': { stateName: 'Arizona',       county: 'applicable county', depositReturnDays: 14, earlyTermNoticeDays: 30, moveOutNoticeDays: 30, mtmNoticeDays: 30,
          eSignAct: 'Arizona Uniform Electronic Transactions Act (A.R.S. ÃÂ§ 44-7001 et seq.) and the federal' },
  'CA': { stateName: 'California',    county: 'applicable county', depositReturnDays: 21, earlyTermNoticeDays: 60, moveOutNoticeDays: 30, mtmNoticeDays: 60,
          eSignAct: 'California Uniform Electronic Transactions Act (Cal. Civ. Code ÃÂ§ 1633.1 et seq.) and the federal' },
  'CO': { stateName: 'Colorado',      county: 'applicable county', depositReturnDays: 30, earlyTermNoticeDays: 21, moveOutNoticeDays: 21, mtmNoticeDays: 21,
          eSignAct: 'Colorado Uniform Electronic Transactions Act (C.R.S. ÃÂ§ 24-71.3-101 et seq.) and the federal' },
  'FL': { stateName: 'Florida',       county: 'applicable county', depositReturnDays: 15, earlyTermNoticeDays: 60, moveOutNoticeDays: 30, mtmNoticeDays: 30,
          eSignAct: 'Florida Electronic Signature Act (F.S. ÃÂ§ 668.001 et seq.) and the federal' },
  'GA': { stateName: 'Georgia',       county: 'applicable county', depositReturnDays: 30, earlyTermNoticeDays: 60, moveOutNoticeDays: 30, mtmNoticeDays: 30,
          eSignAct: 'Georgia Electronic Records and Signatures Act (O.C.G.A. ÃÂ§ 10-12-1 et seq.) and the federal' },
  'IL': { stateName: 'Illinois',      county: 'applicable county', depositReturnDays: 30, earlyTermNoticeDays: 60, moveOutNoticeDays: 30, mtmNoticeDays: 30,
          eSignAct: 'Illinois Electronic Commerce Security Act (5 ILCS 175) and the federal' },
  'MI': { stateName: 'Michigan',      county: 'Oakland County',    depositReturnDays: 30, earlyTermNoticeDays: 60, moveOutNoticeDays: 60, mtmNoticeDays: 30,
          eSignAct: 'Michigan Electronic Signature Act (MCL ÃÂ§ 450.832 et seq.) and the federal' },
  'MN': { stateName: 'Minnesota',     county: 'applicable county', depositReturnDays: 21, earlyTermNoticeDays: 30, moveOutNoticeDays: 30, mtmNoticeDays: 30,
          eSignAct: 'Minnesota Uniform Electronic Transactions Act (Minn. Stat. ÃÂ§ 325L) and the federal' },
  'NV': { stateName: 'Nevada',        county: 'applicable county', depositReturnDays: 30, earlyTermNoticeDays: 30, moveOutNoticeDays: 30, mtmNoticeDays: 30,
          eSignAct: 'Nevada Electronic Transactions Act (NRS ÃÂ§ 719) and the federal' },
  'NJ': { stateName: 'New Jersey',    county: 'applicable county', depositReturnDays: 30, earlyTermNoticeDays: 60, moveOutNoticeDays: 30, mtmNoticeDays: 30,
          eSignAct: 'New Jersey Uniform Electronic Transactions Act (N.J.S.A. ÃÂ§ 12A:12-1 et seq.) and the federal' },
  'NY': { stateName: 'New York',      county: 'applicable county', depositReturnDays: 14, earlyTermNoticeDays: 30, moveOutNoticeDays: 30, mtmNoticeDays: 30,
          eSignAct: 'New York Electronic Signatures and Records Act (State Technology Law ÃÂ§ÃÂ§ 301-309) and the federal' },
  'NC': { stateName: 'North Carolina',county: 'applicable county', depositReturnDays: 30, earlyTermNoticeDays: 30, moveOutNoticeDays: 30, mtmNoticeDays: 7,
          eSignAct: 'North Carolina Uniform Electronic Transactions Act (N.C.G.S. ÃÂ§ 66-311 et seq.) and the federal' },
  'OH': { stateName: 'Ohio',          county: 'applicable county', depositReturnDays: 30, earlyTermNoticeDays: 30, moveOutNoticeDays: 30, mtmNoticeDays: 30,
          eSignAct: 'Ohio Uniform Electronic Transactions Act (R.C. ÃÂ§ 1306) and the federal' },
  'OR': { stateName: 'Oregon',        county: 'applicable county', depositReturnDays: 31, earlyTermNoticeDays: 30, moveOutNoticeDays: 30, mtmNoticeDays: 30,
          eSignAct: 'Oregon Uniform Electronic Transactions Act (ORS ÃÂ§ 84.001 et seq.) and the federal' },
  'PA': { stateName: 'Pennsylvania',  county: 'applicable county', depositReturnDays: 30, earlyTermNoticeDays: 30, moveOutNoticeDays: 30, mtmNoticeDays: 15,
          eSignAct: 'Pennsylvania Electronic Transactions Act (73 P.S. ÃÂ§ 2260.101 et seq.) and the federal' },
  'TN': { stateName: 'Tennessee',     county: 'applicable county', depositReturnDays: 30, earlyTermNoticeDays: 30, moveOutNoticeDays: 30, mtmNoticeDays: 30,
          eSignAct: 'Tennessee Uniform Electronic Transactions Act (T.C.A. ÃÂ§ 47-10-101 et seq.) and the federal' },
  'TX': { stateName: 'Texas',         county: 'applicable county', depositReturnDays: 30, earlyTermNoticeDays: 30, moveOutNoticeDays: 30, mtmNoticeDays: 30,
          eSignAct: 'Texas Uniform Electronic Transactions Act (Tex. Bus. & Com. Code ÃÂ§ 322) and the federal' },
  'VA': { stateName: 'Virginia',      county: 'applicable county', depositReturnDays: 45, earlyTermNoticeDays: 60, moveOutNoticeDays: 30, mtmNoticeDays: 30,
          eSignAct: 'Virginia Electronic Transactions Act (Va. Code ÃÂ§ 59.1-479 et seq.) and the federal' },
  'WA': { stateName: 'Washington',    county: 'applicable county', depositReturnDays: 21, earlyTermNoticeDays: 20, moveOutNoticeDays: 20, mtmNoticeDays: 20,
          eSignAct: 'Washington Uniform Electronic Transactions Act (RCW ÃÂ§ 19.360) and the federal' },
  // Ã¢ÂÂÃ¢ÂÂ DEFAULT Ã¢ÂÂ used when state is unknown or not yet mapped Ã¢ÂÂÃ¢ÂÂ
  'DEFAULT': { stateName: 'the applicable state', county: 'the applicable county',
               depositReturnDays: 30, earlyTermNoticeDays: 60,
               moveOutNoticeDays: 30, mtmNoticeDays: 30,
               eSignAct: 'the federal' }
};

// Returns the jurisdiction entry for a given 2-letter state code.
// Falls back to DEFAULT if the state isn't mapped yet.
function getJurisdiction(stateCode) {
  const code = (stateCode || '').toString().trim().toUpperCase();
  return JURISDICTION_MAP[code] || JURISDICTION_MAP['DEFAULT'];
}

// Returns the e-signature legal text for the given state.
// Used in the lease e-sign notice, checkbox label, and step list.
// For Michigan: cites the state act + federal E-SIGN.
// For all other states: cites the state UETA equivalent + federal E-SIGN.
function getESignText(stateCode) {
  const j = getJurisdiction(stateCode);
  return j.eSignAct + ' Electronic Signatures in Global and National Commerce Act (E-SIGN Act, 15 U.S.C. ÃÂ§ 7001 et seq.)';
}

// ============================================================
// Helper: get or create spreadsheet
// ============================================================
function getSpreadsheet() {
  try {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      const scriptProperties = PropertiesService.getScriptProperties();
      const savedSheetId = scriptProperties.getProperty('SPREADSHEET_ID');
      if (savedSheetId) {
        try {
          ss = SpreadsheetApp.openById(savedSheetId);
        } catch (e) {
          ss = SpreadsheetApp.create('Choice Properties Rental Applications');
          scriptProperties.setProperty('SPREADSHEET_ID', ss.getId());
        }
      } else {
        ss = SpreadsheetApp.create('Choice Properties Rental Applications');
        scriptProperties.setProperty('SPREADSHEET_ID', ss.getId());
      }
    }
    return ss;
  } catch (error) {
    const ss = SpreadsheetApp.create('Choice Properties Rental Applications');
    const scriptProperties = PropertiesService.getScriptProperties();
    scriptProperties.setProperty('SPREADSHEET_ID', ss.getId());
    return ss;
  }
}

// ============================================================
// Initialize sheets Ã¢ÂÂ now includes lease columns
// ============================================================
function initializeSheets() {
  const ss = getSpreadsheet();

  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    const headers = [
      // Ã¢ÂÂÃ¢ÂÂ Original columns Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
      'Timestamp', 'App ID', 'Status', 'Payment Status', 'Payment Date', 'Admin Notes',
      'First Name', 'Last Name', 'Email', 'Phone', 'Property Address', 'Requested Move-in Date',
      'Desired Lease Term', 'DOB', 'SSN', 'Current Address', 'Residency Duration',
      'Current Rent Amount', 'Reason for leaving', 'Current Landlord Name', 'Landlord Phone',
      'Employment Status', 'Employer', 'Job Title', 'Employment Duration',
      'Supervisor Name', 'Supervisor Phone', 'Monthly Income', 'Other Income',
      'Reference 1 Name', 'Reference 1 Phone', 'Reference 1 Relationship', 'Reference 2 Name', 'Reference 2 Phone', 'Reference 2 Relationship',
      'Emergency Contact Name', 'Emergency Contact Phone', 'Primary Payment Method', 'Primary Payment Method Other',
      'Alternative Payment Method', 'Alternative Payment Method Other', 'Third Choice Payment Method', 'Third Choice Payment Method Other',
      'Has Pets', 'Pet Details', 'Total Occupants', 'Additional Occupants',
      'Ever Evicted', 'Smoker', 'Document URL',
      'Has Co-Applicant', 'Additional Person Role',
      'Co-Applicant First Name', 'Co-Applicant Last Name', 'Co-Applicant Email', 'Co-Applicant Phone',
      'Co-Applicant DOB', 'Co-Applicant SSN', 'Co-Applicant Employer', 'Co-Applicant Job Title',
      'Co-Applicant Monthly Income', 'Co-Applicant Employment Duration', 'Co-Applicant Consent',
      'Vehicle Make', 'Vehicle Model', 'Vehicle Year', 'Vehicle License Plate', 'Has Vehicle',
      'Emergency Contact Relationship', 'Preferred Contact Method', 'Preferred Time', 'Preferred Time Specific',
      // Ã¢ÂÂÃ¢ÂÂ NEW: Property context columns (from URL params, D-001) Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
      'Property ID', 'Property Name', 'Property City', 'Property State', 'Listed Rent', 'Property Address URL', 'Property Address Source',
      // C3: renamed column — new submissions use Property Address Source; old data stays in Property Address URL
      // Ã¢ÂÂÃ¢ÂÂ NEW: Lease columns Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
      'Property Owner', 'Managed By',
      'Lease Status', 'Lease Sent Date', 'Lease Signed Date',
      'Lease Start Date', 'Lease End Date', 'Monthly Rent',
      'Security Deposit', 'Move-in Costs', 'Lease Notes',
      'Rent Due Day', 'Grace Period Days', 'Late Fee Amount',
      // Ã¢ÂÂÃ¢ÂÂ NEW: Phase 5 lease property-specific columns (D-017, D-018) Ã¢ÂÂÃ¢ÂÂ
      'Unit Type', 'Bedrooms', 'Bathrooms', 'Parking Space', 'Included Utilities',
      'Pet Deposit Amount', 'Monthly Pet Rent',
      'Tenant Signature', 'Signature Timestamp', 'Lease IP Address',
      // Ã¢ÂÂÃ¢ÂÂ NEW: Holding Fee columns (Session 037) Ã¢ÂÂÃ¢ÂÂ
      'Holding Fee Amount', 'Holding Fee Status', 'Holding Fee Date', 'Holding Fee Notes',
      // Ã¢ÂÂÃ¢ÂÂ Phase 6: Precise payment timestamp for refund window Ã¢ÂÂÃ¢ÂÂ
      'Holding Fee Payment Timestamp',
      // Ã¢ÂÂÃ¢ÂÂ ISSUE-002 fix: extended property context columns Ã¢ÂÂÃ¢ÂÂ
      'Property Zip', 'Application Fee', 'Available Date', 'Lease Terms',
      'Min Lease Months', 'Pets Allowed', 'Pet Types Allowed', 'Pet Weight Limit',
      'Pet Deposit', 'Smoking Allowed', 'Utilities Included', 'Parking', 'Parking Fee',
      // 2026-04-07: Extended property context Ã¢ÂÂ new data-collection fields
      'Garage Spaces', 'EV Charging', 'Laundry Type', 'Heating Type', 'Cooling Type',
      'Last Months Rent', 'Admin Fee', 'Move-in Special',
      // Phase 1: Management countersignature
      'Management Signature', 'Management Signature Date', 'Management Signer Name'
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1a5276').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  } else {
    // Ã¢ÂÂÃ¢ÂÂ Safely add missing lease columns to an existing sheet Ã¢ÂÂÃ¢ÂÂ
    addMissingLeaseColumns(sheet);
  }

  // Settings sheet
  let settingsSheet = ss.getSheetByName(SETTINGS_SHEET);
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet(SETTINGS_SHEET);
    settingsSheet.getRange('A1').setValue('Setting').setFontWeight('bold');
    settingsSheet.getRange('B1').setValue('Value').setFontWeight('bold');
    settingsSheet.getRange('A2').setValue('AdminEmails');
    settingsSheet.getRange('B2').setValue('choicepropertygroup@hotmail.com,theapprovalh@gmail.com,jamesdouglaspallock@gmail.com');
    const range = settingsSheet.getRange('B2');
    ss.setNamedRange(ADMIN_EMAILS_RANGE, range);
  }

  // Email logs sheet
  let logSheet = ss.getSheetByName(LOG_SHEET);
  if (!logSheet) {
    logSheet = ss.insertSheet(LOG_SHEET);
    logSheet.getRange(1, 1, 1, 6).setValues([[
      'Timestamp', 'Type', 'Recipient', 'Status', 'App ID', 'Error'
    ]]).setFontWeight('bold').setBackground('#1a5276').setFontColor('#ffffff');
  }

  // Ã¢ÂÂÃ¢ÂÂ Credits sheet (Phase 5) Ã¢ÂÂÃ¢ÂÂ
  const CREDITS_SHEET = 'Credits';
  let creditsSheet = ss.getSheetByName(CREDITS_SHEET);
  if (!creditsSheet) {
    creditsSheet = ss.insertSheet(CREDITS_SHEET);
    creditsSheet.getRange(1, 1, 1, 5).setValues([[
      'Email', 'Credits Remaining', 'Issued Date', 'Expiration Date', 'Source App ID'
    ]]).setFontWeight('bold').setBackground('#1565c0').setFontColor('#ffffff');
  }
}

// Ã¢ÂÂÃ¢ÂÂ Add property context + lease columns to sheets that existed before this update Ã¢ÂÂÃ¢ÂÂ
function addMissingLeaseColumns(sheet) {
  const newColumns = [
    // Reference relationship fields (missed in original schema)
    'Reference 1 Relationship', 'Reference 2 Relationship',
    // D-001: property context columns
    'Property ID', 'Property Name', 'Property City', 'Property State', 'Listed Rent', 'Property Address URL', 'Property Address Source',
    // Original lease columns
    'Property Owner', 'Managed By',
    'Lease Status', 'Lease Sent Date', 'Lease Signed Date',
    'Lease Start Date', 'Lease End Date', 'Monthly Rent',
    'Security Deposit', 'Move-in Costs', 'Lease Notes',
    'Rent Due Day', 'Grace Period Days', 'Late Fee Amount',
    // Phase 5 columns
    'Unit Type', 'Bedrooms', 'Bathrooms', 'Parking Space', 'Included Utilities',
    'Pet Deposit Amount', 'Monthly Pet Rent',
    'Tenant Signature', 'Signature Timestamp', 'Lease IP Address',
    // Session 037: Holding Fee columns
    'Holding Fee Amount', 'Holding Fee Status', 'Holding Fee Date', 'Holding Fee Notes',
    // Session 043: Has Vehicle (previously uncaptured)
    'Has Vehicle',
    // Phase 1: Management countersignature columns
    'Management Signature', 'Management Signature Date', 'Management Signer Name',
    // Phase 5 (Implementation Plan): new columns
    'Verified Property Address', 'Renter Insurance Agreed',
    // Phase 6: payment tracking and holding fee deadline
    'Payment Method Used', 'Transaction Reference', 'Amount Collected', 'Holding Fee Deadline',
    // Phase 8: UX & flow completion
    'Last Contacted', 'Document URLs',
    // 2026-04-07: Extended property context Ã¢ÂÂ new data-collection fields
    'Garage Spaces', 'EV Charging', 'Laundry Type', 'Heating Type', 'Cooling Type',
    'Last Months Rent', 'Admin Fee', 'Move-in Special'
  ];
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  newColumns.forEach(col => {
    if (!headers.includes(col)) {
      const nextCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, nextCol).setValue(col)
           .setFontWeight('bold').setBackground('#1a5276').setFontColor('#ffffff');
    }
  });
}

// ============================================================
// Helper: get column map (dynamic)
// ============================================================
function getColumnMap(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};
  headers.forEach((header, index) => {
    map[header] = index + 1;
  });
  return map;
}

// ============================================================
// Helper: combine checkbox arrays into comma-separated string
// ============================================================
function getCheckboxValues(formData, fieldName) {
  const val = formData[fieldName];
  if (Array.isArray(val)) return val.join(', ');
  return val || '';
}

// ============================================================
// doGet() Ã¢ÂÂ Serve web pages (lease routes added)
// ============================================================
function doGet(e) {
  initializeSheets();
  const params = e || { parameter: {} };
  const path   = params.parameter.path || '';
  const id     = params.parameter.id   || '';

  if (path === 'admin') {
    const token = params.parameter.token || '';
    if (token && validateAdminToken(token)) {
      return renderAdminPanel(token);
    }
    const userEmail = Session.getActiveUser().getEmail();
    const authorizedEmails = getAdminEmails();
    if (userEmail && authorizedEmails.includes(userEmail)) {
      return renderAdminPanel('');
    }
    return renderAdminLoginPage();
  } else if (path === 'dashboard' && id) {
    const result = getApplication(id);
    if (result.success) {
      return renderApplicantDashboard(id);
    } else {
      return renderLoginPage('Invalid application ID or email. Please try again.');
    }
  } else if (path === 'dashboard') {
    return renderLoginPage();
  } else if (path === 'login') {
    return renderLoginPage();

  // Ã¢ÂÂÃ¢ÂÂ NEW lease routes Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  } else if (path === 'lease' && id) {
    return renderLeaseSigningPage(id);
  } else if (path === 'lease_confirm' && id) {
    return renderLeaseConfirmPage(id);
    // [L4 fix] Load saved form progress by resume token (cross-device resume)
      } else if (path === 'loadProgress') {
        const token = params.parameter.token || '';
        if (!token) {
          return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'missing_token' })).setMimeType(ContentService.MimeType.JSON);
        }
        return ContentService.createTextOutput(JSON.stringify(loadResumeProgress(token))).setMimeType(ContentService.MimeType.JSON);

      // [FIXED-B3] Health check endpoint Ã¢ÂÂ allows listing platform to verify backend is alive
    } else if (path === 'health') {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString(), version: '10.0' }))
        .setMimeType(ContentService.MimeType.JSON);
    // Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ

    } else {
    const gasLandingUrl = ScriptApp.getService().getUrl();
    return HtmlService.createHtmlOutput(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Choice Properties</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <style>body{background:linear-gradient(135deg,#f5f7fa 0%,#e4e8ed 100%);min-height:100vh;display:flex;align-items:center;}</style>
      </head>
      <body>
        <div class="container">
          <div class="row justify-content-center">
            <div class="col-md-6">
              <div class="card shadow-lg border-0 rounded-4">
                <div class="card-body p-5 text-center">
                  <i class="fas fa-building fa-4x text-primary mb-4"></i>
                  <h1 class="h3 mb-3">Choice Properties</h1>
                  <p class="text-muted mb-4">Professional Property Management</p>
                  <div class="d-grid gap-2">
                    <a href="?path=login" class="btn btn-primary btn-lg">Applicant Login</a>
                    <button onclick="goAdmin()" class="btn btn-outline-secondary btn-lg">Admin Login</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
        <script>
          var _GAS = '${gasLandingUrl}';
          var _SK  = 'cp_admin_session_v2';
          function _fp() {
            var p = [navigator.userAgent||'',navigator.language||'',(screen.width||0)+'x'+(screen.height||0),new Date().getTimezoneOffset(),navigator.platform||'',navigator.hardwareConcurrency||'',navigator.deviceMemory||''];
            var s=p.join('|'),h=0; for(var i=0;i<s.length;i++){h=Math.imul(31,h)+s.charCodeAt(i)|0;} return Math.abs(h).toString(36);
          }
          function goAdmin() {
            try {
              var raw = localStorage.getItem(_SK);
              if (raw) {
                var sess = JSON.parse(raw);
                if (sess && sess.token && (Date.now()-sess.savedAt < 8*60*60*1000) && sess.fp === _fp()) {
                  window.location.href = _GAS + '?path=admin&token=' + encodeURIComponent(sess.token);
                  return;
                }
              }
            } catch(e) {}
            window.location.href = _GAS + '?path=admin';
          }
        </script>
      </body>
      </html>
    `).setTitle('Choice Properties');
  }
}

// ============================================================
// renderLoginPage()
// ============================================================
function renderLoginPage(errorMsg) {
  const gasUrl = ScriptApp.getService().getUrl();
  return HtmlService.createHtmlOutput(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Applicant Login - Choice Properties</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
      <style>
        body{background:linear-gradient(135deg,#f5f7fa 0%,#e4e8ed 100%);min-height:100vh;display:flex;align-items:center;}
        .card{border:none;border-radius:20px;box-shadow:0 10px 30px rgba(0,0,0,.1);}
        .form-control:focus{border-color:#1a5276;box-shadow:0 0 0 .2rem rgba(26,82,118,.25);}
        .btn-primary{background:#1a5276;border:none;padding:12px;font-weight:600;}
        .btn-primary:hover{background:#3498db;}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-md-5">
            <div class="card p-4">
              <div class="text-center mb-4">
                <i class="fas fa-key fa-3x text-primary"></i>
                <h2 class="h4 mt-3">Access Your Application</h2>
                <p class="text-muted">Enter your email or Application ID</p>
              </div>
              ${errorMsg ? `<div class="alert alert-danger">${errorMsg}</div>` : ''}
              <form id="loginForm" onsubmit="event.preventDefault();login();">
                <div class="mb-3">
                  <label class="form-label">Email or Application ID</label>
                  <input type="text" class="form-control form-control-lg" id="query"
                         placeholder="e.g., CP-20250315-ABCDEF or email@example.com" required>
                </div>
                <button type="submit" class="btn btn-primary w-100 btn-lg">View My Application</button>
              </form>
              <hr class="my-4">
              <div class="text-center">
                <p class="text-muted small mb-2">Need help? Text us at <strong>707-706-3137</strong></p>
                <details style="cursor:pointer;margin-top:8px;">
                  <summary class="text-muted small" style="color:#1a5276;">Forgot your Application ID?</summary>
                  <div style="margin-top:10px;">
                    <p class="text-muted small">Enter your email and we will send your active Application IDs.</p>
                    <div class="input-group input-group-sm">
                      <input type="email" id="lookupEmail" class="form-control" placeholder="your@email.com">
                      <button class="btn btn-outline-secondary" type="button" onclick="lookupById()">Send</button>
                    </div>
                    <p id="lookupMsg" class="text-muted small mt-2" style="display:none;"></p>
                  </div>
                </details>
              </div>
            </div>
          </div>
        </div>
      </div>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
      <script>
        var _BASE = '${gasUrl}';
        function login(){
          const q=document.getElementById('query').value.trim();
          if(!q)return;
          window.location.href=_BASE+'?path=dashboard&id='+encodeURIComponent(q);
        }
        function lookupById(){
          const em=document.getElementById('lookupEmail').value.trim();
          const msg=document.getElementById('lookupMsg');
          if(!em){msg.textContent='Please enter your email address.';msg.style.display='block';return;}
          msg.textContent='SendingÃ¢ÂÂ¦';msg.style.display='block';
          fetch(_BASE,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
            body:'_action=lookupAppId&email='+encodeURIComponent(em)})
            .then(function(){msg.textContent='If we have a matching application, you will receive an email shortly.';})
            .catch(function(){msg.textContent='Something went wrong. Please try again.';});
        }
      </script>
    </body>
    </html>
  `).setTitle('Applicant Login - Choice Properties');
}


  // ============================================================
  // lookupAppIdByEmail() Ã¢ÂÂ 9C-3: Email-based App ID recovery
  // ============================================================
  function lookupAppIdByEmail(email) {
    try {
      if (!email || !email.includes('@')) return { success: true };
      const ss    = getSpreadsheet();
      const sheet = ss.getSheetByName(SHEET_NAME);
      if (!sheet) return { success: true };
      const col  = getColumnMap(sheet);
      const data = sheet.getDataRange().getValues();
      const emailNorm = email.toLowerCase().trim();
      const matches = [];
      for (let i = 1; i < data.length; i++) {
        const rowEmail  = String(data[i][(col['Email'] || 1) - 1]).toLowerCase().trim();
        const rowStatus = String(data[i][(col['Status'] || 1) - 1]).toLowerCase().trim();
        const rowAppId  = String(data[i][(col['App ID'] || 1) - 1]).trim();
        if (rowEmail === emailNorm && rowAppId && !['denied', 'withdrawn'].includes(rowStatus)) {
          const gasUrl = ScriptApp.getService().getUrl();
          matches.push({ appId: rowAppId, status: rowStatus,
            dashLink: gasUrl + '?path=dashboard&id=' + encodeURIComponent(rowAppId) });
        }
      }
      if (matches.length > 0) {
        const listLines = matches.map(function(m) {
          return '\u2022 Application ID: ' + m.appId + ' (' + m.status + ')\n  Dashboard: ' + m.dashLink;
        }).join('\n\n');
        MailApp.sendEmail({
          to: email,
          subject: 'Choice Properties Ã¢ÂÂ Your Application ID(s)',
          body: 'Hello,\n\nYou requested your Application ID(s).\n\nActive applications:\n\n' +
                listLines + '\n\nIf you did not request this, ignore this email.\n\nÃ¢ÂÂ Choice Properties Team'
        });
      }
      return { success: true };
    } catch (err) {
      console.error('lookupAppIdByEmail error:', err.toString());
      return { success: true };
    }
  }

  // ============================================================
// ADMIN AUTH Ã¢ÂÂ Token + OTP + Password System
// ============================================================

function generateAdminToken() {
  const props = PropertiesService.getScriptProperties();
  let secret = props.getProperty('ADMIN_AUTH_SECRET');
  if (!secret) {
    secret = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty('ADMIN_AUTH_SECRET', secret);
  }
  const ts  = Math.floor(Date.now() / 1000);
  const sig = Utilities.base64Encode(
    Utilities.computeHmacSha256Signature('admin:' + ts, secret)
  );
  return Utilities.base64EncodeWebSafe(sig + '.' + ts);
}


// Constant-time string comparison — prevents timing attacks on HMAC comparisons.
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function validateAdminToken(token) {
  if (!token) return false;
  try {
    const props  = PropertiesService.getScriptProperties();
    const secret = props.getProperty('ADMIN_AUTH_SECRET');
    if (!secret) return false;
    const decoded  = Utilities.newBlob(Utilities.base64DecodeWebSafe(token)).getDataAsString();
    const lastDot  = decoded.lastIndexOf('.');
    if (lastDot === -1) return false;
    const sig = decoded.substring(0, lastDot);
    const ts  = parseInt(decoded.substring(lastDot + 1));
    if (isNaN(ts)) return false;
    const now = Math.floor(Date.now() / 1000);
    if (now - ts > 30 * 24 * 60 * 60) return false;
    const expectedSig = Utilities.base64Encode(
      Utilities.computeHmacSha256Signature('admin:' + ts, secret)
    );
    return safeEqual(sig, expectedSig);
  } catch (e) { return false; }
}

// Client-callable: silently validate a stored token (used by localStorage session check)
function checkAdminToken(token) {
  return { valid: validateAdminToken(token) };
}

function sendAdminOTP(email) {
  try {
    if (!email) return { success: false, error: 'Email is required.' };
    const normalized       = email.trim().toLowerCase();
    const authorizedEmails = getAdminEmails().map(e => e.toLowerCase());
    if (!authorizedEmails.includes(normalized)) {
      return { success: false, error: 'This email is not authorized.' };
    }
    const otp    = (parseInt(Utilities.getUuid().replace(/-/g, '').substring(0, 8), 16) % 900000 + 100000).toString();
    const expiry = Date.now() + 10 * 60 * 1000;
    PropertiesService.getScriptProperties().deleteProperty('ADMIN_OTP_STRIKES_' + normalized);
    PropertiesService.getScriptProperties().setProperty('ADMIN_OTP_' + normalized, otp + ':' + expiry);
    MailApp.sendEmail({
      to: email.trim(),
      subject: 'Admin Login Code Ã¢ÂÂ Choice Properties',
      htmlBody: `
        <div style="font-family:sans-serif;max-width:420px;margin:auto;padding:32px;background:#fff;border-radius:16px;">
          <h2 style="color:#1e293b;margin-bottom:8px;">Admin Login Code</h2>
          <p style="color:#475569;margin-bottom:24px;">Use the code below to access the Choice Properties admin panel.</p>
          <div style="font-size:40px;font-weight:700;letter-spacing:10px;color:#4f46e5;background:#f1f5f9;border-radius:12px;padding:24px;text-align:center;">${otp}</div>
          <p style="color:#94a3b8;font-size:13px;margin-top:20px;">Ã¢ÂÂ± Expires in 10 minutes. Do not share this code with anyone.</p>
        </div>`,
      name: 'Choice Properties Security'
    });
    return { success: true };
  } catch (e) { return { success: false, error: 'Failed to send code: ' + e.toString() }; }
}

function verifyAdminOTP(email, otp) {
  try {
    const normalized = email.trim().toLowerCase();
    const props      = PropertiesService.getScriptProperties();
    const stored     = props.getProperty('ADMIN_OTP_' + normalized);
    if (!stored) return { success: false, error: 'No code found. Please request a new one.' };
    const parts      = stored.split(':');
    const storedOtp  = parts[0];
    const expiry     = parseInt(parts[1]);
    if (Date.now() > expiry) {
      props.deleteProperty('ADMIN_OTP_' + normalized);
      return { success: false, error: 'Code expired. Please request a new one.' };
    }
    if (otp.trim() !== storedOtp) {
      const strikeKey = 'ADMIN_OTP_STRIKES_' + normalized;
      const strikes   = parseInt(props.getProperty(strikeKey) || '0') + 1;
      if (strikes >= 5) {
        props.deleteProperty('ADMIN_OTP_' + normalized);
        props.deleteProperty(strikeKey);
        return { success: false, error: 'Too many failed attempts. Please request a new code.' };
      }
      props.setProperty(strikeKey, strikes.toString());
      return { success: false, error: 'Incorrect code. Please try again.' };
    }
    props.deleteProperty('ADMIN_OTP_' + normalized);
    props.deleteProperty('ADMIN_OTP_STRIKES_' + normalized);
    return { success: true, token: generateAdminToken() };
  } catch (e) { return { success: false, error: 'Verification failed: ' + e.toString() }; }
}

function validateAdminPassword(username, password) {
  try {
    const props      = PropertiesService.getScriptProperties();
    const storedUser = props.getProperty('ADMIN_USERNAME');
    const storedHash = props.getProperty('ADMIN_PASSWORD_HASH');
    if (!storedUser || !storedHash) {
      return { success: false, error: 'Admin credentials not configured. Run setupAdminPassword() in the GAS editor first.' };
    }
    const inputHash = Utilities.base64Encode(
      Utilities.computeHmacSha256Signature(password, storedUser)
    );
    if (!safeEqual(username.trim(), storedUser) || !safeEqual(inputHash, storedHash)) {
      return { success: false, error: 'Invalid username or password.' };
    }
    return { success: true, token: generateAdminToken() };
  } catch (e) { return { success: false, error: 'Login failed: ' + e.toString() }; }
}

// Run this ONCE manually in the GAS editor to set your admin credentials.
// SECURITY: Never hardcode credentials here. Set username and password
// directly in this function body locally, run it once, then remove the values.
// The values are stored securely in GAS Script Properties and never in source.
//
// HOW TO USE:
//   1. Open this file in the GAS editor (script.google.com)
//   2. Temporarily set your credentials below
//   3. Click Run Ã¢ÂÂ setupAdminPassword
//   4. Delete the credential values again before saving
//   5. Verify setup by running: Logger.log(PropertiesService.getScriptProperties().getProperty('ADMIN_USERNAME'))
function setupAdminPassword() {
  const username = ''; // Set your admin email here temporarily, then remove
  const password = ''; // Set your password here temporarily, then remove
  if (!username || !password) {
    Logger.log('Ã¢ÂÂ Set your username and password in this function body before running it. Remove them after running.');
    return;
  }
  const props = PropertiesService.getScriptProperties();
  props.setProperty('ADMIN_USERNAME', username);
  const hash = Utilities.base64Encode(
    Utilities.computeHmacSha256Signature(password, username)
  );
  props.setProperty('ADMIN_PASSWORD_HASH', hash);
  Logger.log('Ã¢ÂÂ Admin credentials set. Username: ' + username + '. IMPORTANT: Remove the credential values from this function now.');
}

// ============================================================
// renderAdminLoginPage()
// ============================================================
function renderAdminLoginPage(errorMsg) {
  const props             = PropertiesService.getScriptProperties();
  const passwordConfigured = !!(props.getProperty('ADMIN_USERNAME') && props.getProperty('ADMIN_PASSWORD_HASH'));
  const gasUrl            = ScriptApp.getService().getUrl();
  return HtmlService.createHtmlOutput(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Admin Login Ã¢ÂÂ Choice Properties</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      min-height: 100vh; display: flex; align-items: center;
      justify-content: center; padding: 16px;
    }
    .card {
      background: white; border-radius: 20px; padding: 36px 32px;
      max-width: 440px; width: 100%; box-shadow: 0 24px 64px rgba(0,0,0,.45);
    }
    @media (max-width: 480px) {
      .card { padding: 28px 20px; border-radius: 16px; }
    }
    .logo { text-align: center; margin-bottom: 28px; }
    .logo-icon { width: 56px; height: 56px; background: linear-gradient(135deg, #1B3A5C, #2A6FAD); border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 800; color: white; letter-spacing: -.5px; margin: 0 auto 12px; box-shadow: 0 6px 20px rgba(42,111,173,.35); border: 1.5px solid rgba(255,255,255,.15); }
    .logo h1 { font-size: 20px; font-weight: 700; color: #1e293b; }
    .logo p { font-size: 13px; color: #94a3b8; margin-top: 4px; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; margin-bottom: 12px; }
    label { display: block; font-size: 13px; font-weight: 500; color: #374151; margin-bottom: 5px; }
    input[type=text], input[type=email], input[type=password] {
      width: 100%; padding: 12px 14px; border: 1.5px solid #e2e8f0;
      border-radius: 10px; font-size: 15px; font-family: 'Inter', sans-serif;
      outline: none; transition: border-color .2s; margin-bottom: 12px;
      -webkit-appearance: none;
    }
    input:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,.1); }
    .btn {
      width: 100%; padding: 13px; border: none; border-radius: 10px;
      font-size: 15px; font-weight: 600; cursor: pointer; transition: all .2s;
      font-family: 'Inter', sans-serif; touch-action: manipulation;
    }
    .btn-primary { background: #4f46e5; color: white; }
    .btn-primary:hover { background: #4338ca; }
    .btn-outline { background: #f8fafc; color: #1e293b; border: 1.5px solid #e2e8f0; }
    .btn-outline:hover { background: #f1f5f9; }
    .btn:disabled { opacity: .55; cursor: not-allowed; }
    .divider { display: flex; align-items: center; gap: 12px; margin: 24px 0; color: #94a3b8; font-size: 12px; font-weight: 500; }
    .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: #e2e8f0; }
    .alert { padding: 12px 14px; border-radius: 10px; font-size: 13px; margin-bottom: 18px; }
    .alert-error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
    .otp-row { display: flex; gap: 8px; align-items: flex-start; margin-bottom: 12px; }
    .otp-row input { flex: 1; margin-bottom: 0; }
    .otp-row .btn-outline { flex-shrink: 0; width: auto; padding: 12px 14px; font-size: 14px; white-space: nowrap; }
    #otpCodeSection { display: none; }
    .msg { font-size: 13px; margin-top: 6px; min-height: 18px; line-height: 1.4; }
    .msg.error { color: #dc2626; }
    .msg.success { color: #16a34a; }
    .msg.info { color: #4f46e5; }
    .pass-wrap { position: relative; margin-bottom: 12px; }
    .pass-wrap input { margin-bottom: 0; padding-right: 44px; }
    .pass-toggle {
      position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
      background: none; border: none; cursor: pointer; padding: 4px;
      color: #94a3b8; font-size: 18px; line-height: 1; touch-action: manipulation;
    }
    .pass-toggle:hover { color: #4f46e5; }
  </style>
</head>
<body>
<div class="card">
  <div class="logo">
    <div class="logo-icon">CP</div>
    <h1>Choice Properties</h1>
    <p>Admin Portal Ã¢ÂÂ Secure Login</p>
  </div>

  ${errorMsg ? '<div class="alert alert-error">Ã¢ÂÂ Ã¯Â¸Â ' + errorMsg + '</div>' : ''}

  <div class="section-title">Sign in with authorized email</div>
  <label for="otpEmail">Email Address</label>
  <div class="otp-row">
    <input type="email" id="otpEmail" placeholder="your@email.com" autocomplete="email">
    <button class="btn btn-outline" id="otpSendBtn" onclick="requestOTP()">Send Code</button>
  </div>
  <div id="otpCodeSection">
    <label for="otpCode">6-Digit Verification Code</label>
    <input type="text" id="otpCode" placeholder="123456" maxlength="6" inputmode="numeric" autocomplete="one-time-code">
    <button class="btn btn-primary" onclick="verifyOTP()">Verify &amp; Sign In</button>
  </div>
  <div class="msg" id="otpMsg"></div>

  <div class="divider">or</div>

  ${passwordConfigured ? `
  <div class="section-title">Sign in with username &amp; password</div>
  <label for="upUser">Username</label>
  <input type="text" id="upUser" placeholder="Username" autocomplete="username">
  <label for="upPass">Password</label>
  <div class="pass-wrap">
    <input type="password" id="upPass" placeholder="Ã¢ÂÂ¢Ã¢ÂÂ¢Ã¢ÂÂ¢Ã¢ÂÂ¢Ã¢ÂÂ¢Ã¢ÂÂ¢Ã¢ÂÂ¢Ã¢ÂÂ¢" autocomplete="current-password">
    <button class="pass-toggle" type="button" onclick="togglePass()" id="passToggleBtn" aria-label="Show password">Ã°ÂÂÂ</button>
  </div>
  <button class="btn btn-primary" onclick="passwordLogin()">Sign In</button>
  <div class="msg" id="upMsg"></div>
  ` : `
  <p style="text-align:center;color:#94a3b8;font-size:13px;padding:8px 0;">Password login not configured Ã¢ÂÂ use email code above.</p>
  `}
</div>

<script>
  function setMsg(id, text, type) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = text;
    el.className = 'msg ' + (type || '');
  }

  function togglePass() {
    const inp = document.getElementById('upPass');
    const btn = document.getElementById('passToggleBtn');
    if (!inp) return;
    inp.type = inp.type === 'password' ? 'text' : 'password';
    btn.textContent = inp.type === 'password' ? 'Ã°ÂÂÂ' : 'Ã°ÂÂÂ';
  }

  function requestOTP() {
    const email = document.getElementById('otpEmail').value.trim();
    if (!email) { setMsg('otpMsg', 'Please enter your email address.', 'error'); return; }
    const btn = document.getElementById('otpSendBtn');
    btn.disabled = true; btn.textContent = 'Sending...';
    setMsg('otpMsg', 'Sending codeÃ¢ÂÂ¦', 'info');
    google.script.run
      .withSuccessHandler(function(data) {
        if (data.success) {
          document.getElementById('otpCodeSection').style.display = 'block';
          setMsg('otpMsg', 'Ã¢ÂÂ Code sent! Check your inbox (and spam folder).', 'success');
          btn.textContent = 'Resend Code'; btn.disabled = false;
        } else {
          setMsg('otpMsg', data.error || 'Failed to send code.', 'error');
          btn.textContent = 'Send Code'; btn.disabled = false;
        }
      })
      .withFailureHandler(function() {
        setMsg('otpMsg', 'Something went wrong. Please try again.', 'error');
        btn.textContent = 'Send Code'; btn.disabled = false;
      })
      .sendAdminOTP(email);
  }

  var GAS_BASE = '${gasUrl}';
  var CP_SESSION_KEY = 'cp_admin_session_v2';

  /* Ã¢ÂÂÃ¢ÂÂ Device fingerprint Ã¢ÂÂÃ¢ÂÂ */
  function getDeviceFingerprint() {
    var parts = [
      navigator.userAgent || '',
      navigator.language || '',
      (screen.width || 0) + 'x' + (screen.height || 0),
      new Date().getTimezoneOffset(),
      navigator.platform || '',
      navigator.hardwareConcurrency || '',
      navigator.deviceMemory || ''
    ];
    var str = parts.join('|'), h = 0;
    for (var i = 0; i < str.length; i++) {
      h = Math.imul(31, h) + str.charCodeAt(i) | 0;
    }
    return Math.abs(h).toString(36);
  }

  /* Ã¢ÂÂÃ¢ÂÂ Save session to localStorage after successful login Ã¢ÂÂÃ¢ÂÂ */
  function saveAdminSession(token) {
    try {
      localStorage.setItem(CP_SESSION_KEY, JSON.stringify({
        token: token,
        fp: getDeviceFingerprint(),
        savedAt: Date.now()
      }));
    } catch(e) {}
  }

  /* Ã¢ÂÂÃ¢ÂÂ On load: check if this device already has a valid session Ã¢ÂÂÃ¢ÂÂ */
  function checkExistingSession() {
    try {
      var raw = localStorage.getItem(CP_SESSION_KEY);
      if (!raw) return;
      var session = JSON.parse(raw);
      if (!session || !session.token) return;
      // Reject if older than 8 hours (M2: reduced from 30 days for security)
      if (Date.now() - session.savedAt > 8 * 60 * 60 * 1000) {
        localStorage.removeItem(CP_SESSION_KEY); return;
      }
      // Reject if fingerprint doesn't match this device
      if (session.fp !== getDeviceFingerprint()) {
        localStorage.removeItem(CP_SESSION_KEY); return;
      }
      // Show subtle "checkingÃ¢ÂÂ¦" indicator
      var card = document.querySelector('.card');
      if (card) {
        var notice = document.createElement('div');
        notice.style.cssText = 'text-align:center;padding:10px 0 4px;font-size:13px;color:#6366f1;font-weight:500;';
        notice.textContent = 'Ã°ÂÂÂ Detecting your sessionÃ¢ÂÂ¦';
        card.insertBefore(notice, card.firstChild);
      }
      // Validate token server-side
      google.script.run
        .withSuccessHandler(function(res) {
          if (res && res.valid) {
            // Refresh savedAt so the 30-day window resets on every visit
            session.savedAt = Date.now();
            try { localStorage.setItem(CP_SESSION_KEY, JSON.stringify(session)); } catch(e) {}
            window.top.location.href = GAS_BASE + '?path=admin&token=' + encodeURIComponent(session.token);
          } else {
            localStorage.removeItem(CP_SESSION_KEY);
            if (card) { var n = card.querySelector('div[style*="Detecting"]'); if (n) n.remove(); }
          }
        })
        .withFailureHandler(function() {
          if (card) { var n = card.querySelector('div[style*="Detecting"]'); if (n) n.remove(); }
        })
        .checkAdminToken(session.token);
    } catch(e) {}
  }

  document.addEventListener('DOMContentLoaded', function() { checkExistingSession(); });

  function verifyOTP() {
    const email = document.getElementById('otpEmail').value.trim();
    const otp   = document.getElementById('otpCode').value.trim();
    if (!otp) { setMsg('otpMsg', 'Please enter the verification code.', 'error'); return; }
    setMsg('otpMsg', 'VerifyingÃ¢ÂÂ¦', 'info');
    google.script.run
      .withSuccessHandler(function(data) {
        if (data.success) {
          setMsg('otpMsg', 'Ã¢ÂÂ Verified! RedirectingÃ¢ÂÂ¦', 'success');
          saveAdminSession(data.token);
          window.top.location.href = GAS_BASE + '?path=admin&token=' + encodeURIComponent(data.token);
        } else {
          setMsg('otpMsg', data.error || 'Invalid code.', 'error');
        }
      })
      .withFailureHandler(function() {
        setMsg('otpMsg', 'Something went wrong. Please try again.', 'error');
      })
      .verifyAdminOTP(email, otp);
  }

  function passwordLogin() {
    const user = document.getElementById('upUser').value.trim();
    const pass = document.getElementById('upPass').value;
    if (!user || !pass) { setMsg('upMsg', 'Please enter both username and password.', 'error'); return; }
    setMsg('upMsg', 'Signing inÃ¢ÂÂ¦', 'info');
    google.script.run
      .withSuccessHandler(function(data) {
        if (data.success) {
          setMsg('upMsg', 'Ã¢ÂÂ Success! RedirectingÃ¢ÂÂ¦', 'success');
          saveAdminSession(data.token);
          window.top.location.href = GAS_BASE + '?path=admin&token=' + encodeURIComponent(data.token);
        } else {
          setMsg('upMsg', data.error || 'Invalid credentials.', 'error');
        }
      })
      .withFailureHandler(function() {
        setMsg('upMsg', 'Something went wrong. Please try again.', 'error');
      })
      .validateAdminPassword(user, pass);
  }

  document.addEventListener('keydown', function(e) {
    if (e.key !== 'Enter') return;
    var focused = document.activeElement && document.activeElement.id;
    if (focused === 'otpCode') verifyOTP();
    else if (focused === 'upPass' || focused === 'upUser') passwordLogin();
    else if (focused === 'otpEmail') requestOTP();
  });
</script>
</body>
</html>
  `).setTitle('Admin Login Ã¢ÂÂ Choice Properties');
}

// ============================================================
// doPost() Ã¢ÂÂ Handle form submissions
// ============================================================
function doPost(e) {
  try {
    let formData = {};
    let fileBlob = null;

    if (e.postData && e.postData.type && e.postData.type.indexOf('multipart/form-data') === 0) {
      const boundary = e.postData.type.split('boundary=')[1];
      const parts = e.postData.contents.split('--' + boundary);
      parts.forEach(part => {
        if (part.trim() === '' || part === '--') return;
        const headerEnd = part.indexOf('\r\n\r\n');
        if (headerEnd === -1) return;
        const headers = part.substring(0, headerEnd);
        const content = part.substring(headerEnd + 4, part.length - 2);
        const filenameMatch = headers.match(/filename="(.+?)"/);
        if (filenameMatch) {
          const filename = filenameMatch[1];
          const contentTypeMatch = headers.match(/Content-Type: (.+)/);
          const contentType = contentTypeMatch ? contentTypeMatch[1] : 'application/octet-stream';
          fileBlob = Utilities.newBlob(content, contentType, filename);
        } else {
          const nameMatch = headers.match(/name="(.+?)"/);
          if (nameMatch) {
            const fieldName = nameMatch[1];
            if (formData.hasOwnProperty(fieldName)) {
              if (!Array.isArray(formData[fieldName])) formData[fieldName] = [formData[fieldName]];
              formData[fieldName].push(content);
            } else {
              formData[fieldName] = content;
            }
          }
        }
      });
    } else {
      formData = e.parameter;
    }

    // Ã¢ÂÂÃ¢ÂÂ Route: lease e-signature submission Ã¢ÂÂÃ¢ÂÂ
    if (formData['_action'] === 'signLease') {
      const result = signLease(formData['appId'], formData['tenantSignature'], formData['ipAddress'] || '', formData['rentersInsuranceAgreed'] || false, formData['email'] || '');
      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Ã¢ÂÂÃ¢ÂÂ Route: admin auth Ã¢ÂÂÃ¢ÂÂ
    if (formData['_action'] === 'adminSendOTP') {
      const result = sendAdminOTP(formData['email'] || '');
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }
    if (formData['_action'] === 'adminVerifyOTP') {
      const result = verifyAdminOTP(formData['email'] || '', formData['otp'] || '');
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }
    if (formData['_action'] === 'adminPasswordLogin') {
      const result = validateAdminPassword(formData['username'] || '', formData['password'] || '');
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }
    // [L4 fix] Save form progress server-side so resume links work on any device/browser
      if (formData['_action'] === 'saveResumeProgress') {
        const result = saveResumeProgress(formData['token'] || '', formData['progressJson'] || '');
        return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
      }

      if (formData['_action'] === 'sendResumeEmail') {
            // Verify the relay secret to prevent open email relay abuse.
            // This action is called from Supabase Edge Functions, not directly from the browser.
            const relaySecret = formData['_relay_secret'] || '';
            const expectedRelay = PropertiesService.getScriptProperties().getProperty('GAS_RELAY_SECRET') || '';
            if (expectedRelay && !safeEqual(relaySecret, expectedRelay)) {
              return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Unauthorized.' })).setMimeType(ContentService.MimeType.JSON);
            }
            const result = sendResumeEmail(formData['email'] || '', formData['resumeUrl'] || '', formData['step'] || '1');
            return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
          }

      // Ã¢ÂÂÃ¢ÂÂ Route: 9C-3 Ã¢ÂÂ email-based App ID lookup Ã¢ÂÂÃ¢ÂÂ
      if (formData['_action'] === 'lookupAppId') {
        // Rate limit: max 3 lookups per email per hour to prevent enumeration attacks
        const lookupEmail = (formData['email'] || '').toLowerCase().trim();
        if (lookupEmail) {
          try {
            const cache = CacheService.getScriptCache();
            const lookupKey = 'rl_lookup_' + lookupEmail.replace(/[^a-z0-9]/g, '_');
            const lookupCount = parseInt(cache.get(lookupKey) || '0', 10);
            if (lookupCount >= 3) {
              return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Too many lookup requests. Please wait an hour before trying again.' })).setMimeType(ContentService.MimeType.JSON);
            }
            cache.put(lookupKey, String(lookupCount + 1), 3600); // 1-hour window
          } catch (_) { /* CacheService unavailable — allow through */ }
        }
        const result = lookupAppIdByEmail(lookupEmail);
        return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
      }

    // Ã¢ÂÂÃ¢ÂÂ Honeypot check Ã¢ÂÂ bots fill this field, real users don't Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
      if (formData['website'] && formData['website'].trim() !== '') {
        // Return fake success to avoid revealing the honeypot mechanism
        return ContentService
          .createTextOutput(JSON.stringify({ success: true, message: 'Application received.', app_id: 'HP-' + Date.now() }))
          .setMimeType(ContentService.MimeType.JSON);
      }

        // M4: CSRF token format check (adds friction against scripted abuse)
        const _csrfVal = formData['_cp_csrf'] || '';
          // Require a properly formatted nonce: 32-128 alphanumeric/hyphen/underscore chars
          if (!_csrfVal || _csrfVal.length < 32 || _csrfVal.length > 128 || !/^[a-zA-Z0-9\-_]+$/.test(_csrfVal)) {
            return ContentService
              .createTextOutput(JSON.stringify({ success: false, error: 'Invalid request.' }))
              .setMimeType(ContentService.MimeType.JSON);
          }

      // Ã¢ÂÂÃ¢ÂÂ Rate limiting via CacheService (max 5 submissions per email per day) Ã¢ÂÂ
      try {
        const email = (formData['Email'] || '').toLowerCase().trim();
        if (email) {
          const cache = CacheService.getScriptCache();
          const cacheKey = 'rl_email_' + email.replace(/[^a-z0-9]/g, '_');
          const cached = cache.get(cacheKey);
          const count = cached ? parseInt(cached, 10) : 0;
          if (count >= 5) {
            return ContentService
              .createTextOutput(JSON.stringify({ success: false, error: 'Too many submissions from this email address. Please wait 24 hours before trying again.' }))
              .setMimeType(ContentService.MimeType.JSON);
          }
          cache.put(cacheKey, String(count + 1), 86400); // 24-hour window
        }
      } catch (rateErr) {
        // CacheService unavailable Ã¢ÂÂ allow the submission through
        console.error('Rate limit check failed (non-blocking):', rateErr.toString());
      }

      const result = processApplication(formData, fileBlob);
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error('doPost error:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================
// processApplication()
// ============================================================
function processApplication(formData, fileBlob) {
  try {
    // Ã¢ÂÂÃ¢ÂÂ Policy consent checkboxes (Phase 4) Ã¢ÂÂÃ¢ÂÂ
      if (!formData['feeAcknowledge']) { // Fixed: HTML checkboxes send 'on' string, not boolean true
        return { success: false, error: 'You must acknowledge the application fee policy before submitting.' };
      }
      if (!formData['infoAccuracy']) { // Fixed: HTML checkboxes send 'on' string, not boolean true
        return { success: false, error: 'You must certify that your information is accurate before submitting.' };
      }
      if (!formData['dataConsent']) { // Fixed: HTML checkboxes send 'on' string, not boolean true
        return { success: false, error: 'You must consent to data review before submitting.' };
      }

      const requiredFields = ['First Name', 'Last Name', 'Email', 'Phone'];
    for (let field of requiredFields) {
      if (!formData[field] || formData[field].trim() === '') {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Ã¢ÂÂÃ¢ÂÂ Task 2.3: Server-side minimum age validation (18+) Ã¢ÂÂÃ¢ÂÂ
    if (formData['DOB'] && formData['DOB'].trim()) {
      const dob = new Date(formData['DOB']);
      if (!isNaN(dob.getTime())) {
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
        if (age < 18) {
          return { success: false, error: 'Applicant must be 18 or older to apply.' };
        }
      }
    }

    // Ã¢ÂÂÃ¢ÂÂ Task 3.1: Phone format validation Ã¢ÂÂÃ¢ÂÂ
    const rawPhone = formData['Phone'] || '';
    const phoneDigits = rawPhone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      return { success: false, error: 'Phone number must contain at least 10 digits. Please check the number you entered.' };
    }

    // Ã¢ÂÂÃ¢ÂÂ Task 3.1: Monthly income Ã¢ÂÂ warn only, never reject Ã¢ÂÂÃ¢ÂÂ
    if (formData['Monthly Income'] && formData['Monthly Income'].toString().trim()) {
      const income = parseFloat(formData['Monthly Income'].toString().replace(/[^0-9.]/g, ''));
      if (isNaN(income)) {
        console.warn('processApplication: non-numeric Monthly Income received:', formData['Monthly Income']);
      }
    }

    // Ã¢ÂÂÃ¢ÂÂ Task 3.5: Normalize all phone fields before storing Ã¢ÂÂÃ¢ÂÂ
    const phoneFields = ['Phone', 'Co-Applicant Phone', 'Supervisor Phone', 'Reference 1 Phone', 'Reference 2 Phone', 'Emergency Contact Phone', 'Landlord Phone'];
    phoneFields.forEach(field => {
      if (formData[field]) formData[field] = normalizePhone(formData[field]);
    });
      // ── File upload content validation (magic bytes) ──────────────────────────
      // Validate that uploaded files are actually the declared types, not malicious
      // content with a benign extension (e.g., executable renamed to .pdf).
      // Base64 magic bytes: PDF=JVBERi0, JPEG=/9j/, PNG=iVBORw0KGgo
      if (formData['documents']) {
        const docs = Array.isArray(formData['documents']) ? formData['documents'] : [formData['documents']];
        const ALLOWED_MAGIC = {
          pdf:  'JVBERi0',
          jpeg: '/9j/',
          jpg:  '/9j/',
          png:  'iVBORw0KGgo'
        };
        for (const doc of docs) {
          if (!doc || typeof doc !== 'string') continue;
          // doc format: "filename.ext|base64data"
          const parts = doc.split('|');
          if (parts.length < 2) continue;
          const filename = parts[0].toLowerCase();
          const b64 = parts[1].substring(0, 20);
          const ext = filename.split('.').pop();
          const expectedMagic = ALLOWED_MAGIC[ext];
          if (expectedMagic && !b64.startsWith(expectedMagic)) {
            return { success: false, error: 'One or more uploaded files appear to be invalid or corrupted. Please re-upload your documents.' };
          }
        }
      }
      // ── End file content validation ─────────────────────────────────────────



    // ── Phase 1 fix 1.4: Validate submitted lease term against allowed values ──
    if (formData['Lease Terms'] && formData['Lease Terms'].trim()) {
      const allowedTerms = formData['Lease Terms'].split('|').map(function(t) { return t.trim().toLowerCase(); }).filter(Boolean);
      const submittedTerm = (formData['Desired Lease Term'] || '').trim().toLowerCase();
      if (submittedTerm && allowedTerms.length > 0 && allowedTerms.indexOf(submittedTerm) === -1) {
        return { success: false, error: 'The selected lease term is not available for this property. Please choose from the allowed options.' };
      }
    }

    // ── LockService: serialize concurrent submissions ──────────────────────────────
    // Prevents race conditions where two simultaneous submissions both pass the
    // duplicate-detection check before either has committed its row to the sheet.
    // getScriptLock() is shared across ALL concurrent GAS executions for this script.
    // waitLock(15000) blocks up to 15 seconds; if the lock cannot be acquired the
    // function returns a user-friendly error so the applicant can retry cleanly.
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(15000);
    } catch(lockErr) {
      return { success: false, error: 'The server is briefly busy processing another submission. Please wait a few seconds and try again.' };
    }
    try {

    const ss = getSpreadsheet();
    initializeSheets();
    const sheet = ss.getSheetByName(SHEET_NAME);
    const col   = getColumnMap(sheet);

    // Ã¢ÂÂÃ¢ÂÂ Task 3.2: Duplicate application detection Ã¢ÂÂÃ¢ÂÂ
    // [FIXED-I5] Use Property ID as primary duplicate key; address string as fallback only
      const incomingEmail      = (formData['Email']            || '').toLowerCase().trim();
      const incomingPropertyId = (formData['Property ID']      || '').trim();
      const incomingProperty   = (formData['Property Address'] || '').toLowerCase().trim();
      if (incomingEmail && (incomingPropertyId || incomingProperty)) {
        const allData        = sheet.getDataRange().getValues();
        const emailColIdx    = (col['Email']            || 1) - 1;
        const propIdColIdx   = (col['Property ID']      || 1) - 1;
        const propertyColIdx = (col['Property Address'] || 1) - 1;
        const statusColIdx   = (col['Status']           || 1) - 1;
        const appIdColIdx    = (col['App ID']            || 1) - 1;
        for (let i = 1; i < allData.length; i++) {
          const rowEmail    = (allData[i][emailColIdx]    || '').toString().toLowerCase().trim();
          const rowPropId   = (allData[i][propIdColIdx]   || '').toString().trim();
          const rowProperty = (allData[i][propertyColIdx] || '').toString().toLowerCase().trim();
          const rowStatus   = (allData[i][statusColIdx]   || '').toString().toLowerCase();
          const rowAppId    =  allData[i][appIdColIdx]    || '';
          if (rowEmail !== incomingEmail) continue;
          if (rowStatus === 'denied' || rowStatus === 'withdrawn') continue;
          // Primary: Property ID (exact, immutable) beats address-string matching
          const idMatch   = incomingPropertyId && rowPropId && (incomingPropertyId === rowPropId);
          // Fallback: address string Ã¢ÂÂ only when no Property ID present
          const addrMatch = !incomingPropertyId && incomingProperty && (rowProperty === incomingProperty);
          if (idMatch || addrMatch) {
            return {
              success: false,
              duplicate: true,
              existingAppId: rowAppId,
              error: `You already have an active application for this property (Ref: ${rowAppId}). Log in to your dashboard to check your status.`
            };
          }
        }
      }

    // [FIXED-I1] Validate property exists and is active in Supabase before accepting application
      // [L3 fix] Track validation outcome — written to Admin Notes so admins can spot unverified property links
      let propertyValidationNote = '';
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
            // Non-200 from Supabase: log and fall through (graceful degradation)
          } catch (validErr) {
              console.warn('processApplication: Property validation skipped (non-blocking):', validErr.toString());
              // [L3 fix] Flag the validation failure so it is visible in the spreadsheet
              propertyValidationNote = '[WARN: Property ID validation failed - verify property link manually]';
            }
        }
      }

      // Ã¢ÂÂÃ¢ÂÂ Task 3.3: Generate a unique App ID Ã¢ÂÂÃ¢ÂÂ
      const appId = formData.appId || generateUniqueAppId(sheet, col);

    // Ã¢ÂÂÃ¢ÂÂ Resolve "Other" payment text into the main payment columns Ã¢ÂÂÃ¢ÂÂ
    // If the user selected "Other" and typed a value, store that text directly
    // so the Sheet never contains the bare word "Other".
    ['Primary Payment Method', 'Alternative Payment Method', 'Third Choice Payment Method'].forEach(field => {
      const otherField = field + ' Other';
      if (formData[field] === 'Other' && formData[otherField] && formData[otherField].trim()) {
        formData[field] = formData[otherField].trim();
      }
    });

    // [L5 fix] Dead fileBlob binary path removed — the form always sends files as base64 (_docFile_N_data fields)
      // Active document storage is handled below in the Phase 8 base64 loop (writes to 'Document URLs' plural column)

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const rowData = [];
    headers.forEach(header => {
      switch (header) {
        case 'Timestamp':             rowData.push(new Date()); break;
        case 'App ID':                rowData.push(appId); break;
        case 'Status':                rowData.push('pending'); break;
        case 'Payment Status':        rowData.push('unpaid'); break;
        case 'Payment Date':          rowData.push(''); break;
        case 'Admin Notes':           rowData.push(propertyValidationNote); break; // [L3 fix] shows validation warning when property ID check failed
        case 'Document URL':          rowData.push(''); break; // [L5 fix] Legacy column — always empty. Active storage uses 'Document URLs' (plural) below
        case 'Preferred Contact Method': rowData.push(getCheckboxValues(formData, 'Preferred Contact Method')); break;
        case 'Preferred Time':        rowData.push(getCheckboxValues(formData, 'Preferred Time')); break;
        // Ã¢ÂÂÃ¢ÂÂ D-001: Property context from URL params Ã¢ÂÂÃ¢ÂÂ
        case 'Property ID':           rowData.push(formData['Property ID']    || ''); break;
        case 'Property Name':         rowData.push(formData['Property Name']  || ''); break;
        case 'Property City':         rowData.push(formData['Property City']  || ''); break;
        case 'Property State':        rowData.push(formData['Property State'] || ''); break;
        case 'Listed Rent':           rowData.push(formData['Listed Rent']    || ''); break;
        case 'Property Address URL':  rowData.push(''); break; // C3: legacy column — existing rows; new submissions go to Property Address Source
          case 'Property Address Source': rowData.push(formData['Property Address Source'] || ''); break; // C3: renamed from Property Address URL
          // Ã¢ÂÂÃ¢ÂÂ D-001 extension: Additional property context params (ISSUE-002 fix) Ã¢ÂÂÃ¢ÂÂ
          case 'Property Zip':        rowData.push(formData['Property Zip']        || ''); break;
          case 'Property Address':    rowData.push(formData['Property Address']    || ''); break;
          case 'Security Deposit':    rowData.push(formData['Security Deposit']    || ''); break;
          case 'Application Fee': { const submittedFee = parseFloat(formData['Application Fee'] || ''); rowData.push(!isNaN(submittedFee) ? submittedFee : 0); break; } // 9C-1: fee always comes from property data via URL param; fallback 0 (free) not hardcoded constant
          case 'Bedrooms':            rowData.push(formData['Bedrooms']            || ''); break;
          case 'Bathrooms':           rowData.push(formData['Bathrooms']           || ''); break;
          case 'Available Date':      rowData.push(formData['Available Date']      || ''); break;
          case 'Lease Terms':         rowData.push(formData['Lease Terms']         || ''); break;
          case 'Min Lease Months':    rowData.push(formData['Min Lease Months']    || ''); break;
          case 'Pets Allowed':        rowData.push(formData['Pets Allowed']        || ''); break;
          case 'Pet Types Allowed':   rowData.push(formData['Pet Types Allowed']   || ''); break;
          case 'Pet Weight Limit':    rowData.push(formData['Pet Weight Limit']    || ''); break;
          case 'Pet Deposit':         rowData.push(formData['Pet Deposit']         || ''); break;
          case 'Pet Details':         rowData.push(formData['Pet Details']         || ''); break;
          case 'Smoking Allowed':     rowData.push(formData['Smoking Allowed']     || ''); break;
          case 'Utilities Included':  rowData.push(formData['Utilities Included']  || ''); break;
          case 'Parking':             rowData.push(formData['Parking']             || ''); break;
          case 'Parking Fee':         rowData.push(formData['Parking Fee']         || ''); break;
            // [FIXED-C2] Explicit cases for 8 property context fields (were falling to default fallthrough)
            case 'Garage Spaces':       rowData.push(formData['Garage Spaces']       || ''); break;
            case 'EV Charging':         rowData.push(formData['EV Charging']         || ''); break;
            case 'Laundry Type':        rowData.push(formData['Laundry Type']        || ''); break;
            case 'Heating Type':        rowData.push(formData['Heating Type']        || ''); break;
            case 'Cooling Type':        rowData.push(formData['Cooling Type']        || ''); break;
            case 'Last Months Rent':    rowData.push(formData['Last Months Rent']    || ''); break;
            case 'Admin Fee':           rowData.push(formData['Admin Fee']           || ''); break;
            case 'Move-in Special':     rowData.push(formData['Move-in Special']     || ''); break;
          // Ã¢ÂÂÃ¢ÂÂ Ownership columns Ã¢ÂÂÃ¢ÂÂ
        case 'Property Owner':        rowData.push(formData['Property Owner'] || 'Choice Properties'); break;
        case 'Managed By':            rowData.push('Choice Properties'); break;
        // Ã¢ÂÂÃ¢ÂÂ Lease columns default empty on submission Ã¢ÂÂÃ¢ÂÂ
        case 'Lease Status':          rowData.push('none'); break;
        case 'Lease Sent Date':       rowData.push(''); break;
        case 'Lease Signed Date':     rowData.push(''); break;
        case 'Lease Start Date':      rowData.push(''); break;
        case 'Lease End Date':        rowData.push(''); break;
        case 'Monthly Rent':          rowData.push(''); break;
        // [FIXED-C1] Duplicate 'Security Deposit' case removed Ã¢ÂÂ was silently overwriting property-context Security Deposit with empty string.
        case 'Move-in Costs':         rowData.push(''); break;
        case 'Lease Notes':           rowData.push(''); break;
        case 'Tenant Signature':      rowData.push(''); break;
        case 'Signature Timestamp':   rowData.push(''); break;
        case 'Lease IP Address':      rowData.push(''); break;
        // Phase 8 columns Ã¢ÂÂ populated after row insert
        case 'Last Contacted':        rowData.push(''); break;
        case 'Document URLs':         rowData.push(''); break;
        default:
          rowData.push(formData[header] || '');
      }
    });

    sheet.appendRow(rowData);

    } finally {
      // Release the script lock immediately after the row is committed.
      // Document uploads and email sending (below) are NOT serialized — only the
      // critical section (duplicate check + row insert) holds the lock.
      lock.releaseLock();
    }

    // Ã¢ÂÂÃ¢ÂÂ Phase 8: Save attached documents to Google Drive Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
    const docUrls = [];
    let docIdx = 0;
    while (formData[`_docFile_${docIdx}_name`] && formData[`_docFile_${docIdx}_data`]) {
      try {
        const fileName  = formData[`_docFile_${docIdx}_name`];
        const mimeType  = formData[`_docFile_${docIdx}_type`] || 'application/octet-stream';
        const b64Data   = formData[`_docFile_${docIdx}_data`];
        // Ã¢ÂÂÃ¢ÂÂ File type validation Ã¢ÂÂ allowlist of safe document/image types Ã¢ÂÂÃ¢ÂÂ
        const ALLOWED_MIME_TYPES = [
          'application/pdf',
          'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain'
        ];
        const ALLOWED_EXTENSIONS = ['.pdf','.jpg','.jpeg','.png','.webp','.gif','.doc','.docx','.txt'];
        const fileExt = (fileName.match(/\.[^.]+$/) || [''])[0].toLowerCase();
        if (!ALLOWED_MIME_TYPES.includes(mimeType) || !ALLOWED_EXTENSIONS.includes(fileExt)) {
          console.warn('processApplication: rejected file "' + fileName + '" (type: ' + mimeType + ', ext: ' + fileExt + ')');
          docIdx++;
          continue;
        }
        const decoded   = Utilities.base64Decode(b64Data);
        const blob      = Utilities.newBlob(decoded, mimeType, `${appId}_${fileName}`);
        let folder;
        try {
          const folders = DriveApp.getFoldersByName('CP_Applicant_Docs');
          folder = folders.hasNext() ? folders.next() : DriveApp.createFolder('CP_Applicant_Docs');
        } catch(fe) {
          folder = DriveApp.getRootFolder();
        }
        const file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        docUrls.push(file.getUrl());
      } catch(de) {
        console.warn('processApplication: failed to save doc ' + docIdx, de);
      }
      docIdx++;
    }
    if (docUrls.length > 0) {
      const newCol = getColumnMap(sheet);
      const newLastRow = sheet.getLastRow();
      if (newCol['Document URLs']) {
        sheet.getRange(newLastRow, newCol['Document URLs']).setValue(docUrls.join('\n'));
      }
    }
    // Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ

    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const range = sheet.getRange(2, 1, lastRow - 1, headers.length);
      range.setBorder(true, true, true, true, true, true);
      for (let i = 2; i <= lastRow; i++) {
        if (i % 2 === 0) sheet.getRange(i, 1, 1, headers.length).setBackground('#f8f9fa');
      }
    }

    const applicantEmailSent = sendApplicantConfirmation(formData, appId);
    logEmail('applicant_confirmation', formData['Email'], applicantEmailSent ? 'success' : 'failed', appId);
    const adminEmailSent = sendAdminNotification(formData, appId);
    logEmail('admin_notification', 'admin', adminEmailSent ? 'success' : 'failed', appId);
    logEmail('application_submitted', formData['Email'], 'success', appId);

    return { success: true, appId: appId, message: 'Application submitted successfully' };

  } catch (error) {
    console.error('processApplication error:', error);
    logEmail('application_submitted', formData['Email'] || 'unknown', 'failed', null, error.toString());
    return { success: false, error: error.toString() };
  }
}

// ============================================================
// generateAppId()
// ============================================================
function generateAppId() {
  const date = new Date();
  const year  = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day   = String(date.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const ms    = String(date.getMilliseconds()).padStart(3, '0');
  return `CP-${year}${month}${day}-${random}${ms}`;
}

// Ã¢ÂÂÃ¢ÂÂ Task 3.3: generateUniqueAppId() Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
// Generates an App ID and verifies it does not already exist in
// the sheet. Retries up to 5 times before returning an error.
function generateUniqueAppId(sheet, col) {
  const maxAttempts = 5;
  for (let i = 0; i < maxAttempts; i++) {
    const candidate = generateAppId();
    const data = sheet.getDataRange().getValues();
    const colIdx = (col['App ID'] || 1) - 1;
    const exists = data.slice(1).some(row => row[colIdx] === candidate);
    if (!exists) return candidate;
  }
  throw new Error('Failed to generate a unique App ID after ' + maxAttempts + ' attempts.');
}

// Ã¢ÂÂÃ¢ÂÂ Task 3.5: normalizePhone() Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
// Strips formatting and returns a consistent digit-only string.
// Handles 10-digit US numbers and 11-digit numbers starting with 1.
function normalizePhone(phone) {
  if (!phone) return phone;
  const digits = phone.toString().replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.charAt(0) === '1') return '+1' + digits.slice(1);
  return phone; // Return original if format is unrecognized
}

// ============================================================
//  Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ     Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
//  Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ     Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
//  Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ     Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ  Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
//  Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ     Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ  Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
//  Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ  Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
//  Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ  Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
//  FLOW FUNCTIONS
// ============================================================

// Ã¢ÂÂÃ¢ÂÂ generateAndSendLease() Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
// Called from admin panel. Populates lease data, then emails
// the tenant a link to sign.
// Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
function generateAndSendLease(appId, monthlyRent, securityDeposit, leaseStartDate, leaseNotes, rentDueDay, gracePeriodDays, lateFeeAmount, unitType, bedrooms, bathrooms, parkingSpace, includedUtilities, petDeposit, monthlyPetRent, verifiedPropertyAddress) {
  try {
    const ss    = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error('Applications sheet not found');

    initializeSheets(); // ensures lease columns exist
    const col  = getColumnMap(sheet);
    const data = sheet.getDataRange().getValues();

    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][col['App ID'] - 1] === appId) { rowIndex = i + 1; break; }
    }
    if (rowIndex === -1) throw new Error('Application not found: ' + appId);

    // Validate applicant is approved & paid
    const paymentStatus = sheet.getRange(rowIndex, col['Payment Status']).getValue();
    const appStatus     = sheet.getRange(rowIndex, col['Status']).getValue();
    if (paymentStatus !== 'paid')      throw new Error('Cannot send lease Ã¢ÂÂ payment not confirmed.');
    if (appStatus !== 'approved')      throw new Error('Cannot send lease Ã¢ÂÂ application not yet approved.');

    const currentLeaseStatus = sheet.getRange(rowIndex, col['Lease Status']).getValue();
    if (currentLeaseStatus === 'signed') throw new Error('Lease already signed by tenant.');

    // Ã¢ÂÂÃ¢ÂÂ Task 1.5: Validate required financial fields before proceeding Ã¢ÂÂÃ¢ÂÂ
    const rentVal = parseFloat(monthlyRent);
    if (!monthlyRent || isNaN(rentVal) || rentVal <= 0) {
      return { success: false, error: 'Monthly rent is required and must be greater than $0. Please enter the rent amount before sending the lease.' };
    }
    if (!leaseStartDate || leaseStartDate.toString().trim() === '') {
      return { success: false, error: 'Lease start date is required. Please select a start date before sending the lease.' };
    }
    const startDateTest = new Date(leaseStartDate);
    if (isNaN(startDateTest.getTime())) {
      return { success: false, error: 'Lease start date is invalid. Please enter a valid date (e.g., 2026-06-01).' };
    }

    // Ã¢ÂÂÃ¢ÂÂ Task 1.4: Calculate lease end date Ã¢ÂÂ handles month-to-month Ã¢ÂÂÃ¢ÂÂ
    const desiredTerm   = sheet.getRange(rowIndex, col['Desired Lease Term']).getValue() || '12 months';
    const startDate     = new Date(leaseStartDate);
    const endDateObj    = calculateLeaseEndDate(startDate, desiredTerm);
    const isMtm         = (endDateObj === null);
    const endDateStr    = isMtm
      ? 'Month-to-Month Ã¢ÂÂ No Fixed Expiration'
      : Utilities.formatDate(endDateObj, Session.getScriptTimeZone(), 'MMMM dd, yyyy');

    // Move-in costs = first month + deposit
    const rent          = rentVal;
    const deposit       = parseFloat(securityDeposit)  || 0;
    const moveInCosts   = rent + deposit;
    const rentDue       = parseInt(rentDueDay)          || 1;
    const graceDays     = parseInt(gracePeriodDays)     || 5;
    const lateFee       = parseFloat(lateFeeAmount)     || 50;

    // Write lease data to sheet
    sheet.getRange(rowIndex, col['Lease Status']).setValue('sent');
    sheet.getRange(rowIndex, col['Lease Sent Date']).setValue(new Date());
    sheet.getRange(rowIndex, col['Lease Start Date']).setValue(leaseStartDate);
    sheet.getRange(rowIndex, col['Lease End Date']).setValue(endDateStr);
    sheet.getRange(rowIndex, col['Monthly Rent']).setValue(rent);
    sheet.getRange(rowIndex, col['Security Deposit']).setValue(deposit);
    sheet.getRange(rowIndex, col['Move-in Costs']).setValue(moveInCosts);
    sheet.getRange(rowIndex, col['Lease Notes']).setValue(leaseNotes || '');
    if (col['Rent Due Day'])      sheet.getRange(rowIndex, col['Rent Due Day']).setValue(rentDue);
    if (col['Grace Period Days']) sheet.getRange(rowIndex, col['Grace Period Days']).setValue(graceDays);
    if (col['Late Fee Amount'])   sheet.getRange(rowIndex, col['Late Fee Amount']).setValue(lateFee);
    // Phase 5 fields (D-017, D-018)
    if (col['Unit Type'])           sheet.getRange(rowIndex, col['Unit Type']).setValue(unitType || '');
    if (col['Bedrooms'])            sheet.getRange(rowIndex, col['Bedrooms']).setValue(bedrooms || '');
    if (col['Bathrooms'])           sheet.getRange(rowIndex, col['Bathrooms']).setValue(bathrooms || '');
    if (col['Parking Space'])       sheet.getRange(rowIndex, col['Parking Space']).setValue(parkingSpace || '');
    if (col['Included Utilities'])  sheet.getRange(rowIndex, col['Included Utilities']).setValue(includedUtilities || '');
    if (col['Pet Deposit Amount'])  sheet.getRange(rowIndex, col['Pet Deposit Amount']).setValue(parseFloat(petDeposit) || 0);
    if (col['Monthly Pet Rent'])    sheet.getRange(rowIndex, col['Monthly Pet Rent']).setValue(parseFloat(monthlyPetRent) || 0);
    // Task 5.2: Store admin-verified property address
    if (verifiedPropertyAddress && col['Verified Property Address']) {
      sheet.getRange(rowIndex, col['Verified Property Address']).setValue(verifiedPropertyAddress.trim());
    }

    // Add admin note
    const currentNotes = sheet.getRange(rowIndex, col['Admin Notes']).getValue();
    const newNote = `[${new Date().toLocaleString()}] Lease sent. Rent: $${rent}/mo, Deposit: $${deposit}, Start: ${leaseStartDate}`;
    sheet.getRange(rowIndex, col['Admin Notes']).setValue(
      currentNotes ? currentNotes + '\n' + newNote : newNote
    );

    // Send email to tenant
    const tenantEmail   = sheet.getRange(rowIndex, col['Email']).getValue();
    const firstName     = sheet.getRange(rowIndex, col['First Name']).getValue();
    const lastName      = sheet.getRange(rowIndex, col['Last Name']).getValue();
    const phone         = sheet.getRange(rowIndex, col['Phone']).getValue();
    const propertyOwner = col['Property Owner'] ? sheet.getRange(rowIndex, col['Property Owner']).getValue() || 'Choice Properties' : 'Choice Properties';

    const baseUrl   = ScriptApp.getService().getUrl();
    const leaseLink = baseUrl + '?path=lease&id=' + appId;

    sendLeaseEmail(appId, tenantEmail, firstName + ' ' + lastName, phone, leaseLink, {
      rent          : rent,
      deposit       : deposit,
      moveInCosts   : moveInCosts,
      startDate     : leaseStartDate,
      endDate       : endDateStr,
      term          : desiredTerm,
      property      : (verifiedPropertyAddress && verifiedPropertyAddress.trim()) ? verifiedPropertyAddress.trim() : sheet.getRange(rowIndex, col['Property Address']).getValue(),
      propertyOwner : propertyOwner,
      propertyState : col['Property State'] ? sheet.getRange(rowIndex, col['Property State']).getValue() || 'MI' : 'MI',
      rentDueDay    : rentDue,
      gracePeriodDays: graceDays,
      lateFeeAmount : lateFee
    });

    logEmail('lease_sent', tenantEmail, 'success', appId);
    return { success: true, message: 'Lease sent to ' + tenantEmail, leaseLink: leaseLink };

  } catch (error) {
    console.error('generateAndSendLease error:', error);
    logEmail('lease_sent', 'admin', 'failed', appId, error.toString());
    return { success: false, error: error.toString() };
  }
}

// Ã¢ÂÂÃ¢ÂÂ calculateLeaseEndDate() Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
// Returns a Date for fixed terms, or null for month-to-month.
// Callers must check: if (endDate === null) treat as month-to-month.
function calculateLeaseEndDate(startDate, termString) {
  const term = (termString || '').toLowerCase();
  if (term.includes('month-to-month') || term.includes('month to month') || term === 'mtm') {
    return null; // month-to-month has no fixed expiration
  }
  const end = new Date(startDate);
  if      (term.includes('6'))  end.setMonth(end.getMonth() + 6);
  else if (term.includes('12')) end.setMonth(end.getMonth() + 12);
  else if (term.includes('18')) end.setMonth(end.getMonth() + 18);
  else if (term.includes('24')) end.setMonth(end.getMonth() + 24);
  else                          end.setMonth(end.getMonth() + 12); // default to 12 months
  end.setDate(end.getDate() - 1); // end = day before next period
  return end;
}

// Ã¢ÂÂÃ¢ÂÂ signLease() Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
// Called via google.script.run from the lease signing page.
// Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
function signLease(appId, tenantSignature, ipAddress, rentersInsuranceAgreed, applicantEmail) {
  try {
    if (!tenantSignature || tenantSignature.trim().length < 2) {
      throw new Error('A valid signature is required.');
    }
    if (!applicantEmail || !applicantEmail.trim()) {
      throw new Error('Your email address is required to verify your identity before signing.');
    }

    const ss    = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error('Applications sheet not found');

    const col  = getColumnMap(sheet);
    const data = sheet.getDataRange().getValues();

    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][col['App ID'] - 1] === appId) { rowIndex = i + 1; break; }
    }
    if (rowIndex === -1) throw new Error('Application not found.');

    // ── Identity verification: confirm caller is the actual applicant ──────
    const storedEmail = (sheet.getRange(rowIndex, col['Email']).getValue() || '').toString().toLowerCase().trim();
    const callerEmail = applicantEmail.toLowerCase().trim();
    if (!storedEmail || storedEmail !== callerEmail) {
      throw new Error('The email address you entered does not match the application on record. Please verify your email and try again.');
    }
    // ── End identity verification ──────────────────────────────────────────

    const leaseStatus = sheet.getRange(rowIndex, col['Lease Status']).getValue();
    if (leaseStatus === 'signed') throw new Error('Lease has already been signed.');
    if (leaseStatus !== 'sent')   throw new Error('No lease is pending signature for this application.');

    const signedAt = new Date();
    sheet.getRange(rowIndex, col['Lease Status']).setValue('signed');
    sheet.getRange(rowIndex, col['Lease Signed Date']).setValue(signedAt);
    sheet.getRange(rowIndex, col['Tenant Signature']).setValue(tenantSignature.trim());
    sheet.getRange(rowIndex, col['Signature Timestamp']).setValue(signedAt.toISOString());
    sheet.getRange(rowIndex, col['Lease IP Address']).setValue(ipAddress || 'not captured');
    if (col['Renter Insurance Agreed']) {
      sheet.getRange(rowIndex, col['Renter Insurance Agreed']).setValue(rentersInsuranceAgreed ? 'Yes' : 'No');
    }

    // Add audit note
    const currentNotes = sheet.getRange(rowIndex, col['Admin Notes']).getValue();
    const auditNote = `[${signedAt.toLocaleString()}] Lease signed electronically by "${tenantSignature.trim()}" from IP ${ipAddress || 'unknown'}.`;
    sheet.getRange(rowIndex, col['Admin Notes']).setValue(
      currentNotes ? currentNotes + '\n' + auditNote : auditNote
    );

    // Gather data for emails
    const email         = sheet.getRange(rowIndex, col['Email']).getValue();
    const firstName     = sheet.getRange(rowIndex, col['First Name']).getValue();
    const lastName      = sheet.getRange(rowIndex, col['Last Name']).getValue();
    const phone         = sheet.getRange(rowIndex, col['Phone']).getValue();
    const property      = sheet.getRange(rowIndex, col['Property Address']).getValue();
    const rent          = sheet.getRange(rowIndex, col['Monthly Rent']).getValue();
    const deposit       = sheet.getRange(rowIndex, col['Security Deposit']).getValue();
    const startDate     = sheet.getRange(rowIndex, col['Lease Start Date']).getValue();
    const endDate       = sheet.getRange(rowIndex, col['Lease End Date']).getValue();
    const moveInCost    = sheet.getRange(rowIndex, col['Move-in Costs']).getValue();
    // Bug fix: read propertyState from the sheet row directly Ã¢ÂÂ `app` was never
    // defined in signLease(), causing a ReferenceError that silently swallowed emails.
    const propertyState = col['Property State']
      ? sheet.getRange(rowIndex, col['Property State']).getValue() || 'MI'
      : 'MI';

    const baseUrl       = ScriptApp.getService().getUrl();
    const dashboardLink = baseUrl + '?path=dashboard&id=' + appId;

    sendLeaseSignedTenantEmail(appId, email, firstName, phone, {
      property      : property,
      rent          : rent,
      deposit       : deposit,
      moveInCost    : moveInCost,
      startDate     : startDate,
      endDate       : endDate,
      signature     : tenantSignature.trim(),
      propertyState : propertyState,
      dashboardLink
    });

    sendLeaseSignedAdminAlert(appId, firstName + ' ' + lastName, email, phone, tenantSignature.trim(), property);

    // Ã¢ÂÂÃ¢ÂÂ Task 4.4: Send move-in preparation guide to tenant Ã¢ÂÂÃ¢ÂÂ
    sendMoveInPreparationGuide(appId, email, firstName, {
      property  : property,
      rent      : rent,
      deposit   : deposit,
      moveInCost: moveInCost,
      startDate : startDate,
      endDate   : endDate
    });

    logEmail('lease_signed', email, 'success', appId);
    return { success: true, message: 'Lease signed successfully.' };

  } catch (error) {
    console.error('signLease error:', error);
    logEmail('lease_signed', appId, 'failed', appId, error.toString());
    return { success: false, error: error.toString() };
  }
}

// Ã¢ÂÂÃ¢ÂÂ getLeaseSummary() Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
// Returns lease data for a given appId Ã¢ÂÂ used by the
// applicant dashboard to show lease status card.
// Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
function getLeaseSummary(appId) {
  try {
    const result = getApplication(appId);
    if (!result.success) return { success: false, error: result.error };
    const app = result.application;
    return {
      success      : true,
      leaseStatus  : app['Lease Status']        || 'none',
      sentDate     : app['Lease Sent Date']      || '',
      signedDate   : app['Lease Signed Date']    || '',
      startDate    : app['Lease Start Date']     || '',
      endDate      : app['Lease End Date']       || '',
      rent         : app['Monthly Rent']         || '',
      deposit      : app['Security Deposit']     || '',
      moveInCosts  : app['Move-in Costs']        || '',
      notes        : app['Lease Notes']          || '',
      signature    : app['Tenant Signature']     || ''
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ============================================================
// renderLeaseSigningPage()  Ã¢ÂÂ  ?path=lease&id=APP_ID
// Full lease document + e-signature block
// ============================================================
function renderLeaseSigningPage(appId) {
  const result = getApplication(appId);
  if (!result.success) {
    return HtmlService.createHtmlOutput(`
      <html><body style="font-family:sans-serif;text-align:center;padding:60px;">
      <h2>Ã¢ÂÂ Ã¯Â¸Â Lease Not Found</h2>
      <p>This link is invalid or has expired. Please text us at <strong>707-706-3137</strong>.</p>
      </body></html>
    `).setTitle('Lease Not Found');
  }

  const app = result.application;

  const leaseStatus = app['Lease Status'] || 'none';
  if (leaseStatus === 'signed') {
    return HtmlService.createHtmlOutput(`
      <html><body style="font-family:sans-serif;text-align:center;padding:60px;background:#f5f7fa;">
      <div style="max-width:600px;margin:auto;background:white;border-radius:16px;padding:40px;box-shadow:0 4px 20px rgba(0,0,0,.1);">
        <div style="font-size:64px;">Ã¢ÂÂ</div>
        <h2 style="color:#27ae60;">Lease Already Signed</h2>
        <p>This lease has already been signed. Please check your email for your copy, or log in to your dashboard.</p>
        <a href="?path=dashboard&id=${appId}" style="display:inline-block;margin-top:20px;background:#1a5276;color:white;padding:14px 32px;border-radius:50px;text-decoration:none;font-weight:600;">View My Dashboard</a>
      </div></body></html>
    `).setTitle('Already Signed');
  }
  if (leaseStatus !== 'sent') {
    return HtmlService.createHtmlOutput(`
      <html><body style="font-family:sans-serif;text-align:center;padding:60px;">
      <h2>Ã¢ÂÂ Ã¯Â¸Â No Lease Ready</h2>
      <p>No lease is currently available for signing. Please contact us at <strong>707-706-3137</strong>.</p>
      </body></html>
    `).setTitle('No Lease Available');
  }

  const firstName     = app['First Name']         || '';
  const lastName      = app['Last Name']          || '';
  const fullName      = firstName + ' ' + lastName;
  const property      = app['Verified Property Address'] || app['Property Address'] || '';
  const term          = app['Desired Lease Term'] || '';
  const rent          = parseFloat(app['Monthly Rent'])       || 0;
  const deposit       = parseFloat(app['Security Deposit'])   || 0;
  const holdingFeeAmt    = parseFloat(app['Holding Fee Amount']) || 0;
  const holdingFeeStatus = app['Holding Fee Status'] || 'none';
  const holdingFeePaid   = holdingFeeStatus === 'paid' && holdingFeeAmt > 0;
  const holdingFeePending= holdingFeeStatus === 'requested' && holdingFeeAmt > 0;
  const rawMoveIn     = parseFloat(app['Move-in Costs'])      || (rent + deposit);
  const moveInCost    = holdingFeePaid ? Math.max(0, rawMoveIn - holdingFeeAmt) : rawMoveIn;
  const startDate     = app['Lease Start Date']   || '';
  const endDate       = app['Lease End Date']     || '';
  const phone         = app['Phone']              || '';
  const email         = app['Email']              || '';
  const totalOccupants= app['Total Occupants']    || '1';
  const hasPets       = app['Has Pets']           || 'No';
  const petDetails    = app['Pet Details']        || '';
  const smoker        = app['Smoker']             || 'No';
  const baseUrl       = ScriptApp.getService().getUrl();
  const todayStr      = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MMMM dd, yyyy');

  // Ã¢ÂÂÃ¢ÂÂ D-005/D-006: Lease financial config (admin-set, defaults for existing rows) Ã¢ÂÂÃ¢ÂÂ
  const rentDueDay     = parseInt(app['Rent Due Day'])      || 1;
  const gracePeriodDays= parseInt(app['Grace Period Days']) || 5;
  const lateFeeAmount  = parseFloat(app['Late Fee Amount']) || 50;
  // Build human-readable due/grace strings
  const rentDueSuffix  = rentDueDay === 1 ? 'st' : rentDueDay === 2 ? 'nd' : rentDueDay === 3 ? 'rd' : 'th';
  const rentDueStr     = `${rentDueDay}${rentDueSuffix} day of each calendar month`;
  const graceLateDay   = rentDueDay + gracePeriodDays;
  const graceDateSfx   = graceLateDay === 1 ? 'st' : graceLateDay === 2 ? 'nd' : graceLateDay === 3 ? 'rd' : 'th';
  const graceStr       = `${gracePeriodDays} days Ã¢ÂÂ rent is considered late after the ${graceLateDay}${graceDateSfx} of the month`;
  const lateFeeStr     = `$${lateFeeAmount.toFixed(2)} assessed on the ${graceLateDay}${graceDateSfx}; $10.00 per day thereafter`;

  // Ã¢ÂÂÃ¢ÂÂ D-002/D-003/D-004: Jurisdiction derived from property state Ã¢ÂÂÃ¢ÂÂ
  // Property State is stored on the sheet row from D-001. Falls back to MI
  // (Choice Properties HQ state) so existing rows before the D-001 fix still work.
  const propertyState = app['Property State'] || 'MI';
  const jur           = getJurisdiction(propertyState);
  const eSignText     = getESignText(propertyState);
  const eSignShort    = propertyState === 'MI'
    ? 'Michigan Electronic Signature Act and the federal E-SIGN Act'
    : 'applicable state Uniform Electronic Transactions Act (UETA) and the federal E-SIGN Act';

  // Determine correct landlord for this property
  const propertyOwner = app['Property Owner'] || 'Choice Properties';
  const isChoiceOwned = !propertyOwner || propertyOwner === 'Choice Properties' || propertyOwner.trim() === '';
  const landlordName  = isChoiceOwned ? 'Choice Properties' : propertyOwner;
  const landlordAddr  = isChoiceOwned ? '2265 Livernois, Suite 500, Troy, MI 48083' : '';
  const managedByLine = isChoiceOwned
    ? ''
    : `<li><b>Property Manager:</b> Choice Properties, 2265 Livernois Suite 500, Troy, MI 48083 | 707-706-3137 (acting as authorized management agent)</li>`;

  // Utilities clause Ã¢ÂÂ dynamic (D-019): list included utilities if specified, else generic
  const includedUtilities = app['Included Utilities'] || '';
  const utilitiesNote = includedUtilities.trim()
    ? `The following utilities are included in the monthly rent: <strong>${includedUtilities.trim()}</strong>. All other utilities and services not listed are the sole responsibility of the Tenant and must be established in Tenant's name prior to move-in.`
    : 'Tenant is responsible for all utilities and services (electricity, gas, water, internet, trash, etc.) unless otherwise specified in a written addendum provided at lease signing. Please confirm any included utilities with Choice Properties management prior to move-in.';

  // Phase 5 property detail fields (D-017)
  const unitType      = app['Unit Type']    || '';
  const bedrooms      = app['Bedrooms']     || '';
  const bathrooms     = app['Bathrooms']    || '';
  const parkingSpace  = app['Parking Space'] || '';

  // Phase 5 pet financial fields (D-018)
  const petDeposit    = parseFloat(app['Pet Deposit Amount'])  || 0;
  const monthlyPetRent= parseFloat(app['Monthly Pet Rent'])    || 0;

  return HtmlService.createHtmlOutput(`
<!DOCTYPE html>
<html>
<head>
  <title>Residential Lease Agreement - Choice Properties</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600;700&family=Dancing+Script:wght@700&display=swap" rel="stylesheet">
  <style>
    /* Ã¢ÂÂÃ¢ÂÂ Base Ã¢ÂÂÃ¢ÂÂ */
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Inter',Arial,sans-serif;background:#f0f2f5;color:#2c3e50;line-height:1.7;}
    .wrapper{max-width:860px;margin:30px auto;padding:0 15px 60px;}

    /* Ã¢ÂÂÃ¢ÂÂ Header Ã¢ÂÂÃ¢ÂÂ */
    .lease-header{
      background:linear-gradient(135deg,#0a1628 0%,#1a3050 60%,#0d2240 100%);
      color:white;padding:40px 48px 36px;border-radius:16px 16px 0 0;
      text-align:center;position:relative;overflow:hidden;
    }
    .lease-header::before{content:'';position:absolute;top:-60px;right:-60px;
      width:220px;height:220px;background:rgba(212,175,55,.06);border-radius:50%;}
    .lease-header::after{content:'';position:absolute;bottom:-40px;left:-40px;
      width:160px;height:160px;background:rgba(212,175,55,.04);border-radius:50%;}
    .hdr-eyebrow{font-size:11px;font-weight:700;letter-spacing:3px;
      text-transform:uppercase;color:rgba(212,175,55,.8);margin-bottom:12px;}
    .hdr-logo{font-family:'Playfair Display',Georgia,serif;font-size:32px;
      font-weight:700;color:#fff;letter-spacing:.5px;margin-bottom:4px;}
    .hdr-sub{font-size:12px;color:rgba(255,255,255,.45);letter-spacing:2px;
      text-transform:uppercase;margin-bottom:20px;}
    .hdr-divider{width:48px;height:2px;
      background:linear-gradient(to right,rgba(212,175,55,.3),rgba(212,175,55,.9),rgba(212,175,55,.3));
      margin:0 auto 20px;}
    .hdr-title{font-family:'Playfair Display',Georgia,serif;font-size:20px;
      font-weight:600;color:#fff;line-height:1.4;margin-bottom:14px;}
    .hdr-badges{display:flex;justify-content:center;flex-wrap:wrap;gap:10px;}
    .hdr-badge{display:inline-block;background:rgba(255,255,255,.07);
      border:1px solid rgba(212,175,55,.3);border-radius:4px;
      padding:6px 16px;font-size:11px;font-weight:600;
      color:rgba(212,175,55,.9);letter-spacing:1.5px;}

    /* Ã¢ÂÂÃ¢ÂÂ Doc ref bar Ã¢ÂÂÃ¢ÂÂ */
    .doc-ref-bar{background:#1a5276;color:rgba(255,255,255,.85);
      padding:10px 48px;font-size:12px;font-family:'Inter',monospace;
      display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;
      border-left:1px solid #144066;border-right:1px solid #144066;}

    /* Ã¢ÂÂÃ¢ÂÂ Managed-by notice (external properties only) Ã¢ÂÂÃ¢ÂÂ */
    .mgmt-notice{background:#fffbeb;border-left:4px solid #f59e0b;padding:12px 20px;
      font-size:13px;color:#78350f;border-right:1px solid #e5c07a;
      border-bottom:1px solid #e5c07a;}

    /* Ã¢ÂÂÃ¢ÂÂ Lease body Ã¢ÂÂÃ¢ÂÂ */
    .lease-body{background:white;padding:40px 48px;
      border-left:1px solid #dde3ea;border-right:1px solid #dde3ea;}

    /* Ã¢ÂÂÃ¢ÂÂ Personalization banner Ã¢ÂÂÃ¢ÂÂ */
    .personal-banner{background:linear-gradient(135deg,#eff6ff,#dbeafe);
      border:1px solid #93c5fd;border-radius:10px;padding:14px 20px;
      margin-bottom:28px;font-size:13px;color:#1e40af;font-weight:500;}

    /* Ã¢ÂÂÃ¢ÂÂ Article headers Ã¢ÂÂÃ¢ÂÂ */
    .article-header{font-size:10px;font-weight:700;text-transform:uppercase;
      letter-spacing:2px;color:#94a3b8;margin:36px 0 6px;padding-bottom:6px;
      border-bottom:1px solid #f1f5f9;}
    .section-title{font-size:13px;font-weight:700;text-transform:uppercase;
      letter-spacing:1px;color:white;background:#1a5276;
      padding:8px 16px;border-radius:6px;margin:8px 0 14px;}

    /* Ã¢ÂÂÃ¢ÂÂ Key-value table Ã¢ÂÂÃ¢ÂÂ */
    .kv-table{width:100%;border-collapse:collapse;margin-bottom:8px;}
    .kv-table td{padding:9px 14px;border:1px solid #dde3ea;font-size:14px;vertical-align:top;}
    .kv-table td:first-child{width:38%;background:#f8f9fb;font-weight:600;color:#1a5276;}

    /* Ã¢ÂÂÃ¢ÂÂ Highlight boxes Ã¢ÂÂÃ¢ÂÂ */
    .highlight-box{background:#fff3cd;border:1px solid #f39c12;border-radius:10px;padding:18px 22px;margin:20px 0;}
    .highlight-box.blue{background:#e8f4fc;border-color:#3498db;}
    .highlight-box.green{background:#d4edda;border-color:#27ae60;}
    .highlight-box.slate{background:#f8fafc;border-left:4px solid #64748b;border-radius:4px;border-top:none;border-right:none;border-bottom:none;}
    .highlight-box.red{background:#fff0f0;border-left:4px solid #e74c3c;border-radius:4px;border-top:none;border-right:none;border-bottom:none;}

    /* Ã¢ÂÂÃ¢ÂÂ Clause text Ã¢ÂÂÃ¢ÂÂ */
    .clause{margin-bottom:18px;font-size:14px;}
    .clause b{color:#1a5276;}
    ol.clauses{padding-left:20px;}
    ol.clauses > li{margin-bottom:18px;font-size:14px;line-height:1.75;}
    ol.clauses > li > b{color:#1a5276;display:block;margin-bottom:4px;}

    /* Ã¢ÂÂÃ¢ÂÂ Signature section Ã¢ÂÂÃ¢ÂÂ */
    .signature-section{
      background:linear-gradient(135deg,#f8f9fb,#f0f4f8);
      border:2px solid #1a5276;border-radius:20px;
      padding:36px 40px;margin-top:40px;
      box-shadow:0 8px 32px rgba(26,82,118,.12);
    }
    .sig-section-header{display:flex;align-items:center;gap:14px;margin-bottom:6px;}
    .sig-icon-wrap{width:52px;height:52px;background:linear-gradient(135deg,#1a5276,#2980b9);
      border-radius:14px;display:flex;align-items:center;justify-content:center;
      font-size:24px;flex-shrink:0;box-shadow:0 4px 12px rgba(26,82,118,.3);}
    .sig-section-header h3{color:#1a5276;font-size:20px;font-weight:700;line-height:1.2;}
    .sig-section-header p{color:#64748b;font-size:13px;margin-top:2px;}

    /* Ã¢ÂÂÃ¢ÂÂ Step progress Ã¢ÂÂÃ¢ÂÂ */
    .sig-steps{display:flex;gap:0;margin:24px 0 28px;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;}
    .sig-step{flex:1;padding:12px 10px;text-align:center;background:#f8fafc;
      font-size:12px;font-weight:600;color:#94a3b8;transition:all .3s;
      border-right:1px solid #e2e8f0;position:relative;}
    .sig-step:last-child{border-right:none;}
    .sig-step.done{background:#d1fae5;color:#065f46;}
    .sig-step.done::after{content:'Ã¢ÂÂ';margin-left:4px;}
    .sig-step.active{background:linear-gradient(135deg,#1a5276,#2980b9);color:white;font-weight:700;}
    .sig-step-num{display:block;font-size:18px;margin-bottom:2px;}

    /* Ã¢ÂÂÃ¢ÂÂ Signature input Ã¢ÂÂÃ¢ÂÂ */
    .sig-label{display:block;font-weight:700;font-size:13px;color:#1e293b;
      margin:0 0 8px;letter-spacing:.3px;}
    .sig-input{width:100%;padding:16px 18px;font-size:28px;
      font-family:'Dancing Script',cursive;border:2px solid #dde3ea;
      border-radius:12px;color:#1a5276;transition:all .25s;
      background:white;line-height:1.3;}
    .sig-input:focus{border-color:#1a5276;outline:none;
      box-shadow:0 0 0 4px rgba(26,82,118,.12);}
    .sig-input.has-value{border-color:#27ae60;
      box-shadow:0 0 0 3px rgba(39,174,96,.1);}

    /* Ã¢ÂÂÃ¢ÂÂ Live preview Ã¢ÂÂÃ¢ÂÂ */
    .sig-preview-wrap{margin-top:12px;border-radius:12px;overflow:hidden;
      border:1px solid #e2e8f0;background:white;}
    .sig-preview-label{background:#f8fafc;padding:8px 16px;font-size:11px;
      font-weight:700;letter-spacing:1.5px;text-transform:uppercase;
      color:#94a3b8;border-bottom:1px solid #e2e8f0;display:flex;
      justify-content:space-between;align-items:center;}
    .sig-preview-label span{font-size:10px;color:#cbd5e1;font-weight:500;letter-spacing:0;}
    .sig-preview-line{padding:18px 24px 14px;min-height:80px;display:flex;align-items:center;}
    .sig-preview-name{font-family:'Dancing Script',cursive;font-size:42px;
      color:#1a5276;line-height:1.1;transition:all .2s;word-break:break-word;}
    .sig-preview-name.empty{font-family:'Inter',sans-serif;font-size:14px;
      color:#cbd5e1;font-style:italic;font-weight:400;}
    .sig-preview-footer{border-top:1.5px solid #1a5276;margin:0 24px;
      padding:6px 0 12px;display:flex;justify-content:space-between;
      font-size:11px;color:#94a3b8;}

    /* Ã¢ÂÂÃ¢ÂÂ Legal badge Ã¢ÂÂÃ¢ÂÂ */
    .legal-badge{background:#f0fdf4;border:1px solid #86efac;border-radius:8px;
      padding:10px 14px;font-size:12px;color:#15803d;font-weight:500;
      display:flex;align-items:center;gap:8px;margin-top:14px;}
    .legal-badge-icon{font-size:16px;flex-shrink:0;}

    /* Ã¢ÂÂÃ¢ÂÂ Checkboxes Ã¢ÂÂÃ¢ÂÂ */
    .checkbox-group{margin:20px 0;display:flex;flex-direction:column;gap:2px;}
    .checkbox-row{display:flex;align-items:flex-start;gap:12px;
      padding:12px 14px;border-radius:10px;font-size:14px;
      transition:background .2s;cursor:pointer;}
    .checkbox-row:hover{background:rgba(26,82,118,.04);}
    .checkbox-row.checked{background:linear-gradient(135deg,#f0fdf4,#dcfce7);
      border:1px solid #86efac;}
    .checkbox-row input{width:20px;height:20px;margin-top:2px;
      accent-color:#1a5276;flex-shrink:0;cursor:pointer;}
    .checkbox-row label{cursor:pointer;line-height:1.5;}

    /* Ã¢ÂÂÃ¢ÂÂ Sign button Ã¢ÂÂÃ¢ÂÂ */
    .btn-sign-wrap{margin-top:28px;}
    .btn-sign{display:block;width:100%;padding:20px;
      background:linear-gradient(to right,#27ae60,#2ecc71);
      color:white;border:none;border-radius:14px;
      font-size:18px;font-weight:700;cursor:pointer;
      transition:all .25s;letter-spacing:.3px;
      font-family:'Inter',sans-serif;
      box-shadow:0 4px 16px rgba(39,174,96,.3);}
    .btn-sign:not(:disabled):hover{transform:translateY(-3px);
      box-shadow:0 12px 28px rgba(39,174,96,.4);}
    .btn-sign:disabled{background:linear-gradient(to right,#cbd5e1,#94a3b8);
      cursor:not-allowed;transform:none;box-shadow:none;}
    .btn-sign-sub{text-align:center;font-size:12px;color:#94a3b8;margin-top:10px;}

    /* Ã¢ÂÂÃ¢ÂÂ Spinner Ã¢ÂÂÃ¢ÂÂ */
    .spinner{display:none;text-align:center;padding:20px;}
    .spinner-ring{display:inline-block;width:40px;height:40px;
      border:4px solid rgba(26,82,118,.15);border-top-color:#1a5276;
      border-radius:50%;animation:spin .8s linear infinite;}
    @keyframes spin{to{transform:rotate(360deg);}}

    /* Ã¢ÂÂÃ¢ÂÂ Alert Ã¢ÂÂÃ¢ÂÂ */
    .alert{padding:14px 18px;border-radius:10px;margin:14px 0;font-size:14px;}
    .alert-danger{background:#fee2e2;color:#991b1b;border:1px solid #fecaca;}

    /* Ã¢ÂÂÃ¢ÂÂ Success overlay Ã¢ÂÂÃ¢ÂÂ */
    .success-overlay{display:none;text-align:center;padding:32px 20px;}
    .success-overlay .check{font-size:64px;margin-bottom:12px;}
    .success-overlay h4{color:#059669;font-size:20px;font-weight:700;margin-bottom:6px;}
    .success-overlay p{color:#64748b;font-size:14px;}

    /* Ã¢ÂÂÃ¢ÂÂ Footer Ã¢ÂÂÃ¢ÂÂ */
    .lease-footer{background:#0a1628;color:white;padding:28px 40px;
      border-radius:0 0 16px 16px;text-align:center;font-size:13px;}
    .lease-footer .footer-logo{font-family:'Playfair Display',serif;
      font-size:17px;margin-bottom:8px;}
    .lease-footer p{color:rgba(255,255,255,.5);font-size:12px;
      letter-spacing:.5px;margin-top:4px;}
    .lease-footer .tagline{font-style:italic;color:rgba(212,175,55,.7);
      font-size:11px;letter-spacing:1px;margin-top:8px;}

    @media(max-width:600px){
      .lease-body{padding:24px 20px;}
      .signature-section{padding:24px 20px;}
      .kv-table td:first-child{width:44%;}
      .sig-preview-name{font-size:32px;}
      .hdr-logo{font-size:24px;}
      .doc-ref-bar{font-size:11px;}
    }
    @keyframes fadeInUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
    @keyframes checkDraw{0%{transform:scale(0);}60%{transform:scale(1.2);}100%{transform:scale(1);}}
    .animate-in{animation:fadeInUp .4s ease forwards;}
  </style>
</head>
<body>
<div class="wrapper">

  <!-- HEADER -->
  <div class="lease-header">
    <div class="hdr-eyebrow">Choice Properties ÃÂ· Leasing Division</div>
    <div class="hdr-logo">Choice Properties</div>
    <div class="hdr-sub">Professional Property Management</div>
    <div class="hdr-divider"></div>
    <div class="hdr-title">Residential Lease Agreement</div>
    <div class="hdr-badges">
      <span class="hdr-badge">REF: ${appId}</span>
      <span class="hdr-badge">Ã°ÂÂÂ CONFIDENTIAL</span>
      <span class="hdr-badge">E-SIGN ACT COMPLIANT</span>
    </div>
  </div>

  <!-- Doc reference bar -->
  <div class="doc-ref-bar">
    <span>Document: CP-LEASE-${appId}</span>
    <span>Prepared: ${todayStr}</span>
    <span>Jurisdiction: State of ${jur.stateName}</span>
    <span>Prepared for: ${fullName} Ã¢ÂÂ Exclusively</span>
  </div>

  ${!isChoiceOwned ? `
  <div class="mgmt-notice">
    <strong>Ã°ÂÂÂ Management Notice:</strong> This property is owned by <strong>${landlordName}</strong> and managed by <strong>Choice Properties</strong> as the authorized management agent. All lease administration, communications, and tenant services are handled by Choice Properties on behalf of the property owner.
  </div>` : ''}

  <!-- LEASE BODY -->
  <div class="lease-body">

    <!-- Personalization notice -->
    <div class="personal-banner">
      Ã°ÂÂÂ This lease agreement was prepared exclusively for <strong>${fullName}</strong>
      and is linked to Application ID <strong>${appId}</strong>.
      Please read every section carefully before signing.
    </div>

    <!-- Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
         ARTICLE I Ã¢ÂÂ PARTIES TO THE AGREEMENT
    Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ -->
    <div class="article-header">Article I Ã¢ÂÂ Parties to the Agreement</div>
    <div class="section-title">Ã°ÂÂÂ Parties</div>
    <p class="clause">This Residential Lease Agreement ("Agreement" or "Lease") is entered into as of <b>${todayStr}</b>, by and between the following parties:</p>
    <ul style="margin:10px 0 20px 20px;font-size:14px;line-height:2;">
      <li><b>Landlord:</b> ${landlordName}${landlordAddr ? ', ' + landlordAddr : ''}</li>
      ${managedByLine}
      <li><b>Tenant(s):</b> ${fullName}</li>
      <li><b>Contact / Text:</b> ${phone} &nbsp;ÃÂ·&nbsp; ${email}</li>
    </ul>
    <p class="clause" style="font-size:13px;color:#555;">
      Where this Agreement refers to the "Landlord," it refers to <b>${landlordName}</b>.
      Where it refers to "Management" or "Choice Properties," it refers to Choice Properties acting as the authorized management agent responsible for day-to-day operations, communications, and administration on behalf of the Landlord.
    </p>

    <!-- Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
         ARTICLE II Ã¢ÂÂ PROPERTY & LEASE TERM
    Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ -->
    <div class="article-header">Article II Ã¢ÂÂ Property & Lease Term</div>
    <div class="section-title">Ã°ÂÂÂ  Rental Property & Term</div>
    <table class="kv-table">
      <tr><td>Rental Property Address</td><td><b>${property}</b></td></tr>
      ${unitType      ? `<tr><td>Unit Type</td><td>${unitType}</td></tr>` : ''}
      ${bedrooms      ? `<tr><td>Bedrooms</td><td>${bedrooms}</td></tr>` : ''}
      ${bathrooms     ? `<tr><td>Bathrooms</td><td>${bathrooms}</td></tr>` : ''}
      ${parkingSpace  ? `<tr><td>Parking Space</td><td>${parkingSpace}</td></tr>` : ''}
      <tr><td>Tenant(s)</td><td>${fullName}</td></tr>
      <tr><td>Lease Term</td><td>${term}</td></tr>
      <tr><td>Commencement Date</td><td><b>${startDate}</b></td></tr>
      <tr><td>${endDate === 'Month-to-Month Ã¢ÂÂ No Fixed Expiration' ? 'Tenancy Type' : 'Expiration Date'}</td><td><b>${endDate}</b></td></tr>
      <tr><td>Application ID</td><td>${appId}</td></tr>
      <tr><td>Authorized Occupants</td><td>${totalOccupants} person(s) Ã¢ÂÂ as listed in the rental application</td></tr>
    </table>
    <p class="clause" style="font-size:13px;color:#555;margin-top:12px;">
      The Tenant is granted the right to occupy the above-referenced property as a private residence for the duration of this Lease. Occupancy is limited to the person(s) listed in the approved rental application. Any additional occupant not listed must receive prior written approval from Management.
    </p>

    <!-- Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
         ARTICLE III Ã¢ÂÂ FINANCIAL TERMS
    Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ -->
    <div class="article-header">Article III Ã¢ÂÂ Financial Terms</div>
    <div class="section-title">Ã°ÂÂÂ° Rent, Deposit & Move-In Costs</div>
    <table class="kv-table">
      <tr><td>Monthly Rent</td><td><b>$${rent.toLocaleString()}.00</b></td></tr>
      <tr><td>Rent Due Date</td><td>${rentDueStr}</td></tr>
      <tr><td>Grace Period</td><td>${graceStr}</td></tr>
      <tr><td>Late Fee</td><td>${lateFeeStr}</td></tr>
      <tr><td>Returned Payment Fee</td><td>$35.00 for any returned check or failed electronic payment</td></tr>
      <tr><td>Security Deposit</td><td><b>$${deposit.toLocaleString()}.00</b></td></tr>
      ${holdingFeePaid ? `<tr><td>Holding Fee Credit</td><td style="color:#059669;"><b>Ã¢ÂÂ $${holdingFeeAmt.toLocaleString()}.00</b> (applied from holding deposit received)</td></tr>` : ''}
      ${holdingFeePending ? `<tr><td>Holding Fee (Pending)</td><td style="color:#b45309;"><b>$${holdingFeeAmt.toLocaleString()}.00</b> requested Ã¢ÂÂ credit will apply upon receipt</td></tr>` : ''}
      <tr><td>Total Due at Move-In</td><td><b>$${moveInCost.toLocaleString()}.00</b> (${holdingFeePaid ? 'first month\'s rent + security deposit Ã¢ÂÂ holding fee credit' : 'first month\'s rent + security deposit'})</td></tr>
    </table>

    <div class="highlight-box blue">
      <b>Ã°ÂÂÂ Move-In Payment:</b>${holdingFeePaid
        ? ` A holding deposit of <b>$${holdingFeeAmt.toLocaleString()}.00</b> was previously received and has been credited toward your move-in total. Your remaining balance due at move-in is <b>$${moveInCost.toLocaleString()}.00</b>. This must be paid in full prior to receiving keys.`
        : ` A total of <b>$${moveInCost.toLocaleString()}.00</b> is due in full prior to receiving keys and taking possession of the property. This amount covers your first month's rent ($${rent.toLocaleString()}) and security deposit ($${deposit.toLocaleString()}). No keys will be released until this payment is confirmed in writing by Management.`
      }
    </div>

    <!-- Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
         ARTICLE IV Ã¢ÂÂ TERMS & CONDITIONS
    Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ -->
    <div class="article-header">Article IV Ã¢ÂÂ Terms & Conditions</div>
    <div class="section-title">Ã°ÂÂÂ Lease Terms & Tenant Obligations</div>
    <ol class="clauses">

      <li>
        <b>1. Rent Payment.</b>
        Tenant agrees to pay $${rent.toLocaleString()}.00 per month, due on the ${rentDueStr}, payable to ${landlordName} via the payment method agreed upon with Management. Partial payments are not accepted unless expressly agreed to in writing. Rent not received by the ${graceLateDay}${graceDateSfx} of the month is considered late and subject to the late fees outlined in Article III.
      </li>

      <li>
        <b>2. Security Deposit.</b>
        A security deposit of $${deposit.toLocaleString()}.00 has been collected and is held in accordance with applicable ${jur.stateName} law. The deposit is not to be applied toward any month's rent by the Tenant. Upon move-out, the deposit will be returned within ${jur.depositReturnDays} days, less any lawful deductions for unpaid rent, damage beyond normal wear and tear, cleaning costs, or other lease violations. The Tenant will receive an itemized deduction statement if any amount is withheld.
      </li>

      <li>
        <b>3. Occupancy.</b>
        The property shall be used exclusively as a private residential dwelling. Occupancy is restricted to the person(s) named in the approved rental application (${fullName} and any approved co-occupants). No additional persons may reside at the property without prior written consent from Management. Subletting, short-term rentals (including Airbnb or similar platforms), or assignment of this Lease are strictly prohibited without written approval.
      </li>

      <li>
        <b>4. Pets.</b>
        ${hasPets === 'Yes' || hasPets === 'yes' || hasPets === 'true'
          ? `Tenant has disclosed the following pet(s) on the application: <em>${petDetails || 'details on file'}</em>. Pet terms are agreed in writing with Management prior to move-in and are incorporated into this Agreement.${petDeposit > 0 ? ` A non-refundable pet deposit of <b>$${petDeposit.toFixed(2)}</b> is required prior to move-in.` : ''}${monthlyPetRent > 0 ? ` Monthly pet rent of <b>$${monthlyPetRent.toFixed(2)}</b> is due with each monthly rent payment.` : ''} Unauthorized pets may result in additional fees and/or lease termination. Tenant is responsible for all damage, odors, or liability caused by any pet.`
          : `No pets are permitted at the property without prior written approval from Management. Discovery of an unauthorized pet may result in immediate lease termination proceedings and any applicable cleaning or remediation fees charged to the Tenant.`
        }
      </li>

      <li>
        <b>5. Maintenance & Property Condition.</b>
        Tenant shall maintain the premises in a clean, sanitary, and safe condition at all times. Tenant shall promptly notify Management in writing of any needed repairs, water leaks, mold, or hazardous conditions. Tenant is responsible for all damage caused by negligence, misuse, or failure to report a known issue in a timely manner. Reasonable wear and tear is expected and accepted; damage beyond this standard will be deducted from the security deposit or billed to the Tenant.
      </li>

      <li>
        <b>6. Alterations & Improvements.</b>
        Tenant shall not make any alterations, improvements, modifications, or additions to the property Ã¢ÂÂ including painting, installing fixtures, removing hardware, or modifying utilities Ã¢ÂÂ without prior written consent from Management. Any approved alterations become the property of the Landlord upon move-out, unless otherwise agreed in writing. Unauthorized alterations must be restored to the original condition at Tenant's expense.
      </li>

      <li>
        <b>7. Right of Entry.</b>
        Management and/or the Landlord may enter the premises with at least 24 hours' advance written notice for purposes including but not limited to inspections, repairs, maintenance, and showing the unit to prospective tenants or buyers. In the event of an emergency Ã¢ÂÂ including fire, flood, gas leak, or a threat to health and safety Ã¢ÂÂ entry may be made without prior notice. Tenant shall not unreasonably withhold consent to entry.
      </li>

      <li>
        <b>8. Utilities & Services.</b>
        ${utilitiesNote}
      </li>

      <li>
        <b>9. Smoking & Controlled Substances.</b>
        ${smoker === 'Yes' || smoker === 'yes'
          ? `Smoking has been disclosed by the Tenant. Any smoking is strictly limited to designated outdoor areas only, as identified by Management. Smoking inside the unit, in common areas, hallways, or within 25 feet of building entrances is strictly prohibited.`
          : `Smoking of any substance Ã¢ÂÂ including cigarettes, cigars, e-cigarettes, vaporizers, marijuana, or any other product Ã¢ÂÂ is strictly prohibited inside the property and in all common areas. Violation of this clause may result in lease termination and cleaning or remediation costs deducted from the deposit.`
        }
        Use, possession, or distribution of illegal controlled substances on the premises is grounds for immediate lease termination.
      </li>

      <li>
        <b>10. Noise & Nuisance.</b>
        Tenant agrees to maintain a reasonable level of quiet and shall not engage in activities that unreasonably disturb neighbors or other residents. Quiet hours are observed from 10:00 PM to 8:00 AM daily. Tenant shall not engage in any activity that constitutes a nuisance, creates a public disturbance, or violates any applicable noise ordinance. Repeated substantiated complaints may be treated as a material lease violation.
      </li>

      <li>
        <b>11. Parking.</b>
        Tenant may park only in designated spaces assigned by Management. No commercial vehicles, recreational vehicles, boats, inoperable vehicles, or trailers may be stored on the property without prior written authorization. Unauthorized vehicles are subject to towing at the vehicle owner's expense.
      </li>

      <li>
        <b>12. Trash & Recycling.</b>
        Tenant is responsible for proper disposal of all trash and recycling in accordance with local municipal guidelines. Trash must be placed in designated containers and set out only on scheduled collection days. Improper disposal, hoarding of debris, or infestation resulting from unsanitary conditions will be treated as a lease violation.
      </li>

      <li>
        <b>13. Renter's Insurance.</b>
        Tenant is required to obtain a renter's insurance policy prior to move-in and maintain it in full force and effect throughout the entire lease term. Proof of coverage may be requested by Management at any time. The Landlord's property insurance does not cover Tenant's personal belongings, liability, or losses resulting from theft, fire, water damage, or other events. Choice Properties is not responsible for the loss, damage, or theft of any of Tenant's personal property.
      </li>

      <li>
        <b>14. Lease Renewal & Termination.</b>
        ${endDate === 'Month-to-Month Ã¢ÂÂ No Fixed Expiration'
          ? `This is a month-to-month tenancy with no fixed expiration date. Either party may terminate this tenancy by providing at least ${jur.mtmNoticeDays} days' prior written notice to the other party. Month-to-month rent is subject to adjustment with ${jur.mtmNoticeDays} days' written notice from Management.`
          : `This Lease shall expire on the date listed in Article II. If neither party provides written notice at least ${jur.earlyTermNoticeDays} days prior to the expiration date, the Lease will automatically convert to a month-to-month tenancy under the same terms. Month-to-month rent is subject to adjustment with ${jur.mtmNoticeDays} days' written notice from Management. Either party may terminate a month-to-month tenancy with ${jur.mtmNoticeDays} days' written notice.`
        }
      </li>

      <li>
        <b>15. Early Termination.</b>
        ${endDate === 'Month-to-Month Ã¢ÂÂ No Fixed Expiration'
          ? `Either party may terminate this month-to-month tenancy by providing a minimum of ${jur.mtmNoticeDays} days' written notice. Notice must be submitted in writing to choicepropertygroup@hotmail.com or via text to 707-706-3137. Termination does not relieve Tenant of any outstanding financial obligations accrued prior to the termination date.`
          : `Tenant may terminate this Lease prior to the expiration date by providing a minimum of ${jur.earlyTermNoticeDays} days' written notice to Management and paying an early termination fee equal to two (2) months' rent, unless a different arrangement is agreed upon in writing. Notice must be submitted in writing to choicepropertygroup@hotmail.com or via text to 707-706-3137. Early termination does not relieve the Tenant of any outstanding financial obligations.`
        }
      </li>

      <li>
        <b>16. Move-Out Notice & Condition.</b>
        Tenant must provide a minimum of ${jur.moveOutNoticeDays} days' written notice prior to vacating at end of term or month-to-month. Upon vacating, Tenant must leave the property in the same condition as received, accounting for normal wear and tear. A move-out walkthrough inspection will be conducted. Tenant is encouraged to request a pre-move-out inspection at least 7 days prior to the move-out date to identify and correct issues before final inspection.
      </li>

      <li>
        <b>17. Default & Remedies.</b>
        Failure to pay rent when due, material breach of any term of this Agreement, or violation of any applicable law or ordinance constitutes a default. In the event of default, Management may, in accordance with ${jur.stateName} law, issue a notice to cure or vacate, initiate eviction proceedings, and/or pursue any other remedies available at law or in equity. Tenant shall be liable for all court costs, attorney fees, and damages incurred as a result of a default.
      </li>

      <li>
        <b>18. Abandonment.</b>
        If Tenant vacates the property prior to the end of the lease term without providing proper written notice and without surrendering the keys, Management may treat the property as abandoned after 7 days of confirmed absence, provided rent is unpaid. Management may then re-enter the premises, remove any personal property per ${jur.stateName} law, and re-rent the unit. Tenant remains liable for rent through the end of the lease term or until the unit is re-rented, whichever occurs first.
      </li>

      <li>
        <b>19. Hazardous Materials.</b>
        Tenant shall not store, use, or dispose of any hazardous, toxic, flammable, or explosive materials on the premises in a manner inconsistent with normal residential use. Tenant shall comply with all applicable laws governing waste disposal and shall immediately notify Management of any known hazardous condition.
      </li>

      <li>
        <b>20. Lead Paint Disclosure (Pre-1978 Properties).</b>
        Tenant has been informed that properties built prior to 1978 may contain lead-based paint and lead-based paint hazards. Tenant should inquire with Management about the year of construction prior to move-in and is encouraged to conduct their own independent investigation. The Landlord's property insurance does not cover lead-related personal injury claims. Tenant is advised to seek information from the U.S. Environmental Protection Agency (EPA) regarding lead-based paint hazards if concerned.
      </li>

      <li>
        <b>21. Management Contact & Notices.</b>
        All notices, requests, and communications under this Lease must be directed to Choice Properties as the authorized management agent. Formal written notices should be sent to: <b>choicepropertygroup@hotmail.com</b> or <b>2265 Livernois, Suite 500, Troy, MI 48083</b>. For day-to-day matters, text 707-706-3137 (text only). Notices are deemed received on the date sent by email (with delivery confirmation) or the date deposited with the U.S. Postal Service if mailed.
      </li>

      <li>
        <b>22. Joint & Several Liability.</b>
        If this Lease is entered into by more than one Tenant, all Tenants are jointly and severally liable for all obligations under this Agreement, including payment of rent and compliance with all terms. The actions of one Tenant are binding upon all Tenants. Management may proceed against any one or all Tenants in the event of a default.
      </li>

      <li>
        <b>23. Governing Law & Jurisdiction.</b>
        This Agreement shall be governed by and construed in accordance with the laws of the State of ${jur.stateName}. Any disputes arising under this Agreement shall be subject to the exclusive jurisdiction of the courts of ${jur.county}, ${jur.stateName}, unless otherwise required by law.
      </li>

      <li>
        <b>24. Severability.</b>
        If any provision of this Agreement is found to be invalid, illegal, or unenforceable under applicable law, the remaining provisions of this Agreement shall continue in full force and effect.
      </li>

      <li>
        <b>25. Entire Agreement & Modifications.</b>
        This Agreement, together with any signed addenda (Pet Addendum, Parking Addendum, etc.), constitutes the entire agreement between the parties with respect to the rental of the above-referenced property and supersedes all prior verbal or written representations, understandings, and negotiations. No modification of this Agreement shall be valid unless made in writing and signed by both Management and the Tenant.
      </li>

    </ol>

    <!-- Legal notice -->
    <div class="highlight-box slate">
      <b>Ã¢ÂÂÃ¯Â¸Â Electronic Signature Legal Notice:</b> By signing below, you confirm that you have read, understood, and agreed to all 25 articles and provisions of this Residential Lease Agreement. Your electronic signature is legally binding under the <em>${eSignText}</em>. Your full legal name, IP address, and timestamp will be permanently recorded as part of the execution record of this Agreement.
    </div>

    <!-- Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
         MANAGEMENT COUNTERSIGNATURE BLOCK
    Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ -->
    <div style="margin:32px 0;padding:24px 28px;border:1px solid #cbd5e1;border-radius:10px;background:#f8fafc;">
      <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#64748b;margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid #e2e8f0;">
        Management Countersignature
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px 32px;margin-bottom:16px;">
        <div>
          <div style="font-size:11px;color:#94a3b8;margin-bottom:4px;">For and on behalf of</div>
          <div style="font-size:14px;font-weight:600;color:#1e293b;">${landlordName}</div>
          <div style="font-size:12px;color:#64748b;">By its authorized management agent, Choice Properties</div>
        </div>
        <div>
          <div style="font-size:11px;color:#94a3b8;margin-bottom:4px;">Title</div>
          <div style="font-size:14px;font-weight:600;color:#1e293b;">Authorized Leasing Agent</div>
          <div style="font-size:12px;color:#64748b;">Choice Properties</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px 32px;margin-top:8px;">
        <div>
          <div style="font-size:11px;color:#94a3b8;margin-bottom:6px;">Signature</div>
          <div style="height:44px;border-bottom:2px solid #94a3b8;display:flex;align-items:flex-end;padding-bottom:4px;">
            <span style="font-size:11px;color:#94a3b8;font-style:italic;">Awaiting management countersignature</span>
          </div>
        </div>
        <div>
          <div style="font-size:11px;color:#94a3b8;margin-bottom:6px;">Date</div>
          <div style="height:44px;border-bottom:2px solid #94a3b8;"></div>
        </div>
      </div>
      <div style="margin-top:14px;font-size:12px;color:#64748b;background:#f1f5f9;padding:10px 14px;border-radius:6px;">
        Ã°ÂÂÂ This lease becomes fully executed upon management countersignature. You will receive a confirmation email once both parties have signed.
      </div>
    </div>

    <!-- Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
         E-SIGNATURE BLOCK
    Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ -->
    <div class="signature-section" id="signatureSection">

      <div class="sig-section-header">
        <div class="sig-icon-wrap">Ã¢ÂÂÃ¯Â¸Â</div>
        <div>
          <h3>Electronic Signature</h3>
          <p>Complete all steps below to execute this lease agreement</p>
        </div>
      </div>

      <!-- Step progress -->
      <div class="sig-steps" id="sigSteps">
        <div class="sig-step active" id="step1"><span class="sig-step-num">1</span>Sign</div>
        <div class="sig-step"        id="step2"><span class="sig-step-num">2</span>Confirm</div>
        <div class="sig-step"        id="step3"><span class="sig-step-num">3</span>Execute</div>
      </div>

      <div id="alertArea"></div>

        <!-- Phase 10: E-signature legal notice -->
        <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:16px 20px;margin-bottom:20px;">
          <h4 style="font-size:14px;font-weight:700;color:#0c4a6e;margin:0 0 8px;display:flex;align-items:center;gap:8px;"><i class="fas fa-gavel" style="color:#0284c7;"></i> Legally Binding Electronic Signature</h4>
          <p style="font-size:13px;color:#0c4a6e;line-height:1.6;margin:0 0 10px;">By signing below, you agree that your electronic signature is legally binding and has the same effect as a handwritten signature, pursuant to the federal Electronic Signatures in Global and National Commerce Act (ESIGN Act, 15 U.S.C. ÃÂ§ 7001) and applicable state law.</p>
          <p style="font-size:12px;color:#0369a1;margin:0;"><strong>Please read the full lease agreement above carefully before signing.</strong> By signing, you confirm that you have read, understood, and agree to be bound by all terms of the lease.</p>
          <div style="margin-top:12px;">
            <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;font-size:13px;color:#0c4a6e;line-height:1.5;">
              <input type="checkbox" id="leaseReadConfirm" required style="margin-top:3px;flex-shrink:0;" onchange="document.getElementById('btnNext1').disabled = !this.checked;">
              <span>I have read and understand the lease agreement above, and I agree to be legally bound by its terms.</span>
            </label>
          </div>
        </div>

        <!-- Step 1: Signature input -->
      <div id="step1Panel">
<!-- Email verification — identity check before signature -->
        <div id="step1Panel_emailVerif" style="margin-bottom:20px;">
          <label class="sig-label">Confirm Your Email Address
            <span style="font-weight:400;color:#64748b;font-size:12px;margin-left:6px;">
              — must match the email on your application
            </span>
          </label>
          <input type="email"
                 id="signerEmail"
                 class="sig-input"
                 placeholder="e.g. jane@example.com"
                 autocomplete="email"
                 style="font-size:15px;letter-spacing:normal;font-family:sans-serif;">
        </div>
        <!-- Signature input -->
        <label class="sig-label">Your Full Legal Name
          <span style="font-weight:400;color:#64748b;font-size:12px;margin-left:6px;">
            Ã¢ÂÂ Type exactly as it appears on your government-issued ID
          </span>
        </label>
        <input type="text"
               id="tenantSignature"
               class="sig-input"
               placeholder="e.g. John Michael Smith"
               autocomplete="off"
               spellcheck="false"
               oninput="onSigInput(this)">

        <!-- Live signature preview -->
        <div class="sig-preview-wrap" id="previewWrap">
          <div class="sig-preview-label">
            <span>Live Signature Preview</span>
            <span>Rendered using legal cursive font</span>
          </div>
          <div class="sig-preview-line">
            <div class="sig-preview-name empty" id="sigPreviewName">
              Your signature will appear here...
            </div>
          </div>
          <div class="sig-preview-footer">
            <span>Signed by: <span id="previewSigName">Ã¢ÂÂ</span></span>
            <span>Date: ${todayStr}</span>
            <span>Ref: ${appId}</span>
          </div>
        </div>

        <!-- Legal / IP badge -->
        <div class="legal-badge" id="legalBadge">
          <span class="legal-badge-icon">Ã°ÂÂÂ</span>
          <span id="legalBadgeText">Detecting your session details for the execution record...</span>
        </div>
      </div>

      <!-- Step 2: Confirmation checkboxes -->
      <div class="checkbox-group" id="step2Panel" style="margin-top:24px;">
        <div class="checkbox-row" id="row1" onclick="toggleCheck('agreeTerms','row1')">
          <input type="checkbox" id="agreeTerms" onchange="validateSignatureForm()">
          <label for="agreeTerms">I have read and agree to all 25 provisions of this Residential Lease Agreement, including all financial terms, occupancy rules, and my obligations as Tenant.</label>
        </div>
        <div class="checkbox-row" id="row2" onclick="toggleCheck('agreeBinding','row2')">
          <input type="checkbox" id="agreeBinding" onchange="validateSignatureForm()">
          <label for="agreeBinding">I understand this electronic signature is legally binding under the ${eSignShort}, and has the same legal effect as a handwritten signature.</label>
        </div>
        <div class="checkbox-row" id="row3" onclick="toggleCheck('agreeFinancial','row3')">
          <input type="checkbox" id="agreeFinancial" onchange="validateSignatureForm()">
          <label for="agreeFinancial">I agree to pay the move-in total of <b>$${moveInCost.toLocaleString()}.00</b> prior to taking possession${holdingFeePaid ? ` (after holding fee credit of $${holdingFeeAmt.toLocaleString()}.00)` : ''}, and monthly rent of <b>$${rent.toLocaleString()}.00</b> on the ${rentDueDay}${rentDueSuffix} of each month as outlined in Article III.</label>
        </div>
        <div class="checkbox-row" id="row4" onclick="toggleCheck('agreeOwnership','row4')">
          <input type="checkbox" id="agreeOwnership" onchange="validateSignatureForm()">
          <label for="agreeOwnership">I understand that <b>${landlordName}</b> is the Landlord for this property${!isChoiceOwned ? ', and that Choice Properties is acting as the authorized management agent on their behalf' : ''}, and that Choice Properties will handle all communications, maintenance requests, and rent collection.</label>
        </div>
        <div class="checkbox-row" id="row5" onclick="toggleCheck('agreeInsurance','row5')">
          <input type="checkbox" id="agreeInsurance" onchange="validateSignatureForm()">
          <label for="agreeInsurance">I confirm that I will obtain and maintain a renter's insurance policy for the full duration of this lease term, as required by Clause 13, and will provide proof of coverage upon request.</label>
        </div>
      </div>

      <!-- Step 3: Submit -->
      <div class="btn-sign-wrap" id="step3Panel">
        <div class="spinner" id="sigSpinner">
          <div class="spinner-ring"></div>
          <p style="margin-top:12px;color:#1a5276;font-size:14px;font-weight:600;">
            Securing your signature...<br>
            <span style="font-size:12px;font-weight:400;color:#94a3b8;">Please do not close this page</span>
          </p>
        </div>
        <button class="btn-sign" id="signBtn" disabled onclick="submitSignature()">
          Ã¢ÂÂÃ¯Â¸Â Execute Lease Agreement
        </button>
        <div class="btn-sign-sub" id="signBtnSub">
          Complete your name and all 5 checkboxes to activate
        </div>
      </div>

      <!-- Inline success state -->
      <div class="success-overlay" id="successOverlay">
        <div class="check" style="animation:checkDraw .5s ease;">Ã¢ÂÂ</div>
        <h4>Signature Accepted!</h4>
        <p>Redirecting you to your confirmation page...</p>
      </div>

      <p style="font-size:12px;color:#95a5a6;text-align:center;margin-top:20px;padding-top:16px;border-top:1px solid #f1f5f9;">
        Executed on: <strong>${todayStr}</strong> &nbsp;ÃÂ·&nbsp; Application ID: <strong>${appId}</strong>
      </p>
    </div>

  </div><!-- /lease-body -->

  <!-- FOOTER -->
  <div class="lease-footer">
    <div class="footer-logo">Choice Properties</div>
    <p>2265 Livernois, Suite 500 &nbsp;ÃÂ·&nbsp; Troy, MI 48083<br>
    Ã°ÂÂÂ± 707-706-3137 &nbsp;ÃÂ·&nbsp; choicepropertygroup@hotmail.com</p>
    <div class="tagline">Your trust is our standard.</div>
  </div>

</div><!-- /wrapper -->

<script>
  const APP_ID    = '${appId}';
  const BASE_URL  = '${baseUrl}';
  const APP_EMAIL = '${app['Email']}'; // pre-filled from server for identity verification
  let   capturedIP = '';
  let   allChecked = false;

  // 1. Capture IP
  (function captureIP() {
    const badge = document.getElementById('legalBadgeText');
    fetch('https://api.ipify.org?format=json', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        capturedIP = d.ip || 'unavailable';
        badge.textContent =
          'Ã°ÂÂÂ Session verified Ã¢ÂÂ IP: ' + capturedIP +
          ' ÃÂ· Your signature and this session will be permanently recorded in the execution record.';
      })
      .catch(() => {
        capturedIP = 'unavailable';
        badge.textContent =
          'Ã°ÂÂÂ Your signature, date, and timestamp will be permanently recorded in the legal execution record.';
      });
  })();

  // 2. Live preview
  function onSigInput(input) {
    const val     = input.value;
    const preview = document.getElementById('sigPreviewName');
    const footer  = document.getElementById('previewSigName');
    if (val.trim().length > 0) {
      preview.textContent = val;
      preview.className   = 'sig-preview-name';
      footer.textContent  = val;
      input.className     = 'sig-input has-value';
    } else {
      preview.textContent = 'Your signature will appear here...';
      preview.className   = 'sig-preview-name empty';
      footer.textContent  = 'Ã¢ÂÂ';
      input.className     = 'sig-input';
    }
    validateSignatureForm();
  }

  // 3. Checkbox toggle + step progress
  function toggleCheck(cbId, rowId) {
    const cb  = document.getElementById(cbId);
    const row = document.getElementById(rowId);
    cb.checked = !cb.checked;
    row.classList.toggle('checked', cb.checked);
    validateSignatureForm();
  }

  function validateSignatureForm() {
    const sig       = document.getElementById('tenantSignature').value.trim();
    const terms     = document.getElementById('agreeTerms').checked;
    const binding   = document.getElementById('agreeBinding').checked;
    const financial = document.getElementById('agreeFinancial').checked;
    const ownership = document.getElementById('agreeOwnership').checked;
    const insurance = document.getElementById('agreeInsurance').checked;
    const btn       = document.getElementById('signBtn');
    const sub       = document.getElementById('signBtnSub');
    allChecked = terms && binding && financial && ownership && insurance;

    // Step indicators
    document.getElementById('step1').className =
      'sig-step ' + (sig.length >= 3 ? 'done' : 'active');
    document.getElementById('step2').className =
      'sig-step ' + (sig.length < 3 ? '' : allChecked ? 'done' : 'active');
    document.getElementById('step3').className =
      'sig-step ' + (sig.length >= 3 && allChecked ? 'active' : '');

    const ready = sig.length >= 3 && allChecked;
    btn.disabled = !ready;
    if (ready) {
      sub.textContent = 'Click to execute this lease with your electronic signature';
      sub.style.color = '#059669';
    } else {
      const missing = [];
      if (sig.length < 3)  missing.push('your full legal name');
      if (!terms)          missing.push('terms agreement');
      if (!binding)        missing.push('binding acknowledgment');
      if (!financial)      missing.push('financial agreement');
      if (!ownership)      missing.push('ownership acknowledgment');
      if (!insurance)      missing.push('renter\'s insurance confirmation');
      sub.textContent = 'Still needed: ' + missing.join(' ÃÂ· ');
      sub.style.color = '#94a3b8';
    }
  }

  // 4. Submit
  async function submitSignature() {
    const sig = document.getElementById('tenantSignature').value.trim();
    if (sig.length < 3) { showAlert('Please enter your full legal name.', 'danger'); return; }

    if (!capturedIP) {
      try {
        const r = await fetch('https://api.ipify.org?format=json', { cache: 'no-store' });
        const d = await r.json();
        capturedIP = d.ip || 'unavailable';
      } catch(e) { capturedIP = 'unavailable'; }
    }

    const signerEmail = (document.getElementById('signerEmail')?.value || '').trim().toLowerCase();
      if (!signerEmail || !signerEmail.includes('@')) {
        showAlert('Please enter your email address to verify your identity.', 'danger');
        return;
      }
      const insuranceAgreed = document.getElementById('agreeInsurance').checked;
    const btn = document.getElementById('signBtn');
    btn.disabled = true;
    btn.textContent = 'Ã¢ÂÂ³ Securing signature...';
    document.getElementById('sigSpinner').style.display = 'block';
    document.getElementById('tenantSignature').disabled = true;
    ['agreeTerms','agreeBinding','agreeFinancial','agreeOwnership','agreeInsurance'].forEach(id => {
      document.getElementById(id).disabled = true;
    });
    clearAlert();

    google.script.run
      .withSuccessHandler(function(result) {
        document.getElementById('sigSpinner').style.display = 'none';
        if (result.success) {
          document.getElementById('step3Panel').style.display = 'none';
          document.getElementById('step1Panel').style.display = 'none';
          document.getElementById('step2Panel').style.display = 'none';
          document.getElementById('sigSteps').style.display  = 'none';
          document.getElementById('successOverlay').style.display = 'block';
          ['step1','step2','step3'].forEach(id => {
            document.getElementById(id).className = 'sig-step done';
          });
          setTimeout(function() {
            window.location.href = BASE_URL + '?path=lease_confirm&id=' + APP_ID;
          }, 1800);
        } else {
          document.getElementById('sigSpinner').style.display = 'none';
          btn.disabled = false;
          btn.textContent = 'Ã¢ÂÂÃ¯Â¸Â Execute Lease Agreement';
          document.getElementById('tenantSignature').disabled = false;
          ['agreeTerms','agreeBinding','agreeFinancial','agreeOwnership','agreeInsurance'].forEach(id => {
            document.getElementById(id).disabled = false;
          });
          showAlert('Ã¢ÂÂ Ã¯Â¸Â ' + result.error, 'danger');
        }
      })
      .withFailureHandler(function(err) {
        document.getElementById('sigSpinner').style.display = 'none';
        btn.disabled = false;
        btn.textContent = 'Ã¢ÂÂÃ¯Â¸Â Execute Lease Agreement';
        document.getElementById('tenantSignature').disabled = false;
        ['agreeTerms','agreeBinding','agreeFinancial','agreeOwnership','agreeInsurance'].forEach(id => {
          document.getElementById(id).disabled = false;
        });
        showAlert('Submission failed. Please try again or text us at 707-706-3137.', 'danger');
      })
      .signLease(APP_ID, sig, capturedIP, insuranceAgreed, signerEmail);
  }

  function showAlert(msg, type) {
    const el = document.getElementById('alertArea');
    el.innerHTML = '<div class="alert alert-' + type + ' animate-in">' + msg + '</div>';
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function clearAlert() {
    document.getElementById('alertArea').innerHTML = '';
  }
</script>
</body>
</html>
  `).setTitle('Lease Agreement - Choice Properties');
}



// ============================================================
// renderLeaseConfirmPage()  Ã¢ÂÂ  ?path=lease_confirm&id=APP_ID
// Shown after tenant successfully signs
// ============================================================
function renderLeaseConfirmPage(appId) {
  const result = getApplication(appId);
  const app    = result.success ? result.application : {};
  const firstName = app['First Name'] || 'Tenant';
  const property  = app['Property Address'] || '';
  const rent      = app['Monthly Rent']      || '';
  const startDate = app['Lease Start Date']  || '';
  const baseUrl   = ScriptApp.getService().getUrl();
  const dashLink  = baseUrl + '?path=dashboard&id=' + appId;

  return HtmlService.createHtmlOutput(`
<!DOCTYPE html>
<html>
<head>
  <title>Lease Signed - Choice Properties</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{background:linear-gradient(135deg,#d4edda 0%,#e8f4ec 100%);min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:'Segoe UI',sans-serif;padding:20px;}
    .card{background:white;border-radius:24px;padding:50px 40px;max-width:560px;width:100%;box-shadow:0 20px 50px rgba(0,0,0,.12);text-align:center;}
    .check-icon{font-size:80px;margin-bottom:16px;}
    h1{color:#27ae60;font-size:28px;font-weight:700;margin-bottom:8px;}
    .subtitle{color:#5f6b7a;font-size:16px;margin-bottom:30px;}
    .detail-box{background:#f8f9fb;border-radius:12px;padding:20px;margin:20px 0;text-align:left;}
    .detail-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed #dde3ea;font-size:14px;}
    .detail-row:last-child{border-bottom:none;}
    .detail-label{color:#7f8c8d;font-weight:500;}
    .detail-value{color:#2c3e50;font-weight:600;}
    .next-steps{background:#e8f4fc;border-left:4px solid #3498db;border-radius:10px;padding:18px 22px;text-align:left;margin:20px 0;}
    .next-steps h4{color:#1a5276;margin-bottom:10px;font-size:15px;}
    .next-steps li{color:#2c3e50;font-size:14px;margin-bottom:8px;}
    .btn{display:inline-block;padding:14px 32px;border-radius:50px;font-size:16px;font-weight:600;text-decoration:none;transition:all .2s;margin:8px 6px;}
    .btn-primary{background:linear-gradient(to right,#1a5276,#3498db);color:white;}
    .btn-secondary{background:white;color:#2c3e50;border:1px solid #dde3ea;}
    .btn:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(0,0,0,.1);}
    .contact{margin-top:24px;padding-top:24px;border-top:1px solid #eee;font-size:13px;color:#95a5a6;}
    .print-note{font-size:12px;color:#95a5a6;margin-top:6px;}
    @media print{
      body{background:white !important;}
      .btn,.contact,.print-note{display:none !important;}
      .card{box-shadow:none !important;border:1px solid #ccc;padding:30px 24px;}
      .next-steps,.detail-box{break-inside:avoid;}
      h1{color:#1a5276 !important;}
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="check-icon">Ã°ÂÂÂ</div>
    <h1>Lease Signed!</h1>
    <p class="subtitle">Welcome to Choice Properties, ${firstName}. Your lease is now fully executed.</p>

    <div class="detail-box">
      <div class="detail-row"><span class="detail-label">Property</span><span class="detail-value">${property}</span></div>
      <div class="detail-row"><span class="detail-label">Move-in Date</span><span class="detail-value">${startDate}</span></div>
      <div class="detail-row"><span class="detail-label">Monthly Rent</span><span class="detail-value">$${rent}</span></div>
      <div class="detail-row"><span class="detail-label">Application ID</span><span class="detail-value">${appId}</span></div>
    </div>

    <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:16px 20px;margin:16px 0;text-align:left;">
      <div style="font-size:13px;font-weight:700;color:#92400e;margin-bottom:6px;">Ã¢ÂÂ³ Management Countersignature Pending</div>
      <p style="font-size:13px;color:#78350f;line-height:1.6;">Your signature has been recorded. This lease becomes fully executed once a Choice Properties representative countersigns. You will receive a follow-up email when the countersignature is complete.</p>
    </div>

    <div class="next-steps">
      <h4>Ã°ÂÂÂ What Happens Next</h4>
      <ul style="padding-left:18px;">
        <li>A confirmation email has been sent to you with your lease details.</li>
        <li>Choice Properties will countersign your lease to fully execute the agreement.</li>
        <li>Our team will contact you to confirm your move-in date and collect move-in payment.</li>
        <li>You'll receive key handoff instructions closer to your move-in date.</li>
        <li>Save our number: <strong>707-706-3137</strong> Ã¢ÂÂ text us anytime.</li>
      </ul>
    </div>

    <a href="${dashLink}" class="btn btn-primary">Ã°ÂÂÂ View My Dashboard</a>
    <a href="javascript:window.print()" class="btn btn-secondary">Ã°ÂÂÂ¨Ã¯Â¸Â Save or Print Your Lease (PDF)</a>
    <p class="print-note">Click Print in your browser, then choose "Save as PDF" to save a copy for your records.</p>

    <div class="contact">
      Questions? Text us at <strong>707-706-3137</strong> or email choicepropertygroup@hotmail.com
    </div>
  </div>
</body>
</html>
  `).setTitle('Lease Signed - Choice Properties');
}

// ============================================================
// Email Templates  (all original + 2 new lease templates)
// ============================================================
// ============================================================
// EMAIL TEMPLATES Ã¢ÂÂ Choice Properties
// Tone: Luxury ÃÂ· Nationwide ÃÂ· Trusted ÃÂ· Professional
// Brand sign-off: Choice Properties Leasing Team
// Tagline: Your trust is our standard.
// ============================================================

// Ã¢ÂÂÃ¢ÂÂ Shared CSS injected into every email Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
// Design philosophy: clean, minimal, dark-mode safe.
// No dark backgrounds. No colored background boxes.
// Pure white body. Black text. Color only via borders & text.
// Every element readable on light AND dark email clients.
const EMAIL_BASE_CSS = `
  * { margin:0; padding:0; box-sizing:border-box; }
  body { margin:0; padding:0; background:#f4f4f4; font-family:Arial,Helvetica,sans-serif; -webkit-font-smoothing:antialiased; color:#1a1a1a; }
  .email-wrapper { max-width:600px; margin:24px auto; background:#ffffff; border:1px solid #e0e0e0; border-radius:4px; overflow:hidden; }

  /* Ã¢ÂÂÃ¢ÂÂ Header Ã¢ÂÂ white bg, dark text, blue accent bar only Ã¢ÂÂÃ¢ÂÂ */
  .email-header { background:#ffffff; padding:32px 40px 24px; border-bottom:3px solid #1a5276; }
  .header-brand { font-size:20px; font-weight:700; color:#1a1a1a; letter-spacing:0.3px; margin-bottom:3px; }
  .header-sub   { font-size:12px; color:#666666; margin-bottom:14px; }
  .header-title { font-size:22px; font-weight:700; color:#1a1a1a; line-height:1.3; margin-bottom:8px; }
  .header-ref   { font-size:12px; color:#888888; font-family:monospace; }

  /* Ã¢ÂÂÃ¢ÂÂ Status line Ã¢ÂÂ colored text only, no background Ã¢ÂÂÃ¢ÂÂ */
  .status-line { padding:12px 40px; font-size:13px; font-weight:600; border-bottom:1px solid #e8e8e8; }
  .status-pending  { color:#b45309; }
  .status-paid     { color:#166534; }
  .status-approved { color:#166534; }
  .status-denied   { color:#991b1b; }
  .status-lease    { color:#1e40af; }

  /* Ã¢ÂÂÃ¢ÂÂ Body Ã¢ÂÂÃ¢ÂÂ */
  .email-body { padding:36px 40px; }
  .greeting   { font-size:16px; font-weight:600; color:#1a1a1a; margin-bottom:16px; }
  .intro-text { font-size:14px; color:#444444; line-height:1.7; margin-bottom:28px; }

  /* Ã¢ÂÂÃ¢ÂÂ Section Ã¢ÂÂÃ¢ÂÂ */
  .section { margin-bottom:28px; }
  .section-label { font-size:11px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:#888888; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid #e8e8e8; }

  /* Ã¢ÂÂÃ¢ÂÂ Info table Ã¢ÂÂ no background shading Ã¢ÂÂÃ¢ÂÂ */
  .info-table { width:100%; border-collapse:collapse; }
  .info-table tr td { padding:10px 0; font-size:14px; vertical-align:top; border-bottom:1px solid #f0f0f0; }
  .info-table tr:last-child td { border-bottom:none; }
  .info-table td:first-child { width:42%; font-weight:600; color:#555555; padding-right:12px; }
  .info-table td:last-child  { color:#1a1a1a; }

  /* Ã¢ÂÂÃ¢ÂÂ Callout box Ã¢ÂÂ border-left only, white bg Ã¢ÂÂÃ¢ÂÂ */
  .callout { border-left:3px solid #1a5276; padding:14px 18px; margin:20px 0; background:#ffffff; }
  .callout.green  { border-color:#166534; }
  .callout.amber  { border-color:#b45309; }
  .callout.red    { border-color:#991b1b; }
  .callout h4 { font-size:13px; font-weight:700; color:#1a1a1a; margin-bottom:6px; }
  .callout p  { font-size:13px; color:#444444; line-height:1.65; }

  /* Ã¢ÂÂÃ¢ÂÂ Steps list Ã¢ÂÂÃ¢ÂÂ */
  .steps-list { list-style:none; margin:0; padding:0; }
  .steps-list li { display:flex; align-items:flex-start; gap:14px; padding:11px 0; border-bottom:1px solid #f0f0f0; font-size:14px; color:#333333; line-height:1.6; }
  .steps-list li:last-child { border-bottom:none; }
  .step-num { flex-shrink:0; width:24px; height:24px; background:#1a5276; color:#ffffff; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; }

  /* Ã¢ÂÂÃ¢ÂÂ Financial rows Ã¢ÂÂÃ¢ÂÂ */
  .financial-row { display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #f0f0f0; font-size:14px; }
  .financial-row:last-child { border-bottom:none; border-top:1px solid #e0e0e0; padding-top:14px; margin-top:4px; }
  .financial-row .f-label { color:#555555; }
  .financial-row .f-value { font-weight:700; color:#1a1a1a; }
  .financial-row.total .f-value { font-size:17px; color:#1a5276; }

  /* Ã¢ÂÂÃ¢ÂÂ CTA button Ã¢ÂÂÃ¢ÂÂ */
  .cta-wrap { text-align:center; margin:32px 0 24px; }
  .cta-btn  { display:inline-block; background:#1a5276; color:#ffffff !important; text-decoration:none; padding:14px 36px; border-radius:4px; font-size:14px; font-weight:700; letter-spacing:0.5px; }
  .cta-note { font-size:11px; color:#888888; text-align:center; margin-top:8px; word-break:break-all; }

  /* Ã¢ÂÂÃ¢ÂÂ Contact row Ã¢ÂÂÃ¢ÂÂ */
  .contact-row { padding:16px 0; border-top:1px solid #e8e8e8; border-bottom:1px solid #e8e8e8; margin:24px 0; font-size:13px; color:#444444; }
  .contact-row span { margin-right:24px; }
  .contact-row strong { color:#1a1a1a; }

  /* Ã¢ÂÂÃ¢ÂÂ Closing Ã¢ÂÂÃ¢ÂÂ */
  .email-closing { margin-top:28px; padding-top:20px; border-top:1px solid #e8e8e8; }
  .closing-text { font-size:13px; color:#666666; line-height:1.65; margin-bottom:14px; }
  .sign-off     { font-size:14px; font-weight:700; color:#1a1a1a; margin-bottom:2px; }
  .sign-company { font-size:13px; color:#666666; }

  /* Ã¢ÂÂÃ¢ÂÂ Footer Ã¢ÂÂ light gray, dark text Ã¢ÂÂÃ¢ÂÂ */
  .email-footer { background:#f8f8f8; border-top:1px solid #e0e0e0; padding:20px 40px; text-align:center; }
  .footer-name    { font-size:13px; font-weight:700; color:#1a1a1a; margin-bottom:4px; }
  .footer-details { font-size:12px; color:#888888; line-height:1.7; }

  /* Ã¢ÂÂÃ¢ÂÂ Pay pills Ã¢ÂÂÃ¢ÂÂ */
  .pay-pill { display:inline-block; border:1px solid #cccccc; border-radius:3px; padding:5px 12px; font-size:13px; color:#333333; margin:3px 4px 3px 0; }

  @media only screen and (max-width:600px) {
    .email-body   { padding:24px 20px; }
    .email-header { padding:24px 20px 18px; }
    .email-footer { padding:16px 20px; }
    .status-line  { padding:10px 20px; }
    .cta-btn { padding:13px 24px; }
  }
`;

// Ã¢ÂÂÃ¢ÂÂ Shared footer HTML Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
const EMAIL_FOOTER = `
  <div class="email-footer">
    <div class="footer-name">Choice Properties</div>
    <div class="footer-details">
      2265 Livernois, Suite 500 &middot; Troy, MI 48083<br>
      707-706-3137 (Text Only) &middot; choicepropertygroup@hotmail.com<br>
      Your trust is our standard.
    </div>
  </div>
`;

// Ã¢ÂÂÃ¢ÂÂ Shared header builder Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
function buildEmailHeader(title, appId) {
  return `
  <div class="email-header">
    <div class="header-brand">Choice Properties</div>
    <div class="header-sub">Professional Property Management</div>
    <div class="header-title">${title}</div>
    ${appId ? `<div class="header-ref">Ref: ${appId}</div>` : ''}
  </div>`;
}

const EmailTemplates = {

  // Ã¢ÂÂÃ¢ÂÂ 1. Applicant Confirmation Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  applicantConfirmation: (data, appId, dashboardLink, paymentMethods) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Application Received Ã¢ÂÂ Choice Properties</title>
  <style>${EMAIL_BASE_CSS}</style>
</head>
<body>
<div class="email-wrapper">

  ${buildEmailHeader('Application Successfully Received', appId)}

  <div class="status-line status-pending">
    Ã¢ÂÂ³ &nbsp; Awaiting Application Fee ÃÂ· Review Pending
  </div>

  <div class="email-body">

    <p class="greeting">Dear ${data['First Name']},</p>

    <p class="intro-text">
      Thank you for choosing Choice Properties. We have successfully received your rental application and
      your file is now in our system. This confirmation serves as your official acknowledgment that your
      submission has been recorded.
    </p>

    <!-- Application Summary -->
    <div class="section">
      <div class="section-label">Application Summary</div>
      <table class="info-table">
        <tr><td>Application ID</td><td><strong>${appId}</strong></td></tr>
        <tr><td>Applicant Name</td><td>${data['First Name']} ${data['Last Name']}</td></tr>
        <tr><td>Property of Interest</td><td>${data['Property Address'] || 'To be confirmed'}</td></tr>
        <tr><td>Requested Move-In</td><td>${data['Requested Move-in Date'] || 'Not specified'}</td></tr>
        <tr><td>Lease Term</td><td>${data['Desired Lease Term'] || 'Not specified'}</td></tr>
        <tr><td>Email on File</td><td>${data['Email']}</td></tr>
        <tr><td>Phone on File</td><td>${data['Phone']}</td></tr>
      </table>
    </div>

    <!-- Payment Methods -->
    <div class="section">
      <div class="section-label">Your Selected Payment Methods</div>
      <div class="callout amber">
        <h4>Application Fee Ã¢ÂÂ $${safeFee(data['Application Fee'])}.00</h4>
        <p style="margin-bottom:12px;">You have indicated the following preferred payment methods. Our team will reach out to you at the contact information above within 24 hours to arrange collection of your application fee.</p>
        <div>${paymentMethods.map(m => `<span class="pay-pill">${m}</span>`).join('')}</div>
      </div>
    </div>

    <!-- What Happens Next -->
    <div class="section">
      <div class="section-label">What Happens Next</div>
      <ul class="steps-list">
        <li><span class="step-num">1</span><span><strong>Payment Arrangement</strong> Ã¢ÂÂ A member of our leasing team will contact you within 24 hours via text at <strong>${data['Phone']}</strong> to coordinate your $${safeFee(data['Application Fee'])}.00 application fee.</span></li>
        <li><span class="step-num">2</span><span><strong>Payment Confirmation</strong> Ã¢ÂÂ Once your fee is received and confirmed, you will receive an email notification and your application will advance to the review stage.</span></li>
        <li><span class="step-num">3</span><span><strong>Application Review</strong> Ã¢ÂÂ Our team will conduct a thorough review of your application within 2Ã¢ÂÂ3 business days of payment confirmation.</span></li>
        <li><span class="step-num">4</span><span><strong>Decision Notification</strong> Ã¢ÂÂ You will be notified of our decision via email. If approved, our leasing team will prepare your lease agreement for signature.</span></li>
      </ul>
    </div>

    <div class="callout">
      <h4>Important Ã¢ÂÂ Save Your Application ID</h4>
      <p>Your application ID is <strong>${appId}</strong>. Please save this reference number. You will use it to track your application status and access your dashboard at any time.</p>
    </div>

    <div class="cta-wrap">
      <a href="${dashboardLink}" class="cta-btn">Track My Application</a>
      <div class="cta-note">Or visit: ${dashboardLink}</div>
    </div>

    <!-- Contact -->
    <div class="contact-row">
      <strong>Questions?</strong> &nbsp; Text: 707-706-3137 &nbsp;&middot;&nbsp; choicepropertygroup@hotmail.com
    </div>

    <div class="email-closing">
      <p class="closing-text">Should you have any questions prior to hearing from our team, please do not hesitate to reach out. We are committed to making this process as clear and straightforward as possible.</p>
      <div class="sign-off">Choice Properties Leasing Team</div>
      <div class="sign-company">choicepropertygroup@hotmail.com</div>
    </div>

  </div>
  ${EMAIL_FOOTER}
</div>
</body>
</html>
`,

  // Ã¢ÂÂÃ¢ÂÂ 2. Admin Notification Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  adminNotification: (data, appId, baseUrl, dashboardLink, paymentMethods) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>New Application Ã¢ÂÂ ${appId}</title>
  <style>${EMAIL_BASE_CSS}</style>
</head>
<body>
<div class="email-wrapper">

  ${buildEmailHeader('New Application Received', appId)}

  <div class="status-line status-pending">
    Ã¢ÂÂ¡ &nbsp; Action Required Ã¢ÂÂ Application Fee Pending Collection
  </div>

  <div class="email-body">

    <p class="greeting">New Application Alert,</p>

    <p class="intro-text">
      A new rental application has been submitted and requires your attention. The applicant is awaiting contact
      to arrange payment of the $${safeFee(data['Application Fee'])}.00 application fee. Please reach out within 24 hours.
    </p>

    <!-- Applicant at a Glance -->
    <div class="section">
      <div class="section-label">Applicant Overview</div>
      <table class="info-table">
        <tr><td>Full Name</td><td><strong>${data['First Name']} ${data['Last Name']}</strong></td></tr>
        <tr><td>Email</td><td>${data['Email']}</td></tr>
        <tr><td>Phone</td><td><strong>${data['Phone']}</strong> (Text preferred)</td></tr>
        <tr><td>Property Requested</td><td>${data['Property Address'] || 'Not specified'}</td></tr>
        <tr><td>Requested Move-In</td><td>${data['Requested Move-in Date'] || 'Not specified'}</td></tr>
        <tr><td>Lease Term</td><td>${data['Desired Lease Term'] || 'Not specified'}</td></tr>
        <tr><td>Contact Preference</td><td>${data['Preferred Contact Method'] || 'Not specified'}</td></tr>
        <tr><td>Best Times to Reach</td><td>${data['Preferred Time'] || 'Any'} ${data['Preferred Time Specific'] ? 'Ã¢ÂÂ ' + data['Preferred Time Specific'] : ''}</td></tr>
      </table>
    </div>

    <!-- Payment Preferences -->
    <div class="section">
      <div class="section-label">Payment Preferences</div>
      <div class="callout amber">
        <h4>Contact Applicant to Collect $${safeFee(data['Application Fee'])}.00 Fee</h4>
        <p style="margin-bottom:12px;">The applicant has indicated the following preferred payment methods:</p>
        <div>${paymentMethods.map(m => `<span class="pay-pill">${m}</span>`).join('')}</div>
      </div>
    </div>

    <!-- Employment & Income -->
    <div class="section">
      <div class="section-label">Employment & Income</div>
      <table class="info-table">
        <tr><td>Employment Status</td><td>${data['Employment Status'] || 'Not specified'}</td></tr>
        <tr><td>Employer</td><td>${data['Employer'] || 'N/A'}</td></tr>
        <tr><td>Job Title</td><td>${data['Job Title'] || 'N/A'}</td></tr>
        <tr><td>Monthly Income</td><td>${data['Monthly Income'] ? '$' + parseFloat(data['Monthly Income']).toLocaleString() : 'Not specified'}</td></tr>
        <tr><td>Employment Duration</td><td>${data['Employment Duration'] || 'N/A'}</td></tr>
      </table>
    </div>

    <!-- Quick Actions -->
    <div class="section">
      <div class="section-label">Quick Actions</div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:4px;">
        <a href="${baseUrl}?path=admin" style="display:inline-block;background:#0a1628;color:white;text-decoration:none;padding:11px 22px;border-radius:3px;font-size:13px;font-weight:600;letter-spacing:0.5px;">Admin Dashboard</a>
        <a href="${dashboardLink}" target="_blank" style="display:inline-block;background:#1d4ed8;color:white;text-decoration:none;padding:11px 22px;border-radius:3px;font-size:13px;font-weight:600;letter-spacing:0.5px;">View Application</a>
        <a href="sms:7077063137?body=Hi%20${data['First Name']}%2C%20this%20is%20Choice%20Properties%20regarding%20your%20application%20${appId}" style="display:inline-block;background:#059669;color:white;text-decoration:none;padding:11px 22px;border-radius:3px;font-size:13px;font-weight:600;letter-spacing:0.5px;">Text Applicant</a>
        <a href="mailto:${data['Email']}?subject=Your%20Application%20${appId}%20-%20Choice%20Properties" style="display:inline-block;background:#64748b;color:white;text-decoration:none;padding:11px 22px;border-radius:3px;font-size:13px;font-weight:600;letter-spacing:0.5px;">Email Applicant</a>
      </div>
    </div>

    <div class="email-closing">
      <div class="sign-off">Choice Properties System</div>
      <div class="sign-company">Automated Admin Notification Ã¢ÂÂ ${appId}</div>
    </div>

  </div>
  ${EMAIL_FOOTER}
</div>
</body>
</html>
`,

  // Ã¢ÂÂÃ¢ÂÂ 3. Payment Confirmation Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  paymentConfirmation: (appId, applicantName, phone, dashboardLink, propertyAddress, propertyName, fee, actualMethod, transactionRef, amountCollected) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Payment Confirmed Ã¢ÂÂ Choice Properties</title>
  <style>${EMAIL_BASE_CSS}</style>
</head>
<body>
<div class="email-wrapper">

  ${buildEmailHeader('Application Fee Confirmed', appId)}

  <div class="status-line status-paid">
    Ã¢ÂÂ &nbsp; Payment Received Ã¢ÂÂ Application Now Under Review
  </div>

  <div class="email-body">

    <p class="greeting">Dear ${applicantName.split(' ')[0]},</p>

    <p class="intro-text">
      We are pleased to confirm that your ${safeFee(fee)}.00 application fee has been received and successfully recorded.
      Your application is now active and has been placed in our review queue. Thank you for completing
      this step promptly.
    </p>

    <!-- Payment Record -->
    <div class="section">
      <div class="section-label">Payment Confirmation</div>
      <div class="callout green">
        <h4>Ã¢ÂÂ Payment Successfully Received</h4>
        <div class="financial-row"><span class="f-label">Receipt ID</span><span class="f-value">${appId}-PMT</span></div>
        <div class="financial-row"><span class="f-label">Application ID</span><span class="f-value">${appId}</span></div>
        <div class="financial-row"><span class="f-label">Applicant</span><span class="f-value">${applicantName}</span></div>
        ${(propertyAddress || propertyName) ? `<div class="financial-row"><span class="f-label">Property</span><span class="f-value">${propertyName || propertyAddress}</span></div>` : ''}
        <div class="financial-row"><span class="f-label">Application Fee</span><span class="f-value">${safeFee(fee)}.00</span></div>
        ${amountCollected ? `<div class="financial-row"><span class="f-label">Amount Collected</span><span class="f-value">$${parseFloat(amountCollected).toFixed(2)}</span></div>` : ''}
        <div class="financial-row"><span class="f-label">Payment Date</span><span class="f-value">${new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</span></div>
        ${actualMethod ? `<div class="financial-row"><span class="f-label">Payment Method</span><span class="f-value">${actualMethod}</span></div>` : ''}
        ${transactionRef ? `<div class="financial-row"><span class="f-label">Reference / Note</span><span class="f-value">${transactionRef}</span></div>` : ''}
        <div class="financial-row"><span class="f-label">Status</span><span class="f-value" style="color:#059669;">Under Review</span></div>
      </div>
    </div>

    <!-- What Happens Next -->
    <div class="section">
      <div class="section-label">What Happens Next</div>
      <ul class="steps-list">
        <li><span class="step-num">1</span><span><strong>Active Review</strong> Ã¢ÂÂ Your complete application is now being reviewed by our leasing team. This process is thorough and designed to be completed within 2Ã¢ÂÂ3 business days.</span></li>
        <li><span class="step-num">2</span><span><strong>Background & Income Verification</strong> Ã¢ÂÂ We will conduct standard verification procedures as part of our review process.</span></li>
        <li><span class="step-num">3</span><span><strong>Decision Notification</strong> Ã¢ÂÂ You will receive an email notification once a decision has been made. Our team may also reach out via text at <strong>${phone}</strong> if additional information is needed.</span></li>
      </ul>
    </div>

    <div class="callout">
      <h4>A Note on Our Review Process</h4>
      <p>We conduct every review with care and fairness. Our decisions are based on a holistic review of your application. If we require any additional documentation, we will contact you directly. There is nothing further required from you at this time.</p>
    </div>

    <div class="cta-wrap">
      <a href="${dashboardLink}" class="cta-btn">Track My Application</a>
      <div class="cta-note">Monitor your real-time status at any time</div>
    </div>

    <div class="contact-row">
      <strong>Questions?</strong> &nbsp; Text: 707-706-3137 &nbsp;&middot;&nbsp; choicepropertygroup@hotmail.com
    </div>

    <div class="email-closing">
      <p class="closing-text">We appreciate your patience as we complete our review. Should you have any questions in the interim, please do not hesitate to contact our leasing team.</p>
      <div class="sign-off">Choice Properties Leasing Team</div>
      <div class="sign-company">choicepropertygroup@hotmail.com</div>
    </div>

  </div>
  ${EMAIL_FOOTER}
</div>
</body>
</html>
`,

  // Ã¢ÂÂÃ¢ÂÂ 4. Status Update (Approved & Denied) Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  statusUpdate: (appId, firstName, status, reason, dashboardLink, propertyAddress, propertyName, propertyState) => {
    const isApproved    = status === 'approved';
    const propertyLabel = propertyName || propertyAddress || '';
    // Bug fix: eSignText was previously derived from `leaseData.propertyState`
    // which is undefined in this template. Now passed as a direct parameter.
    const resolvedState = propertyState || 'MI';
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${isApproved ? 'Application Approved' : 'Application Update'} Ã¢ÂÂ Choice Properties</title>
  <style>${EMAIL_BASE_CSS}</style>
</head>
<body>
<div class="email-wrapper">

  ${buildEmailHeader(isApproved ? 'Application Approved' : 'Application Update', appId)}

  <div class="status-line ${isApproved ? 'status-approved' : 'status-denied'}">
    ${isApproved ? 'Ã¢ÂÂ &nbsp; Congratulations Ã¢ÂÂ Your Application Has Been Approved' : 'Ã¢ÂÂ &nbsp; Your Application Has Been Reviewed'}
  </div>

  <div class="email-body">

    <p class="greeting">Dear ${firstName},</p>
    ${propertyLabel ? `<p style="font-size:13px;color:#64748b;margin:-4px 0 16px;">Property: <strong>${propertyLabel}</strong></p>` : ''}

    ${isApproved ? `
    <p class="intro-text">
      We are delighted to inform you that your rental application with Choice Properties has been
      <strong>approved</strong>. This decision reflects our confidence in your application, and we
      look forward to welcoming you as a resident.
    </p>

    <div class="callout green">
      <h4>Ã¢ÂÂ Application Approved</h4>
      <p>Your application has met all of our criteria. Our leasing team will be in contact with you shortly to prepare and deliver your lease agreement for electronic signature. Please ensure your phone and email remain accessible.</p>
    </div>

    <div class="section">
      <div class="section-label">Your Next Steps</div>
      <ul class="steps-list">
        <li><span class="step-num">1</span><span><strong>Lease Agreement</strong> Ã¢ÂÂ Our team will prepare a formal lease agreement and send it to you via email within 1Ã¢ÂÂ2 business days. Please review it carefully in its entirety.</span></li>
        <li><span class="step-num">2</span><span><strong>Electronic Signature</strong> Ã¢ÂÂ You will sign your lease electronically. Your signature is legally binding under the ${getESignText(resolvedState)}.</span></li>
        <li><span class="step-num">3</span><span><strong>Move-In Costs</strong> Ã¢ÂÂ Prior to receiving your keys, the move-in total (first month's rent plus security deposit) must be paid in full. This amount will be clearly outlined in your lease.</span></li>
        <li><span class="step-num">4</span><span><strong>Key Handoff</strong> Ã¢ÂÂ Once all documents and payments are complete, our team will coordinate your key pickup and official move-in date.</span></li>
      </ul>
    </div>

    <div class="callout">
      <h4>Important Ã¢ÂÂ Please Respond Promptly</h4>
      <p>Unit availability is time-sensitive. To secure your unit, please sign your lease agreement within 48 hours of receiving it. Delays may result in the unit being offered to other applicants.</p>
    </div>
    ` : `
    <p class="intro-text">
      Thank you for the time and effort you invested in your rental application with Choice Properties.
      After careful and thorough consideration of your application, we regret to inform you that we are
      unable to offer you a tenancy at this time.
    </p>

    <div class="callout red">
      <h4>Application Status Ã¢ÂÂ Not Approved</h4>
      <p>${reason
        ? `After review, the primary reason for this decision relates to: <strong>${reason}</strong>.`
        : `Our decision is based on our standard application review criteria.`
      } We understand this is disappointing news and we genuinely appreciate the trust you placed in us by applying.</p>
    </div>

    <div class="section">
      <div class="section-label">Looking Ahead</div>
      <ul class="steps-list">
        <li><span class="step-num">1</span><span><strong>This is Not Permanent</strong> Ã¢ÂÂ Our decisions are based on current application criteria. Circumstances change, and we encourage you to consider reapplying in the future should your situation evolve. Your application and screening results remain on file for 60 days from your submission date. If you wish to apply for another available Choice Properties unit within 30 days, <strong>no new application fee will be required</strong> Ã¢ÂÂ please contact our team to discuss your options.</span></li>
        <li><span class="step-num">2</span><span><strong>Other Properties</strong> Ã¢ÂÂ Choice Properties manages a portfolio of properties. Our team would be happy to discuss alternative options that may be a strong fit for your current profile.</span></li>
        <li><span class="step-num">3</span><span><strong>Questions</strong> Ã¢ÂÂ If you would like to discuss this decision or explore your options further, please do not hesitate to reach out to our leasing team directly.</span></li>
      </ul>
    </div>

    <div class="callout">
      <h4>We Value Your Interest</h4>
      <p>This decision is in no way a reflection of your character or worth as a prospective tenant. We encourage you to continue your search and wish you every success in finding a home that is the right fit for you.</p>
    </div>
    `}

    <div class="cta-wrap">
      <a href="${dashboardLink}" class="cta-btn">View My Application</a>
    </div>

    <div class="contact-row">
      <strong>Questions?</strong> &nbsp; Text: 707-706-3137 &nbsp;&middot;&nbsp; choicepropertygroup@hotmail.com
    </div>

    <div class="email-closing">
      <p class="closing-text">${isApproved ? 'Congratulations once more. We look forward to having you as part of the Choice Properties community.' : 'Thank you again for your interest in Choice Properties. We wish you all the best.'}</p>
      <div class="sign-off">Choice Properties Leasing Team</div>
      <div class="sign-company">choicepropertygroup@hotmail.com</div>
    </div>

  </div>
  ${EMAIL_FOOTER}
</div>
</body>
</html>
`;
  },

  // Ã¢ÂÂÃ¢ÂÂ 5. Lease Sent Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  leaseSent: (appId, tenantName, leaseLink, leaseData) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Your Lease Agreement is Ready Ã¢ÂÂ Choice Properties</title>
  <style>${EMAIL_BASE_CSS}</style>
</head>
<body>
<div class="email-wrapper">

  ${buildEmailHeader('Your Lease Agreement is Ready', appId)}

  <div class="status-line status-lease">
    Ã°ÂÂÂ &nbsp; Action Required Ã¢ÂÂ Please Review and Sign Within 48 Hours
  </div>

  <div class="email-body">

    <p class="greeting">Dear ${tenantName.split(' ')[0]},</p>

    <p class="intro-text">
      We are pleased to inform you that your lease agreement has been prepared and is now ready
      for your review and electronic signature. Please read the agreement carefully in its entirety
      before signing. Your signature constitutes a legally binding commitment.
    </p>

    <!-- Lease Summary -->
    <div class="section">
      <div class="section-label">Lease Summary</div>
      <table class="info-table">
        <tr><td>Property</td><td><strong>${leaseData.property}</strong></td></tr>
        <tr><td>Lease Term</td><td>${leaseData.term}</td></tr>
        <tr><td>Lease Start Date</td><td>${leaseData.startDate}</td></tr>
        <tr><td>Lease End Date</td><td>${leaseData.endDate}</td></tr>
      </table>
    </div>

    <!-- Financial Summary -->
    <div class="section">
      <div class="section-label">Financial Summary</div>
      <div class="callout">
        <h4>Move-In Financial Breakdown</h4>
        <div class="financial-row"><span class="f-label">Monthly Rent</span><span class="f-value">$${parseFloat(leaseData.rent).toLocaleString('en-US',{minimumFractionDigits:2})}</span></div>
        <div class="financial-row"><span class="f-label">Security Deposit</span><span class="f-value">$${parseFloat(leaseData.deposit).toLocaleString('en-US',{minimumFractionDigits:2})}</span></div>
        <div class="financial-row total"><span class="f-label">Total Due at Move-In</span><span class="f-value">$${parseFloat(leaseData.moveInCosts).toLocaleString('en-US',{minimumFractionDigits:2})}</span></div>
      </div>
    </div>

    <div class="callout amber">
      <h4>Ã¢ÂÂ° 48-Hour Signing Window</h4>
      <p>To secure your unit, your lease must be signed within <strong>48 hours</strong> of receiving this email. Failure to sign within this window may result in the unit being released to other applicants. If you require additional time, please contact our team immediately.</p>
    </div>

    <div class="cta-wrap">
      <a href="${leaseLink}" class="cta-btn">Review &amp; Sign My Lease</a>
      <div class="cta-note">Or copy this link into your browser: ${leaseLink}</div>
    </div>

    <!-- What to Expect -->
    <div class="section">
      <div class="section-label">What to Expect When You Sign</div>
      <ul class="steps-list">
        <li><span class="step-num">1</span><span><strong>Review the Full Agreement</strong> Ã¢ÂÂ Read every section carefully. The lease outlines your rights, responsibilities, and all financial obligations.</span></li>
        <li><span class="step-num">2</span><span><strong>Confirm Checkboxes</strong> Ã¢ÂÂ You will be asked to confirm your agreement to specific terms before signing.</span></li>
        <li><span class="step-num">3</span><span><strong>Sign Electronically</strong> Ã¢ÂÂ Enter your full legal name as your electronic signature. This is legally binding under the ${getESignText(leaseData.propertyState || 'MI')}.</span></li>
        <li><span class="step-num">4</span><span><strong>Receive Confirmation</strong> Ã¢ÂÂ You will receive an immediate email confirmation once your signature is recorded.</span></li>
      </ul>
    </div>

    <div class="contact-row">
      <strong>Questions?</strong> &nbsp; Text: 707-706-3137 &nbsp;&middot;&nbsp; choicepropertygroup@hotmail.com
    </div>

    <div class="email-closing">
      <p class="closing-text">If you have any questions about the lease terms prior to signing, please contact our leasing team. We are available to clarify any aspect of the agreement.</p>
      <div class="sign-off">Choice Properties Leasing Team</div>
      <div class="sign-company">choicepropertygroup@hotmail.com</div>
    </div>

  </div>
  ${EMAIL_FOOTER}
</div>
</body>
</html>
`,

  // Ã¢ÂÂÃ¢ÂÂ 6. Lease Signed Ã¢ÂÂ Tenant Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  leaseSignedTenant: (appId, firstName, leaseData, dashboardLink) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Lease Executed Ã¢ÂÂ Welcome to Choice Properties</title>
  <style>${EMAIL_BASE_CSS}</style>
</head>
<body>
<div class="email-wrapper">

  ${buildEmailHeader('Welcome to Choice Properties', appId)}

  <div class="status-line status-approved">
    Ã¢ÂÂ &nbsp; Lease Successfully Executed Ã¢ÂÂ Your Tenancy is Confirmed
  </div>

  <div class="email-body">

    <p class="greeting">Dear ${firstName},</p>

    <p class="intro-text">
      Congratulations and welcome to Choice Properties. Your lease agreement has been
      successfully signed and is now fully executed. This email serves as your official
      confirmation of tenancy. Please retain it for your records.
    </p>

    <!-- Tenancy Details -->
    <div class="section">
      <div class="section-label">Your Tenancy Confirmation</div>
      <div class="callout green">
        <h4>Ã¢ÂÂ Lease Executed Ã¢ÂÂ Tenancy Confirmed</h4>
        <div class="financial-row"><span class="f-label">Property</span><span class="f-value">${leaseData.property}</span></div>
        <div class="financial-row"><span class="f-label">Move-In Date</span><span class="f-value">${leaseData.startDate}</span></div>
        <div class="financial-row"><span class="f-label">Lease End Date</span><span class="f-value">${leaseData.endDate}</span></div>
        <div class="financial-row"><span class="f-label">Monthly Rent</span><span class="f-value">$${parseFloat(leaseData.rent).toLocaleString('en-US',{minimumFractionDigits:2})}</span></div>
        <div class="financial-row"><span class="f-label">Move-In Total Due</span><span class="f-value">$${parseFloat(leaseData.moveInCost).toLocaleString('en-US',{minimumFractionDigits:2})}</span></div>
        <div class="financial-row"><span class="f-label">Signed By</span><span class="f-value" style="font-style:italic;">${leaseData.signature}</span></div>
        <div class="financial-row"><span class="f-label">Application Reference</span><span class="f-value">${appId}</span></div>
      </div>
    </div>

    <!-- Next Steps -->
    <div class="section">
      <div class="section-label">What Happens Next</div>
      <ul class="steps-list">
        <li><span class="step-num">1</span><span><strong>Move-In Payment</strong> Ã¢ÂÂ Our leasing team will contact you to coordinate collection of your move-in total of <strong>$${parseFloat(leaseData.moveInCost).toLocaleString('en-US',{minimumFractionDigits:2})}</strong>. This must be paid in full prior to key handoff.</span></li>
        <li><span class="step-num">2</span><span><strong>Move-In Preparation</strong> Ã¢ÂÂ We will provide you with a detailed move-in guide and any property-specific information you need to know before your arrival.</span></li>
        <li><span class="step-num">3</span><span><strong>Key Handoff</strong> Ã¢ÂÂ Once all payments are confirmed, your key handoff will be coordinated. Our team will reach out to schedule this at a time that works for you.</span></li>
        <li><span class="step-num">4</span><span><strong>Your Dashboard</strong> Ã¢ÂÂ You may view your lease details and tenancy information at any time through your applicant dashboard.</span></li>
      </ul>
    </div>

    <div class="callout">
      <h4>Your Point of Contact</h4>
      <p>For all questions, coordination, or assistance, please contact our team via text at <strong>707-706-3137</strong>. We are committed to ensuring your move-in experience is seamless and professional.</p>
    </div>

    <div class="cta-wrap">
      <a href="${dashboardLink}" class="cta-btn">View My Dashboard</a>
    </div>

    <div style="text-align:center;margin:12px 0 24px;">
      <a href="${dashboardLink.replace('path=dashboard','path=lease')}" style="font-size:13px;color:#1a5276;text-decoration:underline;">View your executed lease agreement</a>
      <p style="font-size:11px;color:#888888;margin-top:4px;">This link shows your signed lease in read-only format. We recommend printing or saving it as a PDF for your records.</p>
    </div>

    <div class="contact-row">
      <strong>Questions?</strong> &nbsp; Text: 707-706-3137 &nbsp;&middot;&nbsp; choicepropertygroup@hotmail.com
    </div>

    <div class="email-closing">
      <p class="closing-text">We are truly delighted to welcome you to Choice Properties. Our team is dedicated to ensuring your tenancy is a positive and comfortable experience from day one.</p>
      <div class="sign-off">Choice Properties Leasing Team</div>
      <div class="sign-company">choicepropertygroup@hotmail.com</div>
    </div>

  </div>
  ${EMAIL_FOOTER}
</div>
</body>
</html>
`,

  // Ã¢ÂÂÃ¢ÂÂ 7. Lease Signed Ã¢ÂÂ Admin Alert Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  leaseSignedAdmin: (appId, tenantName, email, phone, signature, property, adminUrl) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Lease Signed Ã¢ÂÂ ${appId}</title>
  <style>${EMAIL_BASE_CSS}</style>
</head>
<body>
<div class="email-wrapper">

  ${buildEmailHeader('Lease Signed Ã¢ÂÂ Action Required', appId)}

  <div class="status-line status-approved">
    Ã¢ÂÂÃ¯Â¸Â &nbsp; Tenant Has Executed the Lease Ã¢ÂÂ Collect Move-In Payment
  </div>

  <div class="email-body">

    <p class="greeting">Leasing Team,</p>

    <p class="intro-text">
      The lease agreement for application <strong>${appId}</strong> has been electronically signed
      and is now fully executed. Please initiate contact with the tenant to coordinate collection
      of the move-in payment and schedule the key handoff.
    </p>

    <!-- Execution Details -->
    <div class="section">
      <div class="section-label">Lease Execution Details</div>
      <div class="callout green">
        <h4>Ã¢ÂÂ Lease Successfully Executed</h4>
        <div class="financial-row"><span class="f-label">Tenant</span><span class="f-value">${tenantName}</span></div>
        <div class="financial-row"><span class="f-label">Property</span><span class="f-value">${property}</span></div>
        <div class="financial-row"><span class="f-label">Email</span><span class="f-value">${email}</span></div>
        <div class="financial-row"><span class="f-label">Phone</span><span class="f-value">${phone}</span></div>
        <div class="financial-row"><span class="f-label">Signature Recorded</span><span class="f-value" style="font-style:italic;">"${signature}"</span></div>
        <div class="financial-row"><span class="f-label">Executed At</span><span class="f-value">${new Date().toLocaleString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'})}</span></div>
        <div class="financial-row"><span class="f-label">Application ID</span><span class="f-value">${appId}</span></div>
      </div>
    </div>

    <!-- Required Actions -->
    <div class="section">
      <div class="section-label">Required Actions</div>
      <ul class="steps-list">
        <li><span class="step-num">1</span><span><strong>Collect Move-In Payment</strong> Ã¢ÂÂ Contact the tenant immediately to arrange collection of the move-in total (first month + security deposit).</span></li>
        <li><span class="step-num">2</span><span><strong>Confirm Move-In Date</strong> Ã¢ÂÂ Coordinate and confirm the official move-in date with the tenant once payment is received.</span></li>
        <li><span class="step-num">3</span><span><strong>Key Handoff</strong> Ã¢ÂÂ Schedule and complete the key handoff on or before the agreed move-in date.</span></li>
        <li><span class="step-num">4</span><span><strong>Update Records</strong> Ã¢ÂÂ Ensure all internal records and the admin dashboard reflect the completed lease status.</span></li>
      </ul>
    </div>

    <!-- Quick Actions -->
    <div class="section">
      <div class="section-label">Quick Actions</div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:4px;">
        <a href="${adminUrl}" style="display:inline-block;background:#0a1628;color:white;text-decoration:none;padding:11px 22px;border-radius:3px;font-size:13px;font-weight:600;letter-spacing:0.5px;">Admin Dashboard</a>
        <a href="sms:7077063137?body=Hi%20${tenantName.split(' ')[0]}%2C%20congratulations%20on%20signing%20your%20lease%20for%20${encodeURIComponent(property)}.%20Please%20contact%20us%20to%20arrange%20your%20move-in%20payment." style="display:inline-block;background:#059669;color:white;text-decoration:none;padding:11px 22px;border-radius:3px;font-size:13px;font-weight:600;letter-spacing:0.5px;">Text Tenant</a>
        <a href="mailto:${email}?subject=Next Steps Ã¢ÂÂ Move-In Coordination Ã¢ÂÂ ${appId}" style="display:inline-block;background:#1d4ed8;color:white;text-decoration:none;padding:11px 22px;border-radius:3px;font-size:13px;font-weight:600;letter-spacing:0.5px;">Email Tenant</a>
      </div>
    </div>

    <div class="email-closing">
      <div class="sign-off">Choice Properties System</div>
      <div class="sign-company">Automated Admin Alert Ã¢ÂÂ ${appId}</div>
    </div>

  </div>
  ${EMAIL_FOOTER}
</div>
</body>
</html>
`,

  // Ã¢ÂÂÃ¢ÂÂ 8. Holding Fee Received Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ Task 4.1
  holdingFeeReceived: (appId, tenantName, feeAmount, property, newMoveInBalance, dashboardLink) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Holding Fee Received Ã¢ÂÂ Choice Properties</title>
  <style>${EMAIL_BASE_CSS}</style>
</head>
<body>
<div class="email-wrapper">
  ${buildEmailHeader('Holding Fee Received', appId)}
  <div class="status-line status-approved">Ã¢ÂÂ &nbsp; Holding Fee Successfully Received</div>
  <div class="email-body">
    <p class="greeting">Dear ${tenantName},</p>
    ${property ? `<p style="font-size:13px;color:#64748b;margin:-4px 0 16px;">Property: <strong>${property}</strong></p>` : ''}
    <p class="intro-text">We have received your holding fee and your unit is now secured. Thank you for acting promptly Ã¢ÂÂ your payment ensures the property will not be offered to other applicants while your lease is finalized.</p>
    <div class="callout green">
      <h4>Ã¢ÂÂ Holding Fee Confirmed</h4>
      <p><strong>Amount Received:</strong> $${feeAmount}.00<br>
      <strong>Credit at Move-In:</strong> This amount will be applied in full toward your move-in balance.<br>
      ${newMoveInBalance !== undefined && newMoveInBalance !== null ? `<strong>Remaining Move-In Balance:</strong> $${newMoveInBalance}.00` : ''}</p>
    </div>
    <div class="section">
      <div class="section-label">Next Steps</div>
      <ul class="steps-list">
        <li><span class="step-num">1</span><span><strong>Lease Agreement</strong> Ã¢ÂÂ Your lease agreement will be prepared and sent to you shortly for electronic signature.</span></li>
        <li><span class="step-num">2</span><span><strong>Remaining Move-In Payment</strong> Ã¢ÂÂ Once your lease is signed, the remaining move-in balance will be due before key handoff.</span></li>
        <li><span class="step-num">3</span><span><strong>Move-In Coordination</strong> Ã¢ÂÂ Our team will contact you to confirm your move-in date and key pickup details.</span></li>
      </ul>
    </div>
    <div class="cta-wrap">
      <a href="${dashboardLink}" class="cta-btn">View My Application</a>
    </div>
    <div class="contact-row">
      <strong>Questions?</strong> &nbsp; Text: 707-706-3137 &nbsp;&middot;&nbsp; choicepropertygroup@hotmail.com
    </div>
    <div class="email-closing">
      <p class="closing-text">We look forward to welcoming you as a Choice Properties resident.</p>
      <div class="sign-off">Choice Properties Leasing Team</div>
      <div class="sign-company">choicepropertygroup@hotmail.com</div>
    </div>
  </div>
  ${EMAIL_FOOTER}
</div>
</body>
</html>
`,

  // Ã¢ÂÂÃ¢ÂÂ 9. Lease Signing Reminder Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ Task 4.2
  leaseSigningReminder: (appId, firstName, leaseLink, property) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Friendly Reminder Ã¢ÂÂ Sign Your Lease</title>
  <style>${EMAIL_BASE_CSS}</style>
</head>
<body>
<div class="email-wrapper">
  ${buildEmailHeader('Lease Signing Reminder', appId)}
  <div class="status-line" style="background:#fff7ed;color:#c2410c;border-left-color:#f97316;">Ã¢ÂÂ³ &nbsp; Action Required Ã¢ÂÂ Your Lease Awaits Your Signature</div>
  <div class="email-body">
    <p class="greeting">Dear ${firstName},</p>
    ${property ? `<p style="font-size:13px;color:#64748b;margin:-4px 0 16px;">Property: <strong>${property}</strong></p>` : ''}
    <p class="intro-text">This is a friendly reminder that your lease agreement is still awaiting your electronic signature. Unit availability is time-sensitive Ã¢ÂÂ to protect your reservation, please sign at your earliest convenience.</p>
    <div class="callout" style="border-left-color:#f97316;background:#fff7ed;">
      <h4 style="color:#c2410c;">Please Sign Within 48 Hours</h4>
      <p>If your lease remains unsigned, the unit may be offered to other applicants on our waiting list. If you have questions or concerns about any clause, please reach out to our team before the deadline.</p>
    </div>
    <div class="cta-wrap">
      <a href="${leaseLink}" class="cta-btn">Sign My Lease Now Ã¢ÂÂ</a>
    </div>
    <div class="contact-row">
      <strong>Questions?</strong> &nbsp; Text: 707-706-3137 &nbsp;&middot;&nbsp; choicepropertygroup@hotmail.com
    </div>
    <div class="email-closing">
      <p class="closing-text">We're excited to have you as a resident and look forward to getting your home ready.</p>
      <div class="sign-off">Choice Properties Leasing Team</div>
      <div class="sign-company">choicepropertygroup@hotmail.com</div>
    </div>
  </div>
  ${EMAIL_FOOTER}
</div>
</body>
</html>
`,

  // Ã¢ÂÂÃ¢ÂÂ 10. Lease Expiry Admin Alert Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ Task 4.3
  leaseExpiryAdminAlert: (appId, tenantName, tenantEmail, tenantPhone, property) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Lease Unsigned Ã¢ÂÂ Admin Alert</title>
  <style>${EMAIL_BASE_CSS}</style>
</head>
<body>
<div class="email-wrapper">
  ${buildEmailHeader('Lease Unsigned Ã¢ÂÂ 48h Alert', appId)}
  <div class="status-line status-denied">Ã¢ÂÂ  &nbsp; Tenant Has Not Signed Ã¢ÂÂ 48 Hours Elapsed</div>
  <div class="email-body">
    <p class="intro-text">The lease agreement for Application <strong>${appId}</strong> has not been signed within 48 hours of delivery. Immediate follow-up is recommended to protect unit availability.</p>
    <div class="callout red">
      <h4>Applicant Contact Information</h4>
      <p>
        <strong>Name:</strong> ${tenantName}<br>
        <strong>Email:</strong> ${tenantEmail}<br>
        <strong>Phone:</strong> ${tenantPhone}<br>
        ${property ? `<strong>Property:</strong> ${property}` : ''}
      </p>
    </div>
    <div class="section">
      <div class="section-label">Suggested Actions</div>
      <ul class="steps-list">
        <li><span class="step-num">1</span><span>Contact the applicant by text at <strong>${tenantPhone}</strong> to confirm they received the lease and address any questions.</span></li>
        <li><span class="step-num">2</span><span>If no response within 24 hours, evaluate whether the unit should be re-listed.</span></li>
        <li><span class="step-num">3</span><span>If cancelling, update the application status in the admin panel and notify the applicant.</span></li>
      </ul>
    </div>
    <div class="contact-row">
      This alert was generated automatically by the Choice Properties rental system.
    </div>
  </div>
  ${EMAIL_FOOTER}
</div>
</body>
</html>
`,

  // Ã¢ÂÂÃ¢ÂÂ 11. Move-In Preparation Guide Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ Task 4.4
  moveInPreparationGuide: (appId, firstName, leaseData, dashboardLink) => {
    const rent    = leaseData.rent    || 0;
    const deposit = leaseData.deposit || 0;
    const moveIn  = leaseData.moveInCost || (parseFloat(rent) + parseFloat(deposit));
    const start   = leaseData.startDate  ? new Date(leaseData.startDate).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' }) : 'As agreed';
    const property = leaseData.property || '';
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Move-In Preparation Guide Ã¢ÂÂ Choice Properties</title>
  <style>${EMAIL_BASE_CSS}</style>
</head>
<body>
<div class="email-wrapper">
  ${buildEmailHeader('Move-In Preparation Guide', appId)}
  <div class="status-line status-approved">Ã°ÂÂÂ  &nbsp; Your Lease is Signed Ã¢ÂÂ Here\'s How to Prepare</div>
  <div class="email-body">
    <p class="greeting">Dear ${firstName},</p>
    ${property ? `<p style="font-size:13px;color:#64748b;margin:-4px 0 16px;">Property: <strong>${property}</strong></p>` : ''}
    <p class="intro-text">Congratulations on signing your lease! This guide covers everything you need to do before your move-in date of <strong>${start}</strong>.</p>
    <div class="callout green">
      <h4>Move-In Payment Due Before Key Handoff</h4>
      <p>
        <strong>First Month\'s Rent:</strong> $${parseFloat(rent).toFixed(2)}<br>
        <strong>Security Deposit:</strong> $${parseFloat(deposit).toFixed(2)}<br>
        <strong>Total Due:</strong> $${parseFloat(moveIn).toFixed(2)}<br><br>
        Our team will contact you to arrange payment. <strong>Do not send money before speaking with us directly.</strong>
      </p>
    </div>
    <div class="section">
      <div class="section-label">What to Bring on Move-In Day</div>
      <ul class="steps-list">
        <li><span class="step-num">1</span><span><strong>Government-Issued Photo ID</strong> Ã¢ÂÂ Required for all adults 18+ who will reside in the unit.</span></li>
        <li><span class="step-num">2</span><span><strong>Move-In Payment</strong> Ã¢ÂÂ Full move-in amount in the agreed payment form. Our team will confirm the method in advance.</span></li>
        <li><span class="step-num">3</span><span><strong>Renter\'s Insurance Proof</strong> Ã¢ÂÂ A current binder or declaration page showing Choice Properties as an interested party.</span></li>
      </ul>
    </div>
    <div class="section">
      <div class="section-label">Before You Move In</div>
      <ul class="steps-list">
        <li><span class="step-num">A</span><span><strong>Set Up Utilities</strong> Ã¢ÂÂ Electric, gas, water, and internet accounts should be transferred or opened in your name on or before your lease start date. Your utility providers may need your move-in date and unit address.</span></li>
        <li><span class="step-num">B</span><span><strong>Obtain Renter\'s Insurance</strong> Ã¢ÂÂ Your lease requires you to maintain renter\'s insurance for the full lease term. Most policies cost $10Ã¢ÂÂ$20/month. Please have your policy in effect before key handoff.</span></li>
        <li><span class="step-num">C</span><span><strong>Review Parking</strong> Ã¢ÂÂ Parking assignments and rules are outlined in your lease. Please review these before your move-in day.</span></li>
      </ul>
    </div>
    <div class="callout">
      <h4>Maintenance & Emergency Contact</h4>
      <p>For maintenance requests or questions, contact us by text at <strong>707-706-3137</strong> or email <strong>choicepropertygroup@hotmail.com</strong>. For property emergencies (water, electrical, structural), text us immediately and call 911 if there is any immediate safety risk.</p>
    </div>
    <div class="cta-wrap">
      <a href="${dashboardLink}" class="cta-btn">View My Application</a>
    </div>
    <div class="email-closing">
      <p class="closing-text">We\'re thrilled to welcome you to your new home. Our team is here to help make your move-in smooth and stress-free.</p>
      <div class="sign-off">Choice Properties Leasing Team</div>
      <div class="sign-company">choicepropertygroup@hotmail.com</div>
    </div>
  </div>
  ${EMAIL_FOOTER}
</div>
</body>
</html>
`; },

  // Ã¢ÂÂÃ¢ÂÂ 12. Admin Review Summary Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ Task 4.5
  adminReviewSummary: (appId, data, adminPanelUrl) => {
    const row = (label, value) => value ? `<tr><td style="padding:6px 10px;font-size:13px;color:#64748b;width:40%;border-bottom:1px solid #f1f5f9;">${label}</td><td style="padding:6px 10px;font-size:13px;color:#1e293b;font-weight:500;border-bottom:1px solid #f1f5f9;">${value}</td></tr>` : '';
    const section = (title) => `<tr><td colspan="2" style="padding:10px 10px 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#94a3b8;background:#f8fafc;">${title}</td></tr>`;
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Review Summary Ã¢ÂÂ ${appId}</title>
  <style>${EMAIL_BASE_CSS}</style>
</head>
<body>
<div class="email-wrapper">
  ${buildEmailHeader('Application Review Summary', appId)}
  <div class="status-line" style="background:#f0fdf4;color:#15803d;border-left-color:#22c55e;">Ã¢ÂÂ &nbsp; Fee Confirmed Ã¢ÂÂ Application Ready for Decision</div>
  <div class="email-body">
    <p class="intro-text">The application fee for <strong>${appId}</strong> has been confirmed. The full application summary is below. Please review and record your decision in the admin panel.</p>
    <div class="callout green">
      <h4>Decision Required</h4>
      <p>Log in to the admin panel to <strong>Approve</strong> or <strong>Deny</strong> this application. Do not communicate your decision to the applicant directly Ã¢ÂÂ use the admin panel to trigger the correct email.</p>
    </div>
    <div class="section">
      <div class="section-label">Full Application Data</div>
      <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
        <tbody>
          ${section('Property')}
          ${row('Property', data['Property Address'])}
          ${row('Listed Rent', data['Listed Rent'] ? '$' + data['Listed Rent'] : '')}
          ${row('Bedrooms', data['Bedrooms'])}
          ${row('Bathrooms', data['Bathrooms'])}
          ${section('Applicant')}
          ${row('Full Name', (data['First Name'] || '') + ' ' + (data['Last Name'] || ''))}
          ${row('Email', data['Email'])}
          ${row('Phone', data['Phone'])}
          ${row('Date of Birth', data['DOB'])}
          ${row('SSN (last 4)', data['SSN Last 4'])}
          ${row('Driver\'s License', data['Driver\'s License'])}
          ${section('Residency')}
          ${row('Current Address', data['Current Address'])}
          ${row('Move-in Reason', data['Move-in Reason'])}
          ${row('Current Landlord', data['Landlord Name'])}
          ${row('Landlord Phone', data['Landlord Phone'])}
          ${row('Monthly Rent (current)', data['Current Rent'] ? '$' + data['Current Rent'] : '')}
          ${section('Employment & Income')}
          ${row('Status', data['Employment Status'])}
          ${row('Employer', data['Employer Name'])}
          ${row('Job Title', data['Job Title'])}
          ${row('Monthly Income', data['Monthly Income'] ? '$' + data['Monthly Income'] : '')}
          ${section('References')}
          ${row('Reference 1', data['Reference 1 Name'])}
          ${row('Ref 1 Relationship', data['Reference 1 Relationship'])}
          ${row('Ref 1 Phone', data['Reference 1 Phone'])}
          ${row('Reference 2', data['Reference 2 Name'])}
          ${row('Ref 2 Relationship', data['Reference 2 Relationship'])}
          ${row('Ref 2 Phone', data['Reference 2 Phone'])}
          ${section('Background')}
          ${row('Has Criminal Record', data['Criminal Record'])}
          ${row('Has Eviction', data['Eviction Record'])}
          ${row('Has Bankruptcy', data['Bankruptcy Record'])}
          ${section('Co-Applicant')}
          ${row('Co-Applicant Name', data['Co-Applicant First Name'] ? (data['Co-Applicant First Name'] + ' ' + (data['Co-Applicant Last Name'] || '')) : '')}
          ${row('Co-Applicant Email', data['Co-Applicant Email'])}
          ${row('Co-Applicant Phone', data['Co-Applicant Phone'])}
        </tbody>
      </table>
    </div>
    <div class="cta-wrap">
      <a href="${adminPanelUrl}" class="cta-btn">Open Admin Panel Ã¢ÂÂ</a>
    </div>
    <div class="contact-row">This summary was generated automatically when the application fee was confirmed.</div>
  </div>
  ${EMAIL_FOOTER}
</div>
</body>
</html>
`; }
};

// ============================================================
// Email dispatch functions  (originals unchanged + 2 new)
// ============================================================

function sendApplicantConfirmation(data, appId) {
  try {
    const paymentMethods = buildPaymentMethodList(data, false);
    const baseUrl        = ScriptApp.getService().getUrl();
    const dashboardLink  = baseUrl + '?path=dashboard&id=' + appId;
    const htmlBody = EmailTemplates.applicantConfirmation(data, appId, dashboardLink, paymentMethods);
    const propertySnippet = data['Property Address'] ? ` Ã¢ÂÂ ${data['Property Address'].split(',')[0]}` : '';
    MailApp.sendEmail({
      to: data['Email'],
      subject: `Ã¢ÂÂ Application Received${propertySnippet} | Choice Properties (Ref: ${appId})`,
      htmlBody: htmlBody,
      name: 'Choice Properties Leasing',
      replyTo: 'choicepropertygroup@hotmail.com',
      noReply: false
    });
    return true;
  } catch (error) {
    console.error('sendApplicantConfirmation error Ã¢ÂÂ appId: ' + appId + ' | to: ' + data['Email'] + ' | ' + error.toString());
    return false;
  }
}

function sendAdminNotification(data, appId) {
  try {
    const adminEmails = getAdminEmails();
    const paymentMethods = buildPaymentMethodList(data, true);
    const baseUrl       = ScriptApp.getService().getUrl();
    const dashboardLink = baseUrl + '?path=dashboard&id=' + appId;
    const htmlBody = EmailTemplates.adminNotification(data, appId, baseUrl, dashboardLink, paymentMethods);
    const propertySnippet = data['Property Address'] ? ` | ${data['Property Address']}` : '';
    adminEmails.forEach(email => {
      MailApp.sendEmail({
        to: email,
        subject: `New Application: ${appId} Ã¢ÂÂ ${data['First Name']} ${data['Last Name']}${propertySnippet}`,
        htmlBody: htmlBody, name: 'Choice Properties System'
      });
    });
    return true;
  } catch (error) { console.error('sendAdminNotification error:', error); return false; }
}

// Ã¢ÂÂÃ¢ÂÂ Task 4.6: Refactored to use shared EMAIL_BASE_CSS, buildEmailHeader(), EMAIL_FOOTER Ã¢ÂÂÃ¢ÂÂ

  // ============================================================
  // [L4 fix] RESUME PROGRESS — server-side storage for cross-device resume
  // Stored in ScriptProperties keyed by token with 7-day expiry.
  // ============================================================
  function saveResumeProgress(token, progressJson) {
    try {
      if (!token || !progressJson) return { success: false, error: 'missing_params' };
      // Guard against oversized payloads (ScriptProperties limit is 500KB per key)
      if (progressJson.length > 400000) return { success: false, error: 'data_too_large' };
      const scriptProps = PropertiesService.getScriptProperties();
      scriptProps.setProperty('resume_' + token, JSON.stringify({
        data: progressJson,
        expires: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
      }));
      return { success: true };
    } catch (e) {
      console.error('saveResumeProgress error:', e.toString());
      return { success: false, error: e.toString() };
    }
  }

  function loadResumeProgress(token) {
    try {
      if (!token) return { success: false, error: 'missing_token' };
      const scriptProps = PropertiesService.getScriptProperties();
      const stored = scriptProps.getProperty('resume_' + token);
      if (!stored) return { success: false, error: 'not_found' };
      const parsed = JSON.parse(stored);
      if (Date.now() > parsed.expires) {
        scriptProps.deleteProperty('resume_' + token);
        // Return 'not_found' instead of 'expired' to prevent timing-based token enumeration
        return { success: false, error: 'not_found' };
      }
      return { success: true, data: parsed.data };
    } catch (e) {
      console.error('loadResumeProgress error:', e.toString());
      return { success: false, error: e.toString() };
    }
  }

  function sendResumeEmail(email, resumeUrl, step) {
  try {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, error: 'Invalid email' };
    }
    // D-013: parse property name from URL params in resumeUrl
    let propertyLine = '';
    try {
      const urlParts = resumeUrl.split('?');
      if (urlParts.length > 1) {
        const params = {};
        urlParts[1].split('&').forEach(p => {
          const kv = p.split('=');
          if (kv.length === 2) params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1].replace(/\+/g, ' '));
        });
        const propName = params['pn'] || params['addr'] || '';
        if (propName) propertyLine = `<p style="font-size:13px;color:#64748b;margin:-4px 0 16px;">Applying for: <strong>${propName}</strong></p>`;
      }
    } catch (e) {}
    const subject  = 'Ã°ÂÂÂ Resume Your Choice Properties Application';
    const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Resume Your Application Ã¢ÂÂ Choice Properties</title>
  <style>${EMAIL_BASE_CSS}</style>
</head>
<body>
<div class="email-wrapper">
  ${buildEmailHeader('Resume Your Application', null)}
  <div class="email-body">
    <p class="greeting">Your progress is saved!</p>
    ${propertyLine}
    <p class="intro-text">
      We've saved your progress through Step <strong>${step}</strong> of 6. Click the button below to pick up right where you left off Ã¢ÂÂ your information will be restored automatically.
    </p>
    <div class="cta-wrap">
      <a href="${resumeUrl}" class="cta-btn">Continue My Application Ã¢ÂÂ</a>
    </div>
    <div class="callout" style="border-left:4px solid #c0392b;">
      <h4 style="color:#c0392b;">&#9888; Important: Same Device Required</h4>
      <p>Your progress is saved locally in your browser. <strong>This link must be opened in the same browser on the same device where you started your application.</strong> Opening it on a different device or browser will show a blank form.</p>
    </div>
    <div class="contact-row">
      <strong>Questions?</strong> &nbsp; Text: 707-706-3137 &nbsp;&middot;&nbsp; choicepropertygroup@hotmail.com
    </div>
    <div class="email-closing">
      <div class="sign-off">Choice Properties Leasing Team</div>
      <div class="sign-company">choicepropertygroup@hotmail.com</div>
    </div>
  </div>
  ${EMAIL_FOOTER}
</div>
</body>
</html>`;
    MailApp.sendEmail({ to: email, subject: subject, htmlBody: htmlBody, name: 'Choice Properties' });
    return { success: true };
  } catch (error) {
    console.error('sendResumeEmail error:', error);
    return { success: false, error: error.toString() };
  }
}

// Ã¢ÂÂÃ¢ÂÂ Task 4.1: Holding Fee Received dispatch Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
function sendHoldingFeeReceivedEmail(appId, email, tenantName, feeAmount, property, newMoveInBalance) {
  try {
    const baseUrl      = ScriptApp.getService().getUrl();
    const dashboardLink = baseUrl + '?path=dashboard&id=' + appId;
    const htmlBody     = EmailTemplates.holdingFeeReceived(appId, tenantName, feeAmount, property, newMoveInBalance, dashboardLink);
    MailApp.sendEmail({
      to: email,
      subject: `Holding Fee Confirmed Ã¢ÂÂ ${property || 'Your Unit'} | Choice Properties (Ref: ${appId})`,
      htmlBody: htmlBody,
      name: 'Choice Properties Leasing',
      replyTo: 'choicepropertygroup@hotmail.com'
    });
    logEmail('holding_fee_received', email, 'success', appId);
    return true;
  } catch (error) {
    console.error('sendHoldingFeeReceivedEmail error:', error);
    logEmail('holding_fee_received', email, 'failed', appId, error.toString());
    return false;
  }
}

// Ã¢ÂÂÃ¢ÂÂ Task 4.2: Lease Signing Reminder dispatch Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
function sendLeaseSigningReminder(appId, email, firstName, leaseLink, property) {
  try {
    const htmlBody = EmailTemplates.leaseSigningReminder(appId, firstName, leaseLink, property);
    MailApp.sendEmail({
      to: email,
      subject: `Reminder: Your Lease Awaits Signature Ã¢ÂÂ ${property || 'Choice Properties'} (Ref: ${appId})`,
      htmlBody: htmlBody,
      name: 'Choice Properties Leasing',
      replyTo: 'choicepropertygroup@hotmail.com'
    });
    logEmail('lease_signing_reminder', email, 'success', appId);
    return true;
  } catch (error) {
    console.error('sendLeaseSigningReminder error:', error);
    logEmail('lease_signing_reminder', email, 'failed', appId, error.toString());
    return false;
  }
}

// Ã¢ÂÂÃ¢ÂÂ Task 4.3: Lease Expiry Admin Alert dispatch Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
function sendLeaseExpiryAdminAlert(appId, tenantName, tenantEmail, tenantPhone, property) {
  try {
    const adminEmails = getAdminEmails();
    const htmlBody    = EmailTemplates.leaseExpiryAdminAlert(appId, tenantName, tenantEmail, tenantPhone, property);
    adminEmails.forEach(adminEmail => {
      MailApp.sendEmail({
        to: adminEmail,
        subject: `Lease Unsigned Ã¢ÂÂ 48h Alert: ${appId} Ã¢ÂÂ ${tenantName}`,
        htmlBody: htmlBody,
        name: 'Choice Properties System'
      });
    });
    logEmail('lease_expiry_admin_alert', 'admin', 'success', appId);
    return true;
  } catch (error) {
    console.error('sendLeaseExpiryAdminAlert error:', error);
    logEmail('lease_expiry_admin_alert', 'admin', 'failed', appId, error.toString());
    return false;
  }
}

// Ã¢ÂÂÃ¢ÂÂ Task 4.4: Move-In Preparation Guide dispatch Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
function sendMoveInPreparationGuide(appId, email, firstName, leaseData) {
  try {
    const baseUrl       = ScriptApp.getService().getUrl();
    const dashboardLink = baseUrl + '?path=dashboard&id=' + appId;
    const htmlBody      = EmailTemplates.moveInPreparationGuide(appId, firstName, leaseData, dashboardLink);
    MailApp.sendEmail({
      to: email,
      subject: `Your Move-In Preparation Guide Ã¢ÂÂ ${leaseData.property || 'Choice Properties'} (Ref: ${appId})`,
      htmlBody: htmlBody,
      name: 'Choice Properties Leasing',
      replyTo: 'choicepropertygroup@hotmail.com'
    });
    logEmail('move_in_prep_guide', email, 'success', appId);
    return true;
  } catch (error) {
    console.error('sendMoveInPreparationGuide error:', error);
    logEmail('move_in_prep_guide', email, 'failed', appId, error.toString());
    return false;
  }
}

// Ã¢ÂÂÃ¢ÂÂ Task 4.5: Admin Review Summary dispatch Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
function sendAdminReviewSummary(appId) {
  try {
    const ss    = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error('Applications sheet not found');
    const col  = getColumnMap(sheet);
    const rows = sheet.getDataRange().getValues();
    let appData = null;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][col['App ID'] - 1] === appId) {
        appData = {};
        Object.keys(col).forEach(key => { appData[key] = rows[i][col[key] - 1]; });
        break;
      }
    }
    if (!appData) throw new Error('Application not found: ' + appId);
    const adminEmails   = getAdminEmails();
    const adminPanelUrl = ScriptApp.getService().getUrl() + '?path=admin';
    const htmlBody      = EmailTemplates.adminReviewSummary(appId, appData, adminPanelUrl);
    adminEmails.forEach(adminEmail => {
      MailApp.sendEmail({
        to: adminEmail,
        subject: `Review Summary: ${appId} Ã¢ÂÂ ${appData['First Name'] || ''} ${appData['Last Name'] || ''} Ã¢ÂÂ Fee Confirmed`,
        htmlBody: htmlBody,
        name: 'Choice Properties System'
      });
    });
    logEmail('admin_review_summary', 'admin', 'success', appId);
    return true;
  } catch (error) {
    console.error('sendAdminReviewSummary error:', error);
    logEmail('admin_review_summary', 'admin', 'failed', appId, error.toString());
    return false;
  }
}

function sendPaymentConfirmation(appId, applicantEmail, applicantName, phone, actualMethod, transactionRef, amountCollected) {
  try {
    const baseUrl       = ScriptApp.getService().getUrl();
    const dashboardLink = baseUrl + '?path=dashboard&id=' + appId;
    // D-011: fetch property context from sheet row
    let propertyAddress = '';
    let propertyName    = '';
    let applicationFee  = APPLICATION_FEE;
    try {
      const result = getApplication(appId);
      if (result.success) {
        propertyAddress = result.application['Property Address'] || '';
        propertyName    = result.application['Property Name']    || '';
        applicationFee  = safeFee(result.application['Application Fee']);
      }
    } catch (e) {}
    const propertyLabel   = propertyName || propertyAddress;
    const propertySnippet = propertyLabel ? ` Ã¢ÂÂ ${propertyLabel.split(',')[0]}` : '';
    MailApp.sendEmail({
      to: applicantEmail,
      subject: `Ã¢ÂÂ Payment Confirmed${propertySnippet} | Application ${appId}`,
      htmlBody: EmailTemplates.paymentConfirmation(appId, applicantName, phone, dashboardLink, propertyAddress, propertyName, applicationFee, actualMethod, transactionRef, amountCollected),
      name: 'Choice Properties'
    });
    return true;
  } catch (error) { console.error('sendPaymentConfirmation error:', error); return false; }
}

function sendStatusUpdateEmail(appId, email, firstName, status, reason) {
  try {
    const baseUrl       = ScriptApp.getService().getUrl();
    const dashboardLink = baseUrl + '?path=dashboard&id=' + appId;
    // D-012: fetch property context from sheet row
    let propertyAddress = '';
    let propertyName    = '';
    let propertyState   = 'MI'; // default to MI (HQ state) if not found
    try {
      const result = getApplication(appId);
      if (result.success) {
        propertyAddress = result.application['Property Address'] || '';
        propertyName    = result.application['Property Name']    || '';
        propertyState   = result.application['Property State']   || 'MI';
      }
    } catch (e) {}
    const propertyLabel   = propertyName || propertyAddress;
    const propertySnippet = propertyLabel ? ` Ã¢ÂÂ ${propertyLabel.split(',')[0]}` : '';
    MailApp.sendEmail({
      to: email,
      subject: status === 'approved'
        ? `Ã¢ÂÂ Application Approved${propertySnippet} | ${appId}`
        : `Application Update${propertySnippet} | ${appId}`,
      // Bug fix: pass propertyState so the template can resolve the correct e-sign text
      // without referencing the nonexistent `leaseData` variable.
      htmlBody: EmailTemplates.statusUpdate(appId, firstName, status, reason, dashboardLink, propertyAddress, propertyName, propertyState),
      name: 'Choice Properties'
    });
    return true;
  } catch (error) { console.error('sendStatusUpdateEmail error:', error); return false; }
}

// Ã¢ÂÂÃ¢ÂÂ [NEW] sendLeaseEmail Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
function sendLeaseEmail(appId, email, tenantName, phone, leaseLink, leaseData) {
  try {
    MailApp.sendEmail({
      to: email,
      subject: `Ã°ÂÂÂ Your Lease is Ready to Sign - ${appId}`,
      htmlBody: EmailTemplates.leaseSent(appId, tenantName, leaseLink, leaseData),
      name: 'Choice Properties Leasing'
    });
    return true;
  } catch (error) { console.error('sendLeaseEmail error:', error); return false; }
}

// Ã¢ÂÂÃ¢ÂÂ [NEW] sendLeaseSignedTenantEmail Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
function sendLeaseSignedTenantEmail(appId, email, firstName, phone, leaseData) {
  try {
    const baseUrl       = ScriptApp.getService().getUrl();
    const dashboardLink = baseUrl + '?path=dashboard&id=' + appId;
    MailApp.sendEmail({
      to: email,
      subject: `Ã°ÂÂÂ Lease Signed - Welcome to Choice Properties! (${appId})`,
      htmlBody: EmailTemplates.leaseSignedTenant(appId, firstName, leaseData, dashboardLink),
      name: 'Choice Properties Leasing'
    });
    return true;
  } catch (error) { console.error('sendLeaseSignedTenantEmail error:', error); return false; }
}

// Ã¢ÂÂÃ¢ÂÂ [NEW] sendLeaseSignedAdminAlert Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
function sendLeaseSignedAdminAlert(appId, tenantName, email, phone, signature, property) {
  try {
    const adminEmails = getAdminEmails();
    const baseUrl     = ScriptApp.getService().getUrl();
    const adminUrl    = baseUrl + '?path=admin';
    adminEmails.forEach(adminEmail => {
      MailApp.sendEmail({
        to: adminEmail,
        subject: `Ã¢ÂÂÃ¯Â¸Â LEASE SIGNED: ${appId} - ${tenantName}`,
        htmlBody: EmailTemplates.leaseSignedAdmin(appId, tenantName, email, phone, signature, property, adminUrl),
        name: 'Choice Properties System'
      });
    });
    return true;
  } catch (error) { console.error('sendLeaseSignedAdminAlert error:', error); return false; }
}

// ============================================================
// Shared helpers
// ============================================================
function getAdminEmails() {
  try {
    const ss        = getSpreadsheet();
    const namedRange = ss.getRangeByName(ADMIN_EMAILS_RANGE);
    if (namedRange) return namedRange.getValue().split(',').map(e => e.trim());
  } catch (e) {}
  return ['choicepropertygroup@hotmail.com'];
}

function buildPaymentMethodList(data, withEmoji) {
  const methods  = [];
  const primary  = data['Primary Payment Method'] || '';
  const primOth  = data['Primary Payment Method Other'] || '';
  const second   = data['Alternative Payment Method'] || '';
  const secOth   = data['Alternative Payment Method Other'] || '';
  const third    = data['Third Choice Payment Method'] || '';
  const thirdOth = data['Third Choice Payment Method Other'] || '';

  const label = (emoji, fallback, val, other) => {
    const name = (val === 'Other' && other) ? other : val;
    return withEmoji ? `${emoji} ${name}` : `<strong>${fallback}:</strong> ${name}`;
  };

  if (primary) methods.push(label('Ã°ÂÂ¥Â', 'Primary', primary, primOth));
  if (second)  methods.push(label('Ã°ÂÂ¥Â', 'Secondary', second, secOth));
  if (third)   methods.push(label('Ã°ÂÂ¥Â', 'Third Choice', third, thirdOth));
  return methods;
}

// ============================================================
// requestHoldingFee()  Ã¢ÂÂ Session 037
// Admin requests a holding fee from an approved applicant.
// Sets Holding Fee Status Ã¢ÂÂ 'requested', emails the tenant.
// ============================================================
function requestHoldingFee(appId, amount, adminNotes, deadline) {
  try {
    const ss    = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error('Applications sheet not found');
    initializeSheets(); // ensure holding fee columns exist

    const col  = getColumnMap(sheet);
    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][col['App ID'] - 1] === appId) { rowIndex = i + 1; break; }
    }
    if (rowIndex === -1) throw new Error('Application not found');

    const feeAmount = parseFloat(amount);
    if (!feeAmount || feeAmount <= 0) throw new Error('Please enter a valid holding fee amount.');

    // Guard: only request a holding fee on approved, paid applications
    const appStatus     = sheet.getRange(rowIndex, col['Status']).getValue();
    const paymentStatus = sheet.getRange(rowIndex, col['Payment Status']).getValue();
    if (appStatus !== 'approved')  throw new Error('Cannot request a holding fee Ã¢ÂÂ application is not yet approved.');
    if (paymentStatus !== 'paid')  throw new Error('Cannot request a holding fee Ã¢ÂÂ application fee has not been confirmed.');

    const currentStatus = sheet.getRange(rowIndex, col['Holding Fee Status']).getValue();
    if (currentStatus === 'paid') throw new Error('Holding fee is already marked as paid.');

    // Write to sheet
    sheet.getRange(rowIndex, col['Holding Fee Amount']).setValue(feeAmount);
    sheet.getRange(rowIndex, col['Holding Fee Status']).setValue('requested');
    if (deadline && col['Holding Fee Deadline']) {
      sheet.getRange(rowIndex, col['Holding Fee Deadline']).setValue(deadline.trim());
    }
    const noteText = `[${new Date().toLocaleString()}] Holding fee of $${feeAmount} requested.${deadline ? ' Deadline: ' + deadline + '.' : ''}${adminNotes ? ' ' + adminNotes : ''}`;
    const existing = sheet.getRange(rowIndex, col['Holding Fee Notes']).getValue();
    sheet.getRange(rowIndex, col['Holding Fee Notes']).setValue(existing ? existing + '\n' + noteText : noteText);

    // Also add to admin notes
    const currAdminNotes = sheet.getRange(rowIndex, col['Admin Notes']).getValue();
    sheet.getRange(rowIndex, col['Admin Notes']).setValue(
      currAdminNotes ? currAdminNotes + '\n' + noteText : noteText
    );

    // Read tenant info for email
    const email     = sheet.getRange(rowIndex, col['Email']).getValue();
    const firstName = sheet.getRange(rowIndex, col['First Name']).getValue();
    const lastName  = sheet.getRange(rowIndex, col['Last Name']).getValue();
    const phone     = sheet.getRange(rowIndex, col['Phone']).getValue();
    const property  = sheet.getRange(rowIndex, col['Property Address']).getValue();
    const fullName  = firstName + ' ' + lastName;

    // Send holding fee request email to tenant
    sendHoldingFeeRequestEmail(appId, email, fullName, phone, feeAmount, property, deadline);
    logEmail('holding_fee_request', email, 'success', appId);

    return { success: true, message: `Holding fee of $${feeAmount} requested. Tenant has been emailed.` };
  } catch (error) {
    console.error('requestHoldingFee error:', error);
    logEmail('holding_fee_request', 'admin', 'failed', appId, error.toString());
    return { success: false, error: error.toString() };
  }
}

// ============================================================
// markHoldingFeePaid()  Ã¢ÂÂ Session 037
// Admin confirms offline holding fee payment received.
// Sets Holding Fee Status Ã¢ÂÂ 'paid', logs date.
// ============================================================
function markHoldingFeePaid(appId, adminNotes) {
  try {
    const ss    = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error('Applications sheet not found');

    const col  = getColumnMap(sheet);
    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][col['App ID'] - 1] === appId) { rowIndex = i + 1; break; }
    }
    if (rowIndex === -1) throw new Error('Application not found');

    const currentStatus = sheet.getRange(rowIndex, col['Holding Fee Status']).getValue();
    if (currentStatus === 'paid') throw new Error('Holding fee is already marked as paid.');
    if (!currentStatus || currentStatus === 'none') throw new Error('No holding fee has been requested yet.');

    const feeAmount = parseFloat(sheet.getRange(rowIndex, col['Holding Fee Amount']).getValue()) || 0;

    const holdingPaymentTime = new Date();
    sheet.getRange(rowIndex, col['Holding Fee Status']).setValue('paid');
    sheet.getRange(rowIndex, col['Holding Fee Date']).setValue(holdingPaymentTime);
    // Ã¢ÂÂÃ¢ÂÂ Phase 6: Store precise payment timestamp for refund window calculation Ã¢ÂÂÃ¢ÂÂ
    if (col['Holding Fee Payment Timestamp']) {
      sheet.getRange(rowIndex, col['Holding Fee Payment Timestamp']).setValue(holdingPaymentTime.getTime());
    }

    const noteText = `[${new Date().toLocaleString()}] Holding fee of $${feeAmount} marked as received.${adminNotes ? ' ' + adminNotes : ''}`;
    const existing = sheet.getRange(rowIndex, col['Holding Fee Notes']).getValue();
    sheet.getRange(rowIndex, col['Holding Fee Notes']).setValue(existing ? existing + '\n' + noteText : noteText);

    const currAdminNotes = sheet.getRange(rowIndex, col['Admin Notes']).getValue();
    sheet.getRange(rowIndex, col['Admin Notes']).setValue(
      currAdminNotes ? currAdminNotes + '\n' + noteText : noteText
    );

    // Ã¢ÂÂÃ¢ÂÂ Task 4.1: Notify tenant that holding fee was received Ã¢ÂÂÃ¢ÂÂ
    const tenantEmail    = sheet.getRange(rowIndex, col['Email']).getValue();
    const tenantFirst    = sheet.getRange(rowIndex, col['First Name']).getValue();
    const tenantLast     = sheet.getRange(rowIndex, col['Last Name']).getValue();
    const propertyAddr   = col['Property Address'] ? sheet.getRange(rowIndex, col['Property Address']).getValue() : '';
    const rent           = col['Monthly Rent']     ? parseFloat(sheet.getRange(rowIndex, col['Monthly Rent']).getValue()) || 0 : 0;
    const deposit        = col['Security Deposit'] ? parseFloat(sheet.getRange(rowIndex, col['Security Deposit']).getValue()) || 0 : 0;
    const newBalance     = (rent + deposit - feeAmount) > 0 ? (rent + deposit - feeAmount) : null;
    sendHoldingFeeReceivedEmail(appId, tenantEmail, tenantFirst + ' ' + tenantLast, feeAmount, propertyAddr, newBalance);

    return { success: true, message: `Holding fee of $${feeAmount} marked as paid.` };
  } catch (error) {
    console.error('markHoldingFeePaid error:', error);
    return { success: false, error: error.toString() };
  }
}

// ============================================================
// managementCountersign()  Ã¢ÂÂ Phase 1
// Records the management countersignature on an executed lease.
// Called from the admin panel after the tenant has signed.
// ============================================================
function managementCountersign(appId, signerName, notes) {
  try {
    if (!signerName || signerName.trim().length < 2) {
      return { success: false, error: 'Signer name is required.' };
    }
    const ss    = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error('Applications sheet not found');
    const col  = getColumnMap(sheet);
    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][col['App ID'] - 1] === appId) { rowIndex = i + 1; break; }
    }
    if (rowIndex === -1) throw new Error('Application not found: ' + appId);

    const leaseStatus = sheet.getRange(rowIndex, col['Lease Status']).getValue();
    if (leaseStatus !== 'signed') {
      return { success: false, error: 'Lease must be signed by the tenant before management can countersign.' };
    }
    const existingSig = col['Management Signature'] ? sheet.getRange(rowIndex, col['Management Signature']).getValue() : '';
    if (existingSig) {
      return { success: false, error: 'This lease has already been countersigned by management.' };
    }

    const now = new Date();
    if (col['Management Signature'])      sheet.getRange(rowIndex, col['Management Signature']).setValue(signerName.trim());
    if (col['Management Signature Date']) sheet.getRange(rowIndex, col['Management Signature Date']).setValue(now);
    if (col['Management Signer Name'])    sheet.getRange(rowIndex, col['Management Signer Name']).setValue(signerName.trim());
    sheet.getRange(rowIndex, col['Lease Status']).setValue('executed');

    const currentNotes = sheet.getRange(rowIndex, col['Admin Notes']).getValue();
    const noteText = `[${now.toLocaleString()}] Lease countersigned by management. Signer: ${signerName.trim()}.${notes ? ' Note: ' + notes : ''}`;
    sheet.getRange(rowIndex, col['Admin Notes']).setValue(currentNotes ? currentNotes + '\n' + noteText : noteText);

    return { success: true, message: 'Lease countersigned. Status updated to Executed.' };
  } catch (error) {
    console.error('managementCountersign error:', error);
    return { success: false, error: error.toString() };
  }
}

// ============================================================
// sendHoldingFeeRequestEmail()  Ã¢ÂÂ Session 037
// Emails the tenant with holding fee amount and payment instructions.
// ============================================================
function sendHoldingFeeRequestEmail(appId, email, fullName, phone, feeAmount, property, deadline) {
  try {
    const firstName   = fullName.split(' ')[0] || fullName;
    const deadlineText = (deadline && deadline.trim()) ? deadline.trim() : '48 hours';
    const subject   = `Action Required Ã¢ÂÂ Holding Fee to Reserve Your Unit | ${property || 'Choice Properties'}`;
    const body = `
<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  body{font-family:'Helvetica Neue',Arial,sans-serif;background:#f1f5f9;margin:0;padding:0;}
  .wrap{max-width:600px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);}
  .header{background:linear-gradient(135deg,#1a5276,#2471a3);padding:28px 32px;color:#fff;}
  .header h1{margin:0;font-size:20px;font-weight:700;letter-spacing:-.3px;}
  .header p{margin:6px 0 0;font-size:13px;opacity:.8;}
  .body{padding:28px 32px;}
  .greeting{font-size:16px;font-weight:600;color:#1e293b;margin:0 0 12px;}
  .intro{font-size:14px;color:#475569;line-height:1.7;margin:0 0 20px;}
  .callout{background:#f0fdf4;border-left:4px solid #10b981;border-radius:8px;padding:16px 20px;margin:20px 0;}
  .callout h4{margin:0 0 8px;font-size:14px;font-weight:700;color:#065f46;}
  .callout p{margin:0;font-size:13px;color:#374151;line-height:1.6;}
  .amount-box{background:#1a5276;color:#fff;border-radius:10px;padding:20px;text-align:center;margin:20px 0;}
  .amount-box .label{font-size:12px;font-weight:600;opacity:.75;text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px;}
  .amount-box .amount{font-size:32px;font-weight:800;}
  .steps{margin:20px 0;}
  .step{display:flex;gap:12px;margin-bottom:12px;align-items:flex-start;}
  .step-dot{flex-shrink:0;width:24px;height:24px;background:#1a5276;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;margin-top:1px;}
  .step p{margin:0;font-size:13px;color:#374151;line-height:1.6;}
  .notice{background:#fef9c3;border:1px solid #fde68a;border-radius:8px;padding:14px 18px;margin:20px 0;font-size:13px;color:#713f12;line-height:1.6;}
  .footer{background:#f8fafc;padding:20px 32px;text-align:center;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;}
</style>
</head><body>
<div class="wrap">
  <div class="header">
    <h1>Choice Properties</h1>
    <p>Holding Fee Request Ã¢ÂÂ App #${appId}</p>
  </div>
  <div class="body">
    <p class="greeting">Dear ${firstName},</p>
    <p class="intro">
      Congratulations again on your approved application${property ? ' for <strong>' + property + '</strong>' : ''}. To officially reserve this unit and take it off the market while your lease is being prepared, a holding fee is required.
    </p>

    <div class="amount-box">
      <div class="label">Holding Fee Due</div>
      <div class="amount">$${feeAmount.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
    </div>

    <div class="callout">
      <h4>Ã¢ÂÂ This Fee Is Credited Toward Your Move-In</h4>
      <p>The holding fee is not an additional charge. It will be fully credited toward your move-in total (first month's rent + security deposit) when you take possession of the property.</p>
    </div>

    <div class="steps">
      <p style="font-size:13px;font-weight:700;color:#1e293b;margin:0 0 12px;">How to Pay</p>
      <div class="step"><div class="step-dot">1</div><p><strong>Contact our team</strong> Ã¢ÂÂ Text or call us at <strong>707-706-3137</strong> to coordinate your preferred payment method (Zelle, money order, certified check, or cashier's check).</p></div>
      <div class="step"><div class="step-dot">2</div><p><strong>Submit payment</strong> Ã¢ÂÂ Send the holding fee using your chosen method. Our team will provide payment details when you reach out.</p></div>
      <div class="step"><div class="step-dot">3</div><p><strong>Receive confirmation</strong> Ã¢ÂÂ Once payment is received, our team will confirm in writing and proceed to prepare your lease agreement.</p></div>
    </div>

    <div class="notice">
      Ã¢ÂÂ± <strong>Deadline: ${deadlineText}.</strong> Unit availability is time-sensitive. If the holding fee is not received within this window, the unit may be offered to other qualified applicants.
    </div>

    <p style="font-size:13px;color:#475569;line-height:1.7;">
      If you have any questions, please text us at <strong>707-706-3137</strong> or email us at
      <a href="mailto:choicepropertygroup@hotmail.com" style="color:#1a5276;">choicepropertygroup@hotmail.com</a>.
      We look forward to welcoming you as a resident.
    </p>
  </div>
  <div class="footer">
    Choice Properties &nbsp;ÃÂ·&nbsp; 2265 Livernois Suite 500, Troy MI 48083<br>
    707-706-3137 &nbsp;ÃÂ·&nbsp; choicepropertygroup@hotmail.com<br>
    <span style="font-size:11px;">App ID: ${appId}</span>
  </div>
</div>
</body></html>`;
    MailApp.sendEmail({ to: email, subject: subject, htmlBody: body });
  } catch (err) {
    console.error('sendHoldingFeeRequestEmail error:', err);
    throw err;
  }
}

// ============================================================
// markAsPaid()
// ============================================================
function markAsPaid(appId, notes, actualMethod, transactionRef, amountCollected) {
  try {
    const ss    = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error('Applications sheet not found');
    initializeSheets();
    const col  = getColumnMap(sheet);
    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][col['App ID'] - 1] === appId) { rowIndex = i + 1; break; }
    }
    if (rowIndex === -1) throw new Error('Application not found');
    if (sheet.getRange(rowIndex, col['Payment Status']).getValue() === 'paid') {
      throw new Error('Application already marked as paid');
    }
    sheet.getRange(rowIndex, col['Payment Status']).setValue('paid');
    sheet.getRange(rowIndex, col['Payment Date']).setValue(new Date());
    if (actualMethod && col['Payment Method Used']) {
      sheet.getRange(rowIndex, col['Payment Method Used']).setValue(actualMethod.trim());
    }
    if (transactionRef && col['Transaction Reference']) {
      sheet.getRange(rowIndex, col['Transaction Reference']).setValue(transactionRef.trim());
    }
    if (amountCollected && col['Amount Collected']) {
      sheet.getRange(rowIndex, col['Amount Collected']).setValue(parseFloat(amountCollected));
    }
    const noteLines = [];
    if (actualMethod)    noteLines.push('Method: ' + actualMethod);
    if (amountCollected) noteLines.push('Amount: $' + parseFloat(amountCollected).toFixed(2));
    if (transactionRef)  noteLines.push('Ref: ' + transactionRef);
    if (notes)           noteLines.push(notes);
    if (noteLines.length) {
      const curr = sheet.getRange(rowIndex, col['Admin Notes']).getValue();
      const note = `[${new Date().toLocaleString()}] Payment marked as paid. ${noteLines.join(' | ')}`;
      sheet.getRange(rowIndex, col['Admin Notes']).setValue(curr ? curr + '\n' + note : note);
    }
    const email     = sheet.getRange(rowIndex, col['Email']).getValue();
    const firstName = sheet.getRange(rowIndex, col['First Name']).getValue();
    const lastName  = sheet.getRange(rowIndex, col['Last Name']).getValue();
    const phone     = sheet.getRange(rowIndex, col['Phone']).getValue();
    sendPaymentConfirmation(appId, email, firstName + ' ' + lastName, phone, actualMethod, transactionRef, amountCollected);
    logEmail('payment_confirmation', email, 'success', appId);
    // Ã¢ÂÂÃ¢ÂÂ Task 4.9: Send admin review summary now that fee is confirmed Ã¢ÂÂÃ¢ÂÂ
    sendAdminReviewSummary(appId);
    return { success: true, message: 'Application marked as paid' };
  } catch (error) {
    console.error('markAsPaid error:', error);
    logEmail('payment_confirmation', 'admin', 'failed', appId, error.toString());
    return { success: false, error: error.toString() };
  }
}

// ============================================================
// markAsRefunded()  Ã¢ÂÂ Phase 6 Task 6.2
// Admin marks a paid application fee as refunded.
// Sets Payment Status Ã¢ÂÂ 'refunded'. No email is sent automatically.
// ============================================================
function markAsRefunded(appId, notes) {
  try {
    const ss    = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error('Applications sheet not found');
    const col  = getColumnMap(sheet);
    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][col['App ID'] - 1] === appId) { rowIndex = i + 1; break; }
    }
    if (rowIndex === -1) throw new Error('Application not found');
    const payStatus = sheet.getRange(rowIndex, col['Payment Status']).getValue();
    if (payStatus !== 'paid') throw new Error('Only applications with Payment Status "paid" can be refunded.');
    sheet.getRange(rowIndex, col['Payment Status']).setValue('refunded');
    const noteText = `[${new Date().toLocaleString()}] Payment marked as refunded.${notes ? ' ' + notes : ''}`;
    const curr = sheet.getRange(rowIndex, col['Admin Notes']).getValue();
    sheet.getRange(rowIndex, col['Admin Notes']).setValue(curr ? curr + '\n' + noteText : noteText);
    return { success: true, message: 'Payment marked as refunded.' };
  } catch (error) {
    console.error('markAsRefunded error:', error);
    return { success: false, error: error.toString() };
  }
}

// ============================================================
// markAsContacted()  Ã¢ÂÂ Phase 8.3
// Logs the current timestamp into the "Last Contacted" column
// so admins can see when they last reached out to an applicant.
// ============================================================
function markAsContacted(appId) {
  try {
    const ss    = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error('Applications sheet not found');
    initializeSheets();
    const col  = getColumnMap(sheet);
    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][col['App ID'] - 1] === appId) { rowIndex = i + 1; break; }
    }
    if (rowIndex === -1) throw new Error('Application not found');
    const now = new Date();
    if (col['Last Contacted']) {
      sheet.getRange(rowIndex, col['Last Contacted']).setValue(now);
    }
    const curr     = sheet.getRange(rowIndex, col['Admin Notes']).getValue();
    const noteText = `[${now.toLocaleString()}] Applicant contacted by admin.`;
    sheet.getRange(rowIndex, col['Admin Notes']).setValue(curr ? curr + '\n' + noteText : noteText);
    return { success: true, message: 'Contact logged', contactedAt: now.toLocaleString() };
  } catch (error) {
    console.error('markAsContacted error:', error);
    return { success: false, error: error.toString() };
  }
}

// ============================================================
// withdrawApplication()  Ã¢ÂÂ Phase 8.5
// Allows an applicant to withdraw their own application.
// Sets status to 'withdrawn' and reverts the property listing
// to 'active' so it becomes available for other applicants.
// ============================================================
function withdrawApplication(appId) {
  try {
    const ss    = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error('Applications sheet not found');
    const col  = getColumnMap(sheet);
    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][col['App ID'] - 1] === appId) { rowIndex = i + 1; break; }
    }
    if (rowIndex === -1) throw new Error('Application not found');
    const currentStatus  = sheet.getRange(rowIndex, col['Status']).getValue();
    const leaseStatus    = col['Lease Status'] ? sheet.getRange(rowIndex, col['Lease Status']).getValue() : '';
    if (currentStatus === 'approved' && (leaseStatus === 'signed' || leaseStatus === 'active')) {
      throw new Error('Your lease has already been executed and cannot be withdrawn. Please contact our office directly.');
    }
    if (currentStatus === 'withdrawn') {
      throw new Error('This application has already been withdrawn.');
    }
    sheet.getRange(rowIndex, col['Status']).setValue('withdrawn');
    const now      = new Date();
    const curr     = sheet.getRange(rowIndex, col['Admin Notes']).getValue();
    const noteText = `[${now.toLocaleString()}] Application withdrawn by applicant.`;
    sheet.getRange(rowIndex, col['Admin Notes']).setValue(curr ? curr + '\n' + noteText : noteText);
    if (col['Property ID']) {
      const propertyId = sheet.getRange(rowIndex, col['Property ID']).getValue();
      if (propertyId) _syncPropertyStatusToSupabase(propertyId, 'active');
    }
    return { success: true, message: 'Your application has been withdrawn.' };
  } catch (error) {
    console.error('withdrawApplication error:', error);
    return { success: false, error: error.toString() };
  }
}

// ============================================================
// _syncPropertyStatusToSupabase()
// Keeps the listing platform's Supabase database in sync when
// an application is approved or denied.
//
// approved Ã¢ÂÂ property.status = 'rented'  (takes it off the market)
// denied   Ã¢ÂÂ property.status = 'active'  (makes it available again)
//
// SETUP REQUIRED Ã¢ÂÂ add these two Script Properties in the GAS editor:
//   Extensions Ã¢ÂÂ Apps Script Ã¢ÂÂ Project Settings Ã¢ÂÂ Script Properties
//     SUPABASE_URL         e.g. https://abcdefgh.supabase.co
//     SUPABASE_SERVICE_KEY Your Supabase service role key
//                          (Dashboard Ã¢ÂÂ Settings Ã¢ÂÂ API Ã¢ÂÂ service_role)
//
// This call is fire-and-forget Ã¢ÂÂ errors are logged but never block
// the approval flow. If credentials are not set, it silently skips.
// ============================================================
function _syncPropertyStatusToSupabase(propertyId, supabaseStatus) {
  try {
    const props      = PropertiesService.getScriptProperties();
    const supabaseUrl = props.getProperty('SUPABASE_URL');
    const serviceKey  = props.getProperty('SUPABASE_SERVICE_KEY');

    if (!supabaseUrl || !serviceKey) {
      console.warn('_syncPropertyStatusToSupabase: SUPABASE_URL or SUPABASE_SERVICE_KEY not set in Script Properties. Skipping sync.');
      return;
    }
    if (!propertyId) {
      console.warn('_syncPropertyStatusToSupabase: No Property ID on this application. Skipping sync.');
      return;
    }

    const url = supabaseUrl.replace(/\/$/, '') + '/rest/v1/properties?id=eq.' + encodeURIComponent(propertyId);
    const options = {
      method: 'PATCH',
      contentType: 'application/json',
      headers: {
        'apikey':         serviceKey,
        'Authorization':  'Bearer ' + serviceKey,
        'Prefer':         'return=minimal'
      },
      payload:            JSON.stringify({ status: supabaseStatus }),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const code     = response.getResponseCode();

    if (code >= 200 && code < 300) {
      console.log('_syncPropertyStatusToSupabase: Property ' + propertyId + ' Ã¢ÂÂ "' + supabaseStatus + '" (HTTP ' + code + ')');
    } else {
      console.error('_syncPropertyStatusToSupabase: Supabase returned HTTP ' + code + ': ' + response.getContentText());
    }
  } catch (err) {
    // Never let a sync failure block the approval flow
    console.error('_syncPropertyStatusToSupabase error (non-fatal):', err.toString());
  }
}

// ============================================================
// updateStatus()
// ============================================================

  // Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  // PHASE 5 Ã¢ÂÂ Application Credit System
  // Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ

  const CREDITS_SHEET_NAME = 'Credits';
  const MAX_ACTIVE_CREDITS  = 2;
  const CREDIT_EXPIRY_DAYS  = 45;
  const CREDITS_PER_DENIAL  = 2;

  /**
   * Issue application credits to an applicant after a denial.
   * Rules: max 2 active credits at any time. Each denial issues 2 credits.
   * If applicant already has 2 active credits, no new ones are issued.
   */
  function issueApplicationCredits(email, sourceAppId) {
    try {
      if (!email || !sourceAppId) return;
      const ss    = getSpreadsheet();
      const sheet = ss.getSheetByName(CREDITS_SHEET_NAME);
      if (!sheet) return;

      const now       = new Date();
      const data      = sheet.getDataRange().getValues();
      let activeCount = 0;

      // Count currently active (non-expired) credits for this email
      for (let i = 1; i < data.length; i++) {
        const rowEmail   = data[i][0];
        const rowCredits = parseInt(data[i][1]) || 0;
        const expiry     = new Date(data[i][3]);
        if (rowEmail === email && rowCredits > 0 && expiry > now) {
          activeCount += rowCredits;
        }
      }

      if (activeCount >= MAX_ACTIVE_CREDITS) {
        console.log('issueApplicationCredits: max active credits reached for ' + email);
        return;
      }

      const creditsToIssue = Math.min(CREDITS_PER_DENIAL, MAX_ACTIVE_CREDITS - activeCount);
      const expiryDate     = new Date(now.getTime() + CREDIT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
      sheet.appendRow([email, creditsToIssue, now, expiryDate, sourceAppId]);
      console.log('issueApplicationCredits: issued ' + creditsToIssue + ' credits to ' + email);
    } catch (e) {
      console.error('issueApplicationCredits error:', e.message);
    }
  }

  /**
   * Check if an applicant has valid application credits.
   * Returns { hasCredits: bool, creditsRemaining: number, expiryDate: Date|null, rowIndex: number }
   */
  function checkCredits(email) {
    try {
      if (!email) return { hasCredits: false, creditsRemaining: 0, expiryDate: null, rowIndex: -1 };
      const ss    = getSpreadsheet();
      const sheet = ss.getSheetByName(CREDITS_SHEET_NAME);
      if (!sheet) return { hasCredits: false, creditsRemaining: 0, expiryDate: null, rowIndex: -1 };

      const now  = new Date();
      const data = sheet.getDataRange().getValues();
      let totalActive = 0;
      let earliestExpiry = null;

      for (let i = 1; i < data.length; i++) {
        const rowEmail   = data[i][0];
        const rowCredits = parseInt(data[i][1]) || 0;
        const expiry     = new Date(data[i][3]);
        if (rowEmail === email && rowCredits > 0 && expiry > now) {
          totalActive += rowCredits;
          if (!earliestExpiry || expiry < earliestExpiry) earliestExpiry = expiry;
        }
      }

      return {
        hasCredits:       totalActive > 0,
        creditsRemaining: totalActive,
        expiryDate:       earliestExpiry,
        rowIndex:         -1
      };
    } catch (e) {
      console.error('checkCredits error:', e.message);
      return { hasCredits: false, creditsRemaining: 0, expiryDate: null, rowIndex: -1 };
    }
  }

  /**
   * Consume one application credit for the given email.
   * Deducts from the row with the earliest expiry that still has credits.
   */
  function consumeOneCredit(email) {
    try {
      const ss    = getSpreadsheet();
      const sheet = ss.getSheetByName(CREDITS_SHEET_NAME);
      if (!sheet) return;
      const now  = new Date();
      const data = sheet.getDataRange().getValues();
      let earliestExpiry = null;
      let targetRow = -1;

      for (let i = 1; i < data.length; i++) {
        const rowEmail   = data[i][0];
        const rowCredits = parseInt(data[i][1]) || 0;
        const expiry     = new Date(data[i][3]);
        if (rowEmail === email && rowCredits > 0 && expiry > now) {
          if (!earliestExpiry || expiry < earliestExpiry) {
            earliestExpiry = expiry;
            targetRow = i + 1;
          }
        }
      }

      if (targetRow > 0) {
        const currentCredits = parseInt(sheet.getRange(targetRow, 2).getValue()) || 0;
        sheet.getRange(targetRow, 2).setValue(Math.max(0, currentCredits - 1));
      }
    } catch (e) {
      console.error('consumeOneCredit error:', e.message);
    }
  }

  function updateStatus(appId, newStatus, notes) {
  try {
    const ss    = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error('Applications sheet not found');
    const col  = getColumnMap(sheet);
    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][col['App ID'] - 1] === appId) { rowIndex = i + 1; break; }
    }
    if (rowIndex === -1) throw new Error('Application not found');
    if (newStatus === 'approved' && sheet.getRange(rowIndex, col['Payment Status']).getValue() !== 'paid') {
      throw new Error('Cannot approve application until payment is received');
    }
    const currentStatus = sheet.getRange(rowIndex, col['Status']).getValue();
    if (currentStatus === newStatus) throw new Error(`Application already ${newStatus}`);
    sheet.getRange(rowIndex, col['Status']).setValue(newStatus);
    if (notes) {
      const curr = sheet.getRange(rowIndex, col['Admin Notes']).getValue();
      const note = `[${new Date().toLocaleString()}] Status changed to ${newStatus}. ${notes}`;
      sheet.getRange(rowIndex, col['Admin Notes']).setValue(curr ? curr + '\n' + note : note);
    }
    const email     = sheet.getRange(rowIndex, col['Email']).getValue();
    const firstName = sheet.getRange(rowIndex, col['First Name']).getValue();
    sendStatusUpdateEmail(appId, email, firstName, newStatus, notes);
    logEmail('status_update', email, 'success', appId);

    // Ã¢ÂÂÃ¢ÂÂ Phase 5: Issue application credits on denial Ã¢ÂÂÃ¢ÂÂ
    if (newStatus === 'denied') {
      const emailForCredits = sheet.getRange(rowIndex, col['Email']).getValue();
      issueApplicationCredits(emailForCredits, appId);
    }

    // Sync property availability to the listing platform (Supabase).
      // Only fires on approval Ã¢ÂÂ denial does not change property availability.
      if (newStatus === 'approved' && col['Property ID']) {
        const propertyId = sheet.getRange(rowIndex, col['Property ID']).getValue();
        _syncPropertyStatusToSupabase(propertyId, 'rented');
      }

      // [FIXED-M5] Reverse sync: if an approved application is later reversed (withdrawn or denied),
      // restore the listing back to 'active' so it appears available again on the platform.
      if ((newStatus === 'withdrawn' || newStatus === 'denied')
          && String(currentStatus).toLowerCase() === 'approved'
          && col['Property ID']) {
        const propertyId = sheet.getRange(rowIndex, col['Property ID']).getValue();
        if (propertyId) {
          _syncPropertyStatusToSupabase(propertyId, 'active');
          console.log('updateStatus: Restored property ' + propertyId + ' to active after reversal from approved Ã¢ÂÂ ' + newStatus);
        }
      }

    return { success: true, message: `Status updated to ${newStatus}` };
  } catch (error) {
    console.error('updateStatus error:', error);
    logEmail('status_update', 'admin', 'failed', appId, error.toString());
    return { success: false, error: error.toString() };
  }
}

// ============================================================
// getApplication()
// ============================================================
function getApplication(query) {
  try {
    const ss    = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error('Applications sheet not found');
    const data    = sheet.getDataRange().getValues();
    const headers = data[0];
    for (let i = 1; i < data.length; i++) {
      const row   = data[i];
      const appId = row[1];
      const email = row[8];
      if (appId === query || email === query) {
        const result = {};
        headers.forEach((header, index) => { result[header] = row[index]; });
        delete result['SSN'];
        delete result['Co-Applicant SSN'];
        return { success: true, application: result };
      }
    }
    return { success: false, error: 'Application not found' };
  } catch (error) {
    console.error('getApplication error:', error);
    return { success: false, error: error.toString() };
  }
}

// ============================================================
// getAllApplications()
// ============================================================
function getAllApplications(filterStatus) {
  try {
    const ss    = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error('Applications sheet not found');
    const data    = sheet.getDataRange().getValues();
    const headers = data[0];
    const applications = [];
    for (let i = 1; i < data.length; i++) {
      const row           = data[i];
      const status        = row[2];
      const paymentStatus = row[3];
      let displayStatus = paymentStatus === 'unpaid' ? 'pending' :
                         (status === 'approved' ? 'approved' :
                         (status === 'denied'   ? 'denied'   :
                         (paymentStatus === 'paid' ? 'reviewing' : 'pending')));
      if (filterStatus && filterStatus !== 'all') {
        if (filterStatus === 'pending'  && displayStatus !== 'pending')  continue;
        if (filterStatus === 'paid'     && paymentStatus !== 'paid')     continue;
        if (filterStatus === 'approved' && status !== 'approved')        continue;
        if (filterStatus === 'denied'   && status !== 'denied')          continue;
      }
      const app = {};
      headers.forEach((header, index) => {
        if (!header.includes('SSN')) app[header] = row[index];
      });
      app['DisplayStatus'] = displayStatus;
      applications.push(app);
    }
    applications.sort((a, b) => new Date(b['Timestamp']) - new Date(a['Timestamp']));
    return { success: true, applications: applications };
  } catch (error) {
    console.error('getAllApplications error:', error);
    return { success: false, error: error.toString() };
  }
}

// ============================================================
// getDataFingerprint()
// Lightweight check Ã¢ÂÂ returns a hash of all App IDs + statuses.
// Used by both dashboards to decide whether a full data fetch
// is needed. Costs almost nothing server-side.
// ============================================================
function getDataFingerprint() {
  try {
    const ss    = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) return { success: false, fingerprint: '' };
    const col  = getColumnMap(sheet);
    const data = sheet.getDataRange().getValues();
    let fp = '';
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      fp += (row[col['App ID']-1]||'') + '|' +
            (row[col['Status']-1]||'') + '|' +
            (row[col['Payment Status']-1]||'') + '|' +
            (row[col['Lease Status']-1]||'') + ';';
    }
    return { success: true, fingerprint: fp, count: data.length - 1 };
  } catch (e) {
    return { success: false, fingerprint: '', count: 0 };
  }
}

// ============================================================
// getApplicationLiveStatus()
// Returns only the live status fields for a single applicant.
// Used by the applicant dashboard poller.
// ============================================================
function getApplicationLiveStatus(appId) {
  try {
    const ss    = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) return { success: false };
    const col  = getColumnMap(sheet);
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][col['App ID']-1] === appId) {
        return {
          success       : true,
          paymentStatus : data[i][col['Payment Status']-1] || 'unpaid',
          appStatus     : data[i][col['Status']-1]         || 'pending',
          leaseStatus   : data[i][col['Lease Status']-1]   || 'none',
          leaseStartDate: data[i][col['Lease Start Date']-1]|| '',
          leaseEndDate  : data[i][col['Lease End Date']-1]  || '',
          monthlyRent   : data[i][col['Monthly Rent']-1]    || '',
          securityDeposit: data[i][col['Security Deposit']-1]|| '',
          moveInCosts   : data[i][col['Move-in Costs']-1]   || '',
          leaseNotes    : data[i][col['Lease Notes']-1]     || '',
          fingerprint   : (data[i][col['Payment Status']-1]||'') + '|' +
                          (data[i][col['Status']-1]||'') + '|' +
                          (data[i][col['Lease Status']-1]||'')
        };
      }
    }
    return { success: false };
  } catch (e) {
    return { success: false };
  }
}

// ============================================================
// logEmail()
// ============================================================
function logEmail(type, recipient, status, appId, errorMsg) {
  try {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName(LOG_SHEET);
    if (!sheet) {
      sheet = ss.insertSheet(LOG_SHEET);
      sheet.getRange(1,1,1,6).setValues([['Timestamp','Type','Recipient','Status','App ID','Error']])
           .setFontWeight('bold').setBackground('#1a5276').setFontColor('#ffffff');
    }
    sheet.appendRow([new Date(), type, recipient, status, appId || '', errorMsg || '']);
  } catch (error) { console.error('logEmail error:', error); }
}

// ============================================================
// renderApplicantDashboard()  Ã¢ÂÂ extended with lease status card
// ============================================================
// ============================================================
// renderApplicantDashboard() Ã¢ÂÂ ENHANCED UI
// ============================================================

  // Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  // PHASE 6 Ã¢ÂÂ Holding Deposit Refund Eligibility
  // Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ

  /**
   * Calculate holding deposit refund eligibility based on payment timestamp.
   * Returns: { status: 'full'|'partial'|'none'|'unknown', label: string, color: string }
   */
  function getHoldingDepositRefundEligibility(app) {
    const tsRaw = app['Holding Fee Payment Timestamp'];
    if (!tsRaw) {
      // Fallback: use Holding Fee Date if timestamp not stored yet
      const dateRaw = app['Holding Fee Date'];
      if (!dateRaw) return { status: 'unknown', label: 'Timestamp not available', color: '#9e9e9e' };
      const paidAt = new Date(dateRaw);
      const hoursElapsed = (Date.now() - paidAt.getTime()) / 3600000;
      if (hoursElapsed < 24) return { status: 'full',    label: 'Full refund available (within 24h)',        color: '#43a047' };
      if (hoursElapsed < 48) return { status: 'partial', label: 'Partial refund Ã¢ÂÂ review case (24Ã¢ÂÂ48h)',     color: '#fb8c00' };
      return                        { status: 'none',    label: 'Non-refundable (48h+ or lease executed)',   color: '#e53935' };
    }
    const paidAt      = new Date(parseInt(tsRaw));
    const hoursElapsed = (Date.now() - paidAt.getTime()) / 3600000;
    const leaseExecuted = app['Lease Status'] === 'signed' || app['Lease Status'] === 'active';
    if (leaseExecuted) return { status: 'none', label: 'Non-refundable (lease executed)', color: '#e53935' };
    if (hoursElapsed < 24) return { status: 'full',    label: 'Full refund available (within 24h)',       color: '#43a047' };
    if (hoursElapsed < 48) return { status: 'partial', label: 'Partial refund Ã¢ÂÂ review case (24Ã¢ÂÂ48h)',    color: '#fb8c00' };
    return                        { status: 'none',    label: 'Non-refundable (48h+ or lease executed)',  color: '#e53935' };
  }

  function renderApplicantDashboard(appId) {
  const result = getApplication(appId);
  if (!result.success) return renderLoginPage('Invalid application ID or email. Please try again.');

  const app = result.application;
  const baseUrl = ScriptApp.getService().getUrl();

  // Ã¢ÂÂÃ¢ÂÂ Status logic Ã¢ÂÂÃ¢ÂÂ
  let statusColor, statusGradient, statusText, statusIcon, statusSubtext;
  if (app['Payment Status'] === 'unpaid') {
    statusColor = '#f59e0b'; statusGradient = 'linear-gradient(135deg,#f59e0b,#fbbf24)';
    statusText = 'Pending Payment'; statusIcon = 'Ã¢ÂÂ³';
    statusSubtext = 'Action required Ã¢ÂÂ payment needed to proceed';
  } else if (app['Status'] === 'approved' && (app['Lease Status'] === 'signed' || app['Lease Status'] === 'active')) {
    statusColor = '#10b981'; statusGradient = 'linear-gradient(135deg,#059669,#10b981)';
    statusText = 'Lease Signed'; statusIcon = 'Ã°ÂÂÂ ';
    statusSubtext = 'Welcome! Your lease is fully executed';
  } else if (app['Lease Status'] === 'sent') {
    statusColor = '#3b82f6'; statusGradient = 'linear-gradient(135deg,#2563eb,#3b82f6)';
    statusText = 'Lease Ready to Sign'; statusIcon = 'Ã°ÂÂÂ';
    statusSubtext = 'Please review and sign your lease agreement';
  } else if (app['Status'] === 'approved') {
    statusColor = '#10b981'; statusGradient = 'linear-gradient(135deg,#059669,#10b981)';
    statusText = 'Approved'; statusIcon = 'Ã¢ÂÂ';
    statusSubtext = 'Congratulations! Your application was approved';
  } else if (app['Status'] === 'denied') {
    statusColor = '#ef4444'; statusGradient = 'linear-gradient(135deg,#dc2626,#ef4444)';
    statusText = 'Not Approved'; statusIcon = 'Ã°ÂÂÂ';
    statusSubtext = 'Thank you for your application';
  } else if (app['Status'] === 'withdrawn') {
    statusColor = '#64748b'; statusGradient = 'linear-gradient(135deg,#475569,#64748b)';
    statusText = 'Withdrawn'; statusIcon = 'Ã¢ÂÂ©Ã¯Â¸Â';
    statusSubtext = 'You have withdrawn this application';
  } else if (app['Payment Status'] === 'paid') {
    statusColor = '#6366f1'; statusGradient = 'linear-gradient(135deg,#4f46e5,#6366f1)';
    statusText = 'Under Review'; statusIcon = 'Ã°ÂÂÂ';
    statusSubtext = 'Your application is being reviewed';
  } else {
    statusColor = '#64748b'; statusGradient = 'linear-gradient(135deg,#475569,#64748b)';
    statusText = 'Received'; statusIcon = 'Ã°ÂÂÂ';
    statusSubtext = 'We have received your application';
  }

  // Ã¢ÂÂÃ¢ÂÂ Progress steps Ã¢ÂÂÃ¢ÂÂ
  const hfStatusDash = app['Holding Fee Status'] || 'none';
  const hfAmtDash    = parseFloat(app['Holding Fee Amount']) || 0;
  const steps = [
    { label: 'Received',     done: true },
    { label: 'Payment',      done: app['Payment Status'] === 'paid' },
    { label: 'Under Review', done: app['Payment Status'] === 'paid' && (app['Status'] === 'approved' || app['Status'] === 'denied' || app['Status'] === 'waitlisted') },
    { label: 'Decision',     done: app['Status'] === 'approved' || app['Status'] === 'denied' || app['Status'] === 'waitlisted' },
    { label: 'Lease Ready',  done: app['Lease Status'] === 'sent' || app['Lease Status'] === 'signed' || app['Lease Status'] === 'active' },
    { label: 'Move-In',      done: app['Lease Status'] === 'signed' || app['Lease Status'] === 'active' }
  ];
  const reviewTimeHint = (app['Payment Status'] === 'paid' && app['Status'] === 'received') ? '<p style="font-size:12px;color:#64748b;text-align:center;margin-top:10px;"><i class="fas fa-clock" style="margin-right:4px;"></i>Typical review time: 24Ã¢ÂÂ72 business hours</p>' : '';
  const progressHtml = steps.map((s, i) => `
    <div style="display:flex;flex-direction:column;align-items:center;flex:1;position:relative;">
      ${i < steps.length - 1 ? `<div style="position:absolute;top:16px;left:50%;width:100%;height:3px;background:${s.done ? statusColor : '#e2e8f0'};z-index:0;"></div>` : ''}
      <div style="width:34px;height:34px;border-radius:50%;background:${s.done ? statusColor : '#e2e8f0'};color:${s.done ? 'white' : '#94a3b8'};display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;position:relative;z-index:1;box-shadow:${s.done ? '0 4px 10px rgba(0,0,0,.15)' : 'none'};">${s.done ? 'Ã¢ÂÂ' : (i + 1)}</div>
      <span style="font-size:11px;font-weight:600;color:${s.done ? '#1e293b' : '#94a3b8'};margin-top:7px;text-align:center;line-height:1.2;">${s.label}</span>
    </div>`).join('');

  // Ã¢ÂÂÃ¢ÂÂ Phase 8.1: Denied reapplication card Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  let deniedCardHtml = '';
  if (app['Status'] === 'denied') {
    deniedCardHtml = `
      <div style="background:white;border-radius:18px;overflow:hidden;box-shadow:0 4px 20px rgba(239,68,68,.12);margin:0 0 20px;border:1.5px solid #fca5a5;">
        <div style="background:linear-gradient(135deg,#dc2626,#ef4444);padding:18px 24px;display:flex;align-items:center;gap:14px;">
          <div style="width:44px;height:44px;background:rgba(255,255,255,.2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">Ã°ÂÂÂ</div>
          <div>
            <div style="color:white;font-weight:700;font-size:16px;">Reapplication Protection</div>
            <div style="color:rgba(255,255,255,.85);font-size:13px;margin-top:2px;">Your options going forward</div>
          </div>
        </div>
        <div style="padding:18px 22px;font-size:14px;color:#374151;">
          <p style="margin:0 0 12px;line-height:1.6;">While we were unable to approve your application for this property, our decision is based on current criteria and is <strong>not permanent</strong>.</p>
          <div style="background:#fef2f2;border-radius:12px;padding:14px 16px;margin-bottom:14px;">
            <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;font-size:13px;line-height:1.5;"><span style="color:#dc2626;font-weight:700;flex-shrink:0;">Ã¢ÂÂ</span><span><strong>No new fee for 30 days</strong> Ã¢ÂÂ Apply for any other available Choice Properties unit within 30 days and the $50 application fee will be waived.</span></div>
            <div style="display:flex;align-items:flex-start;gap:10px;font-size:13px;line-height:1.5;"><span style="color:#dc2626;font-weight:700;flex-shrink:0;">Ã¢ÂÂ</span><span><strong>Results valid for 60 days</strong> Ã¢ÂÂ Your background and credit screening remains on file and can be applied to a new application without re-running checks.</span></div>
          </div>
          <p style="margin:0 0 14px;font-size:13px;color:#6b7280;line-height:1.5;">We encourage you to reach out Ã¢ÂÂ our team can discuss available properties that may be a better fit and walk you through your options.</p>
          <div style="display:flex;flex-wrap:wrap;gap:10px;">
            <a href="tel:7077063137" style="display:inline-flex;align-items:center;gap:8px;background:#dc2626;color:white;padding:11px 20px;border-radius:50px;font-weight:600;font-size:14px;text-decoration:none;"><i class="fas fa-phone"></i> Call Us</a>
            <a href="mailto:choicepropertygroup@hotmail.com" style="display:inline-flex;align-items:center;gap:8px;background:white;color:#dc2626;border:2px solid #fca5a5;padding:10px 20px;border-radius:50px;font-weight:600;font-size:14px;text-decoration:none;"><i class="fas fa-envelope"></i> Email Us</a>
          </div>
        </div>
      </div>`;
  }

  // Ã¢ÂÂÃ¢ÂÂ Phase 8.5: Withdraw button (shown when status is still actionable) Ã¢ÂÂÃ¢ÂÂ
  const canWithdraw = !['approved', 'denied', 'withdrawn'].includes(app['Status'] || '') &&
                      !['signed', 'active'].includes(app['Lease Status'] || '');
  const withdrawHtml = canWithdraw ? `
    <div style="text-align:center;margin:0 0 20px;">
      <button id="withdrawBtn" onclick="withdrawApp()" style="background:none;border:none;color:#94a3b8;font-size:13px;cursor:pointer;text-decoration:underline;font-family:inherit;padding:4px 8px;">
        Withdraw my application
      </button>
    </div>` : '';

  // Ã¢ÂÂÃ¢ÂÂ Holding fee card (shown on approved apps when HF requested or paid) Ã¢ÂÂÃ¢ÂÂ
  let hfCardHtml = '';
  if (app['Status'] === 'approved' && hfStatusDash !== 'none') {
    const hfPaid = hfStatusDash === 'paid';
    hfCardHtml = `
      <div style="background:white;border-radius:18px;overflow:hidden;box-shadow:0 4px 20px ${hfPaid ? 'rgba(16,185,129,.12)' : 'rgba(245,158,11,.15)'};margin:0 0 20px;border:1.5px solid ${hfPaid ? '#a7f3d0' : '#fcd34d'};">
        <div style="background:${hfPaid ? 'linear-gradient(135deg,#059669,#10b981)' : 'linear-gradient(135deg,#d97706,#f59e0b)'};padding:16px 22px;display:flex;align-items:center;gap:14px;">
          <div style="width:42px;height:42px;background:rgba(255,255,255,.2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">${hfPaid ? 'Ã¢ÂÂ' : 'Ã¢ÂÂ³'}</div>
          <div>
            <div style="color:white;font-weight:700;font-size:16px;">${hfPaid ? 'Holding Fee Received Ã¢ÂÂ Thank You!' : 'Action Required: Holding Fee'}</div>
            <div style="color:rgba(255,255,255,.85);font-size:13px;margin-top:2px;">${hfPaid ? `$${hfAmtDash.toLocaleString()} credited toward your move-in total` : `$${hfAmtDash.toLocaleString()} due within 48 hours to hold your unit`}</div>
          </div>
        </div>
        <div style="padding:16px 22px;font-size:14px;color:#374151;">
          ${hfPaid
            ? `<p style="margin:0;">Your holding deposit of <strong>$${hfAmtDash.toLocaleString()}</strong> has been received and will be fully credited toward your move-in total when you take possession. No further action is needed at this time Ã¢ÂÂ our team will be in touch with your lease details shortly.</p>`
            : `<p style="margin:0 0 10px;">To officially reserve this unit, a holding fee of <strong>$${hfAmtDash.toLocaleString()}</strong> is required. Please contact our office to submit payment. This fee is not an additional charge Ã¢ÂÂ it will be credited in full toward your move-in costs.</p>
               <p style="margin:0;color:#b45309;font-weight:600;">Ã¢ÂÂ° Please respond within 48 hours. The unit may be offered to another applicant if the holding fee is not received.</p>
               <p style="margin:10px 0 0;"><strong>Contact us:</strong> <a href="tel:7077063137" style="color:#d97706;">707-706-3137</a> &nbsp;|&nbsp; <a href="mailto:choicepropertygroup@hotmail.com" style="color:#d97706;">choicepropertygroup@hotmail.com</a></p>`
          }
        </div>
      </div>`;
  }

  // Ã¢ÂÂÃ¢ÂÂ Lease card Ã¢ÂÂÃ¢ÂÂ
  const leaseStatus = app['Lease Status'] || 'none';
  let leaseCardHtml = '';
  if (leaseStatus === 'sent') {
    const leaseLink = baseUrl + '?path=lease&id=' + appId;
    leaseCardHtml = `
      <div style="background:white;border-radius:18px;overflow:hidden;box-shadow:0 4px 20px rgba(37,99,235,.12);margin:0 0 20px;border:1.5px solid #bfdbfe;">
        <div style="background:linear-gradient(135deg,#1d4ed8,#3b82f6);padding:18px 24px;display:flex;align-items:center;gap:14px;">
          <div style="width:46px;height:46px;background:rgba(255,255,255,.2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">Ã°ÂÂÂ</div>
          <div><div style="color:white;font-weight:700;font-size:17px;">Your Lease is Ready to Sign</div><div style="color:rgba(255,255,255,.8);font-size:13px;margin-top:2px;">Please review carefully before signing</div></div>
        </div>
        <div style="padding:20px 24px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
            <div style="background:#f0f9ff;border-radius:12px;padding:14px;text-align:center;"><div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Monthly Rent</div><div style="font-size:22px;font-weight:800;color:#1d4ed8;">$${parseFloat(app['Monthly Rent']||0).toLocaleString()}</div></div>
            <div style="background:#f0fdf4;border-radius:12px;padding:14px;text-align:center;"><div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Move-in Total</div><div style="font-size:22px;font-weight:800;color:#059669;">$${parseFloat(app['Move-in Costs']||0).toLocaleString()}</div></div>
          </div>
          <div style="background:#f8fafc;border-radius:10px;padding:12px 16px;margin-bottom:16px;">
            <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #e2e8f0;font-size:14px;"><span style="color:#64748b;font-weight:500;">Lease Start Date</span><span style="font-weight:600;color:#1e293b;">${app['Lease Start Date']||'Ã¢ÂÂ'}</span></div>
            <div style="display:flex;justify-content:space-between;padding:7px 0;font-size:14px;"><span style="color:#64748b;font-weight:500;">Security Deposit</span><span style="font-weight:600;color:#1e293b;">$${parseFloat(app['Security Deposit']||0).toLocaleString()}</span></div>
          </div>
          <a href="${leaseLink}" style="display:block;background:linear-gradient(to right,#059669,#10b981);color:white;text-align:center;padding:16px;border-radius:50px;font-weight:700;font-size:17px;text-decoration:none;letter-spacing:.2px;box-shadow:0 6px 18px rgba(16,185,129,.3);">Ã¢ÂÂÃ¯Â¸Â Review &amp; Sign My Lease</a>
          <p style="font-size:12px;color:#f59e0b;text-align:center;margin:10px 0 0;font-weight:600;">Ã¢ÂÂ° Please sign within 48 hours to hold your unit</p>
        </div>
      </div>`;
  } else if (leaseStatus === 'signed' || leaseStatus === 'active') {
    leaseCardHtml = `
      <div style="background:white;border-radius:18px;overflow:hidden;box-shadow:0 4px 20px rgba(16,185,129,.12);margin:0 0 20px;border:1.5px solid #a7f3d0;">
        <div style="background:linear-gradient(135deg,#059669,#10b981);padding:18px 24px;display:flex;align-items:center;gap:14px;">
          <div style="width:46px;height:46px;background:rgba(255,255,255,.2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">Ã°ÂÂÂ </div>
          <div><div style="color:white;font-weight:700;font-size:17px;">Lease Signed Ã¢ÂÂ Welcome Home!</div><div style="color:rgba(255,255,255,.8);font-size:13px;margin-top:2px;">Your tenancy is confirmed</div></div>
        </div>
        <div style="padding:20px 24px;">
          <div style="background:#f0fdf4;border-radius:12px;padding:4px 0;margin-bottom:16px;">
            ${[['Property',app['Property Address']||'Ã¢ÂÂ'],['Move-in Date',app['Lease Start Date']||'Ã¢ÂÂ'],['Lease Ends',app['Lease End Date']||'Ã¢ÂÂ'],['Monthly Rent','$'+parseFloat(app['Monthly Rent']||0).toLocaleString()],['Signed By',app['Tenant Signature']||'Ã¢ÂÂ']].map(([l,v],i,a)=>`<div style="display:flex;justify-content:space-between;padding:10px 16px;${i<a.length-1?'border-bottom:1px solid #d1fae5;':''}font-size:14px;"><span style="color:#64748b;font-weight:500;">${l}</span><span style="font-weight:600;color:#1e293b;">${v}</span></div>`).join('')}
          </div>
          <p style="font-size:13px;color:#059669;text-align:center;font-weight:600;margin:0;">Questions? Text us at <strong>707-706-3137</strong></p>
        </div>
      </div>`;
  }

  // Ã¢ÂÂÃ¢ÂÂ Payment methods Ã¢ÂÂÃ¢ÂÂ
  const paymentMethods = [];
  if (app['Primary Payment Method']) {
    const v = app['Primary Payment Method'] === 'Other' && app['Primary Payment Method Other'] ? app['Primary Payment Method Other'] : app['Primary Payment Method'];
    paymentMethods.push({ label: 'Primary', value: v });
  }
  if (app['Alternative Payment Method']) {
    const v = app['Alternative Payment Method'] === 'Other' && app['Alternative Payment Method Other'] ? app['Alternative Payment Method Other'] : app['Alternative Payment Method'];
    paymentMethods.push({ label: 'Secondary', value: v });
  }
  if (app['Third Choice Payment Method']) {
    const v = app['Third Choice Payment Method'] === 'Other' && app['Third Choice Payment Method Other'] ? app['Third Choice Payment Method Other'] : app['Third Choice Payment Method'];
    paymentMethods.push({ label: '3rd Choice', value: v });
  }

  // Ã¢ÂÂÃ¢ÂÂ Extra detail sections Ã¢ÂÂÃ¢ÂÂ
  let extraHtml = '';
  if (app['Has Co-Applicant'] && app['Co-Applicant First Name']) {
    extraHtml += `<div style="margin-bottom:20px;"><h4 style="font-size:14px;font-weight:700;color:#1e293b;margin:0 0 12px;display:flex;align-items:center;gap:8px;"><span style="background:#e0e7ff;color:#4f46e5;padding:5px 10px;border-radius:20px;font-size:13px;">Ã°ÂÂÂ¥ Co-Applicant / Guarantor</span></h4><div style="background:#f8fafc;border-radius:12px;padding:16px;font-size:14px;"><div style="display:grid;gap:8px;"><div><span style="color:#64748b;font-weight:500;">Role:</span> <span style="font-weight:600;">${app['Additional Person Role']||'Not specified'}</span></div><div><span style="color:#64748b;font-weight:500;">Name:</span> <span style="font-weight:600;">${app['Co-Applicant First Name']||''} ${app['Co-Applicant Last Name']||''}</span></div><div><span style="color:#64748b;font-weight:500;">Email:</span> <span style="font-weight:600;">${app['Co-Applicant Email']||''}</span></div><div><span style="color:#64748b;font-weight:500;">Phone:</span> <span style="font-weight:600;">${app['Co-Applicant Phone']||''}</span></div></div></div></div>`;
  }
  if (app['Vehicle Make']) {
    extraHtml += `<div style="margin-bottom:20px;"><h4 style="font-size:14px;font-weight:700;color:#1e293b;margin:0 0 12px;display:flex;align-items:center;gap:8px;"><span style="background:#fef3c7;color:#d97706;padding:5px 10px;border-radius:20px;font-size:13px;">Ã°ÂÂÂ Vehicle</span></h4><div style="background:#f8fafc;border-radius:12px;padding:16px;font-size:14px;"><div style="display:grid;gap:8px;"><div><span style="color:#64748b;font-weight:500;">Make:</span> <span style="font-weight:600;">${app['Vehicle Make']}</span></div><div><span style="color:#64748b;font-weight:500;">Model:</span> <span style="font-weight:600;">${app['Vehicle Model']||''}</span></div><div><span style="color:#64748b;font-weight:500;">Year:</span> <span style="font-weight:600;">${app['Vehicle Year']||''}</span></div></div></div></div>`;
  }
  if (app['Preferred Contact Method'] || app['Preferred Time']) {
    extraHtml += `<div style="margin-bottom:20px;"><h4 style="font-size:14px;font-weight:700;color:#1e293b;margin:0 0 12px;display:flex;align-items:center;gap:8px;"><span style="background:#dcfce7;color:#16a34a;padding:5px 10px;border-radius:20px;font-size:13px;">Ã°ÂÂÂ± Contact Preferences</span></h4><div style="background:#f8fafc;border-radius:12px;padding:16px;font-size:14px;"><div style="display:grid;gap:8px;"><div><span style="color:#64748b;font-weight:500;">Method:</span> <span style="font-weight:600;">${app['Preferred Contact Method']||'Not specified'}</span></div><div><span style="color:#64748b;font-weight:500;">Times:</span> <span style="font-weight:600;">${app['Preferred Time']||'Any'}</span></div><div><span style="color:#64748b;font-weight:500;">Notes:</span> <span style="font-weight:600;">${app['Preferred Time Specific']||'None'}</span></div></div></div></div>`;
  }

  return HtmlService.createHtmlOutput(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Application Status Ã¢ÂÂ Choice Properties</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#1B3A5C">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { font-size: 16px; -webkit-tap-highlight-color: transparent; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: linear-gradient(160deg, #0D2137 0%, #1B3A5C 50%, #0D2137 100%);
      min-height: 100vh;
      color: #1e293b;
      padding: 20px 16px 40px;
    }
    .shell { max-width: 640px; margin: 0 auto; }

    /* Ã¢ÂÂÃ¢ÂÂ Top bar Ã¢ÂÂÃ¢ÂÂ */
    .top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding: 0 2px;
    }
    .brand { display: flex; align-items: center; gap: 11px; }
    .brand-logo {
      width: 44px; height: 44px;
      background: linear-gradient(135deg, #1B3A5C, #2A6FAD);
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-size: 14px; font-weight: 800; color: white; letter-spacing: -.5px;
      box-shadow: 0 4px 14px rgba(42,111,173,.45);
      border: 1.5px solid rgba(255,255,255,.18);
      flex-shrink: 0;
    }
    .brand-name { color: white; font-weight: 700; font-size: 16px; line-height: 1.2; }
    .brand-sub  { color: rgba(255,255,255,.5); font-size: 11px; margin-top: 2px; font-weight: 500; }
    .refresh-btn {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      background: rgba(255,255,255,.1);
      border: 1.5px solid rgba(255,255,255,.18);
      color: rgba(255,255,255,.9);
      padding: 9px 18px;
      border-radius: 50px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all .2s;
      font-family: inherit;
      touch-action: manipulation;
    }
    .refresh-btn:hover, .refresh-btn:active { background: rgba(255,255,255,.18); border-color: rgba(255,255,255,.3); }

    /* Ã¢ÂÂÃ¢ÂÂ Status hero card Ã¢ÂÂÃ¢ÂÂ */
    .status-hero {
      background: white;
      border-radius: 22px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,.35);
      margin-bottom: 16px;
    }
    .status-banner {
      background: ${statusGradient};
      padding: 28px 24px 26px;
      position: relative;
      overflow: hidden;
    }
    .status-banner::after {
      content: '';
      position: absolute;
      top: -50px; right: -50px;
      width: 200px; height: 200px;
      background: rgba(255,255,255,.07);
      border-radius: 50%;
    }
    .status-icon-wrap {
      width: 60px; height: 60px;
      background: rgba(255,255,255,.18);
      border-radius: 18px;
      display: flex; align-items: center; justify-content: center;
      font-size: 28px;
      margin-bottom: 14px;
      backdrop-filter: blur(4px);
      border: 1.5px solid rgba(255,255,255,.2);
    }
    .status-title {
      color: white;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -.4px;
      margin-bottom: 5px;
      line-height: 1.1;
    }
    .status-sub { color: rgba(255,255,255,.82); font-size: 14px; line-height: 1.4; }
    .app-id-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255,255,255,.15);
      color: white;
      padding: 6px 14px;
      border-radius: 50px;
      font-size: 12px;
      font-weight: 700;
      font-family: 'Courier New', monospace;
      margin-top: 14px;
      border: 1.5px solid rgba(255,255,255,.25);
      letter-spacing: .3px;
    }

    /* Ã¢ÂÂÃ¢ÂÂ Progress tracker Ã¢ÂÂÃ¢ÂÂ */
    .progress-wrap {
      padding: 20px 20px 18px;
      border-bottom: 1px solid #f1f5f9;
    }
    .progress-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      color: #94a3b8;
      margin-bottom: 16px;
    }
    .progress-steps {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    /* Ã¢ÂÂÃ¢ÂÂ Payment pending alert Ã¢ÂÂÃ¢ÂÂ */
    .payment-alert {
      margin: 18px 20px;
      background: linear-gradient(135deg, #fffbeb, #fef3c7);
      border: 1.5px solid #fcd34d;
      border-radius: 16px;
      padding: 18px 20px;
    }
    .payment-alert h5 {
      font-size: 15px;
      font-weight: 700;
      color: #92400e;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .payment-alert p { font-size: 13px; color: #78350f; line-height: 1.5; margin-bottom: 12px; }
    .pay-method-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: white;
      border: 1.5px solid #f59e0b;
      border-radius: 50px;
      padding: 5px 13px;
      font-size: 12px;
      font-weight: 700;
      color: #92400e;
      margin: 3px 4px 3px 0;
    }

    /* Ã¢ÂÂÃ¢ÂÂ Info grid Ã¢ÂÂÃ¢ÂÂ */
    .info-section { padding: 18px 20px 4px; }
    .section-header {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      color: #94a3b8;
      margin-bottom: 14px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 20px;
    }
    .info-tile {
      background: #f8fafc;
      border: 1px solid #e8edf3;
      border-radius: 14px;
      padding: 13px 15px;
      transition: box-shadow .2s;
    }
    .info-tile:hover { box-shadow: 0 4px 14px rgba(0,0,0,.07); }
    .tile-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .6px;
      color: #94a3b8;
      margin-bottom: 5px;
    }
    .tile-value {
      font-size: 14px;
      font-weight: 700;
      color: #1e293b;
      word-break: break-word;
      line-height: 1.3;
    }

    /* Ã¢ÂÂÃ¢ÂÂ Toggle button Ã¢ÂÂÃ¢ÂÂ */
    .toggle-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 9px;
      width: calc(100% - 40px);
      margin: 4px 20px 18px;
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      color: #475569;
      padding: 14px 16px;
      border-radius: 14px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all .2s;
      font-family: inherit;
      touch-action: manipulation;
    }
    .toggle-btn:hover, .toggle-btn:active { background: #f1f5f9; border-color: #cbd5e1; color: #1e293b; }
    .extra-details { display: none; padding: 0 20px 4px; }

    /* Ã¢ÂÂÃ¢ÂÂ Contact card (replaces dark footer) Ã¢ÂÂÃ¢ÂÂ */
    .contact-card {
      background: white;
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 8px 28px rgba(0,0,0,.2);
      margin-bottom: 16px;
    }
    .contact-card-header {
      background: linear-gradient(135deg, #0D2137, #1B3A5C);
      padding: 18px 20px;
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .contact-card-icon {
      width: 42px; height: 42px;
      background: rgba(255,255,255,.12);
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-size: 17px; color: white; flex-shrink: 0;
      border: 1.5px solid rgba(255,255,255,.18);
    }
    .contact-card-title { color: white; font-weight: 700; font-size: 15px; line-height: 1.2; }
    .contact-card-sub { color: rgba(255,255,255,.55); font-size: 12px; margin-top: 2px; }
    .contact-card-body { padding: 16px 18px; display: flex; flex-direction: column; gap: 10px; }
    .contact-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 11px 14px;
      background: #f8fafc;
      border-radius: 12px;
      border: 1px solid #e8edf3;
      text-decoration: none;
      transition: all .2s;
      touch-action: manipulation;
    }
    .contact-row:hover, .contact-row:active { background: #f1f5f9; border-color: #cbd5e1; }
    .contact-row-icon {
      width: 36px; height: 36px;
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 15px; flex-shrink: 0;
    }
    .contact-row-icon.phone { background: #dcfce7; color: #15803d; }
    .contact-row-icon.email { background: #dbeafe; color: #1d4ed8; }
    .contact-row-icon.address { background: #f3e8ff; color: #7c3aed; }
    .contact-row-text { flex: 1; min-width: 0; }
    .contact-row-label { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: .5px; }
    .contact-row-value { font-size: 14px; font-weight: 600; color: #1e293b; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .contact-row-arrow { color: #94a3b8; font-size: 12px; flex-shrink: 0; }

    /* Keep .contact-footer for JS DOM queries Ã¢ÂÂ rendered invisible */
    .contact-footer { display: none; }

    /* Ã¢ÂÂÃ¢ÂÂ Back link Ã¢ÂÂÃ¢ÂÂ */
    .back-link {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 15px 24px;
      background: rgba(255,255,255,.1);
      border: 1.5px solid rgba(255,255,255,.2);
      color: rgba(255,255,255,.92);
      text-decoration: none;
      border-radius: 16px;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 24px;
      transition: all .2s;
      touch-action: manipulation;
    }
    .back-link:hover, .back-link:active { background: rgba(255,255,255,.18); border-color: rgba(255,255,255,.32); color: white; }

    /* Ã¢ÂÂÃ¢ÂÂ Responsive Ã¢ÂÂÃ¢ÂÂ */
    @media (max-width: 480px) {
      body { padding: 16px 12px 36px; }
      .status-title { font-size: 23px; }
      .status-banner { padding: 22px 20px 20px; }
      .info-section { padding: 16px 16px 4px; }
      .toggle-btn { width: calc(100% - 32px); margin: 4px 16px 16px; }
      .extra-details { padding: 0 16px 4px; }
      .progress-wrap { padding: 18px 16px 16px; }
      .payment-alert { margin: 16px 16px; }
    }
    @media (max-width: 360px) {
      .progress-steps > div > span { display: none !important; }
      .info-grid { grid-template-columns: 1fr; }
    }

    /* Ã¢ÂÂÃ¢ÂÂ Animations Ã¢ÂÂÃ¢ÂÂ */
    @keyframes slideDown { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }
    .animate-in { animation: slideDown .3s ease forwards; }
  </style>
</head>
<body>
<div class="shell">

  <!-- Top bar -->
  <div class="top-bar">
    <div class="brand">
      <div class="brand-logo">CP</div>
      <div>
        <div class="brand-name">Choice Properties</div>
        <div class="brand-sub">Rental Application Portal</div>
      </div>
    </div>
    <button class="refresh-btn" onclick="window.location.reload()" aria-label="Refresh status">
      <i class="fas fa-rotate-right"></i> Refresh
    </button>
  </div>

  <!-- Status hero card -->
  <div class="status-hero">
    <div class="status-banner">
      <div class="status-icon-wrap">${statusIcon}</div>
      <div class="status-title">${statusText}</div>
      <div class="status-sub">${statusSubtext}</div>
      <div class="app-id-pill"><i class="fas fa-hashtag" style="font-size:10px;opacity:.7;"></i> ${app['App ID']}</div>
    </div>

    <!-- Progress tracker -->
    <div class="progress-wrap">
      <div class="progress-label">Application Progress</div>
      <div class="progress-steps">${progressHtml}</div>
    </div>

    ${app['Payment Status'] === 'unpaid' ? `
    <!-- Payment pending card -->
    <div class="payment-alert" style="margin:20px 24px;">
      <h5>Ã¢ÂÂ³ Payment Required</h5>
      <p>Your application is on hold. Our team will text you at <strong>${app['Phone']}</strong> within 24 hours to collect your $${safeFee(app['Application Fee'])} application fee.</p>
      <div>
        ${paymentMethods.map(m => `<span class="pay-method-pill">Ã°ÂÂÂ¯ ${m.label}: ${m.value}</span>`).join('')}
      </div>
    </div>` : ''}

    <!-- Application info -->
    <div class="info-section">
      <div class="section-header">Application Details</div>
      <div class="info-grid">
        <div class="info-tile"><div class="tile-label">Property</div><div class="tile-value">${app['Property Address']||'Not specified'}</div></div>
        <div class="info-tile"><div class="tile-label">Move-in Date</div><div class="tile-value">${app['Requested Move-in Date']||'Not specified'}</div></div>
        <div class="info-tile"><div class="tile-label">Applicant</div><div class="tile-value">${app['First Name']} ${app['Last Name']}</div></div>
        <div class="info-tile"><div class="tile-label">Email</div><div class="tile-value" style="font-size:13px;word-break:break-all;">${app['Email']}</div></div>
        <div class="info-tile"><div class="tile-label">Phone</div><div class="tile-value">${app['Phone']}</div></div>
        <div class="info-tile"><div class="tile-label">Lease Term</div><div class="tile-value">${app['Desired Lease Term']||'Not specified'}</div></div>
      </div>
    </div>

    <!-- Lease card (inside status-hero if relevant) -->
    ${hfCardHtml    ? `<div style="padding:0 24px 4px;">${hfCardHtml}</div>`    : ''}
    ${leaseCardHtml ? `<div style="padding:0 24px 4px;">${leaseCardHtml}</div>` : ''}

    <!-- Toggle extra details -->
    <button class="toggle-btn" onclick="toggleDetails(this)" id="toggleBtn" aria-expanded="false">
      <i class="fas fa-chevron-right" id="toggleIcon"></i> Show Full Application Details
    </button>
    <div class="extra-details" id="extraDetails">
      ${extraHtml || '<p style="color:#94a3b8;font-size:14px;padding:0 0 20px;">No additional details on file.</p>'}
    </div>

    <!-- Contact footer kept for JS DOM queries Ã¢ÂÂ visually hidden via CSS -->
    <div class="contact-footer"></div>
  </div>

  <!-- Phase 8.1: Denied reapplication card -->
  ${deniedCardHtml}

  <!-- Phase 8.5: Withdraw application link -->
  ${withdrawHtml}

  <!-- Contact card Ã¢ÂÂ professional replacement for the old dark footer -->
  <div class="contact-card">
    <div class="contact-card-header">
      <div class="contact-card-icon"><i class="fas fa-headset"></i></div>
      <div>
        <div class="contact-card-title">Questions? We're here to help.</div>
        <div class="contact-card-sub">Choice Properties ÃÂ· Troy, MI</div>
      </div>
    </div>
    <div class="contact-card-body">
      <a href="tel:7077063137" class="contact-row" aria-label="Call or text 707-706-3137">
        <div class="contact-row-icon phone"><i class="fas fa-phone"></i></div>
        <div class="contact-row-text">
          <div class="contact-row-label">Call or Text</div>
          <div class="contact-row-value">707-706-3137</div>
        </div>
        <div class="contact-row-arrow"><i class="fas fa-chevron-right"></i></div>
      </a>
      <a href="mailto:choicepropertygroup@hotmail.com" class="contact-row" aria-label="Email choicepropertygroup@hotmail.com">
        <div class="contact-row-icon email"><i class="fas fa-envelope"></i></div>
        <div class="contact-row-text">
          <div class="contact-row-label">Email</div>
          <div class="contact-row-value">choicepropertygroup@hotmail.com</div>
        </div>
        <div class="contact-row-arrow"><i class="fas fa-chevron-right"></i></div>
      </a>
      <div class="contact-row" style="cursor:default;">
        <div class="contact-row-icon address"><i class="fas fa-location-dot"></i></div>
        <div class="contact-row-text">
          <div class="contact-row-label">Office</div>
          <div class="contact-row-value">2265 Livernois, Suite 500 ÃÂ· Troy, MI 48083</div>
        </div>
      </div>
    </div>
  </div>

  <a href="?path=login" class="back-link" aria-label="Check another application status">
    <i class="fas fa-arrow-left"></i> Check Another Application
  </a>

</div>

<script>
  const APP_ID = '${app['App ID']}';

  // Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  // LIVE STATUS WATCHER Ã¢ÂÂ Applicant Dashboard
  // Polls every 15s. When status changes, smoothly updates
  // the hero banner, progress tracker, and lease card Ã¢ÂÂ
  // no page reload, no lost scroll position.
  // Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  let _lastStatusFingerprint = '${app['Payment Status']}|${app['Status']}|${(app['Lease Status'] || 'none')}';
  let _watchTimer = null;

  function initStatusWatcher() {
    // Inject live dot styles
    const s = document.createElement('style');
    s.textContent =
      '@keyframes watchPulse{0%,100%{opacity:1;}50%{opacity:.35;}}' +
      '@keyframes fadeInUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}' +
      '.status-updated{animation:fadeInUp .5s ease;}';
    document.head.appendChild(s);

    // Add a subtle live indicator to the top bar
    const refreshBtn = document.querySelector('.refresh-btn');
    if (refreshBtn) {
      const dot = document.createElement('span');
      dot.id = 'liveDot';
      dot.style.cssText =
        'display:inline-block;width:8px;height:8px;background:#22c55e;' +
        'border-radius:50%;margin-right:6px;vertical-align:middle;' +
        'animation:watchPulse 2.5s ease-in-out infinite;';
      refreshBtn.prepend(dot);
      refreshBtn.title = 'Status updates automatically Ã¢ÂÂ no refresh needed';
    }

    // Check every 45 seconds Ã¢ÂÂ balances responsiveness with GAS daily execution quota.
    // At 5s the quota (~6 min/day free tier) burns out with just a few concurrent viewers.
    // 45s allows ~190 checks/day per applicant before quota pressure.
    _watchTimer = setInterval(checkForStatusChange, 45000);
  }

  function checkForStatusChange() {
    google.script.run
      .withSuccessHandler(function(data) {
        if (!data || !data.success) return;
        if (data.fingerprint !== _lastStatusFingerprint) {
          _lastStatusFingerprint = data.fingerprint;
          applyLiveStatusUpdate(data);
        }
      })
      .withFailureHandler(function() { /* silent Ã¢ÂÂ don't alarm the user */ })
      .getApplicationLiveStatus(APP_ID);
  }

  function applyLiveStatusUpdate(data) {
    const pay   = data.paymentStatus || 'unpaid';
    const stat  = data.appStatus     || 'pending';
    const lease = data.leaseStatus   || 'none';

    // Ã¢ÂÂÃ¢ÂÂ Compute new display values Ã¢ÂÂÃ¢ÂÂ
    let gradient, icon, title, subtitle, progressStep;
    if (pay === 'unpaid') {
      gradient = 'linear-gradient(135deg,#f59e0b,#fbbf24)';
      icon = 'Ã¢ÂÂ³'; title = 'Pending Payment';
      subtitle = 'Action required Ã¢ÂÂ payment needed to proceed';
      progressStep = 0;
    } else if (stat === 'approved' && (lease === 'signed' || lease === 'active')) {
      gradient = 'linear-gradient(135deg,#059669,#10b981)';
      icon = 'Ã°ÂÂÂ '; title = 'Lease Signed';
      subtitle = 'Welcome! Your lease is fully executed';
      progressStep = 4;
    } else if (lease === 'sent') {
      gradient = 'linear-gradient(135deg,#2563eb,#3b82f6)';
      icon = 'Ã°ÂÂÂ'; title = 'Lease Ready to Sign';
      subtitle = 'Please review and sign your lease agreement';
      progressStep = 3;
    } else if (stat === 'approved') {
      gradient = 'linear-gradient(135deg,#059669,#34d399)';
      icon = 'Ã¢ÂÂ'; title = 'Application Approved!';
      subtitle = 'Congratulations Ã¢ÂÂ your lease will be sent shortly';
      progressStep = 2;
    } else if (stat === 'denied') {
      gradient = 'linear-gradient(135deg,#dc2626,#ef4444)';
      icon = 'Ã¢ÂÂ'; title = 'Application Declined';
      subtitle = 'Please contact us for more information';
      progressStep = -1;
    } else {
      gradient = 'linear-gradient(135deg,#6366f1,#8b5cf6)';
      icon = 'Ã°ÂÂÂ'; title = 'Under Review';
      subtitle = 'Our team is reviewing your application';
      progressStep = 1;
    }

    // Ã¢ÂÂÃ¢ÂÂ Animate the banner Ã¢ÂÂÃ¢ÂÂ
    const banner = document.querySelector('.status-banner');
    if (banner) {
      banner.style.transition = 'background .6s ease';
      banner.style.background = gradient;
      const iconEl  = banner.querySelector('.status-icon-wrap');
      const titleEl = banner.querySelector('.status-title');
      const subEl   = banner.querySelector('.status-sub');
      if (iconEl)  { iconEl.style.animation = 'none'; iconEl.textContent = icon; }
      if (titleEl) titleEl.textContent = title;
      if (subEl)   subEl.textContent   = subtitle;
      banner.classList.add('status-updated');
      setTimeout(() => banner.classList.remove('status-updated'), 600);
    }

    // Ã¢ÂÂÃ¢ÂÂ Update progress steps Ã¢ÂÂÃ¢ÂÂ
    updateProgressSteps(progressStep, stat === 'denied');

    // Ã¢ÂÂÃ¢ÂÂ Update / inject lease card if lease was just sent or signed Ã¢ÂÂÃ¢ÂÂ
    if (lease === 'sent' || lease === 'signed' || lease === 'active') {
      updateLeaseCard(data, lease);
    }

    // Ã¢ÂÂÃ¢ÂÂ Remove payment alert if now paid Ã¢ÂÂÃ¢ÂÂ
    if (pay !== 'unpaid') {
      const payAlert = document.querySelector('.payment-alert');
      if (payAlert) {
        payAlert.style.transition = 'opacity .5s, max-height .5s';
        payAlert.style.opacity = '0';
        payAlert.style.maxHeight = '0';
        payAlert.style.overflow = 'hidden';
        setTimeout(() => payAlert.remove(), 500);
      }
    }

    // Ã¢ÂÂÃ¢ÂÂ Show a non-intrusive toast notification Ã¢ÂÂÃ¢ÂÂ
    showStatusToast('Ã¢ÂÂ¨ Your status has been updated: ' + title);
  }

  function updateProgressSteps(activeStep, denied) {
    const stepEls = document.querySelectorAll('.progress-steps > *');
    if (!stepEls.length) return;
    stepEls.forEach((el, i) => {
      const circle = el.querySelector('[data-circle]') || el.querySelector('div:first-child');
      if (!circle) return;
      if (denied) {
        circle.style.background = i === 0 ? '#22c55e' : '#ef4444';
      } else {
        circle.style.background = i <= activeStep ? '#22c55e' : '#e2e8f0';
        circle.style.color      = i <= activeStep ? 'white'   : '#94a3b8';
      }
    });
  }

  function updateLeaseCard(data, lease) {
    const leaseContainer = document.querySelector('.lease-card-live') ||
                           document.querySelector('[data-lease-card]');
    if (!leaseContainer) {
      // No lease card yet Ã¢ÂÂ inject one above the toggle button
      const toggleBtn = document.getElementById('toggleBtn');
      if (!toggleBtn) return;
      const card = buildLeaseCardHtml(data, lease);
      const div = document.createElement('div');
      div.innerHTML = card;
      div.firstElementChild.style.animation = 'fadeInUp .5s ease';
      div.firstElementChild.setAttribute('data-lease-card', '1');
      toggleBtn.parentElement.insertBefore(div.firstElementChild, toggleBtn);
    } else {
      // Refresh existing card
      leaseContainer.innerHTML = buildLeaseCardInner(data, lease);
    }
  }

  function buildLeaseCardHtml(data, lease) {
    const isSigned = (lease === 'signed' || lease === 'active');
    return '<div data-lease-card="1" style="margin:0 24px 16px;">' +
      buildLeaseCardInner(data, lease) + '</div>';
  }

  function buildLeaseCardInner(data, lease) {
    const isSigned = (lease === 'signed' || lease === 'active');
    const rent      = data.monthlyRent      ? '\$' + parseFloat(data.monthlyRent).toLocaleString()      : 'Ã¢ÂÂ';
    const deposit   = data.securityDeposit  ? '\$' + parseFloat(data.securityDeposit).toLocaleString()  : 'Ã¢ÂÂ';
    const movein    = data.moveInCosts      ? '\$' + parseFloat(data.moveInCosts).toLocaleString()       : 'Ã¢ÂÂ';
    const startDate = data.leaseStartDate   || 'Ã¢ÂÂ';
    const endDate   = data.leaseEndDate     || 'Ã¢ÂÂ';
    const btnHtml   = isSigned ? '' :
      '<a href="?path=lease&id=' + APP_ID + '" style="display:block;margin-top:12px;' +
      'background:linear-gradient(to right,#2563eb,#3b82f6);color:white;text-align:center;' +
      'padding:13px;border-radius:12px;font-size:14px;font-weight:700;text-decoration:none;">' +
      'Ã¢ÂÂÃ¯Â¸Â Review & Sign My Lease</a>';
    return '<div style="background:' + (isSigned ? 'linear-gradient(135deg,#f0fdf4,#dcfce7)' : 'linear-gradient(135deg,#eff6ff,#dbeafe)') + ';' +
      'border:1.5px solid ' + (isSigned ? '#86efac' : '#93c5fd') + ';border-radius:16px;padding:18px 20px;">' +
      '<div style="font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;' +
      'color:' + (isSigned ? '#15803d' : '#1e40af') + ';margin-bottom:12px;">' +
      (isSigned ? 'Ã°ÂÂÂ  Lease Executed' : 'Ã°ÂÂÂ Lease Ready to Sign') + '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;">' +
      '<div><span style="color:#64748b;">Monthly Rent</span><br><strong>' + rent + '</strong></div>' +
      '<div><span style="color:#64748b;">Security Deposit</span><br><strong>' + deposit + '</strong></div>' +
      '<div><span style="color:#64748b;">Move-in Total</span><br><strong>' + movein + '</strong></div>' +
      '<div><span style="color:#64748b;">Lease Start</span><br><strong>' + startDate + '</strong></div>' +
      '</div>' + btnHtml + '</div>';
  }

  function showStatusToast(msg) {
    const t = document.createElement('div');
    t.style.cssText =
      'position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(16px);' +
      'background:#0f172a;color:white;padding:12px 22px;border-radius:50px;' +
      'font-size:13px;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,.25);' +
      'transition:all .4s;z-index:9999;white-space:nowrap;max-width:90vw;';
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => {
      t.style.transform = 'translateX(-50%) translateY(0)';
      t.style.opacity = '1';
    });
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateX(-50%) translateY(16px)';
      setTimeout(() => t.remove(), 400);
    }, 5000);
  }

  function toggleDetails(btn) {
    const d = document.getElementById('extraDetails');
    const icon = document.getElementById('toggleIcon');
    const isHidden = d.style.display === 'none' || d.style.display === '';
    if (isHidden) {
      d.style.display = 'block';
      d.classList.add('animate-in');
      btn.setAttribute('aria-expanded', 'true');
      btn.innerHTML = '<i class="fas fa-chevron-down" id="toggleIcon"></i> Hide Full Application Details';
    } else {
      d.style.display = 'none';
      btn.setAttribute('aria-expanded', 'false');
      btn.innerHTML = '<i class="fas fa-chevron-right" id="toggleIcon"></i> Show Full Application Details';
    }
  }

  // Boot the watcher when the page loads
  window.addEventListener('load', initStatusWatcher);

  // Ã¢ÂÂÃ¢ÂÂ Phase 8.5: Withdraw application Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  function withdrawApp() {
    if (!confirm('Are you sure you want to withdraw your application? This action cannot be undone.')) return;
    const btn = document.getElementById('withdrawBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'WithdrawingÃ¢ÂÂ¦'; }
    google.script.run
      .withSuccessHandler(function(result) {
        if (result.success) {
          window.location.reload();
        } else {
          alert('Could not withdraw: ' + result.error);
          if (btn) { btn.disabled = false; btn.textContent = 'Withdraw my application'; }
        }
      })
      .withFailureHandler(function(err) {
        alert('Error: ' + (err.message || err));
        if (btn) { btn.disabled = false; btn.textContent = 'Withdraw my application'; }
      })
      .withdrawApplication('${app['App ID']}');
  }
  // Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
</body>
</html>
  `).setTitle('Application ' + app['App ID'] + ' Ã¢ÂÂ Choice Properties');
}

// ============================================================
// renderAdminPanel() Ã¢ÂÂ ENHANCED UI
// ============================================================
function renderAdminPanel(authToken) {
  initializeSheets();
  const ss = getSpreadsheet();

  let isAuthorized = false;
  let userEmail    = 'Admin';
  if (authToken && validateAdminToken(authToken)) {
    isAuthorized = true;
    const storedUsername = PropertiesService.getScriptProperties().getProperty('ADMIN_USERNAME');
    userEmail = storedUsername || 'Admin';
  } else {
    const authorizedEmails = getAdminEmails();
    const googleEmail      = Session.getActiveUser().getEmail();
    if (googleEmail && authorizedEmails.includes(googleEmail)) {
      isAuthorized = true;
      userEmail    = googleEmail;
    }
  }

  if (!isAuthorized) {
    return renderAdminLoginPage('Session expired or not authorized. Please sign in.');
  }

  const result       = getAllApplications();
  const applications = result.success ? result.applications : [];

  const pendingPayment = applications.filter(a => a['Payment Status'] === 'unpaid').length;
  const underReview    = applications.filter(a => a['Payment Status'] === 'paid' && a['Status'] !== 'approved' && a['Status'] !== 'denied').length;
  const approved       = applications.filter(a => a['Status'] === 'approved').length;
  const denied         = applications.filter(a => a['Status'] === 'denied').length;
  const leaseSent      = applications.filter(a => a['Lease Status'] === 'sent').length;
  const leaseSigned    = applications.filter(a => a['Lease Status'] === 'signed' || a['Lease Status'] === 'active').length;
  const total          = applications.length;

  const baseUrl = ScriptApp.getService().getUrl();
  const initialCardsHtml = applications.length === 0
    ? '<div style="text-align:center;padding:60px 20px;color:#94a3b8;"><div style="font-size:48px;margin-bottom:12px;"><i class="fas fa-inbox" style="font-size:48px;color:#cbd5e1;"></i></div><p style="font-size:16px;font-weight:600;">No applications yet</p></div>'
    : applications.map(app => buildAdminCard(app, baseUrl)).join('');

  return HtmlService.createHtmlOutput(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Admin Dashboard Ã¢ÂÂ Choice Properties</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#0f172a">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { font-size: 16px; -webkit-tap-highlight-color: transparent; }
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background: #f1f5f9;
      color: #1e293b;
      min-height: 100vh;
    }
    body.modal-open { overflow: hidden; }
    body.sidebar-lock { overflow: hidden; }

    /* Ã¢ÂÂÃ¢ÂÂ Sidebar + layout Ã¢ÂÂÃ¢ÂÂ */
    .layout { display: flex; min-height: 100vh; }
    .sidebar {
      width: 270px;
      background: linear-gradient(180deg,#0f172a 0%,#1e293b 100%);
      padding: 24px 0 24px;
      position: fixed;
      top: 0; left: 0; bottom: 0;
      z-index: 400;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      transform: translateX(-100%);
      transition: transform .28s cubic-bezier(.4,0,.2,1);
      box-shadow: 6px 0 32px rgba(0,0,0,.35);
    }
    .sidebar.open { transform: translateX(0); }
    .sidebar-backdrop {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(10,18,35,.55);
      z-index: 399;
      backdrop-filter: blur(3px);
      -webkit-backdrop-filter: blur(3px);
      animation: fadeIn .2s ease;
    }
    @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
    .sidebar-backdrop.visible { display: block; }
    .sidebar-close {
      position: absolute;
      top: 14px; right: 14px;
      background: rgba(255,255,255,.1);
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 9px;
      color: rgba(255,255,255,.65);
      width: 34px; height: 34px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      font-size: 15px;
      transition: background .15s, color .15s;
      touch-action: manipulation;
      flex-shrink: 0;
    }
    .sidebar-close:hover { background: rgba(255,255,255,.2); color: white; }
    .sidebar-brand {
      padding: 0 20px 20px;
      border-bottom: 1px solid rgba(255,255,255,.07);
      margin-bottom: 18px;
    }
    .sidebar-logo {
      width: 46px; height: 46px;
      background: linear-gradient(135deg, #1B3A5C, #2A6FAD);
      border-radius: 13px;
      display: flex; align-items: center; justify-content: center;
      font-size: 14px; font-weight: 800; color: white; letter-spacing: -.5px;
      margin-bottom: 12px;
      box-shadow: 0 4px 14px rgba(42,111,173,.4);
      border: 1.5px solid rgba(255,255,255,.15);
    }
    .sidebar-title { color: white; font-weight: 700; font-size: 15px; }
    .sidebar-sub { color: rgba(255,255,255,.4); font-size: 11px; margin-top: 3px; }
    .sidebar-user { padding: 10px 20px; margin-bottom: 6px; }
    .user-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(255,255,255,.08);
      border: 1px solid rgba(255,255,255,.1);
      border-radius: 20px;
      padding: 7px 12px;
      font-size: 12px;
      color: rgba(255,255,255,.7);
      word-break: break-all;
    }
    .nav-label {
      padding: 0 20px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: rgba(255,255,255,.3);
      margin-bottom: 6px;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 20px;
      color: rgba(255,255,255,.6);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all .15s;
      border: none;
      background: none;
      width: 100%;
      text-align: left;
      font-family: inherit;
      border-left: 3px solid transparent;
      touch-action: manipulation;
    }
    .nav-item i { width: 16px; text-align: center; font-size: 13px; opacity: .8; flex-shrink: 0; }
    .nav-item:hover { background: rgba(255,255,255,.05); color: white; }
    .nav-item.active { background: rgba(59,130,246,.15); color: #93c5fd; border-left-color: #3b82f6; }
    .nav-item.active i { opacity: 1; }
    .nav-item .badge-mini {
      margin-left: auto;
      background: rgba(59,130,246,.25);
      color: #93c5fd;
      border-radius: 20px;
      padding: 2px 8px;
      font-size: 11px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .sidebar-footer {
      margin-top: auto;
      padding: 14px 20px;
      border-top: 1px solid rgba(255,255,255,.07);
    }
    .sidebar-footer p { color: rgba(255,255,255,.3); font-size: 11px; text-align: center; line-height: 1.6; }

    /* Ã¢ÂÂÃ¢ÂÂ Main content Ã¢ÂÂÃ¢ÂÂ */
    .main { margin-left: 0; padding: 0; flex: 1; min-width: 0; }
    .btn-sidebar-toggle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 38px; height: 38px;
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      color: #475569;
      border-radius: 10px;
      font-size: 16px;
      cursor: pointer;
      transition: background .2s, color .2s, border-color .2s;
      flex-shrink: 0;
      touch-action: manipulation;
    }
    .btn-sidebar-toggle:hover { background: #1e293b; color: white; border-color: #1e293b; }
    .btn-logout {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 38px; height: 38px;
      background: #fff1f2;
      border: 1.5px solid #fecdd3;
      color: #e11d48;
      border-radius: 10px;
      font-size: 15px;
      cursor: pointer;
      transition: background .2s, color .2s, border-color .2s;
      flex-shrink: 0;
      touch-action: manipulation;
    }
    .btn-logout:hover { background: #e11d48; color: white; border-color: #e11d48; }
    .topbar {
      background: white;
      padding: 14px 24px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 50;
      box-shadow: 0 1px 4px rgba(0,0,0,.06);
      gap: 12px;
    }
    .topbar-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
    .topbar-title { font-size: 17px; font-weight: 700; color: #1e293b; white-space: nowrap; }
    .topbar-subtitle { font-size: 13px; font-weight: 400; color: #94a3b8; margin-left: 4px; }
    .topbar-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .btn-refresh {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      color: #475569;
      padding: 8px 16px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all .2s;
      font-family: inherit;
      touch-action: manipulation;
    }
    .btn-refresh:hover { background: #f1f5f9; border-color: #cbd5e1; }
    .spinning { animation: spin .8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Ã¢ÂÂÃ¢ÂÂ Stats row Ã¢ÂÂ horizontally scrollable on mobile Ã¢ÂÂÃ¢ÂÂ */
    .page-content { padding: 20px 24px 80px; }
    .stats-scroll-wrap {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      margin-bottom: 20px;
      padding-bottom: 4px;
    }
    .stats-scroll-wrap::-webkit-scrollbar { height: 4px; }
    .stats-scroll-wrap::-webkit-scrollbar-track { background: transparent; }
    .stats-scroll-wrap::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }
    .stats-row {
      display: flex;
      gap: 12px;
      min-width: max-content;
    }
    .stat-card {
      background: white;
      border-radius: 16px;
      padding: 16px 18px;
      border: 1px solid #f1f5f9;
      cursor: pointer;
      transition: all .2s;
      box-shadow: 0 1px 4px rgba(0,0,0,.04);
      position: relative;
      overflow: hidden;
      min-width: 130px;
      flex-shrink: 0;
    }
    .stat-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3px;
    }
    .stat-card.s-pending::before  { background: linear-gradient(to right,#f59e0b,#fbbf24); }
    .stat-card.s-review::before   { background: linear-gradient(to right,#6366f1,#8b5cf6); }
    .stat-card.s-approved::before { background: linear-gradient(to right,#10b981,#34d399); }
    .stat-card.s-lease-sent::before   { background: linear-gradient(to right,#3b82f6,#60a5fa); }
    .stat-card.s-lease-signed::before { background: linear-gradient(to right,#059669,#10b981); }
    .stat-card.s-denied::before  { background: linear-gradient(to right,#ef4444,#f87171); }
    .stat-card.s-total::before   { background: linear-gradient(to right,#0ea5e9,#38bdf8); }
    .stat-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,.08); transform: translateY(-2px); }
    .stat-card.active { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,.2); }
    .stat-num { font-size: 28px; font-weight: 800; color: #0f172a; line-height: 1; }
    .stat-label { font-size: 11px; font-weight: 600; color: #94a3b8; margin-top: 6px; text-transform: uppercase; letter-spacing: .4px; }

    /* Ã¢ÂÂÃ¢ÂÂ Search + filters Ã¢ÂÂÃ¢ÂÂ */
    .controls-bar { display: flex; flex-direction: column; gap: 10px; margin-bottom: 18px; }
    .search-wrap { position: relative; }
    .search-icon {
      position: absolute;
      left: 13px; top: 50%;
      transform: translateY(-50%);
      color: #94a3b8;
      font-size: 14px;
      pointer-events: none;
    }
    #searchInput {
      width: 100%;
      padding: 12px 14px 12px 38px;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      font-size: 14px;
      font-family: inherit;
      color: #1e293b;
      background: white;
      outline: none;
      transition: border-color .2s;
    }
    #searchInput:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,.1); }
    #searchInput::placeholder { color: #94a3b8; }
    .filter-pills { display: flex; flex-wrap: wrap; gap: 7px; }
    .filter-pill {
      padding: 7px 15px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      border: 1.5px solid #e2e8f0;
      background: white;
      color: #64748b;
      transition: all .2s;
      font-family: inherit;
      touch-action: manipulation;
    }
    .filter-pill:hover { border-color: #94a3b8; color: #1e293b; }
    .filter-pill.active { background: #1e293b; color: white; border-color: #1e293b; }

    /* Ã¢ÂÂÃ¢ÂÂ Application cards Ã¢ÂÂÃ¢ÂÂ */
    #applicationsContainer { display: flex; flex-direction: column; gap: 12px; }
    .app-card {
      background: white;
      border-radius: 18px;
      border: 1.5px solid #f1f5f9;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,.05);
      transition: all .2s;
    }
    .app-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,.09); transform: translateY(-1px); }
    .card-accent { height: 4px; }
    .accent-pending      { background: linear-gradient(to right,#f59e0b,#fbbf24); }
    .accent-review       { background: linear-gradient(to right,#6366f1,#8b5cf6); }
    .accent-approved     { background: linear-gradient(to right,#10b981,#34d399); }
    .accent-denied       { background: linear-gradient(to right,#ef4444,#f87171); }
    .accent-lease-sent   { background: linear-gradient(to right,#3b82f6,#60a5fa); }
    .accent-lease-signed { background: linear-gradient(to right,#059669,#10b981); }
    .card-body { padding: 16px 18px; }
    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 12px;
    }
    .card-name { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 3px; }
    .card-meta { font-size: 12px; color: #94a3b8; font-weight: 500; }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .badge-pending      { background:#fef3c7; color:#92400e; }
    .badge-review       { background:#ede9fe; color:#5b21b6; }
    .badge-approved     { background:#d1fae5; color:#065f46; }
    .badge-denied       { background:#fee2e2; color:#991b1b; }
    .badge-lease-sent   { background:#dbeafe; color:#1e40af; }
    .badge-lease-signed { background:#d1fae5; color:#065f46; }
    .card-info-row { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px; }
    .info-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 5px 10px;
      font-size: 12px;
      font-weight: 500;
      color: #475569;
      text-decoration: none;
      transition: all .15s;
    }
    a.info-chip:hover { background: #f1f5f9; border-color: #cbd5e1; color: #1e293b; }
    .pay-prefs {
      background: #fffbeb;
      border: 1px solid #fcd34d;
      border-radius: 10px;
      padding: 10px 14px;
      font-size: 13px;
      color: #78350f;
      margin-bottom: 10px;
    }
    .pay-prefs strong { font-weight: 700; }

    /* Ã¢ÂÂÃ¢ÂÂ Action buttons Ã¢ÂÂ larger for touch Ã¢ÂÂÃ¢ÂÂ */
    .card-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #f1f5f9;
    }
    .act-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 9px 14px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      font-family: inherit;
      transition: all .2s;
      text-decoration: none;
      touch-action: manipulation;
      min-height: 38px;
      white-space: nowrap;
    }
    .act-btn:disabled { opacity: .35; cursor: not-allowed; transform: none !important; pointer-events: none; }
    .act-btn:not(:disabled):hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,.12); }
    .act-btn:not(:disabled):active { transform: translateY(0); }
    .btn-pay   { background:#fef3c7; color:#92400e; border: 1.5px solid #fcd34d; }
    .btn-appr  { background:#d1fae5; color:#065f46; border: 1.5px solid #6ee7b7; }
    .btn-deny  { background:#fee2e2; color:#991b1b; border: 1.5px solid #fca5a5; }
    .btn-lease { background:#dbeafe; color:#1e40af; border: 1.5px solid #93c5fd; }
    .btn-view  { background:#e0e7ff; color:#3730a3; border: 1.5px solid #a5b4fc; }
    .btn-text      { background:#f0fdf4; color:#15803d; border: 1.5px solid #86efac; }
    .btn-hold-req  { background:#fef3c7; color:#78350f; border: 1.5px solid #fcd34d; }
    .btn-hold-paid { background:#d1fae5; color:#065f46; border: 1.5px solid #6ee7b7; }
    .btn-contacted { background:#dcfce7; color:#166534; border: 1.5px solid #86efac; }
    .badge-hold-req  { background:#fef3c7; color:#92400e; }
    .badge-hold-paid { background:#d1fae5; color:#065f46; }

    /* Ã¢ÂÂÃ¢ÂÂ Modals Ã¢ÂÂÃ¢ÂÂ */
    .modal-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(15,23,42,.65);
      z-index: 1000;
      align-items: center;
      justify-content: center;
      padding: 20px;
      backdrop-filter: blur(5px);
    }
    .modal-overlay.open { display: flex; }
    .modal-box {
      background: white;
      border-radius: 24px;
      max-width: 500px;
      width: 100%;
      overflow: hidden;
      box-shadow: 0 24px 60px rgba(0,0,0,.3);
      animation: modalPop .22s ease;
      max-height: 90vh;
      overflow-y: auto;
    }
    @keyframes modalPop {
      from { opacity:0; transform: scale(.95) translateY(12px); }
      to   { opacity:1; transform: scale(1)   translateY(0); }
    }
    .modal-header { padding: 22px 24px 16px; border-bottom: 1px solid #f1f5f9; }
    .modal-header h5 { font-size: 17px; font-weight: 700; color: #0f172a; }
    .modal-header p  { font-size: 13px; color: #64748b; margin-top: 4px; }
    .modal-body { padding: 20px 24px; }
    .modal-footer {
      padding: 16px 24px;
      border-top: 1px solid #f1f5f9;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
    .modal-btn {
      padding: 11px 22px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      font-family: inherit;
      transition: all .15s;
      touch-action: manipulation;
    }
    .modal-btn:hover { opacity: .85; }
    .btn-cancel { background: #f1f5f9; color: #475569; }
    .btn-confirm-action { background: #1e293b; color: white; }
    .btn-send-lease { background: linear-gradient(to right,#059669,#10b981); color: white; }
    .form-label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px; }
    .form-control {
      width: 100%;
      padding: 10px 14px;
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      font-size: 14px;
      font-family: inherit;
      color: #1e293b;
      outline: none;
      transition: border-color .2s;
    }
    .form-control:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,.1); }
    .form-group { margin-bottom: 16px; }
    .contact-info-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 14px;
      font-size: 13px;
      color: #475569;
      margin-bottom: 14px;
    }
    .move-in-preview {
      background: linear-gradient(135deg,#eff6ff,#dbeafe);
      border: 1.5px solid #bfdbfe;
      border-radius: 10px;
      padding: 12px 14px;
      font-size: 16px;
      font-weight: 700;
      color: #1e40af;
    }
    .alert { padding: 12px 14px; border-radius: 10px; font-size: 13px; margin-bottom: 12px; }
    .alert-danger  { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
    .alert-success { background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; }

    /* Ã¢ÂÂÃ¢ÂÂ Loading spinner Ã¢ÂÂÃ¢ÂÂ */
    .spinner-wrap { text-align: center; padding: 40px; display: none; }
    .spinner-ring {
      display: inline-block;
      width: 40px; height: 40px;
      border: 4px solid #e2e8f0;
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin .7s linear infinite;
    }

    /* Ã¢ÂÂÃ¢ÂÂ Empty state Ã¢ÂÂÃ¢ÂÂ */
    .empty-state { text-align: center; padding: 60px 20px; color: #94a3b8; }
    .empty-state .icon { font-size: 48px; margin-bottom: 12px; }
    .empty-state p { font-size: 15px; font-weight: 600; }

    /* Ã¢ÂÂÃ¢ÂÂ Mobile bottom nav (replaces hidden sidebar) Ã¢ÂÂÃ¢ÂÂ */
    .mobile-nav {
      display: none;
      position: fixed;
      bottom: 0; left: 0; right: 0;
      background: #0f172a;
      border-top: 1px solid rgba(255,255,255,.1);
      z-index: 200;
      padding: 0;
      box-shadow: 0 -4px 20px rgba(0,0,0,.3);
    }
    .mobile-nav-inner {
      display: flex;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
    }
    .mobile-nav-inner::-webkit-scrollbar { display: none; }
    .mobile-nav-item {
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      padding: 10px 14px;
      background: none;
      border: none;
      color: rgba(255,255,255,.45);
      font-size: 10px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: color .15s;
      touch-action: manipulation;
      border-top: 2px solid transparent;
      white-space: nowrap;
    }
    .mobile-nav-item i { font-size: 17px; }
    .mobile-nav-item.active { color: #3b82f6; border-top-color: #3b82f6; }
    .mobile-nav-item:hover { color: rgba(255,255,255,.8); }

    /* Ã¢ÂÂÃ¢ÂÂ Responsive Ã¢ÂÂÃ¢ÂÂ */
    @media (max-width: 640px) {
      .mobile-nav { display: block; }
      .page-content { padding: 14px 14px 80px; }
      .topbar { padding: 12px 16px; }
      .topbar-title { font-size: 15px; }
      .card-body { padding: 14px 14px; }
      .act-btn { padding: 9px 12px; font-size: 11px; }
    }
    @media (max-width: 400px) {
      .filter-pills { flex-wrap: nowrap; overflow-x: auto; padding-bottom: 4px; }
      .filter-pill { flex-shrink: 0; }
    }
  </style>
</head>
<body>
<!-- Sidebar backdrop -->
<div class="sidebar-backdrop" id="sidebarBackdrop" onclick="closeSidebar()"></div>

<div class="layout">

  <!-- Ã¢ÂÂÃ¢ÂÂ Sidebar Ã¢ÂÂÃ¢ÂÂ -->
  <aside class="sidebar" id="sidebar">
    <button class="sidebar-close" onclick="closeSidebar()" aria-label="Close sidebar"><i class="fas fa-xmark"></i></button>
    <div class="sidebar-brand">
      <div class="sidebar-logo">CP</div>
      <div class="sidebar-title">Choice Properties</div>
      <div class="sidebar-sub">Admin Panel</div>
    </div>
    <div class="sidebar-user">
      <div class="user-pill"><i class="fas fa-user-circle" style="opacity:.6;"></i> ${userEmail}</div>
    </div>
    <div class="nav-label">Filters</div>
    <button class="nav-item active" id="navAll"         onclick="filterApps('all',this)"><i class="fas fa-table-list"></i> All Applications <span class="badge-mini" id="sNavTotal">${total}</span></button>
    <button class="nav-item"        id="navPending"      onclick="filterApps('pending',this)"><i class="fas fa-clock"></i> Pending Payment <span class="badge-mini" id="sNavPend">${pendingPayment}</span></button>
    <button class="nav-item"        id="navReview"       onclick="filterApps('paid',this)"><i class="fas fa-magnifying-glass"></i> Under Review <span class="badge-mini" id="sNavReview">${underReview}</span></button>
    <button class="nav-item"        id="navApproved"     onclick="filterApps('approved',this)"><i class="fas fa-circle-check"></i> Approved <span class="badge-mini" id="sNavAppr">${approved}</span></button>
    <button class="nav-item"        id="navLeaseSent"    onclick="filterApps('lease_sent',this)"><i class="fas fa-file-signature"></i> Lease Sent <span class="badge-mini" id="sNavLSent">${leaseSent}</span></button>
    <button class="nav-item"        id="navLeaseSigned"  onclick="filterApps('lease_signed',this)"><i class="fas fa-house-circle-check"></i> Lease Signed <span class="badge-mini" id="sNavLSign">${leaseSigned}</span></button>
    <button class="nav-item"        id="navDenied"       onclick="filterApps('denied',this)"><i class="fas fa-circle-xmark"></i> Denied <span class="badge-mini" id="sNavDenied">${denied}</span></button>
    <div class="sidebar-footer">
      <p>Choice Properties<br>2265 Livernois, Suite 500<br>Troy, MI 48083</p>
    </div>
  </aside>

  <!-- Ã¢ÂÂÃ¢ÂÂ Main Ã¢ÂÂÃ¢ÂÂ -->
  <div class="main">

    <!-- Topbar -->
    <div class="topbar">
      <div class="topbar-left">
        <button class="btn-sidebar-toggle" onclick="toggleSidebar()" id="sidebarToggleBtn" aria-label="Toggle sidebar" title="Toggle filters sidebar">
          <i class="fas fa-bars"></i>
        </button>
        <div class="topbar-title">Applications <span class="topbar-subtitle">(${total} total)</span></div>
      </div>
      <div class="topbar-actions">
        <button class="btn-refresh" onclick="refreshApplications()" id="refreshBtn" aria-label="Refresh applications">
          <i class="fas fa-rotate-right" id="refreshIcon"></i> Refresh
        </button>
        <button class="btn-logout" onclick="adminLogout()" aria-label="Logout" title="Sign out">
          <i class="fas fa-right-from-bracket"></i>
        </button>
      </div>
    </div>

    <div class="page-content">

      <!-- Stats row Ã¢ÂÂ horizontally scrollable on mobile -->
      <div class="stats-scroll-wrap">
        <div class="stats-row">
          <div class="stat-card s-pending"      onclick="filterApps('pending',null)"     aria-label="Filter: Pending Payment">
            <div class="stat-num" id="statPending">${pendingPayment}</div>
            <div class="stat-label">Pending</div>
          </div>
          <div class="stat-card s-review"       onclick="filterApps('paid',null)"        aria-label="Filter: Under Review">
            <div class="stat-num" id="statPaid">${underReview}</div>
            <div class="stat-label">Under Review</div>
          </div>
          <div class="stat-card s-approved"     onclick="filterApps('approved',null)"    aria-label="Filter: Approved">
            <div class="stat-num" id="statApproved">${approved}</div>
            <div class="stat-label">Approved</div>
          </div>
          <div class="stat-card s-lease-sent"   onclick="filterApps('lease_sent',null)"  aria-label="Filter: Lease Sent">
            <div class="stat-num" id="statLeaseSent">${leaseSent}</div>
            <div class="stat-label">Lease Sent</div>
          </div>
          <div class="stat-card s-lease-signed" onclick="filterApps('lease_signed',null)" aria-label="Filter: Lease Signed">
            <div class="stat-num" id="statLeaseSigned">${leaseSigned}</div>
            <div class="stat-label">Lease Signed</div>
          </div>
          <div class="stat-card s-denied"       onclick="filterApps('denied',null)"      aria-label="Filter: Denied">
            <div class="stat-num" id="statDenied">${denied}</div>
            <div class="stat-label">Denied</div>
          </div>
          <div class="stat-card s-total"        onclick="filterApps('all',null)"         aria-label="Filter: All">
            <div class="stat-num" id="statTotal">${total}</div>
            <div class="stat-label">Total</div>
          </div>
        </div>
      </div>

      <!-- Search + filter pills -->
      <div class="controls-bar">
        <div class="search-wrap">
          <span class="search-icon"><i class="fas fa-magnifying-glass"></i></span>
          <input type="text" id="searchInput" placeholder="Search by name, email, ID, or property...">
        </div>
        <div class="filter-pills">
          <button class="filter-pill active" onclick="filterApps('all',this)">All</button>
          <button class="filter-pill" onclick="filterApps('pending',this)"><i class="fas fa-clock"></i> Pending</button>
          <button class="filter-pill" onclick="filterApps('paid',this)"><i class="fas fa-magnifying-glass"></i> Review</button>
          <button class="filter-pill" onclick="filterApps('approved',this)"><i class="fas fa-circle-check"></i> Approved</button>
          <button class="filter-pill" onclick="filterApps('lease_sent',this)"><i class="fas fa-file-signature"></i> Lease Sent</button>
          <button class="filter-pill" onclick="filterApps('lease_signed',this)"><i class="fas fa-house-circle-check"></i> Lease Signed</button>
          <button class="filter-pill" onclick="filterApps('denied',this)"><i class="fas fa-circle-xmark"></i> Denied</button>
        </div>
      </div>

      <!-- Cards -->
      <div id="applicationsContainer">${initialCardsHtml}</div>

      <!-- Loading spinner -->
      <div class="spinner-wrap" id="loadingSpinner">
        <div class="spinner-ring"></div>
        <p style="color:#94a3b8;font-size:14px;margin-top:12px;">Loading applications...</p>
      </div>

    </div><!-- end .page-content -->
  </div><!-- end .main -->

  <!-- Mobile bottom nav Ã¢ÂÂ visible on Ã¢ÂÂ¤ 640px, replaces the hidden sidebar -->
  <nav class="mobile-nav" aria-label="Application filter navigation">
    <div class="mobile-nav-inner">
      <button class="mobile-nav-item active" id="mNavAll"         onclick="filterApps('all',this)"><i class="fas fa-table-list"></i>All</button>
      <button class="mobile-nav-item"        id="mNavPending"     onclick="filterApps('pending',this)"><i class="fas fa-clock"></i>Pending</button>
      <button class="mobile-nav-item"        id="mNavReview"      onclick="filterApps('paid',this)"><i class="fas fa-magnifying-glass"></i>Review</button>
      <button class="mobile-nav-item"        id="mNavApproved"    onclick="filterApps('approved',this)"><i class="fas fa-circle-check"></i>Approved</button>
      <button class="mobile-nav-item"        id="mNavLeaseSent"   onclick="filterApps('lease_sent',this)"><i class="fas fa-file-signature"></i>Lease</button>
      <button class="mobile-nav-item"        id="mNavLeaseSigned" onclick="filterApps('lease_signed',this)"><i class="fas fa-house-circle-check"></i>Signed</button>
      <button class="mobile-nav-item"        id="mNavDenied"      onclick="filterApps('denied',this)"><i class="fas fa-circle-xmark"></i>Denied</button>
    </div>
  </nav>

</div><!-- end .layout -->

<!-- Ã¢ÂÂÃ¢ÂÂ Action Confirmation Modal Ã¢ÂÂÃ¢ÂÂ -->
<div class="modal-overlay" id="confirmModal">
  <div class="modal-box">
    <div class="modal-header">
      <h5 id="modalTitle">Confirm Action</h5>
      <p id="modalSubtitle"></p>
    </div>
    <div class="modal-body">
      <div class="contact-info-box" id="contactInfo"></div>
      <div id="paymentFields" style="display:none;">
        <div class="form-group" style="margin-bottom:12px;">
          <label class="form-label" for="actualPaymentMethod">Payment Method <span style="color:#ef4444;">*</span></label>
          <select class="form-control" id="actualPaymentMethod">
            <option value="">Ã¢ÂÂ select Ã¢ÂÂ</option>
            <option value="Cash">Cash</option>
            <option value="Venmo">Venmo</option>
            <option value="Zelle">Zelle</option>
            <option value="PayPal">PayPal</option>
            <option value="Check">Check</option>
            <option value="Money Order">Money Order</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom:12px;">
          <label class="form-label" for="amountCollected">Amount Collected ($) <span style="color:#ef4444;">*</span></label>
          <input type="number" class="form-control" id="amountCollected" placeholder="e.g., 50" min="0" step="0.01">
        </div>
        <div class="form-group" style="margin-bottom:12px;">
          <label class="form-label" for="transactionRef">Transaction Reference / Note (optional)</label>
          <input type="text" class="form-control" id="transactionRef" placeholder="e.g., Venmo confirmation #12345, check #001...">
        </div>
      </div>
      <div id="notesField" style="display:none;">
        <label class="form-label" id="notesLabel">Reason / Notes (optional)</label>
        <textarea class="form-control" id="actionNotes" rows="3" placeholder="Provide a reason for this action..."></textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="modal-btn btn-cancel" onclick="closeModal()">Cancel</button>
      <button class="modal-btn btn-confirm-action" id="modalConfirmBtn">Confirm</button>
    </div>
  </div>
</div>

<!-- Ã¢ÂÂÃ¢ÂÂ Holding Fee Modal Ã¢ÂÂÃ¢ÂÂ -->
<div class="modal-overlay" id="holdingFeeModal">
  <div class="modal-box">
    <div class="modal-header">
      <h5 id="hfModalTitle">Request Holding Fee</h5>
      <p id="hfModalSubtitle" style="color:#64748b;"></p>
    </div>
    <div class="modal-body">
      <div id="hfAlertArea"></div>
      <div class="contact-info-box" id="hfContactInfo"></div>
      <div id="hfAmountField" class="form-group">
        <label class="form-label" for="hfAmount">Holding Fee Amount ($) <span style="color:#ef4444;">*</span></label>
        <input type="number" class="form-control" id="hfAmount" placeholder="e.g., 500" min="1" step="1">
        <p style="font-size:12px;color:#64748b;margin-top:6px;">This amount will be credited toward the tenant's move-in total once received.</p>
      </div>
      <div class="form-group">
        <label class="form-label" for="hfDeadline">Payment Deadline <span style="color:#ef4444;">*</span></label>
        <select class="form-control" id="hfDeadline">
          <option value="24 hours">24 hours</option>
          <option value="48 hours" selected>48 hours</option>
          <option value="72 hours">72 hours</option>
          <option value="7 days">7 days</option>
        </select>
        <p style="font-size:12px;color:#64748b;margin-top:6px;">Tenant will see this deadline in their email and on their dashboard.</p>
      </div>
      <div class="form-group">
        <label class="form-label" for="hfNotes">Admin Notes (optional)</label>
        <textarea class="form-control" id="hfNotes" rows="2" placeholder="e.g., Venmo @choice-properties, due by Friday..."></textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="modal-btn btn-cancel" onclick="closeHoldingFeeModal()">Cancel</button>
      <button class="modal-btn btn-confirm-action" id="hfConfirmBtn" style="background:linear-gradient(to right,#d97706,#f59e0b);">Send Request</button>
    </div>
  </div>
</div>

<!-- Ã¢ÂÂÃ¢ÂÂ Send Lease Modal Ã¢ÂÂÃ¢ÂÂ -->
<div class="modal-overlay" id="leaseModal">
  <div class="modal-box">
    <div class="modal-header">
      <h5>Ã°ÂÂÂ Send Lease Agreement</h5>
      <p id="leaseModalSubtitle" style="color:#64748b;"></p>
    </div>
    <div class="modal-body">
      <div id="leaseAlertArea"></div>
      <div class="form-group">
        <label class="form-label">Property Address <span style="color:#ef4444;">*</span> <span style="font-size:11px;color:#64748b;font-weight:400;">(verify and correct before sending)</span></label>
        <input type="text" class="form-control" id="leasePropertyAddress" placeholder="e.g., 123 Main St, Troy, MI 48083">
      </div>
      <div class="form-group">
        <label class="form-label">Monthly Rent ($) <span style="color:#ef4444;">*</span></label>
        <input type="number" class="form-control" id="leaseRent" placeholder="e.g., 1200" min="0" step="0.01">
      </div>
      <div class="form-group">
        <label class="form-label">Security Deposit ($) <span style="color:#ef4444;">*</span></label>
        <input type="number" class="form-control" id="leaseDeposit" placeholder="e.g., 1200" min="0" step="0.01">
      </div>
      <div class="form-group">
        <label class="form-label">Lease Start Date <span style="color:#ef4444;">*</span></label>
        <input type="date" class="form-control" id="leaseStartDate">
      </div>
      <div class="form-group">
        <label class="form-label">Move-in Total (auto-calculated)</label>
        <div class="move-in-preview" id="moveInPreview">Enter rent and deposit above</div>
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">Notes / Special Conditions</label>
        <textarea class="form-control" id="leaseNotes" rows="2" placeholder="e.g., Utilities included, parking space #4..."></textarea>
      </div>
      <hr style="margin:16px 0;border:none;border-top:1px solid #e2e8f0;">
      <p style="font-size:12px;color:#64748b;margin-bottom:12px;">Ã°ÂÂÂ  <strong>Property Details</strong> Ã¢ÂÂ optional; shown on the lease if provided</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label" style="font-size:12px;">Unit Type</label>
          <input type="text" class="form-control" id="leaseUnitType" placeholder="e.g., Apartment, House">
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label" style="font-size:12px;">Parking Space</label>
          <input type="text" class="form-control" id="leaseParkingSpace" placeholder="e.g., #4, Driveway">
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label" style="font-size:12px;">Bedrooms</label>
          <input type="text" class="form-control" id="leaseBedrooms" placeholder="e.g., 2">
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label" style="font-size:12px;">Bathrooms</label>
          <input type="text" class="form-control" id="leaseBathrooms" placeholder="e.g., 1.5">
        </div>
      </div>
      <div class="form-group" style="margin-top:10px;margin-bottom:0;">
        <label class="form-label" style="font-size:12px;">Included Utilities (leave blank if none)</label>
        <input type="text" class="form-control" id="leaseIncludedUtilities" placeholder="e.g., Water, Trash, Gas">
      </div>
      <hr style="margin:16px 0;border:none;border-top:1px solid #e2e8f0;">
      <p style="font-size:12px;color:#64748b;margin-bottom:12px;">Ã°ÂÂÂ¾ <strong>Pet Terms</strong> Ã¢ÂÂ only if tenant has pets; leave at 0 if not applicable</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label" style="font-size:12px;">Pet Deposit ($)</label>
          <input type="number" class="form-control" id="leasePetDeposit" value="0" min="0" step="0.01" placeholder="0">
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label" style="font-size:12px;">Monthly Pet Rent ($)</label>
          <input type="number" class="form-control" id="leaseMonthlyPetRent" value="0" min="0" step="0.01" placeholder="0">
        </div>
      </div>
      <hr style="margin:16px 0;border:none;border-top:1px solid #e2e8f0;">
      <p style="font-size:12px;color:#64748b;margin-bottom:12px;">Ã¢ÂÂÃ¯Â¸Â <strong>Financial Terms</strong> Ã¢ÂÂ defaults shown; edit only if this property differs</p>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label" style="font-size:12px;">Rent Due Day</label>
          <input type="number" class="form-control" id="leaseRentDueDay" value="1" min="1" max="28" placeholder="1">
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label" style="font-size:12px;">Grace Period (days)</label>
          <input type="number" class="form-control" id="leaseGraceDays" value="5" min="0" max="15" placeholder="5">
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label" style="font-size:12px;">Late Fee ($)</label>
          <input type="number" class="form-control" id="leaseLateFee" value="50" min="0" step="0.01" placeholder="50">
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="modal-btn btn-cancel" onclick="closeLeaseModal()">Cancel</button>
      <button class="modal-btn btn-send-lease" id="leaseSendBtn" onclick="submitLease()"><i class="fas fa-paper-plane"></i> Send Lease to Tenant</button>
    </div>
  </div>
</div>

<script>
  let currentAction = '';
  let currentAppId  = '';
  let currentFilter = 'all';
  let currentSearch = '';
  const baseUrl = '${baseUrl}';

  // Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  // LIVE POLLING ENGINE Ã¢ÂÂ Admin Dashboard
  // Polls server every 20s. Only re-renders if data changed.
  // Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  let _lastFingerprint  = '';       // last known data hash
  let _pollTimer        = null;     // setInterval handle
  let _pollPaused       = false;    // pause while modal is open
  let _liveIndicator    = null;     // DOM element
  let _allApplications  = [];       // in-memory data store
  let _actionInProgress = false;    // don't poll during action

  function initLivePolling() {
    // Create the live indicator badge in the topbar
    const topbarActions = document.querySelector('.topbar-actions');
    if (topbarActions) {
      _liveIndicator = document.createElement('div');
      _liveIndicator.id = 'liveIndicator';
      _liveIndicator.style.cssText =
        'display:flex;align-items:center;gap:6px;padding:6px 14px;' +
        'background:#f0fdf4;border:1.5px solid #86efac;border-radius:20px;' +
        'font-size:12px;font-weight:600;color:#15803d;font-family:inherit;' +
        'transition:all .3s;';
      _liveIndicator.innerHTML =
        '<span id="liveDot" style="width:8px;height:8px;background:#22c55e;' +
        'border-radius:50%;animation:livePulse 2s ease-in-out infinite;' +
        'flex-shrink:0;"></span>' +
        '<span id="liveLabel">Ready</span>';
      topbarActions.prepend(_liveIndicator);

      // Inject pulse keyframe
      const s = document.createElement('style');
      s.textContent =
        '@keyframes livePulse{0%,100%{opacity:1;transform:scale(1);}' +
        '50%{opacity:.4;transform:scale(.7);}}' +
        '@keyframes flashGreen{0%{background:#dcfce7;}100%{background:white;}}' +
        '.card-updated{animation:flashGreen .8s ease;}';
      document.head.appendChild(s);
    }

    // Load data immediately on first open Ã¢ÂÂ no recurring timer
    fetchAndRenderAll('');
  }

  function pausePolling()  { _pollPaused = true; }
  function resumePolling() { _pollPaused = false; }

  function setLiveStatus(state) {
    if (!_liveIndicator) return;
    const dot   = document.getElementById('liveDot');
    const label = document.getElementById('liveLabel');
    if (state === 'live') {
      _liveIndicator.style.background = '#f0fdf4';
      _liveIndicator.style.borderColor = '#86efac';
      _liveIndicator.style.color = '#15803d';
      dot.style.background = '#22c55e'; dot.style.animation = 'livePulse 2s ease-in-out infinite';
      label.textContent = 'Ready';
    } else if (state === 'checking') {
      _liveIndicator.style.background = '#eff6ff';
      _liveIndicator.style.borderColor = '#93c5fd';
      _liveIndicator.style.color = '#1d4ed8';
      dot.style.background = '#3b82f6'; dot.style.animation = 'livePulse .6s ease-in-out infinite';
      label.textContent = 'Checking...';
    } else if (state === 'updated') {
      _liveIndicator.style.background = '#fef3c7';
      _liveIndicator.style.borderColor = '#fcd34d';
      _liveIndicator.style.color = '#92400e';
      dot.style.background = '#f59e0b'; dot.style.animation = 'none';
      label.textContent = 'Updated!';
      setTimeout(() => setLiveStatus('live'), 3000);
    } else if (state === 'error') {
      _liveIndicator.style.background = '#fef2f2';
      _liveIndicator.style.borderColor = '#fca5a5';
      _liveIndicator.style.color = '#991b1b';
      dot.style.background = '#ef4444'; dot.style.animation = 'none';
      label.textContent = 'Offline';
    }
  }

  function pollForChanges() {
    if (_pollPaused || _actionInProgress) return;
    setLiveStatus('checking');
    google.script.run
      .withSuccessHandler(function(result) {
        if (!result.success) { setLiveStatus('error'); return; }
        if (result.fingerprint !== _lastFingerprint) {
          // Data changed Ã¢ÂÂ fetch full dataset
          fetchAndRenderAll(result.fingerprint);
        } else {
          setLiveStatus('live');
        }
      })
      .withFailureHandler(function() { setLiveStatus('error'); })
      .getDataFingerprint();
  }

  function fetchAndRenderAll(newFingerprint) {
    google.script.run
      .withSuccessHandler(function(result) {
        if (!result.success) { setLiveStatus('error'); return; }
        const wasFirstLoad = (_lastFingerprint === '');
        const prevData     = _allApplications;
        _allApplications   = result.applications;
        _lastFingerprint   = newFingerprint;

        if (wasFirstLoad) {
          // Initial render Ã¢ÂÂ just set everything
          renderApplications(_allApplications);
        } else {
          // Incremental update Ã¢ÂÂ patch only changed cards
          patchChangedCards(prevData, _allApplications);
          updateStats(_allApplications);
          setLiveStatus('updated');
          showToast('Ã°ÂÂÂ Dashboard updated automatically', 'success');
        }
      })
      .withFailureHandler(function() { setLiveStatus('error'); })
      .getAllApplications();
  }

  // Patch only cards whose status changed Ã¢ÂÂ no full re-render flicker
  function patchChangedCards(prevData, newData) {
    const prevMap = {};
    prevData.forEach(a => { prevMap[a['App ID']] = a; });
    const newMap = {};
    newData.forEach(a => { newMap[a['App ID']] = a; });

    // Remove cards for deleted applications
    Object.keys(prevMap).forEach(id => {
      if (!newMap[id]) {
        const el = document.querySelector('.app-card[data-appid="' + id + '"]');
        if (el) { el.style.transition = 'opacity .4s'; el.style.opacity = '0'; setTimeout(()=>el.remove(),400); }
      }
    });

    // Update changed cards / add new ones
    newData.forEach(app => {
      const id   = app['App ID'];
      const prev = prevMap[id];
      const existingCard = document.querySelector('.app-card[data-appid="' + id + '"]');

      if (!existingCard) {
        // New application Ã¢ÂÂ prepend it
        const container = document.getElementById('applicationsContainer');
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = buildCardHtml(app);
        const newCard = tempDiv.firstElementChild;
        newCard.style.opacity = '0';
        newCard.style.transform = 'translateY(-12px)';
        container.prepend(newCard);
        requestAnimationFrame(() => {
          newCard.style.transition = 'opacity .5s, transform .5s';
          newCard.style.opacity = '1';
          newCard.style.transform = 'translateY(0)';
        });
      } else if (prev &&
        (prev['Status'] !== app['Status'] ||
         prev['Payment Status'] !== app['Payment Status'] ||
         prev['Lease Status'] !== app['Lease Status'])) {
        // Status changed Ã¢ÂÂ smoothly replace this card
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = buildCardHtml(app);
        const newCard = tempDiv.firstElementChild;
        newCard.style.opacity = '0';
        existingCard.replaceWith(newCard);
        requestAnimationFrame(() => {
          newCard.style.transition = 'opacity .4s';
          newCard.style.opacity = '1';
          newCard.classList.add('card-updated');
        });
      }
    });

    applyFilterAndSearch();
  }

  // Ã¢ÂÂÃ¢ÂÂ Move-in preview Ã¢ÂÂÃ¢ÂÂ
  ['leaseRent','leaseDeposit'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateMoveInPreview);
  });
  function updateMoveInPreview() {
    const rent    = parseFloat(document.getElementById('leaseRent').value)    || 0;
    const deposit = parseFloat(document.getElementById('leaseDeposit').value) || 0;
    const total   = rent + deposit;
    const el = document.getElementById('moveInPreview');
    el.textContent = total > 0
      ? '\$' + total.toLocaleString('en-US', {minimumFractionDigits:2})
      : 'Enter rent and deposit above';
  }

  // Ã¢ÂÂÃ¢ÂÂ Lease modal Ã¢ÂÂÃ¢ÂÂ
  function showLeaseModal(appId, tenantName, contactMethod, contactTimes, propertyAddress) {
    currentAppId = appId;
    pausePolling();
    document.getElementById('leaseModalSubtitle').textContent = tenantName + '  ÃÂ·  ' + appId;
    ['leaseRent','leaseDeposit','leaseStartDate','leaseNotes',
     'leaseUnitType','leaseParkingSpace','leaseBedrooms','leaseBathrooms','leaseIncludedUtilities'
    ].forEach(id => document.getElementById(id).value = '');
    document.getElementById('leasePropertyAddress').value = propertyAddress || '';
    document.getElementById('leaseRentDueDay').value      = '1';
    document.getElementById('leaseGraceDays').value       = '5';
    document.getElementById('leaseLateFee').value         = '50';
    document.getElementById('leasePetDeposit').value      = '0';
    document.getElementById('leaseMonthlyPetRent').value  = '0';
    document.getElementById('leaseAlertArea').innerHTML = '';
    document.getElementById('moveInPreview').textContent = 'Enter rent and deposit above';
    document.getElementById('leaseModal').classList.add('open');
    document.body.classList.add('modal-open');
  }
  function closeLeaseModal() {
    document.getElementById('leaseModal').classList.remove('open');
    document.body.classList.remove('modal-open');
    resumePolling();
  }
  function submitLease() {
    const verifiedAddress = document.getElementById('leasePropertyAddress').value.trim();
    const rent      = document.getElementById('leaseRent').value;
    const deposit   = document.getElementById('leaseDeposit').value;
    const startDate = document.getElementById('leaseStartDate').value;
    const notes     = document.getElementById('leaseNotes').value;
    const rentDueDay        = document.getElementById('leaseRentDueDay').value       || '1';
    const graceDays         = document.getElementById('leaseGraceDays').value        || '5';
    const lateFee           = document.getElementById('leaseLateFee').value          || '50';
    const unitType          = document.getElementById('leaseUnitType').value         || '';
    const bedrooms          = document.getElementById('leaseBedrooms').value         || '';
    const bathrooms         = document.getElementById('leaseBathrooms').value        || '';
    const parkingSpace      = document.getElementById('leaseParkingSpace').value     || '';
    const includedUtilities = document.getElementById('leaseIncludedUtilities').value|| '';
    const petDeposit        = document.getElementById('leasePetDeposit').value       || '0';
    const monthlyPetRent    = document.getElementById('leaseMonthlyPetRent').value   || '0';
    const alertArea = document.getElementById('leaseAlertArea');
    if (!rent || !deposit || !startDate) {
      alertArea.innerHTML = '<div class="alert alert-danger">Please fill in all required fields.</div>';
      return;
    }
    const btn = document.getElementById('leaseSendBtn');
    btn.disabled = true; btn.textContent = 'Sending...';
    alertArea.innerHTML = '';
    _actionInProgress = true;
    google.script.run
      .withSuccessHandler(function(result) {
        _actionInProgress = false;
        btn.disabled = false; btn.textContent = 'Send Lease to Tenant';
        if (result.success) {
          closeLeaseModal();
          showToast('Ã¢ÂÂ Lease sent! The tenant has been emailed a signing link.', 'success');
          // Immediately fetch fresh data and update dashboard
          fetchAndRenderAll('');
        } else {
          alertArea.innerHTML = '<div class="alert alert-danger">Error: ' + result.error + '</div>';
        }
      })
      .withFailureHandler(function(err) {
        _actionInProgress = false;
        btn.disabled = false; btn.textContent = 'Send Lease to Tenant';
        alertArea.innerHTML = '<div class="alert alert-danger">Server error: ' + err + '</div>';
      })
      .generateAndSendLease(currentAppId, rent, deposit, startDate, notes, rentDueDay, graceDays, lateFee,
                             unitType, bedrooms, bathrooms, parkingSpace, includedUtilities, petDeposit, monthlyPetRent, verifiedAddress);
  }

  // Ã¢ÂÂÃ¢ÂÂ Confirm modal close + submit Ã¢ÂÂÃ¢ÂÂ
  function closeModal() {
    document.getElementById('confirmModal').classList.remove('open');
    document.body.classList.remove('modal-open');
    resumePolling();
  }
  document.getElementById('modalConfirmBtn').onclick = function() {
    const notes = document.getElementById('actionNotes').value;
    const btn = this;
    btn.disabled = true; btn.textContent = 'Processing...';
    _actionInProgress = true;
    const onSuccess = (result) => {
      _actionInProgress = false;
      btn.disabled = false;
      closeModal();
      if (result && result.success === false) {
        showToast('Error: ' + (result.error || 'Unknown error'), 'error');
        return;
      }
      fetchAndRenderAll('');
    };
    const onFail = err => {
      _actionInProgress = false;
      btn.disabled = false;
      showToast('Error: ' + err, 'error');
    };
    if (currentAction === 'markPaid') {
      const actualMethod   = document.getElementById('actualPaymentMethod').value.trim();
      const amountCollected = document.getElementById('amountCollected').value.trim();
      const transactionRef = document.getElementById('transactionRef').value.trim();
      if (!actualMethod)   { onFail('Please select a payment method.'); btn.disabled = false; btn.textContent = 'Confirm Payment'; _actionInProgress = false; return; }
      if (!amountCollected || parseFloat(amountCollected) <= 0) { onFail('Please enter the amount collected.'); btn.disabled = false; btn.textContent = 'Confirm Payment'; _actionInProgress = false; return; }
      google.script.run.withSuccessHandler(onSuccess).withFailureHandler(onFail).markAsPaid(currentAppId, notes, actualMethod, transactionRef, parseFloat(amountCollected));
    }
    else if (currentAction === 'approve')     google.script.run.withSuccessHandler(onSuccess).withFailureHandler(onFail).updateStatus(currentAppId, 'approved', notes);
    else if (currentAction === 'deny')        google.script.run.withSuccessHandler(onSuccess).withFailureHandler(onFail).updateStatus(currentAppId, 'denied', notes);
    else if (currentAction === 'holdFeePaid')   google.script.run.withSuccessHandler(onSuccess).withFailureHandler(onFail).markHoldingFeePaid(currentAppId, notes);
    else if (currentAction === 'markRefund')    google.script.run.withSuccessHandler(onSuccess).withFailureHandler(onFail).markAsRefunded(currentAppId, notes);
    else if (currentAction === 'markContacted') google.script.run.withSuccessHandler(onSuccess).withFailureHandler(onFail).markAsContacted(currentAppId);
    else if (currentAction === 'countersign') {
      if (!notes || notes.trim().length < 2) {
        onFail('Please enter your full legal name to countersign.');
        return;
      }
      google.script.run.withSuccessHandler(onSuccess).withFailureHandler(onFail).managementCountersign(currentAppId, notes, '');
    }
  };

  // Ã¢ÂÂÃ¢ÂÂ Holding Fee Modal open/close Ã¢ÂÂÃ¢ÂÂ
  function showHoldingFeeModal(appId, applicantName, contactMethod) {
    currentAppId = appId;
    pausePolling();
    document.getElementById('hfModalTitle').textContent    = 'Request Holding Fee';
    document.getElementById('hfModalSubtitle').textContent = applicantName + ' ÃÂ· ' + appId;
    document.getElementById('hfContactInfo').innerHTML     = '<strong>Contact:</strong> ' + contactMethod;
    document.getElementById('hfAmountField').style.display = 'block';
    document.getElementById('hfAmount').value              = '';
    document.getElementById('hfDeadline').value            = '48 hours';
    document.getElementById('hfNotes').value               = '';
    document.getElementById('hfAlertArea').innerHTML       = '';
    document.getElementById('hfConfirmBtn').textContent    = 'Send Request';
    document.getElementById('hfConfirmBtn').disabled       = false;
    document.getElementById('holdingFeeModal').classList.add('open');
    document.body.classList.add('modal-open');
    setTimeout(() => document.getElementById('hfAmount').focus(), 120);
  }
  function closeHoldingFeeModal() {
    document.getElementById('holdingFeeModal').classList.remove('open');
    document.body.classList.remove('modal-open');
    resumePolling();
  }
  document.getElementById('hfConfirmBtn').onclick = function() {
    const amount   = parseFloat(document.getElementById('hfAmount').value);
    const deadline = document.getElementById('hfDeadline').value;
    const notes    = document.getElementById('hfNotes').value.trim();
    const alertArea = document.getElementById('hfAlertArea');
    alertArea.innerHTML = '';
    if (!amount || amount <= 0) {
      alertArea.innerHTML = '<div class="alert alert-danger">Please enter a valid holding fee amount.</div>';
      return;
    }
    const btn = this;
    btn.disabled = true; btn.textContent = 'Sending...';
    _actionInProgress = true;
    google.script.run
      .withSuccessHandler(result => {
        _actionInProgress = false;
        if (result && result.success === false) {
          btn.disabled = false; btn.textContent = 'Send Request';
          alertArea.innerHTML = '<div class="alert alert-danger">' + (result.error || 'An error occurred.') + '</div>';
          return;
        }
        closeHoldingFeeModal();
        showToast('Holding fee requested Ã¢ÂÂ tenant emailed.', 'success');
        fetchAndRenderAll('');
      })
      .withFailureHandler(err => {
        _actionInProgress = false;
        btn.disabled = false; btn.textContent = 'Send Request';
        alertArea.innerHTML = '<div class="alert alert-danger">Error: ' + err + '</div>';
      })
      .requestHoldingFee(currentAppId, amount, notes, deadline);
  };

  // Ã¢ÂÂÃ¢ÂÂ Close modals on backdrop click Ã¢ÂÂÃ¢ÂÂ
  ['confirmModal','holdingFeeModal','leaseModal'].forEach(id => {
    document.getElementById(id).addEventListener('click', function(e) {
      if (e.target === this) {
        this.classList.remove('open');
        document.body.classList.remove('modal-open');
        if (id === 'confirmModal') { document.getElementById('modalConfirmBtn').disabled = false; }
        resumePolling();
      }
    });
  });

  // Ã¢ÂÂÃ¢ÂÂ showConfirmModal Ã¢ÂÂ extended for holdFeePaid, markRefund Ã¢ÂÂÃ¢ÂÂ
  function showConfirmModal(action, appId, applicantName, contactMethod, contactTimes) {
    currentAction = action; currentAppId = appId;
    pausePolling();
    const config = {
      markPaid    : { title: 'Mark as Paid',             sub: 'A payment confirmation receipt email will be sent to the applicant.', btn: 'Confirm Payment',   notes: false, notesLabel: 'Notes (optional)', payFields: true },
      approve     : { title: 'Approve Application',       sub: 'An approval email will be sent to the applicant.',                   btn: 'Approve',           notes: false, notesLabel: 'Notes (optional)', payFields: false },
      deny        : { title: 'Deny Application',           sub: 'The applicant will be notified by email.',                           btn: 'Deny Application',  notes: true,  notesLabel: 'Reason for denial (optional Ã¢ÂÂ sent to applicant)', payFields: false },
      holdFeePaid : { title: 'Mark Hold Fee Received',     sub: 'Holding fee will be credited toward move-in total.',                 btn: 'Confirm Receipt',   notes: true,  notesLabel: 'Notes (optional)', payFields: false },
      countersign : { title: 'Countersign Lease',          sub: 'Enter your full legal name to countersign this lease. Lease status will update to Executed.', btn: 'Countersign Lease', notes: true, notesLabel: 'Your Full Legal Name (required)', payFields: false },
      markRefund    : { title: 'Mark as Refunded',   sub: 'Payment Status will be set to "refunded". No email is sent automatically.', btn: 'Mark Refunded',   notes: true,  notesLabel: 'Refund reason / notes (optional)', payFields: false },
      markContacted : { title: 'Log Contact',         sub: 'Record that you contacted this applicant. The timestamp will appear on their card.', btn: 'Log Contact', notes: false, notesLabel: '', payFields: false }
    };
    const c = config[action];
    document.getElementById('modalTitle').textContent    = c.title;
    document.getElementById('modalSubtitle').textContent = applicantName + ' ÃÂ· ' + appId;
    document.getElementById('contactInfo').innerHTML     = '<strong>' + (action === 'deny' ? 'Applicant:' : 'Contact:') + '</strong> ' + contactMethod + ' ÃÂ· ' + contactTimes;
    document.getElementById('paymentFields').style.display = c.payFields ? 'block' : 'none';
    if (c.payFields) {
      document.getElementById('actualPaymentMethod').value = '';
      document.getElementById('amountCollected').value = '';
      document.getElementById('transactionRef').value = '';
    }
    document.getElementById('notesField').style.display = c.notes ? 'block' : 'none';
    const notesLabelEl = document.getElementById('notesLabel');
    if (notesLabelEl) notesLabelEl.textContent = c.notesLabel || 'Notes (optional)';
    document.getElementById('actionNotes').value        = '';
    document.getElementById('modalConfirmBtn').textContent = c.btn;
    document.getElementById('confirmModal').classList.add('open');
    document.body.classList.add('modal-open');
  }

  // Ã¢ÂÂÃ¢ÂÂ Toast notifications Ã¢ÂÂÃ¢ÂÂ
  function showToast(msg, type) {
    const t = document.createElement('div');
    const isMobile = window.innerWidth <= 640;
    t.style.cssText = 'position:fixed;bottom:' + (isMobile ? '80px' : '28px') + ';right:' + (isMobile ? '12px' : '28px') + ';z-index:9999;background:' +
      (type === 'success' ? '#059669' : '#dc2626') +
      ';color:white;padding:12px 20px;border-radius:14px;font-size:13px;font-weight:600;' +
      'font-family:Inter,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.2);' +
      'animation:slideUp .3s ease;max-width:calc(100vw - 24px);';
    t.textContent = msg;
    const style = document.createElement('style');
    style.textContent = '@keyframes slideUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}';
    document.head.appendChild(style);
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity='0'; t.style.transition='opacity .3s'; setTimeout(()=>t.remove(),350); }, 4000);
  }

  // Ã¢ÂÂÃ¢ÂÂ Build client-side card HTML (live-update version, mirrors buildAdminCard) Ã¢ÂÂÃ¢ÂÂ
  function buildCardHtml(app) {
    const leaseStatus = app['Lease Status'] || 'none';
    let accentClass = 'accent-pending', badgeClass = 'badge-pending', statusText = '<i class="fas fa-clock"></i> Pending';
    if      (leaseStatus === 'signed' || leaseStatus === 'active') { accentClass='accent-lease-signed'; badgeClass='badge-lease-signed'; statusText='<i class="fas fa-house-circle-check"></i> Lease Signed'; }
    else if (leaseStatus === 'sent')   { accentClass='accent-lease-sent';   badgeClass='badge-lease-sent';   statusText='<i class="fas fa-file-signature"></i> Lease Sent'; }
    else if (app['Status'] === 'approved') { accentClass='accent-approved'; badgeClass='badge-approved'; statusText='<i class="fas fa-circle-check"></i> Approved'; }
    else if (app['Status'] === 'denied')   { accentClass='accent-denied';   badgeClass='badge-denied';   statusText='<i class="fas fa-circle-xmark"></i> Denied'; }
    else if (app['Payment Status'] === 'paid') { accentClass='accent-review'; badgeClass='badge-review'; statusText='<i class="fas fa-magnifying-glass"></i> Under Review'; }

    const dataStatus = (leaseStatus==='signed'||leaseStatus==='active') ? 'lease_signed'
      : leaseStatus==='sent' ? 'lease_sent'
      : app['Payment Status']==='unpaid' ? 'pending'
      : app['Status']==='approved' ? 'approved'
      : app['Status']==='denied' ? 'denied' : 'paid';

    const searchTerms   = (app['First Name']+' '+app['Last Name']+' '+app['Email']+' '+app['App ID']+' '+(app['Property Address']||'')).toLowerCase();
    const contactMethod = app['Preferred Contact Method'] || 'Not specified';
    const contactTimes  = app['Preferred Time']            || 'Any';
    // Escape single quotes to prevent onclick breakage on names like O'Brien
    const safeName    = (app['First Name'] + ' ' + app['Last Name']).replace(/'/g, "\\\\'");
    const safeContact = contactMethod.replace(/'/g, "\\\\'");
    const safeTimes   = contactTimes.replace(/'/g, "\\\\'");
    const safeAddr    = (app['Property Address'] || '').replace(/'/g, "\\\\'");
    const canMarkPaid    = app['Payment Status'] === 'unpaid';
    const canMarkRefund  = app['Payment Status'] === 'paid';
    const canApprove     = app['Payment Status'] === 'paid' && app['Status'] === 'pending';
    const canDeny        = canApprove;
    const canSendLease   = app['Status'] === 'approved' && leaseStatus !== 'signed' && leaseStatus !== 'active';
    const dateStr        = app['Timestamp'] ? new Date(app['Timestamp']).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '';
    const phoneClean     = (app['Phone'] || '').replace(/\\D/g, '');
    const hfStatus       = app['Holding Fee Status'] || 'none';
    const hfAmt          = parseFloat(app['Holding Fee Amount']) || 0;
    const canRequestHF   = app['Status'] === 'approved' && hfStatus === 'none';
    const canConfirmHF   = hfStatus === 'requested';
    const canCountersign = leaseStatus === 'signed' && !app['Management Signature'];
    const hfBadgeHtml   = hfStatus === 'paid'
      ? \`<span class="status-badge badge-hold-paid" style="margin-left:6px;" title="Holding fee $\{hfAmt} received"><i class="fas fa-hand-holding-dollar"></i> Hold Fee Paid</span>\`
      : hfStatus === 'requested'
      ? \`<span class="status-badge badge-hold-req" style="margin-left:6px;" title="Holding fee $\{hfAmt} requested"><i class="fas fa-hourglass-half"></i> Hold Fee Pending</span>\`
      : '';
    // Phase 8.4: Application age indicator
    const _daysAgo = app['Timestamp'] ? Math.floor((Date.now() - new Date(app['Timestamp']).getTime()) / 86400000) : null;
    const ageChip  = _daysAgo !== null ? \`<span class="info-chip" title="Submitted \${_daysAgo} day\${_daysAgo===1?'':'s'} ago" style="color:\${_daysAgo>14?'#b45309':'#64748b'};"><i class="fas fa-calendar-days" style="opacity:.6;"></i> \${_daysAgo}d old</span>\` : '';
    // Phase 8.3: Last contacted badge
    const _lastContacted = app['Last Contacted'] ? new Date(app['Last Contacted']).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : null;
    const contactedBadge = _lastContacted ? \`<span class="status-badge" style="background:#dcfce7;color:#166534;margin-left:6px;font-size:11px;" title="Last contacted: \${_lastContacted}"><i class="fas fa-phone-volume"></i> Contacted \${_lastContacted}</span>\` : '';

    let payPrefsHtml = '';
    if (app['Payment Status'] === 'unpaid') {
      const prefs = [];
      if (app['Primary Payment Method'])     prefs.push('<i class="fas fa-medal" style="color:#f59e0b;"></i> ' + (app['Primary Payment Method']==='Other'&&app['Primary Payment Method Other'] ? app['Primary Payment Method Other'] : app['Primary Payment Method']));
      if (app['Alternative Payment Method']) prefs.push('<i class="fas fa-award" style="color:#94a3b8;"></i> ' + (app['Alternative Payment Method']==='Other'&&app['Alternative Payment Method Other'] ? app['Alternative Payment Method Other'] : app['Alternative Payment Method']));
      if (prefs.length) payPrefsHtml = \`<div class="pay-prefs"><strong><i class="fas fa-coins" style="color:#f59e0b;margin-right:4px;"></i>Payment Prefs:</strong> \${prefs.join('  &middot;  ')}</div>\`;
    }

    return \`
      <div class="app-card" data-status="\${dataStatus}" data-search="\${searchTerms}" data-appid="\${app['App ID']}">
        <div class="card-accent \${accentClass}"></div>
        <div class="card-body">
          <div class="card-top">
            <div>
              <div class="card-name">\${app['First Name']} \${app['Last Name']}</div>
              <div class="card-meta"><i class="fas fa-hashtag" style="font-size:10px;opacity:.5;"></i> \${app['App ID']} &middot; \${dateStr}</div>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:5px;justify-content:flex-end;align-items:center;">
              <span class="status-badge \${badgeClass}">\${statusText}</span>
              \${hfBadgeHtml}
              \${contactedBadge}
            </div>
          </div>
          <div class="card-info-row">
            <a href="mailto:\${app['Email']}" class="info-chip" aria-label="Email \${app['Email']}"><i class="fas fa-envelope" style="opacity:.6;"></i> \${app['Email']}</a>
            <a href="tel:\${phoneClean}" class="info-chip" aria-label="Call \${app['Phone']}"><i class="fas fa-phone" style="opacity:.6;"></i> \${app['Phone']}</a>
            <span class="info-chip"><i class="fas fa-house" style="opacity:.6;"></i> \${app['Property Address']||'No property'}</span>
            <span class="info-chip"><i class="fas fa-mobile-screen-button" style="opacity:.6;"></i> \${contactMethod}</span>
            <span class="info-chip"><i class="fas fa-clock" style="opacity:.6;"></i> \${contactTimes}</span>
            \${ageChip}
          </div>
          \${payPrefsHtml}
          <div class="card-actions">
            <button class="act-btn btn-pay"       onclick="showConfirmModal('markPaid','\${app['App ID']}','\${safeName}','\${safeContact}','\${safeTimes}')" \${canMarkPaid?'':'disabled'} aria-label="Mark as paid"><i class="fas fa-coins"></i> Mark Paid</button>
            <button class="act-btn btn-deny"      onclick="showConfirmModal('markRefund','\${app['App ID']}','\${safeName}','\${safeContact}','\${safeTimes}')" \${canMarkRefund?'':'disabled'} aria-label="Mark as refunded" style="background:linear-gradient(to right,#7c3aed,#a855f7);"><i class="fas fa-rotate-left"></i> Refunded</button>
            <button class="act-btn btn-appr"      onclick="showConfirmModal('approve','\${app['App ID']}','\${safeName}','\${safeContact}','\${safeTimes}')" \${canApprove?'':'disabled'} aria-label="Approve"><i class="fas fa-circle-check"></i> Approve</button>
            <button class="act-btn btn-deny"      onclick="showConfirmModal('deny','\${app['App ID']}','\${safeName}','\${safeContact}','\${safeTimes}')" \${canDeny?'':'disabled'} aria-label="Deny"><i class="fas fa-circle-xmark"></i> Deny</button>
            <button class="act-btn btn-lease"     onclick="showLeaseModal('\${app['App ID']}','\${safeName}','\${safeContact}','\${safeTimes}','\${safeAddr}')" \${canSendLease?'':'disabled'} aria-label="Send lease"><i class="fas fa-file-signature"></i> Send Lease</button>
            <button class="act-btn btn-hold-req"  onclick="showHoldingFeeModal('\${app['App ID']}','\${safeName}','\${safeContact}')" \${canRequestHF?'':'disabled'} aria-label="Request holding fee"><i class="fas fa-hand-holding-dollar"></i> Request Hold Fee</button>
            <button class="act-btn btn-hold-paid" onclick="showConfirmModal('holdFeePaid','\${app['App ID']}','\${safeName}','\${safeContact}','\${safeTimes}')" \${canConfirmHF?'':'disabled'} aria-label="Mark holding fee received"><i class="fas fa-circle-check"></i> Hold Fee Received</button>
            <button class="act-btn btn-countersign" onclick="showConfirmModal('countersign','\${app['App ID']}','\${safeName}','\${safeContact}','\${safeTimes}')" \${canCountersign?'':'disabled'} aria-label="Countersign lease"><i class="fas fa-file-signature"></i> Countersign Lease</button>
            <button class="act-btn btn-contacted" onclick="showConfirmModal('markContacted','\${app['App ID']}','\${safeName}','\${safeContact}','\${safeTimes}')" aria-label="Log contact"><i class="fas fa-phone-volume"></i> Mark Contacted</button>
            <a href="?path=dashboard&id=\${app['App ID']}" target="_blank" class="act-btn btn-view" aria-label="View dashboard"><i class="fas fa-eye"></i> View</a>
            <a href="sms:7077063137?body=Hi%20\${encodeURIComponent(app['First Name']||'')}%2C%20this%20is%20Choice%20Properties%20re%20app%20\${app['App ID']}" class="act-btn btn-text" aria-label="Text applicant"><i class="fas fa-comment-sms"></i> Text</a>
          </div>
        </div>
      </div>\`;
  }

  function renderApplications(applications) {
    const container = document.getElementById('applicationsContainer');
    if (!applications || applications.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="icon"><i class="fas fa-inbox" style="font-size:48px;color:#cbd5e1;"></i></div><p>No applications found</p></div>';
      updateStats([]);
      return;
    }
    container.innerHTML = applications.map(app => buildCardHtml(app)).join('');
    updateStats(applications);
    applyFilterAndSearch();
  }

  function updateStats(apps) {
    const set = (id, val) => { const el=document.getElementById(id); if(el) el.textContent=val; };
    set('statPending',    apps.filter(a=>a['Payment Status']==='unpaid').length);
    set('statPaid',       apps.filter(a=>a['Payment Status']==='paid'&&a['Status']!=='approved'&&a['Status']!=='denied').length);
    set('statApproved',   apps.filter(a=>a['Status']==='approved').length);
    set('statLeaseSent',  apps.filter(a=>a['Lease Status']==='sent').length);
    set('statLeaseSigned',apps.filter(a=>a['Lease Status']==='signed'||a['Lease Status']==='active').length);
    set('statDenied',     apps.filter(a=>a['Status']==='denied').length);
    set('statTotal',      apps.length);
    // Update sidebar badges
    set('sNavTotal',  apps.length);
    set('sNavPend',   apps.filter(a=>a['Payment Status']==='unpaid').length);
    set('sNavReview', apps.filter(a=>a['Payment Status']==='paid'&&a['Status']!=='approved'&&a['Status']!=='denied').length);
    set('sNavAppr',   apps.filter(a=>a['Status']==='approved').length);
    set('sNavLSent',  apps.filter(a=>a['Lease Status']==='sent').length);
    set('sNavLSign',  apps.filter(a=>a['Lease Status']==='signed'||a['Lease Status']==='active').length);
    set('sNavDenied', apps.filter(a=>a['Status']==='denied').length);
  }

  function refreshApplications() {
    const spinner = document.getElementById('loadingSpinner');
    const icon    = document.getElementById('refreshIcon');
    spinner.style.display = 'block';
    icon.classList.add('spinning');
    // Force a full re-fetch by clearing fingerprint
    _lastFingerprint = '';
    google.script.run
      .withSuccessHandler(result => {
        spinner.style.display = 'none';
        icon.classList.remove('spinning');
        if (result.success) {
          _allApplications = result.applications;
          renderApplications(result.applications);
        } else {
          showToast('Error: ' + result.error, 'error');
        }
      })
      .withFailureHandler(err => {
        spinner.style.display = 'none';
        icon.classList.remove('spinning');
        showToast('Server error: ' + err, 'error');
      })
      .getAllApplications();
  }

  function filterApps(status, btn) {
    // Update filter pills
    document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
    if (btn && btn.classList && btn.classList.contains('filter-pill')) btn.classList.add('active');
    // Update sidebar nav items
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    const navMap = { all:'navAll', pending:'navPending', paid:'navReview', approved:'navApproved', lease_sent:'navLeaseSent', lease_signed:'navLeaseSigned', denied:'navDenied' };
    const navEl = document.getElementById(navMap[status]);
    if (navEl) navEl.classList.add('active');
    // Update mobile bottom nav
    document.querySelectorAll('.mobile-nav-item').forEach(b => b.classList.remove('active'));
    const mNavMap = { all:'mNavAll', pending:'mNavPending', paid:'mNavReview', approved:'mNavApproved', lease_sent:'mNavLeaseSent', lease_signed:'mNavLeaseSigned', denied:'mNavDenied' };
    const mNavEl = document.getElementById(mNavMap[status]);
    if (mNavEl) { mNavEl.classList.add('active'); mNavEl.scrollIntoView({ inline: 'nearest', behavior: 'smooth' }); }
    currentFilter = status;
    applyFilterAndSearch();
  }

  function applyFilterAndSearch() {
    document.querySelectorAll('.app-card').forEach(card => {
      const matchFilter = currentFilter === 'all' || card.dataset.status === currentFilter;
      const matchSearch = currentSearch === '' || card.dataset.search.includes(currentSearch);
      card.style.display = (matchFilter && matchSearch) ? 'block' : 'none';
    });
  }

  function toggleSidebar() {
    const sidebar  = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (sidebar.classList.contains('open')) {
      closeSidebar();
    } else {
      sidebar.classList.add('open');
      backdrop.classList.add('visible');
      document.body.classList.add('sidebar-lock');
    }
  }

  function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarBackdrop').classList.remove('visible');
    document.body.classList.remove('sidebar-lock');
  }

  // Also close sidebar when a nav-item filter is clicked on mobile
  document.querySelectorAll('.nav-item').forEach(function(item) {
    item.addEventListener('click', function() {
      if (window.innerWidth < 900) closeSidebar();
    });
  });

  document.getElementById('searchInput').addEventListener('input', function() {
    currentSearch = this.value.toLowerCase().trim();
    applyFilterAndSearch();
  });

  /* Ã¢ÂÂÃ¢ÂÂ Persistent session management Ã¢ÂÂÃ¢ÂÂ */
  var CP_SESSION_KEY = 'cp_admin_session_v2';
  var _cpToken = '${authToken}';

  function _cpFingerprint() {
    var parts = [
      navigator.userAgent || '',
      navigator.language || '',
      (screen.width || 0) + 'x' + (screen.height || 0),
      new Date().getTimezoneOffset(),
      navigator.platform || '',
      navigator.hardwareConcurrency || '',
      navigator.deviceMemory || ''
    ];
    var str = parts.join('|'), h = 0;
    for (var i = 0; i < str.length; i++) {
      h = Math.imul(31, h) + str.charCodeAt(i) | 0;
    }
    return Math.abs(h).toString(36);
  }

  function refreshAdminSession() {
    if (!_cpToken) return;
    try {
      localStorage.setItem(CP_SESSION_KEY, JSON.stringify({
        token: _cpToken,
        fp: _cpFingerprint(),
        savedAt: Date.now()
      }));
    } catch(e) {}
  }

  function adminLogout() {
    try { localStorage.removeItem(CP_SESSION_KEY); } catch(e) {}
    var base = window.location.href.split('?')[0];
    window.top.location.href = base + '?path=admin';
  }

  window.onload = function() {
    // Refresh the session so the 30-day window resets on every dashboard visit
    refreshAdminSession();
    currentFilter = 'all';
    currentSearch = '';
    applyFilterAndSearch();
    // Boot the live polling engine Ã¢ÂÂ starts watching for changes immediately
    initLivePolling();
  };
</script>
</body>
</html>
  `).setTitle('Admin Dashboard Ã¢ÂÂ Choice Properties');
}

// Ã¢ÂÂÃ¢ÂÂ Helper: build admin card server-side (initial render, enhanced) Ã¢ÂÂÃ¢ÂÂ
function buildAdminCard(app, baseUrl) {
  const leaseStatus = app['Lease Status'] || 'none';
  let accentClass = 'accent-pending', badgeClass = 'badge-pending', statusText = '<i class="fas fa-clock"></i> Pending';
  if      (leaseStatus === 'signed' || leaseStatus === 'active') { accentClass='accent-lease-signed'; badgeClass='badge-lease-signed'; statusText='<i class="fas fa-house-circle-check"></i> Lease Signed'; }
  else if (leaseStatus === 'sent')       { accentClass='accent-lease-sent';   badgeClass='badge-lease-sent';   statusText='<i class="fas fa-file-signature"></i> Lease Sent'; }
  else if (app['Status'] === 'approved') { accentClass='accent-approved';     badgeClass='badge-approved';     statusText='<i class="fas fa-circle-check"></i> Approved'; }
  else if (app['Status'] === 'denied')   { accentClass='accent-denied';       badgeClass='badge-denied';       statusText='<i class="fas fa-circle-xmark"></i> Denied'; }
  else if (app['Payment Status'] === 'paid') { accentClass='accent-review';   badgeClass='badge-review';       statusText='<i class="fas fa-magnifying-glass"></i> Under Review'; }

  const dataStatus = (leaseStatus==='signed'||leaseStatus==='active') ? 'lease_signed'
    : leaseStatus==='sent' ? 'lease_sent'
    : app['Payment Status']==='unpaid' ? 'pending'
    : app['Status']==='approved' ? 'approved'
    : app['Status']==='denied' ? 'denied' : 'paid';

  const searchTerms   = (app['First Name']+' '+app['Last Name']+' '+app['Email']+' '+app['App ID']+' '+(app['Property Address']||'')).toLowerCase();
  const contactMethod = app['Preferred Contact Method'] || 'Not specified';
  const contactTimes  = app['Preferred Time']            || 'Any';
  // Escape single quotes so names like O'Brien don't break onclick JS string literals
  const safeName    = (app['First Name'] + ' ' + app['Last Name']).replace(/'/g, "\\'");
  const safeContact = contactMethod.replace(/'/g, "\\'");
  const safeTimes   = contactTimes.replace(/'/g, "\\'");
  const safeAddr    = (app['Property Address'] || '').replace(/'/g, "\\'");
  const canMarkPaid    = app['Payment Status'] === 'unpaid';
  const canMarkRefund  = app['Payment Status'] === 'paid';
  const canApprove     = app['Payment Status'] === 'paid' && app['Status'] === 'pending';
  const canDeny        = canApprove;
  const canSendLease   = app['Status'] === 'approved' && leaseStatus !== 'signed' && leaseStatus !== 'active';
  const dateStr        = app['Timestamp'] ? new Date(app['Timestamp']).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '';
  const hfStatus       = app['Holding Fee Status'] || 'none';
  const hfAmt          = parseFloat(app['Holding Fee Amount']) || 0;
  const canRequestHF   = app['Status'] === 'approved' && hfStatus === 'none';
  const canConfirmHF   = hfStatus === 'requested';
  const canCountersign = leaseStatus === 'signed' && !app['Management Signature'];
  const hfBadgeHtml   = hfStatus === 'paid'
    ? `<span class="status-badge badge-hold-paid" style="margin-left:6px;" title="Holding fee $${hfAmt} received"><i class="fas fa-hand-holding-dollar"></i> Hold Fee Paid</span>`
    : hfStatus === 'requested'
    ? `<span class="status-badge badge-hold-req" style="margin-left:6px;" title="Holding fee $${hfAmt} requested"><i class="fas fa-hourglass-half"></i> Hold Fee Pending</span>`
    : '';
  // Phase 8.4: Application age indicator
  const _daysAgo  = app['Timestamp'] ? Math.floor((Date.now() - new Date(app['Timestamp']).getTime()) / 86400000) : null;
  const ageChip   = _daysAgo !== null ? `<span class="info-chip" title="Submitted ${_daysAgo} day${_daysAgo===1?'':'s'} ago" style="color:${_daysAgo>14?'#b45309':'#64748b'};"><i class="fas fa-calendar-days" style="opacity:.6;"></i> ${_daysAgo}d old</span>` : '';
  // Phase 8.3: Last contacted badge
  const _lastContacted = app['Last Contacted'] ? new Date(app['Last Contacted']).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : null;
  const contactedBadge = _lastContacted ? `<span class="status-badge" style="background:#dcfce7;color:#166534;margin-left:6px;font-size:11px;" title="Last contacted: ${_lastContacted}"><i class="fas fa-phone-volume"></i> Contacted ${_lastContacted}</span>` : '';

  let payPrefsHtml = '';
  if (app['Payment Status'] === 'unpaid') {
    const prefs = [];
    if (app['Primary Payment Method'])     prefs.push('<i class="fas fa-medal" style="color:#f59e0b;"></i> ' + (app['Primary Payment Method']==='Other'&&app['Primary Payment Method Other'] ? app['Primary Payment Method Other'] : app['Primary Payment Method']));
    if (app['Alternative Payment Method']) prefs.push('<i class="fas fa-award" style="color:#94a3b8;"></i> ' + (app['Alternative Payment Method']==='Other'&&app['Alternative Payment Method Other'] ? app['Alternative Payment Method Other'] : app['Alternative Payment Method']));
    if (prefs.length) payPrefsHtml = `<div class="pay-prefs"><strong><i class="fas fa-coins" style="color:#f59e0b;margin-right:4px;"></i>Payment Prefs:</strong> ${prefs.join('  &middot;  ')}</div>`;
  }

  return `
    <div class="app-card" data-status="${dataStatus}" data-search="${searchTerms}" data-appid="${app['App ID']}">
      <div class="card-accent ${accentClass}"></div>
      <div class="card-body">
        <div class="card-top">
          <div>
            <div class="card-name">${app['First Name']} ${app['Last Name']}</div>
            <div class="card-meta"><i class="fas fa-hashtag" style="font-size:10px;opacity:.5;"></i> ${app['App ID']} &middot; ${dateStr}</div>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:5px;justify-content:flex-end;align-items:center;">
            <span class="status-badge ${badgeClass}">${statusText}</span>
            ${hfBadgeHtml}
            ${contactedBadge}
          </div>
        </div>
        <div class="card-info-row">
          <a href="mailto:${app['Email']}" class="info-chip" aria-label="Email ${app['Email']}"><i class="fas fa-envelope" style="opacity:.6;"></i> ${app['Email']}</a>
          <a href="tel:${(app['Phone']||'').replace(/\D/g,'')}" class="info-chip" aria-label="Call ${app['Phone']}"><i class="fas fa-phone" style="opacity:.6;"></i> ${app['Phone']}</a>
          <span class="info-chip"><i class="fas fa-house" style="opacity:.6;"></i> ${app['Property Address']||'No property'}</span>
          <span class="info-chip"><i class="fas fa-mobile-screen-button" style="opacity:.6;"></i> ${contactMethod}</span>
          <span class="info-chip"><i class="fas fa-clock" style="opacity:.6;"></i> ${contactTimes}</span>
          ${ageChip}
        </div>
        ${payPrefsHtml}
        <div class="card-actions">
          <button class="act-btn btn-pay"       onclick="showConfirmModal('markPaid','${app['App ID']}','${safeName}','${safeContact}','${safeTimes}')" ${canMarkPaid?'':'disabled'} aria-label="Mark as paid"><i class="fas fa-coins"></i> Mark Paid</button>
          <button class="act-btn btn-deny"      onclick="showConfirmModal('markRefund','${app['App ID']}','${safeName}','${safeContact}','${safeTimes}')" ${canMarkRefund?'':'disabled'} aria-label="Mark as refunded" style="background:linear-gradient(to right,#7c3aed,#a855f7);"><i class="fas fa-rotate-left"></i> Refunded</button>
          <button class="act-btn btn-appr"      onclick="showConfirmModal('approve','${app['App ID']}','${safeName}','${safeContact}','${safeTimes}')" ${canApprove?'':'disabled'} aria-label="Approve"><i class="fas fa-circle-check"></i> Approve</button>
          <button class="act-btn btn-deny"      onclick="showConfirmModal('deny','${app['App ID']}','${safeName}','${safeContact}','${safeTimes}')" ${canDeny?'':'disabled'} aria-label="Deny"><i class="fas fa-circle-xmark"></i> Deny</button>
          <button class="act-btn btn-lease"     onclick="showLeaseModal('${app['App ID']}','${safeName}','${safeContact}','${safeTimes}','${safeAddr}')" ${canSendLease?'':'disabled'} aria-label="Send lease"><i class="fas fa-file-signature"></i> Send Lease</button>
          <button class="act-btn btn-hold-req"  onclick="showHoldingFeeModal('${app['App ID']}','${safeName}','${safeContact}')" ${canRequestHF?'':'disabled'} aria-label="Request holding fee"><i class="fas fa-hand-holding-dollar"></i> Request Hold Fee</button>
          <button class="act-btn btn-hold-paid" onclick="showConfirmModal('holdFeePaid','${app['App ID']}','${safeName}','${safeContact}','${safeTimes}')" ${canConfirmHF?'':'disabled'} aria-label="Mark holding fee received"><i class="fas fa-circle-check"></i> Hold Fee Received</button>
          <button class="act-btn btn-countersign" onclick="showConfirmModal('countersign','${app['App ID']}','${safeName}','${safeContact}','${safeTimes}')" ${canCountersign?'':'disabled'} aria-label="Countersign lease"><i class="fas fa-file-signature"></i> Countersign Lease</button>
          <button class="act-btn btn-contacted" onclick="showConfirmModal('markContacted','${app['App ID']}','${safeName}','${safeContact}','${safeTimes}')" aria-label="Log contact"><i class="fas fa-phone-volume"></i> Mark Contacted</button>
          <a href="${baseUrl}?path=dashboard&id=${app['App ID']}" target="_blank" class="act-btn btn-view" aria-label="View dashboard"><i class="fas fa-eye"></i> View</a>
          <a href="sms:7077063137?body=Hi%20${encodeURIComponent(app['First Name']||'')}%2C%20this%20is%20Choice%20Properties%20re%20app%20${app['App ID']}" class="act-btn btn-text" aria-label="Text applicant"><i class="fas fa-comment-sms"></i> Text</a>
        </div>
      </div>
    </div>`;
}

// ============================================================
// runCompleteBackendTest() Ã¢ÂÂ dev helper (unchanged)
// ============================================================
// ============================================================
  // checkUnsignedLeases()  Ã¢ÂÂ Issue #6 fix
  // Scheduled to run daily via setupLeaseReminderTrigger().
  // At 24h after lease sent: emails tenant a signing reminder.
  // At 48h after lease sent: emails admin an expiry alert.
  // Each action fires only once (sentinel tags in Admin Notes).
  // ============================================================
  function checkUnsignedLeases() {
    try {
      const ss    = getSpreadsheet();
      const sheet = ss.getSheetByName(SHEET_NAME);
      if (!sheet) return;
      const col  = getColumnMap(sheet);
      const data = sheet.getDataRange().getValues();
      const now  = new Date();

      for (let i = 1; i < data.length; i++) {
        const row          = data[i];
        const leaseStatus  = col['Lease Status']    ? row[col['Lease Status'] - 1]    : '';
        const leaseSentRaw = col['Lease Sent Date'] ? row[col['Lease Sent Date'] - 1] : '';
        if (leaseStatus !== 'sent' || !leaseSentRaw) continue;

        const leaseSentDate = new Date(leaseSentRaw);
        if (isNaN(leaseSentDate.getTime())) continue;
        const hoursElapsed = (now - leaseSentDate) / 36e5;

        const rowNum     = i + 1;
        const appId      = col['App ID']           ? row[col['App ID'] - 1]           : '';
        const email      = col['Email']            ? row[col['Email'] - 1]             : '';
        const firstName  = col['First Name']       ? row[col['First Name'] - 1]        : '';
        const lastName   = col['Last Name']        ? row[col['Last Name'] - 1]         : '';
        const tenantName = (firstName + ' ' + lastName).trim();
        const tenantPhone= col['Phone']            ? row[col['Phone'] - 1]             : '';
        const property   = col['Property Address'] ? row[col['Property Address'] - 1]  : '';
        const leaseLink  = col['Lease Link']       ? row[col['Lease Link'] - 1]        : '';
        const adminNotes = col['Admin Notes']      ? String(row[col['Admin Notes'] - 1] || '') : '';

        if (!appId || !email) continue;

        // 24h window: send tenant reminder once (between 24h and 36h after send)
        if (hoursElapsed >= 24 && hoursElapsed < 36 && !adminNotes.includes('[REMINDER_SENT]')) {
          sendLeaseSigningReminder(appId, email, firstName, leaseLink, property);
          const note = '[' + new Date().toLocaleString() + '] [REMINDER_SENT] 24h lease signing reminder emailed to tenant.';
          sheet.getRange(rowNum, col['Admin Notes']).setValue(adminNotes ? adminNotes + '\n' + note : note);
          console.log('checkUnsignedLeases: 24h reminder sent for', appId);
        }

        // 48h window: send admin expiry alert once (at or after 48h)
        if (hoursElapsed >= 48 && !adminNotes.includes('[EXPIRY_ALERT_SENT]')) {
          sendLeaseExpiryAdminAlert(appId, tenantName, email, tenantPhone, property);
          const current = sheet.getRange(rowNum, col['Admin Notes']).getValue();
          const note = '[' + new Date().toLocaleString() + '] [EXPIRY_ALERT_SENT] 48h unsigned lease admin alert sent.';
          sheet.getRange(rowNum, col['Admin Notes']).setValue(current ? current + '\n' + note : note);
          console.log('checkUnsignedLeases: 48h admin alert sent for', appId);
        }
      }
    } catch (err) {
      console.error('checkUnsignedLeases error:', err);
    }
  }

  // ============================================================
  // setupLeaseReminderTrigger()  Ã¢ÂÂ Run ONCE manually from GAS IDE.
  // Creates a daily time-driven trigger for checkUnsignedLeases().
  // Safe to re-run Ã¢ÂÂ removes any duplicate triggers first.
  // ============================================================
  function setupLeaseReminderTrigger() {
    ScriptApp.getProjectTriggers().forEach(function(t) {
      if (t.getHandlerFunction() === 'checkUnsignedLeases') ScriptApp.deleteTrigger(t);
    });
    ScriptApp.newTrigger('checkUnsignedLeases')
      .timeBased()
      .everyDays(1)
      .atHour(9)
      .create();
    console.log('setupLeaseReminderTrigger: daily 9 AM trigger created for checkUnsignedLeases.');
  }