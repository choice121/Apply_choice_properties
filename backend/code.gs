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
// Initialize sheets — now includes lease columns
// ============================================================
function initializeSheets() {
  const ss = getSpreadsheet();

  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    const headers = [
      // ── Original columns ─────────────────────────────────
      'Timestamp', 'App ID', 'Status', 'Payment Status', 'Payment Date', 'Admin Notes',
      'First Name', 'Last Name', 'Email', 'Phone', 'Property Address', 'Requested Move-in Date',
      'Desired Lease Term', 'DOB', 'SSN', 'Current Address', 'Residency Duration',
      'Current Rent Amount', 'Reason for leaving', 'Current Landlord Name', 'Landlord Phone',
      'Employment Status', 'Employer', 'Job Title', 'Employment Duration',
      'Supervisor Name', 'Supervisor Phone', 'Monthly Income', 'Other Income',
      'Reference 1 Name', 'Reference 1 Phone', 'Reference 2 Name', 'Reference 2 Phone',
      'Emergency Contact Name', 'Emergency Contact Phone', 'Primary Payment Method', 'Primary Payment Method Other',
      'Alternative Payment Method', 'Alternative Payment Method Other', 'Third Choice Payment Method', 'Third Choice Payment Method Other',
      'Has Pets', 'Pet Details', 'Total Occupants', 'Additional Occupants',
      'Ever Evicted', 'Smoker', 'Document URL',
      'Has Co-Applicant', 'Additional Person Role',
      'Co-Applicant First Name', 'Co-Applicant Last Name', 'Co-Applicant Email', 'Co-Applicant Phone',
      'Co-Applicant DOB', 'Co-Applicant SSN', 'Co-Applicant Employer', 'Co-Applicant Job Title',
      'Co-Applicant Monthly Income', 'Co-Applicant Employment Duration', 'Co-Applicant Consent',
      'Vehicle Make', 'Vehicle Model', 'Vehicle Year', 'Vehicle License Plate',
      'Emergency Contact Relationship', 'Preferred Contact Method', 'Preferred Time', 'Preferred Time Specific',
      // ── NEW: Lease columns ────────────────────────────────
      'Property Owner', 'Managed By',
      'Lease Status', 'Lease Sent Date', 'Lease Signed Date',
      'Lease Start Date', 'Lease End Date', 'Monthly Rent',
      'Security Deposit', 'Move-in Costs', 'Lease Notes',
      'Tenant Signature', 'Signature Timestamp', 'Lease IP Address'
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1a5276').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  } else {
    // ── Safely add missing lease columns to an existing sheet ──
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
}

// ── Add lease columns to sheets that existed before this update ──
function addMissingLeaseColumns(sheet) {
  const leaseColumns = [
    'Property Owner', 'Managed By',
    'Lease Status', 'Lease Sent Date', 'Lease Signed Date',
    'Lease Start Date', 'Lease End Date', 'Monthly Rent',
    'Security Deposit', 'Move-in Costs', 'Lease Notes',
    'Tenant Signature', 'Signature Timestamp', 'Lease IP Address'
  ];
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  leaseColumns.forEach(col => {
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
// doGet() — Serve web pages (lease routes added)
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

  // ── NEW lease routes ──────────────────────────────────────
  } else if (path === 'lease' && id) {
    return renderLeaseSigningPage(id);
  } else if (path === 'lease_confirm' && id) {
    return renderLeaseConfirmPage(id);
  // ─────────────────────────────────────────────────────────

  } else {
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
                    <a href="?path=admin" class="btn btn-outline-secondary btn-lg">Admin Login</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
      </body>
      </html>
    `).setTitle('Choice Properties');
  }
}

// ============================================================
// renderLoginPage()
// ============================================================
function renderLoginPage(errorMsg) {
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
              <p class="text-center text-muted small">Need help? Text us at <strong>707-706-3137</strong></p>
            </div>
          </div>
        </div>
      </div>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
      <script>
        function login(){
          const q=document.getElementById('query').value.trim();
          if(!q)return;
          window.location.href='?path=dashboard&id='+encodeURIComponent(q);
        }
      </script>
    </body>
    </html>
  `).setTitle('Applicant Login - Choice Properties');
}

// ============================================================
// ADMIN AUTH — Token + OTP + Password System
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
    if (now - ts > 8 * 60 * 60) return false;
    const expectedSig = Utilities.base64Encode(
      Utilities.computeHmacSha256Signature('admin:' + ts, secret)
    );
    return sig === expectedSig;
  } catch (e) { return false; }
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
      subject: '🔐 Your Admin Login Code — Choice Properties',
      htmlBody: `
        <div style="font-family:sans-serif;max-width:420px;margin:auto;padding:32px;background:#fff;border-radius:16px;">
          <h2 style="color:#1e293b;margin-bottom:8px;">Admin Login Code</h2>
          <p style="color:#475569;margin-bottom:24px;">Use the code below to access the Choice Properties admin panel.</p>
          <div style="font-size:40px;font-weight:700;letter-spacing:10px;color:#4f46e5;background:#f1f5f9;border-radius:12px;padding:24px;text-align:center;">${otp}</div>
          <p style="color:#94a3b8;font-size:13px;margin-top:20px;">⏱ Expires in 10 minutes. Do not share this code with anyone.</p>
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
    if (username.trim() !== storedUser || inputHash !== storedHash) {
      return { success: false, error: 'Invalid username or password.' };
    }
    return { success: true, token: generateAdminToken() };
  } catch (e) { return { success: false, error: 'Login failed: ' + e.toString() }; }
}

// Run this ONCE manually in the GAS editor to set your admin credentials:
function setupAdminPassword() {
  const username = 'choiceproperties404@gmail.com';
  const password = 'Choice123$..';
  if (!username || !password) {
    Logger.log('❌ Set your username and password in this function before running it.');
    return;
  }
  const props    = PropertiesService.getScriptProperties();
  props.setProperty('ADMIN_USERNAME', username);
  const hash = Utilities.base64Encode(
    Utilities.computeHmacSha256Signature(password, username)
  );
  props.setProperty('ADMIN_PASSWORD_HASH', hash);
  Logger.log('✅ Admin credentials set. Username: ' + username);
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
  <title>Admin Login — Choice Properties</title>
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
    <p>Admin Portal — Secure Login</p>
  </div>

  ${errorMsg ? '<div class="alert alert-error">⚠️ ' + errorMsg + '</div>' : ''}

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
    <input type="password" id="upPass" placeholder="••••••••" autocomplete="current-password">
    <button class="pass-toggle" type="button" onclick="togglePass()" id="passToggleBtn" aria-label="Show password">👁</button>
  </div>
  <button class="btn btn-primary" onclick="passwordLogin()">Sign In</button>
  <div class="msg" id="upMsg"></div>
  ` : `
  <p style="text-align:center;color:#94a3b8;font-size:13px;padding:8px 0;">Password login not configured — use email code above.</p>
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
    btn.textContent = inp.type === 'password' ? '👁' : '🙈';
  }

  function requestOTP() {
    const email = document.getElementById('otpEmail').value.trim();
    if (!email) { setMsg('otpMsg', 'Please enter your email address.', 'error'); return; }
    const btn = document.getElementById('otpSendBtn');
    btn.disabled = true; btn.textContent = 'Sending...';
    setMsg('otpMsg', 'Sending code…', 'info');
    google.script.run
      .withSuccessHandler(function(data) {
        if (data.success) {
          document.getElementById('otpCodeSection').style.display = 'block';
          setMsg('otpMsg', '✅ Code sent! Check your inbox (and spam folder).', 'success');
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

  function verifyOTP() {
    const email = document.getElementById('otpEmail').value.trim();
    const otp   = document.getElementById('otpCode').value.trim();
    if (!otp) { setMsg('otpMsg', 'Please enter the verification code.', 'error'); return; }
    setMsg('otpMsg', 'Verifying…', 'info');
    google.script.run
      .withSuccessHandler(function(data) {
        if (data.success) {
          setMsg('otpMsg', '✅ Verified! Redirecting…', 'success');
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
    setMsg('upMsg', 'Signing in…', 'info');
    google.script.run
      .withSuccessHandler(function(data) {
        if (data.success) {
          setMsg('upMsg', '✅ Success! Redirecting…', 'success');
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
  `).setTitle('Admin Login — Choice Properties');
}

// ============================================================
// doPost() — Handle form submissions
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

    // ── Route: lease e-signature submission ──
    if (formData['_action'] === 'signLease') {
      const result = signLease(formData['appId'], formData['tenantSignature'], formData['ipAddress'] || '');
      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ── Route: admin auth ──
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
    const requiredFields = ['First Name', 'Last Name', 'Email', 'Phone'];
    for (let field of requiredFields) {
      if (!formData[field] || formData[field].trim() === '') {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    const ss = getSpreadsheet();
    initializeSheets();
    const sheet = ss.getSheetByName(SHEET_NAME);
    const col   = getColumnMap(sheet);
    const appId = formData.appId || generateAppId();

    let fileUrl = '';
    if (fileBlob) {
      try {
        const file = DriveApp.createFile(fileBlob);
        fileUrl = file.getUrl();
      } catch (err) { console.error('File upload error:', err); }
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const rowData = [];
    headers.forEach(header => {
      switch (header) {
        case 'Timestamp':             rowData.push(new Date()); break;
        case 'App ID':                rowData.push(appId); break;
        case 'Status':                rowData.push('pending'); break;
        case 'Payment Status':        rowData.push('unpaid'); break;
        case 'Payment Date':          rowData.push(''); break;
        case 'Admin Notes':           rowData.push(''); break;
        case 'Document URL':          rowData.push(fileUrl); break;
        case 'Preferred Contact Method': rowData.push(getCheckboxValues(formData, 'Preferred Contact Method')); break;
        case 'Preferred Time':        rowData.push(getCheckboxValues(formData, 'Preferred Time')); break;
        // ── Ownership columns ──
        case 'Property Owner':        rowData.push(formData['Property Owner'] || 'Choice Properties'); break;
        case 'Managed By':            rowData.push('Choice Properties'); break;
        // ── Lease columns default empty on submission ──
        case 'Lease Status':          rowData.push('none'); break;
        case 'Lease Sent Date':       rowData.push(''); break;
        case 'Lease Signed Date':     rowData.push(''); break;
        case 'Lease Start Date':      rowData.push(''); break;
        case 'Lease End Date':        rowData.push(''); break;
        case 'Monthly Rent':          rowData.push(''); break;
        case 'Security Deposit':      rowData.push(''); break;
        case 'Move-in Costs':         rowData.push(''); break;
        case 'Lease Notes':           rowData.push(''); break;
        case 'Tenant Signature':      rowData.push(''); break;
        case 'Signature Timestamp':   rowData.push(''); break;
        case 'Lease IP Address':      rowData.push(''); break;
        default:
          rowData.push(formData[header] || '');
      }
    });

    sheet.appendRow(rowData);

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

// ============================================================
//  ██╗     ███████╗ █████╗ ███████╗███████╗
//  ██║     ██╔════╝██╔══██╗██╔════╝██╔════╝
//  ██║     █████╗  ███████║███████╗█████╗
//  ██║     ██╔══╝  ██╔══██║╚════██║██╔══╝
//  ███████╗███████╗██║  ██║███████║███████╗
//  ╚══════╝╚══════╝╚═╝  ╚═╝╚══════╝╚══════╝
//  FLOW FUNCTIONS
// ============================================================

// ── generateAndSendLease() ────────────────────────────────
// Called from admin panel. Populates lease data, then emails
// the tenant a link to sign.
// ─────────────────────────────────────────────────────────
function generateAndSendLease(appId, monthlyRent, securityDeposit, leaseStartDate, leaseNotes) {
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
    if (paymentStatus !== 'paid')      throw new Error('Cannot send lease — payment not confirmed.');
    if (appStatus !== 'approved')      throw new Error('Cannot send lease — application not yet approved.');

    const currentLeaseStatus = sheet.getRange(rowIndex, col['Lease Status']).getValue();
    if (currentLeaseStatus === 'signed') throw new Error('Lease already signed by tenant.');

    // Calculate lease end date from term
    const desiredTerm   = sheet.getRange(rowIndex, col['Desired Lease Term']).getValue() || '12 months';
    const startDate     = new Date(leaseStartDate);
    const endDate       = calculateLeaseEndDate(startDate, desiredTerm);
    const endDateStr    = Utilities.formatDate(endDate, Session.getScriptTimeZone(), 'MMMM dd, yyyy');

    // Move-in costs = first month + deposit
    const rent          = parseFloat(monthlyRent)      || 0;
    const deposit       = parseFloat(securityDeposit)  || 0;
    const moveInCosts   = rent + deposit;

    // Write lease data to sheet
    sheet.getRange(rowIndex, col['Lease Status']).setValue('sent');
    sheet.getRange(rowIndex, col['Lease Sent Date']).setValue(new Date());
    sheet.getRange(rowIndex, col['Lease Start Date']).setValue(leaseStartDate);
    sheet.getRange(rowIndex, col['Lease End Date']).setValue(endDateStr);
    sheet.getRange(rowIndex, col['Monthly Rent']).setValue(rent);
    sheet.getRange(rowIndex, col['Security Deposit']).setValue(deposit);
    sheet.getRange(rowIndex, col['Move-in Costs']).setValue(moveInCosts);
    sheet.getRange(rowIndex, col['Lease Notes']).setValue(leaseNotes || '');

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
      property      : sheet.getRange(rowIndex, col['Property Address']).getValue(),
      propertyOwner : propertyOwner
    });

    logEmail('lease_sent', tenantEmail, 'success', appId);
    return { success: true, message: 'Lease sent to ' + tenantEmail, leaseLink: leaseLink };

  } catch (error) {
    console.error('generateAndSendLease error:', error);
    logEmail('lease_sent', 'admin', 'failed', appId, error.toString());
    return { success: false, error: error.toString() };
  }
}

// ── calculateLeaseEndDate() ───────────────────────────────
function calculateLeaseEndDate(startDate, termString) {
  const end = new Date(startDate);
  const term = termString.toLowerCase();
  if      (term.includes('6'))  end.setMonth(end.getMonth() + 6);
  else if (term.includes('12')) end.setMonth(end.getMonth() + 12);
  else if (term.includes('18')) end.setMonth(end.getMonth() + 18);
  else if (term.includes('24')) end.setMonth(end.getMonth() + 24);
  else                          end.setMonth(end.getMonth() + 1);  // month-to-month default
  end.setDate(end.getDate() - 1); // end = day before next period
  return end;
}

// ── signLease() ───────────────────────────────────────────
// Called via google.script.run from the lease signing page.
// ─────────────────────────────────────────────────────────
function signLease(appId, tenantSignature, ipAddress) {
  try {
    if (!tenantSignature || tenantSignature.trim().length < 2) {
      throw new Error('A valid signature is required.');
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

    const leaseStatus = sheet.getRange(rowIndex, col['Lease Status']).getValue();
    if (leaseStatus === 'signed') throw new Error('Lease has already been signed.');
    if (leaseStatus !== 'sent')   throw new Error('No lease is pending signature for this application.');

    const signedAt = new Date();
    sheet.getRange(rowIndex, col['Lease Status']).setValue('signed');
    sheet.getRange(rowIndex, col['Lease Signed Date']).setValue(signedAt);
    sheet.getRange(rowIndex, col['Tenant Signature']).setValue(tenantSignature.trim());
    sheet.getRange(rowIndex, col['Signature Timestamp']).setValue(signedAt.toISOString());
    sheet.getRange(rowIndex, col['Lease IP Address']).setValue(ipAddress || 'not captured');

    // Add audit note
    const currentNotes = sheet.getRange(rowIndex, col['Admin Notes']).getValue();
    const auditNote = `[${signedAt.toLocaleString()}] Lease signed electronically by "${tenantSignature.trim()}" from IP ${ipAddress || 'unknown'}.`;
    sheet.getRange(rowIndex, col['Admin Notes']).setValue(
      currentNotes ? currentNotes + '\n' + auditNote : auditNote
    );

    // Gather data for emails
    const email      = sheet.getRange(rowIndex, col['Email']).getValue();
    const firstName  = sheet.getRange(rowIndex, col['First Name']).getValue();
    const lastName   = sheet.getRange(rowIndex, col['Last Name']).getValue();
    const phone      = sheet.getRange(rowIndex, col['Phone']).getValue();
    const property   = sheet.getRange(rowIndex, col['Property Address']).getValue();
    const rent       = sheet.getRange(rowIndex, col['Monthly Rent']).getValue();
    const deposit    = sheet.getRange(rowIndex, col['Security Deposit']).getValue();
    const startDate  = sheet.getRange(rowIndex, col['Lease Start Date']).getValue();
    const endDate    = sheet.getRange(rowIndex, col['Lease End Date']).getValue();
    const moveInCost = sheet.getRange(rowIndex, col['Move-in Costs']).getValue();

    const baseUrl       = ScriptApp.getService().getUrl();
    const dashboardLink = baseUrl + '?path=dashboard&id=' + appId;

    sendLeaseSignedTenantEmail(appId, email, firstName, phone, {
      property    : property,
      rent        : rent,
      deposit     : deposit,
      moveInCost  : moveInCost,
      startDate   : startDate,
      endDate     : endDate,
      signature   : tenantSignature.trim(),
      dashboardLink
    });

    sendLeaseSignedAdminAlert(appId, firstName + ' ' + lastName, email, phone, tenantSignature.trim(), property);

    logEmail('lease_signed', email, 'success', appId);
    return { success: true, message: 'Lease signed successfully.' };

  } catch (error) {
    console.error('signLease error:', error);
    logEmail('lease_signed', appId, 'failed', appId, error.toString());
    return { success: false, error: error.toString() };
  }
}

// ── getLeaseSummary() ─────────────────────────────────────
// Returns lease data for a given appId — used by the
// applicant dashboard to show lease status card.
// ─────────────────────────────────────────────────────────
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
// renderLeaseSigningPage()  —  ?path=lease&id=APP_ID
// Full lease document + e-signature block
// ============================================================
function renderLeaseSigningPage(appId) {
  const result = getApplication(appId);
  if (!result.success) {
    return HtmlService.createHtmlOutput(`
      <html><body style="font-family:sans-serif;text-align:center;padding:60px;">
      <h2>⚠️ Lease Not Found</h2>
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
        <div style="font-size:64px;">✅</div>
        <h2 style="color:#27ae60;">Lease Already Signed</h2>
        <p>This lease has already been signed. Please check your email for your copy, or log in to your dashboard.</p>
        <a href="?path=dashboard&id=${appId}" style="display:inline-block;margin-top:20px;background:#1a5276;color:white;padding:14px 32px;border-radius:50px;text-decoration:none;font-weight:600;">View My Dashboard</a>
      </div></body></html>
    `).setTitle('Already Signed');
  }
  if (leaseStatus !== 'sent') {
    return HtmlService.createHtmlOutput(`
      <html><body style="font-family:sans-serif;text-align:center;padding:60px;">
      <h2>⚠️ No Lease Ready</h2>
      <p>No lease is currently available for signing. Please contact us at <strong>707-706-3137</strong>.</p>
      </body></html>
    `).setTitle('No Lease Available');
  }

  const firstName     = app['First Name']         || '';
  const lastName      = app['Last Name']          || '';
  const fullName      = firstName + ' ' + lastName;
  const property      = app['Property Address']   || '';
  const term          = app['Desired Lease Term'] || '';
  const rent          = parseFloat(app['Monthly Rent'])       || 0;
  const deposit       = parseFloat(app['Security Deposit'])   || 0;
  const moveInCost    = parseFloat(app['Move-in Costs'])      || (rent + deposit);
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

  // Determine correct landlord for this property
  const propertyOwner = app['Property Owner'] || 'Choice Properties';
  const isChoiceOwned = !propertyOwner || propertyOwner === 'Choice Properties' || propertyOwner.trim() === '';
  const landlordName  = isChoiceOwned ? 'Choice Properties' : propertyOwner;
  const landlordAddr  = isChoiceOwned ? '2265 Livernois, Suite 500, Troy, MI 48083' : '';
  const managedByLine = isChoiceOwned
    ? ''
    : `<li><b>Property Manager:</b> Choice Properties, 2265 Livernois Suite 500, Troy, MI 48083 | 707-706-3137 (acting as authorized management agent)</li>`;

  // Utilities clause — generic since it varies by property
  const utilitiesNote = 'Tenant is responsible for all utilities unless otherwise specified in a written addendum provided at lease signing. Please confirm any included utilities with Choice Properties management prior to move-in.';

  return HtmlService.createHtmlOutput(`
<!DOCTYPE html>
<html>
<head>
  <title>Residential Lease Agreement - Choice Properties</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600;700&family=Dancing+Script:wght@700&display=swap" rel="stylesheet">
  <style>
    /* ── Base ── */
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Inter',Arial,sans-serif;background:#f0f2f5;color:#2c3e50;line-height:1.7;}
    .wrapper{max-width:860px;margin:30px auto;padding:0 15px 60px;}

    /* ── Header ── */
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

    /* ── Doc ref bar ── */
    .doc-ref-bar{background:#1a5276;color:rgba(255,255,255,.85);
      padding:10px 48px;font-size:12px;font-family:'Inter',monospace;
      display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;
      border-left:1px solid #144066;border-right:1px solid #144066;}

    /* ── Managed-by notice (external properties only) ── */
    .mgmt-notice{background:#fffbeb;border-left:4px solid #f59e0b;padding:12px 20px;
      font-size:13px;color:#78350f;border-right:1px solid #e5c07a;
      border-bottom:1px solid #e5c07a;}

    /* ── Lease body ── */
    .lease-body{background:white;padding:40px 48px;
      border-left:1px solid #dde3ea;border-right:1px solid #dde3ea;}

    /* ── Personalization banner ── */
    .personal-banner{background:linear-gradient(135deg,#eff6ff,#dbeafe);
      border:1px solid #93c5fd;border-radius:10px;padding:14px 20px;
      margin-bottom:28px;font-size:13px;color:#1e40af;font-weight:500;}

    /* ── Article headers ── */
    .article-header{font-size:10px;font-weight:700;text-transform:uppercase;
      letter-spacing:2px;color:#94a3b8;margin:36px 0 6px;padding-bottom:6px;
      border-bottom:1px solid #f1f5f9;}
    .section-title{font-size:13px;font-weight:700;text-transform:uppercase;
      letter-spacing:1px;color:white;background:#1a5276;
      padding:8px 16px;border-radius:6px;margin:8px 0 14px;}

    /* ── Key-value table ── */
    .kv-table{width:100%;border-collapse:collapse;margin-bottom:8px;}
    .kv-table td{padding:9px 14px;border:1px solid #dde3ea;font-size:14px;vertical-align:top;}
    .kv-table td:first-child{width:38%;background:#f8f9fb;font-weight:600;color:#1a5276;}

    /* ── Highlight boxes ── */
    .highlight-box{background:#fff3cd;border:1px solid #f39c12;border-radius:10px;padding:18px 22px;margin:20px 0;}
    .highlight-box.blue{background:#e8f4fc;border-color:#3498db;}
    .highlight-box.green{background:#d4edda;border-color:#27ae60;}
    .highlight-box.slate{background:#f8fafc;border-left:4px solid #64748b;border-radius:4px;border-top:none;border-right:none;border-bottom:none;}
    .highlight-box.red{background:#fff0f0;border-left:4px solid #e74c3c;border-radius:4px;border-top:none;border-right:none;border-bottom:none;}

    /* ── Clause text ── */
    .clause{margin-bottom:18px;font-size:14px;}
    .clause b{color:#1a5276;}
    ol.clauses{padding-left:20px;}
    ol.clauses > li{margin-bottom:18px;font-size:14px;line-height:1.75;}
    ol.clauses > li > b{color:#1a5276;display:block;margin-bottom:4px;}

    /* ── Signature section ── */
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

    /* ── Step progress ── */
    .sig-steps{display:flex;gap:0;margin:24px 0 28px;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;}
    .sig-step{flex:1;padding:12px 10px;text-align:center;background:#f8fafc;
      font-size:12px;font-weight:600;color:#94a3b8;transition:all .3s;
      border-right:1px solid #e2e8f0;position:relative;}
    .sig-step:last-child{border-right:none;}
    .sig-step.done{background:#d1fae5;color:#065f46;}
    .sig-step.done::after{content:'✓';margin-left:4px;}
    .sig-step.active{background:linear-gradient(135deg,#1a5276,#2980b9);color:white;font-weight:700;}
    .sig-step-num{display:block;font-size:18px;margin-bottom:2px;}

    /* ── Signature input ── */
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

    /* ── Live preview ── */
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

    /* ── Legal badge ── */
    .legal-badge{background:#f0fdf4;border:1px solid #86efac;border-radius:8px;
      padding:10px 14px;font-size:12px;color:#15803d;font-weight:500;
      display:flex;align-items:center;gap:8px;margin-top:14px;}
    .legal-badge-icon{font-size:16px;flex-shrink:0;}

    /* ── Checkboxes ── */
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

    /* ── Sign button ── */
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

    /* ── Spinner ── */
    .spinner{display:none;text-align:center;padding:20px;}
    .spinner-ring{display:inline-block;width:40px;height:40px;
      border:4px solid rgba(26,82,118,.15);border-top-color:#1a5276;
      border-radius:50%;animation:spin .8s linear infinite;}
    @keyframes spin{to{transform:rotate(360deg);}}

    /* ── Alert ── */
    .alert{padding:14px 18px;border-radius:10px;margin:14px 0;font-size:14px;}
    .alert-danger{background:#fee2e2;color:#991b1b;border:1px solid #fecaca;}

    /* ── Success overlay ── */
    .success-overlay{display:none;text-align:center;padding:32px 20px;}
    .success-overlay .check{font-size:64px;margin-bottom:12px;}
    .success-overlay h4{color:#059669;font-size:20px;font-weight:700;margin-bottom:6px;}
    .success-overlay p{color:#64748b;font-size:14px;}

    /* ── Footer ── */
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
    <div class="hdr-eyebrow">Choice Properties · Leasing Division</div>
    <div class="hdr-logo">Choice Properties</div>
    <div class="hdr-sub">Professional Property Management</div>
    <div class="hdr-divider"></div>
    <div class="hdr-title">Residential Lease Agreement</div>
    <div class="hdr-badges">
      <span class="hdr-badge">REF: ${appId}</span>
      <span class="hdr-badge">🔒 CONFIDENTIAL</span>
      <span class="hdr-badge">E-SIGN ACT COMPLIANT</span>
    </div>
  </div>

  <!-- Doc reference bar -->
  <div class="doc-ref-bar">
    <span>Document: CP-LEASE-${appId}</span>
    <span>Prepared: ${todayStr}</span>
    <span>Jurisdiction: State of Michigan</span>
    <span>Prepared for: ${fullName} — Exclusively</span>
  </div>

  ${!isChoiceOwned ? `
  <div class="mgmt-notice">
    <strong>📋 Management Notice:</strong> This property is owned by <strong>${landlordName}</strong> and managed by <strong>Choice Properties</strong> as the authorized management agent. All lease administration, communications, and tenant services are handled by Choice Properties on behalf of the property owner.
  </div>` : ''}

  <!-- LEASE BODY -->
  <div class="lease-body">

    <!-- Personalization notice -->
    <div class="personal-banner">
      🔒 This lease agreement was prepared exclusively for <strong>${fullName}</strong>
      and is linked to Application ID <strong>${appId}</strong>.
      Please read every section carefully before signing.
    </div>

    <!-- ═══════════════════════════════════════
         ARTICLE I — PARTIES TO THE AGREEMENT
    ═══════════════════════════════════════ -->
    <div class="article-header">Article I — Parties to the Agreement</div>
    <div class="section-title">📋 Parties</div>
    <p class="clause">This Residential Lease Agreement ("Agreement" or "Lease") is entered into as of <b>${todayStr}</b>, by and between the following parties:</p>
    <ul style="margin:10px 0 20px 20px;font-size:14px;line-height:2;">
      <li><b>Landlord:</b> ${landlordName}${landlordAddr ? ', ' + landlordAddr : ''}</li>
      ${managedByLine}
      <li><b>Tenant(s):</b> ${fullName}</li>
      <li><b>Contact / Text:</b> ${phone} &nbsp;·&nbsp; ${email}</li>
    </ul>
    <p class="clause" style="font-size:13px;color:#555;">
      Where this Agreement refers to the "Landlord," it refers to <b>${landlordName}</b>.
      Where it refers to "Management" or "Choice Properties," it refers to Choice Properties acting as the authorized management agent responsible for day-to-day operations, communications, and administration on behalf of the Landlord.
    </p>

    <!-- ═══════════════════════════════════════
         ARTICLE II — PROPERTY & LEASE TERM
    ═══════════════════════════════════════ -->
    <div class="article-header">Article II — Property & Lease Term</div>
    <div class="section-title">🏠 Rental Property & Term</div>
    <table class="kv-table">
      <tr><td>Rental Property Address</td><td><b>${property}</b></td></tr>
      <tr><td>Tenant(s)</td><td>${fullName}</td></tr>
      <tr><td>Lease Term</td><td>${term}</td></tr>
      <tr><td>Commencement Date</td><td><b>${startDate}</b></td></tr>
      <tr><td>Expiration Date</td><td><b>${endDate}</b></td></tr>
      <tr><td>Application ID</td><td>${appId}</td></tr>
      <tr><td>Authorized Occupants</td><td>${totalOccupants} person(s) — as listed in the rental application</td></tr>
    </table>
    <p class="clause" style="font-size:13px;color:#555;margin-top:12px;">
      The Tenant is granted the right to occupy the above-referenced property as a private residence for the duration of this Lease. Occupancy is limited to the person(s) listed in the approved rental application. Any additional occupant not listed must receive prior written approval from Management.
    </p>

    <!-- ═══════════════════════════════════════
         ARTICLE III — FINANCIAL TERMS
    ═══════════════════════════════════════ -->
    <div class="article-header">Article III — Financial Terms</div>
    <div class="section-title">💰 Rent, Deposit & Move-In Costs</div>
    <table class="kv-table">
      <tr><td>Monthly Rent</td><td><b>$${rent.toLocaleString()}.00</b></td></tr>
      <tr><td>Rent Due Date</td><td>1st day of each calendar month</td></tr>
      <tr><td>Grace Period</td><td>5 days — rent is considered late after the 5th of the month</td></tr>
      <tr><td>Late Fee</td><td>$50.00 assessed on the 6th; $10.00 per day thereafter</td></tr>
      <tr><td>Returned Payment Fee</td><td>$35.00 for any returned check or failed electronic payment</td></tr>
      <tr><td>Security Deposit</td><td><b>$${deposit.toLocaleString()}.00</b></td></tr>
      <tr><td>Total Due at Move-In</td><td><b>$${moveInCost.toLocaleString()}.00</b> (first month's rent + security deposit)</td></tr>
    </table>

    <div class="highlight-box blue">
      <b>📅 Move-In Payment:</b> A total of <b>$${moveInCost.toLocaleString()}.00</b> is due in full prior to receiving keys and taking possession of the property. This amount covers your first month's rent ($${rent.toLocaleString()}) and security deposit ($${deposit.toLocaleString()}). No keys will be released until this payment is confirmed in writing by Management.
    </div>

    <!-- ═══════════════════════════════════════
         ARTICLE IV — TERMS & CONDITIONS
    ═══════════════════════════════════════ -->
    <div class="article-header">Article IV — Terms & Conditions</div>
    <div class="section-title">📜 Lease Terms & Tenant Obligations</div>
    <ol class="clauses">

      <li>
        <b>1. Rent Payment.</b>
        Tenant agrees to pay $${rent.toLocaleString()}.00 per month, due on the 1st of each month, payable to Choice Properties via the payment method agreed upon with Management. Partial payments are not accepted unless expressly agreed to in writing. Rent not received by the 5th of the month is considered late and subject to the late fees outlined in Article III.
      </li>

      <li>
        <b>2. Security Deposit.</b>
        A security deposit of $${deposit.toLocaleString()}.00 has been collected and is held in accordance with applicable Michigan law. The deposit is not to be applied toward any month's rent by the Tenant. Upon move-out, the deposit will be returned within 30 days, less any lawful deductions for unpaid rent, damage beyond normal wear and tear, cleaning costs, or other lease violations. The Tenant will receive an itemized deduction statement if any amount is withheld.
      </li>

      <li>
        <b>3. Occupancy.</b>
        The property shall be used exclusively as a private residential dwelling. Occupancy is restricted to the person(s) named in the approved rental application (${fullName} and any approved co-occupants). No additional persons may reside at the property without prior written consent from Management. Subletting, short-term rentals (including Airbnb or similar platforms), or assignment of this Lease are strictly prohibited without written approval.
      </li>

      <li>
        <b>4. Pets.</b>
        ${hasPets === 'Yes' || hasPets === 'yes' || hasPets === 'true'
          ? `Tenant has disclosed the following pet(s) on the application: <em>${petDetails || 'details on file'}</em>. Any approved pet requires a separate Pet Addendum, which must be signed prior to move-in. Unauthorized pets, or pets not covered by an executed addendum, may result in additional fees and/or lease termination. Tenant is responsible for all damage, odors, or liability caused by any pet.`
          : `No pets are permitted at the property without prior written approval from Management and execution of a Pet Addendum. Discovery of an unauthorized pet may result in immediate lease termination proceedings and any applicable cleaning or remediation fees charged to the Tenant.`
        }
      </li>

      <li>
        <b>5. Maintenance & Property Condition.</b>
        Tenant shall maintain the premises in a clean, sanitary, and safe condition at all times. Tenant shall promptly notify Management in writing of any needed repairs, water leaks, mold, or hazardous conditions. Tenant is responsible for all damage caused by negligence, misuse, or failure to report a known issue in a timely manner. Reasonable wear and tear is expected and accepted; damage beyond this standard will be deducted from the security deposit or billed to the Tenant.
      </li>

      <li>
        <b>6. Alterations & Improvements.</b>
        Tenant shall not make any alterations, improvements, modifications, or additions to the property — including painting, installing fixtures, removing hardware, or modifying utilities — without prior written consent from Management. Any approved alterations become the property of the Landlord upon move-out, unless otherwise agreed in writing. Unauthorized alterations must be restored to the original condition at Tenant's expense.
      </li>

      <li>
        <b>7. Right of Entry.</b>
        Management and/or the Landlord may enter the premises with at least 24 hours' advance written notice for purposes including but not limited to inspections, repairs, maintenance, and showing the unit to prospective tenants or buyers. In the event of an emergency — including fire, flood, gas leak, or a threat to health and safety — entry may be made without prior notice. Tenant shall not unreasonably withhold consent to entry.
      </li>

      <li>
        <b>8. Utilities & Services.</b>
        ${utilitiesNote}
      </li>

      <li>
        <b>9. Smoking & Controlled Substances.</b>
        ${smoker === 'Yes' || smoker === 'yes'
          ? `Smoking has been disclosed by the Tenant. Any smoking is strictly limited to designated outdoor areas only, as identified by Management. Smoking inside the unit, in common areas, hallways, or within 25 feet of building entrances is strictly prohibited.`
          : `Smoking of any substance — including cigarettes, cigars, e-cigarettes, vaporizers, marijuana, or any other product — is strictly prohibited inside the property and in all common areas. Violation of this clause may result in lease termination and cleaning or remediation costs deducted from the deposit.`
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
        Tenant is strongly encouraged to obtain a renter's insurance policy prior to move-in and maintain it throughout the lease term. The Landlord's property insurance does not cover Tenant's personal belongings, liability, or losses resulting from theft, fire, water damage, or other events. Choice Properties is not responsible for the loss, damage, or theft of any of Tenant's personal property.
      </li>

      <li>
        <b>14. Lease Renewal & Month-to-Month.</b>
        This Lease shall expire on the date listed in Article II. If neither party provides written notice at least 60 days prior to the expiration date, the Lease will automatically convert to a month-to-month tenancy under the same terms. Month-to-month rent is subject to adjustment with 30 days' written notice from Management. Either party may terminate a month-to-month tenancy with 30 days' written notice.
      </li>

      <li>
        <b>15. Early Termination.</b>
        Tenant may terminate this Lease prior to the expiration date by providing a minimum of 60 days' written notice to Management and paying an early termination fee equal to two (2) months' rent, unless a different arrangement is agreed upon in writing. Notice must be submitted in writing to choicepropertygroup@hotmail.com or via text to 707-706-3137. Early termination does not relieve the Tenant of any outstanding financial obligations.
      </li>

      <li>
        <b>16. Move-Out Notice & Condition.</b>
        Tenant must provide a minimum of 60 days' written notice prior to vacating at end of term or month-to-month. Upon vacating, Tenant must leave the property in the same condition as received, accounting for normal wear and tear. A move-out walkthrough inspection will be conducted. Tenant is encouraged to request a pre-move-out inspection at least 7 days prior to the move-out date to identify and correct issues before final inspection.
      </li>

      <li>
        <b>17. Default & Remedies.</b>
        Failure to pay rent when due, material breach of any term of this Agreement, or violation of any applicable law or ordinance constitutes a default. In the event of default, Management may, in accordance with Michigan law, issue a notice to cure or vacate, initiate eviction proceedings, and/or pursue any other remedies available at law or in equity. Tenant shall be liable for all court costs, attorney fees, and damages incurred as a result of a default.
      </li>

      <li>
        <b>18. Abandonment.</b>
        If Tenant vacates the property prior to the end of the lease term without providing proper written notice and without surrendering the keys, Management may treat the property as abandoned after 7 days of confirmed absence, provided rent is unpaid. Management may then re-enter the premises, remove any personal property per Michigan law, and re-rent the unit. Tenant remains liable for rent through the end of the lease term or until the unit is re-rented, whichever occurs first.
      </li>

      <li>
        <b>19. Hazardous Materials.</b>
        Tenant shall not store, use, or dispose of any hazardous, toxic, flammable, or explosive materials on the premises in a manner inconsistent with normal residential use. Tenant shall comply with all applicable laws governing waste disposal and shall immediately notify Management of any known hazardous condition.
      </li>

      <li>
        <b>20. Lead Paint Disclosure (Pre-1978 Properties).</b>
        If the property was built prior to 1978, Tenant acknowledges receipt of the federal Lead-Based Paint Disclosure form, where applicable. Tenant should contact Management if they have questions regarding the age of the property or lead-paint status.
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
        This Agreement shall be governed by and construed in accordance with the laws of the State of Michigan. Any disputes arising under this Agreement shall be subject to the exclusive jurisdiction of the courts of Oakland County, Michigan, unless otherwise required by law.
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
      <b>⚖️ Electronic Signature Legal Notice:</b> By signing below, you confirm that you have read, understood, and agreed to all 25 articles and provisions of this Residential Lease Agreement. Your electronic signature is legally binding under the <em>Michigan Electronic Signature Act (MCL § 450.832 et seq.)</em> and the federal <em>Electronic Signatures in Global and National Commerce Act (E-SIGN Act, 15 U.S.C. § 7001 et seq.)</em>. Your full legal name, IP address, and timestamp will be permanently recorded as part of the execution record of this Agreement.
    </div>

    <!-- ═══════════════════════════════════════
         E-SIGNATURE BLOCK
    ═══════════════════════════════════════ -->
    <div class="signature-section" id="signatureSection">

      <div class="sig-section-header">
        <div class="sig-icon-wrap">✍️</div>
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

      <!-- Step 1: Signature input -->
      <div id="step1Panel">
        <label class="sig-label">Your Full Legal Name
          <span style="font-weight:400;color:#64748b;font-size:12px;margin-left:6px;">
            — Type exactly as it appears on your government-issued ID
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
            <span>Signed by: <span id="previewSigName">—</span></span>
            <span>Date: ${todayStr}</span>
            <span>Ref: ${appId}</span>
          </div>
        </div>

        <!-- Legal / IP badge -->
        <div class="legal-badge" id="legalBadge">
          <span class="legal-badge-icon">🔒</span>
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
          <label for="agreeBinding">I understand this electronic signature is legally binding under the Michigan Electronic Signature Act and the federal E-SIGN Act, and has the same legal effect as a handwritten signature.</label>
        </div>
        <div class="checkbox-row" id="row3" onclick="toggleCheck('agreeFinancial','row3')">
          <input type="checkbox" id="agreeFinancial" onchange="validateSignatureForm()">
          <label for="agreeFinancial">I agree to pay the move-in total of <b>$${moveInCost.toLocaleString()}.00</b> prior to taking possession, and monthly rent of <b>$${rent.toLocaleString()}.00</b> on the 1st of each month as outlined in Article III.</label>
        </div>
        <div class="checkbox-row" id="row4" onclick="toggleCheck('agreeOwnership','row4')">
          <input type="checkbox" id="agreeOwnership" onchange="validateSignatureForm()">
          <label for="agreeOwnership">I understand that <b>${landlordName}</b> is the Landlord for this property${!isChoiceOwned ? ', and that Choice Properties is acting as the authorized management agent on their behalf' : ''}, and that Choice Properties will handle all communications, maintenance requests, and rent collection.</label>
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
          ✍️ Execute Lease Agreement
        </button>
        <div class="btn-sign-sub" id="signBtnSub">
          Complete your name and all 4 checkboxes to activate
        </div>
      </div>

      <!-- Inline success state -->
      <div class="success-overlay" id="successOverlay">
        <div class="check" style="animation:checkDraw .5s ease;">✅</div>
        <h4>Signature Accepted!</h4>
        <p>Redirecting you to your confirmation page...</p>
      </div>

      <p style="font-size:12px;color:#95a5a6;text-align:center;margin-top:20px;padding-top:16px;border-top:1px solid #f1f5f9;">
        Executed on: <strong>${todayStr}</strong> &nbsp;·&nbsp; Application ID: <strong>${appId}</strong>
      </p>
    </div>

  </div><!-- /lease-body -->

  <!-- FOOTER -->
  <div class="lease-footer">
    <div class="footer-logo">Choice Properties</div>
    <p>2265 Livernois, Suite 500 &nbsp;·&nbsp; Troy, MI 48083<br>
    📱 707-706-3137 &nbsp;·&nbsp; choicepropertygroup@hotmail.com</p>
    <div class="tagline">Your trust is our standard.</div>
  </div>

</div><!-- /wrapper -->

<script>
  const APP_ID   = '${appId}';
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
          '🔒 Session verified — IP: ' + capturedIP +
          ' · Your signature and this session will be permanently recorded in the execution record.';
      })
      .catch(() => {
        capturedIP = 'unavailable';
        badge.textContent =
          '🔒 Your signature, date, and timestamp will be permanently recorded in the legal execution record.';
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
      footer.textContent  = '—';
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
    const btn       = document.getElementById('signBtn');
    const sub       = document.getElementById('signBtnSub');
    allChecked = terms && binding && financial && ownership;

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
      sub.textContent = 'Still needed: ' + missing.join(' · ');
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

    const btn = document.getElementById('signBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Securing signature...';
    document.getElementById('sigSpinner').style.display = 'block';
    document.getElementById('tenantSignature').disabled = true;
    ['agreeTerms','agreeBinding','agreeFinancial','agreeOwnership'].forEach(id => {
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
            window.location.href = '?path=lease_confirm&id=' + APP_ID;
          }, 1800);
        } else {
          document.getElementById('sigSpinner').style.display = 'none';
          btn.disabled = false;
          btn.textContent = '✍️ Execute Lease Agreement';
          document.getElementById('tenantSignature').disabled = false;
          ['agreeTerms','agreeBinding','agreeFinancial','agreeOwnership'].forEach(id => {
            document.getElementById(id).disabled = false;
          });
          showAlert('⚠️ ' + result.error, 'danger');
        }
      })
      .withFailureHandler(function(err) {
        document.getElementById('sigSpinner').style.display = 'none';
        btn.disabled = false;
        btn.textContent = '✍️ Execute Lease Agreement';
        document.getElementById('tenantSignature').disabled = false;
        ['agreeTerms','agreeBinding','agreeFinancial','agreeOwnership'].forEach(id => {
          document.getElementById(id).disabled = false;
        });
        showAlert('Submission failed. Please try again or text us at 707-706-3137.', 'danger');
      })
      .signLease(APP_ID, sig, capturedIP);
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
// renderLeaseConfirmPage()  —  ?path=lease_confirm&id=APP_ID
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
  </style>
</head>
<body>
  <div class="card">
    <div class="check-icon">🎉</div>
    <h1>Lease Signed!</h1>
    <p class="subtitle">Welcome to Choice Properties, ${firstName}. Your lease is now fully executed.</p>

    <div class="detail-box">
      <div class="detail-row"><span class="detail-label">Property</span><span class="detail-value">${property}</span></div>
      <div class="detail-row"><span class="detail-label">Move-in Date</span><span class="detail-value">${startDate}</span></div>
      <div class="detail-row"><span class="detail-label">Monthly Rent</span><span class="detail-value">$${rent}</span></div>
      <div class="detail-row"><span class="detail-label">Application ID</span><span class="detail-value">${appId}</span></div>
    </div>

    <div class="next-steps">
      <h4>📋 What Happens Next</h4>
      <ul style="padding-left:18px;">
        <li>A confirmation email has been sent to you with your lease details.</li>
        <li>Our team will contact you to confirm your move-in date and collect move-in payment.</li>
        <li>You'll receive key handoff instructions closer to your move-in date.</li>
        <li>Save our number: <strong>707-706-3137</strong> — text us anytime.</li>
      </ul>
    </div>

    <a href="${dashLink}" class="btn btn-primary">📊 View My Dashboard</a>
    <a href="javascript:window.print()" class="btn btn-secondary">🖨️ Print This Page</a>

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
// EMAIL TEMPLATES — Choice Properties
// Tone: Luxury · Nationwide · Trusted · Professional
// Brand sign-off: Choice Properties Leasing Team
// Tagline: Your trust is our standard.
// ============================================================

// ── Shared CSS injected into every email ──────────────────
// Design philosophy: clean, minimal, dark-mode safe.
// No dark backgrounds. No colored background boxes.
// Pure white body. Black text. Color only via borders & text.
// Every element readable on light AND dark email clients.
const EMAIL_BASE_CSS = `
  * { margin:0; padding:0; box-sizing:border-box; }
  body { margin:0; padding:0; background:#f4f4f4; font-family:Arial,Helvetica,sans-serif; -webkit-font-smoothing:antialiased; color:#1a1a1a; }
  .email-wrapper { max-width:600px; margin:24px auto; background:#ffffff; border:1px solid #e0e0e0; border-radius:4px; overflow:hidden; }

  /* ── Header — white bg, dark text, blue accent bar only ── */
  .email-header { background:#ffffff; padding:32px 40px 24px; border-bottom:3px solid #1a5276; }
  .header-brand { font-size:20px; font-weight:700; color:#1a1a1a; letter-spacing:0.3px; margin-bottom:3px; }
  .header-sub   { font-size:12px; color:#666666; margin-bottom:14px; }
  .header-title { font-size:22px; font-weight:700; color:#1a1a1a; line-height:1.3; margin-bottom:8px; }
  .header-ref   { font-size:12px; color:#888888; font-family:monospace; }

  /* ── Status line — colored text only, no background ── */
  .status-line { padding:12px 40px; font-size:13px; font-weight:600; border-bottom:1px solid #e8e8e8; }
  .status-pending  { color:#b45309; }
  .status-paid     { color:#166534; }
  .status-approved { color:#166534; }
  .status-denied   { color:#991b1b; }
  .status-lease    { color:#1e40af; }

  /* ── Body ── */
  .email-body { padding:36px 40px; }
  .greeting   { font-size:16px; font-weight:600; color:#1a1a1a; margin-bottom:16px; }
  .intro-text { font-size:14px; color:#444444; line-height:1.7; margin-bottom:28px; }

  /* ── Section ── */
  .section { margin-bottom:28px; }
  .section-label { font-size:11px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:#888888; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid #e8e8e8; }

  /* ── Info table — no background shading ── */
  .info-table { width:100%; border-collapse:collapse; }
  .info-table tr td { padding:10px 0; font-size:14px; vertical-align:top; border-bottom:1px solid #f0f0f0; }
  .info-table tr:last-child td { border-bottom:none; }
  .info-table td:first-child { width:42%; font-weight:600; color:#555555; padding-right:12px; }
  .info-table td:last-child  { color:#1a1a1a; }

  /* ── Callout box — border-left only, white bg ── */
  .callout { border-left:3px solid #1a5276; padding:14px 18px; margin:20px 0; background:#ffffff; }
  .callout.green  { border-color:#166534; }
  .callout.amber  { border-color:#b45309; }
  .callout.red    { border-color:#991b1b; }
  .callout h4 { font-size:13px; font-weight:700; color:#1a1a1a; margin-bottom:6px; }
  .callout p  { font-size:13px; color:#444444; line-height:1.65; }

  /* ── Steps list ── */
  .steps-list { list-style:none; margin:0; padding:0; }
  .steps-list li { display:flex; align-items:flex-start; gap:14px; padding:11px 0; border-bottom:1px solid #f0f0f0; font-size:14px; color:#333333; line-height:1.6; }
  .steps-list li:last-child { border-bottom:none; }
  .step-num { flex-shrink:0; width:24px; height:24px; background:#1a5276; color:#ffffff; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; }

  /* ── Financial rows ── */
  .financial-row { display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #f0f0f0; font-size:14px; }
  .financial-row:last-child { border-bottom:none; border-top:1px solid #e0e0e0; padding-top:14px; margin-top:4px; }
  .financial-row .f-label { color:#555555; }
  .financial-row .f-value { font-weight:700; color:#1a1a1a; }
  .financial-row.total .f-value { font-size:17px; color:#1a5276; }

  /* ── CTA button ── */
  .cta-wrap { text-align:center; margin:32px 0 24px; }
  .cta-btn  { display:inline-block; background:#1a5276; color:#ffffff !important; text-decoration:none; padding:14px 36px; border-radius:4px; font-size:14px; font-weight:700; letter-spacing:0.5px; }
  .cta-note { font-size:11px; color:#888888; text-align:center; margin-top:8px; word-break:break-all; }

  /* ── Contact row ── */
  .contact-row { padding:16px 0; border-top:1px solid #e8e8e8; border-bottom:1px solid #e8e8e8; margin:24px 0; font-size:13px; color:#444444; }
  .contact-row span { margin-right:24px; }
  .contact-row strong { color:#1a1a1a; }

  /* ── Closing ── */
  .email-closing { margin-top:28px; padding-top:20px; border-top:1px solid #e8e8e8; }
  .closing-text { font-size:13px; color:#666666; line-height:1.65; margin-bottom:14px; }
  .sign-off     { font-size:14px; font-weight:700; color:#1a1a1a; margin-bottom:2px; }
  .sign-company { font-size:13px; color:#666666; }

  /* ── Footer — light gray, dark text ── */
  .email-footer { background:#f8f8f8; border-top:1px solid #e0e0e0; padding:20px 40px; text-align:center; }
  .footer-name    { font-size:13px; font-weight:700; color:#1a1a1a; margin-bottom:4px; }
  .footer-details { font-size:12px; color:#888888; line-height:1.7; }

  /* ── Pay pills ── */
  .pay-pill { display:inline-block; border:1px solid #cccccc; border-radius:3px; padding:5px 12px; font-size:13px; color:#333333; margin:3px 4px 3px 0; }

  @media only screen and (max-width:600px) {
    .email-body   { padding:24px 20px; }
    .email-header { padding:24px 20px 18px; }
    .email-footer { padding:16px 20px; }
    .status-line  { padding:10px 20px; }
    .cta-btn { padding:13px 24px; }
  }
`;

// ── Shared footer HTML ─────────────────────────────────────
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

// ── Shared header builder ──────────────────────────────────
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

  // ── 1. Applicant Confirmation ─────────────────────────────
  applicantConfirmation: (data, appId, dashboardLink, paymentMethods) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Application Received — Choice Properties</title>
  <style>${EMAIL_BASE_CSS}</style>
</head>
<body>
<div class="email-wrapper">

  ${buildEmailHeader('Application Successfully Received', appId)}

  <div class="status-line status-pending">
    ⏳ &nbsp; Awaiting Application Fee · Review Pending
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
        <h4>Application Fee — $50.00</h4>
        <p style="margin-bottom:12px;">You have indicated the following preferred payment methods. Our team will reach out to you at the contact information above within 24 hours to arrange collection of your application fee.</p>
        <div>${paymentMethods.map(m => `<span class="pay-pill">${m}</span>`).join('')}</div>
      </div>
    </div>

    <!-- What Happens Next -->
    <div class="section">
      <div class="section-label">What Happens Next</div>
      <ul class="steps-list">
        <li><span class="step-num">1</span><span><strong>Payment Arrangement</strong> — A member of our leasing team will contact you within 24 hours via text at <strong>${data['Phone']}</strong> to coordinate your $50.00 application fee.</span></li>
        <li><span class="step-num">2</span><span><strong>Payment Confirmation</strong> — Once your fee is received and confirmed, you will receive an email notification and your application will advance to the review stage.</span></li>
        <li><span class="step-num">3</span><span><strong>Application Review</strong> — Our team will conduct a thorough review of your application within 2–3 business days of payment confirmation.</span></li>
        <li><span class="step-num">4</span><span><strong>Decision Notification</strong> — You will be notified of our decision via email. If approved, our leasing team will prepare your lease agreement for signature.</span></li>
      </ul>
    </div>

    <div class="callout">
      <h4>Important — Save Your Application ID</h4>
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

  // ── 2. Admin Notification ─────────────────────────────────
  adminNotification: (data, appId, baseUrl, dashboardLink, paymentMethods) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>New Application — ${appId}</title>
  <style>${EMAIL_BASE_CSS}</style>
</head>
<body>
<div class="email-wrapper">

  ${buildEmailHeader('New Application Received', appId)}

  <div class="status-line status-pending">
    ⚡ &nbsp; Action Required — Application Fee Pending Collection
  </div>

  <div class="email-body">

    <p class="greeting">New Application Alert,</p>

    <p class="intro-text">
      A new rental application has been submitted and requires your attention. The applicant is awaiting contact
      to arrange payment of the $50.00 application fee. Please reach out within 24 hours.
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
        <tr><td>Best Times to Reach</td><td>${data['Preferred Time'] || 'Any'} ${data['Preferred Time Specific'] ? '— ' + data['Preferred Time Specific'] : ''}</td></tr>
      </table>
    </div>

    <!-- Payment Preferences -->
    <div class="section">
      <div class="section-label">Payment Preferences</div>
      <div class="callout amber">
        <h4>Contact Applicant to Collect $50.00 Fee</h4>
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
      <div class="sign-company">Automated Admin Notification — ${appId}</div>
    </div>

  </div>
  ${EMAIL_FOOTER}
</div>
</body>
</html>
`,

  // ── 3. Payment Confirmation ───────────────────────────────
  paymentConfirmation: (appId, applicantName, phone, dashboardLink) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Payment Confirmed — Choice Properties</title>
  <style>${EMAIL_BASE_CSS}</style>
</head>
<body>
<div class="email-wrapper">

  ${buildEmailHeader('Application Fee Confirmed', appId)}

  <div class="status-line status-paid">
    ✓ &nbsp; Payment Received — Application Now Under Review
  </div>

  <div class="email-body">

    <p class="greeting">Dear ${applicantName.split(' ')[0]},</p>

    <p class="intro-text">
      We are pleased to confirm that your $50.00 application fee has been received and successfully recorded.
      Your application is now active and has been placed in our review queue. Thank you for completing
      this step promptly.
    </p>

    <!-- Payment Record -->
    <div class="section">
      <div class="section-label">Payment Confirmation</div>
      <div class="callout green">
        <h4>✓ Payment Successfully Received</h4>
        <div class="financial-row"><span class="f-label">Application ID</span><span class="f-value">${appId}</span></div>
        <div class="financial-row"><span class="f-label">Applicant</span><span class="f-value">${applicantName}</span></div>
        <div class="financial-row"><span class="f-label">Amount Paid</span><span class="f-value">$50.00</span></div>
        <div class="financial-row"><span class="f-label">Payment Date</span><span class="f-value">${new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</span></div>
        <div class="financial-row"><span class="f-label">Status</span><span class="f-value" style="color:#059669;">Under Review</span></div>
      </div>
    </div>

    <!-- What Happens Next -->
    <div class="section">
      <div class="section-label">What Happens Next</div>
      <ul class="steps-list">
        <li><span class="step-num">1</span><span><strong>Active Review</strong> — Your complete application is now being reviewed by our leasing team. This process is thorough and designed to be completed within 2–3 business days.</span></li>
        <li><span class="step-num">2</span><span><strong>Background & Income Verification</strong> — We will conduct standard verification procedures as part of our review process.</span></li>
        <li><span class="step-num">3</span><span><strong>Decision Notification</strong> — You will receive an email notification once a decision has been made. Our team may also reach out via text at <strong>${phone}</strong> if additional information is needed.</span></li>
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

  // ── 4. Status Update (Approved & Denied) ──────────────────
  statusUpdate: (appId, firstName, status, reason, dashboardLink) => {
    const isApproved = status === 'approved';
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${isApproved ? 'Application Approved' : 'Application Update'} — Choice Properties</title>
  <style>${EMAIL_BASE_CSS}</style>
</head>
<body>
<div class="email-wrapper">

  ${buildEmailHeader(isApproved ? 'Application Approved' : 'Application Update', appId)}

  <div class="status-line ${isApproved ? 'status-approved' : 'status-denied'}">
    ${isApproved ? '✓ &nbsp; Congratulations — Your Application Has Been Approved' : '— &nbsp; Your Application Has Been Reviewed'}
  </div>

  <div class="email-body">

    <p class="greeting">Dear ${firstName},</p>

    ${isApproved ? `
    <p class="intro-text">
      We are delighted to inform you that your rental application with Choice Properties has been
      <strong>approved</strong>. This decision reflects our confidence in your application, and we
      look forward to welcoming you as a resident.
    </p>

    <div class="callout green">
      <h4>✓ Application Approved</h4>
      <p>Your application has met all of our criteria. Our leasing team will be in contact with you shortly to prepare and deliver your lease agreement for electronic signature. Please ensure your phone and email remain accessible.</p>
    </div>

    <div class="section">
      <div class="section-label">Your Next Steps</div>
      <ul class="steps-list">
        <li><span class="step-num">1</span><span><strong>Lease Agreement</strong> — Our team will prepare a formal lease agreement and send it to you via email within 1–2 business days. Please review it carefully in its entirety.</span></li>
        <li><span class="step-num">2</span><span><strong>Electronic Signature</strong> — You will sign your lease electronically. Your signature is legally binding under the Michigan Electronic Signature Act and the federal E-SIGN Act.</span></li>
        <li><span class="step-num">3</span><span><strong>Move-In Costs</strong> — Prior to receiving your keys, the move-in total (first month's rent plus security deposit) must be paid in full. This amount will be clearly outlined in your lease.</span></li>
        <li><span class="step-num">4</span><span><strong>Key Handoff</strong> — Once all documents and payments are complete, our team will coordinate your key pickup and official move-in date.</span></li>
      </ul>
    </div>

    <div class="callout">
      <h4>Important — Please Respond Promptly</h4>
      <p>Unit availability is time-sensitive. To secure your unit, please sign your lease agreement within 48 hours of receiving it. Delays may result in the unit being offered to other applicants.</p>
    </div>
    ` : `
    <p class="intro-text">
      Thank you for the time and effort you invested in your rental application with Choice Properties.
      After careful and thorough consideration of your application, we regret to inform you that we are
      unable to offer you a tenancy at this time.
    </p>

    <div class="callout red">
      <h4>Application Status — Not Approved</h4>
      <p>${reason ? `After review, the primary reason for this decision relates to: <strong>${reason}</strong>. ` : ''}We understand this is disappointing news and we genuinely appreciate the trust you placed in us by applying.</p>
    </div>

    <div class="section">
      <div class="section-label">Looking Ahead</div>
      <ul class="steps-list">
        <li><span class="step-num">1</span><span><strong>This is Not Permanent</strong> — Our decisions are based on current application criteria. Circumstances change, and we encourage you to consider reapplying in the future should your situation evolve.</span></li>
        <li><span class="step-num">2</span><span><strong>Other Properties</strong> — Choice Properties manages a portfolio of properties nationwide. Our team would be happy to discuss alternative options that may be a strong fit for your current profile.</span></li>
        <li><span class="step-num">3</span><span><strong>Questions</strong> — If you would like to discuss this decision or explore your options further, please do not hesitate to reach out to our leasing team directly.</span></li>
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

  // ── 5. Lease Sent ─────────────────────────────────────────
  leaseSent: (appId, tenantName, leaseLink, leaseData) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Your Lease Agreement is Ready — Choice Properties</title>
  <style>${EMAIL_BASE_CSS}</style>
</head>
<body>
<div class="email-wrapper">

  ${buildEmailHeader('Your Lease Agreement is Ready', appId)}

  <div class="status-line status-lease">
    📋 &nbsp; Action Required — Please Review and Sign Within 48 Hours
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
      <h4>⏰ 48-Hour Signing Window</h4>
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
        <li><span class="step-num">1</span><span><strong>Review the Full Agreement</strong> — Read every section carefully. The lease outlines your rights, responsibilities, and all financial obligations.</span></li>
        <li><span class="step-num">2</span><span><strong>Confirm Checkboxes</strong> — You will be asked to confirm your agreement to specific terms before signing.</span></li>
        <li><span class="step-num">3</span><span><strong>Sign Electronically</strong> — Enter your full legal name as your electronic signature. This is legally binding under Michigan and federal e-signature law.</span></li>
        <li><span class="step-num">4</span><span><strong>Receive Confirmation</strong> — You will receive an immediate email confirmation once your signature is recorded.</span></li>
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

  // ── 6. Lease Signed — Tenant ──────────────────────────────
  leaseSignedTenant: (appId, firstName, leaseData, dashboardLink) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Lease Executed — Welcome to Choice Properties</title>
  <style>${EMAIL_BASE_CSS}</style>
</head>
<body>
<div class="email-wrapper">

  ${buildEmailHeader('Welcome to Choice Properties', appId)}

  <div class="status-line status-approved">
    ✓ &nbsp; Lease Successfully Executed — Your Tenancy is Confirmed
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
        <h4>✓ Lease Executed — Tenancy Confirmed</h4>
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
        <li><span class="step-num">1</span><span><strong>Move-In Payment</strong> — Our leasing team will contact you to coordinate collection of your move-in total of <strong>$${parseFloat(leaseData.moveInCost).toLocaleString('en-US',{minimumFractionDigits:2})}</strong>. This must be paid in full prior to key handoff.</span></li>
        <li><span class="step-num">2</span><span><strong>Move-In Preparation</strong> — We will provide you with a detailed move-in guide and any property-specific information you need to know before your arrival.</span></li>
        <li><span class="step-num">3</span><span><strong>Key Handoff</strong> — Once all payments are confirmed, your key handoff will be coordinated. Our team will reach out to schedule this at a time that works for you.</span></li>
        <li><span class="step-num">4</span><span><strong>Your Dashboard</strong> — You may view your lease details and tenancy information at any time through your applicant dashboard.</span></li>
      </ul>
    </div>

    <div class="callout">
      <h4>Your Point of Contact</h4>
      <p>For all questions, coordination, or assistance, please contact our team via text at <strong>707-706-3137</strong>. We are committed to ensuring your move-in experience is seamless and professional.</p>
    </div>

    <div class="cta-wrap">
      <a href="${dashboardLink}" class="cta-btn">View My Dashboard</a>
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

  // ── 7. Lease Signed — Admin Alert ────────────────────────
  leaseSignedAdmin: (appId, tenantName, email, phone, signature, property, adminUrl) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Lease Signed — ${appId}</title>
  <style>${EMAIL_BASE_CSS}</style>
</head>
<body>
<div class="email-wrapper">

  ${buildEmailHeader('Lease Signed — Action Required', appId)}

  <div class="status-line status-approved">
    ✍️ &nbsp; Tenant Has Executed the Lease — Collect Move-In Payment
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
        <h4>✓ Lease Successfully Executed</h4>
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
        <li><span class="step-num">1</span><span><strong>Collect Move-In Payment</strong> — Contact the tenant immediately to arrange collection of the move-in total (first month + security deposit).</span></li>
        <li><span class="step-num">2</span><span><strong>Confirm Move-In Date</strong> — Coordinate and confirm the official move-in date with the tenant once payment is received.</span></li>
        <li><span class="step-num">3</span><span><strong>Key Handoff</strong> — Schedule and complete the key handoff on or before the agreed move-in date.</span></li>
        <li><span class="step-num">4</span><span><strong>Update Records</strong> — Ensure all internal records and the admin dashboard reflect the completed lease status.</span></li>
      </ul>
    </div>

    <!-- Quick Actions -->
    <div class="section">
      <div class="section-label">Quick Actions</div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:4px;">
        <a href="${adminUrl}" style="display:inline-block;background:#0a1628;color:white;text-decoration:none;padding:11px 22px;border-radius:3px;font-size:13px;font-weight:600;letter-spacing:0.5px;">Admin Dashboard</a>
        <a href="sms:7077063137?body=Hi%20${tenantName.split(' ')[0]}%2C%20congratulations%20on%20signing%20your%20lease%20for%20${encodeURIComponent(property)}.%20Please%20contact%20us%20to%20arrange%20your%20move-in%20payment." style="display:inline-block;background:#059669;color:white;text-decoration:none;padding:11px 22px;border-radius:3px;font-size:13px;font-weight:600;letter-spacing:0.5px;">Text Tenant</a>
        <a href="mailto:${email}?subject=Next Steps — Move-In Coordination — ${appId}" style="display:inline-block;background:#1d4ed8;color:white;text-decoration:none;padding:11px 22px;border-radius:3px;font-size:13px;font-weight:600;letter-spacing:0.5px;">Email Tenant</a>
      </div>
    </div>

    <div class="email-closing">
      <div class="sign-off">Choice Properties System</div>
      <div class="sign-company">Automated Admin Alert — ${appId}</div>
    </div>

  </div>
  ${EMAIL_FOOTER}
</div>
</body>
</html>
`
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
    MailApp.sendEmail({
      to: data['Email'],
      subject: `Choice Properties - Application Received (Ref: ${appId})`,
      htmlBody: htmlBody,
      name: 'Choice Properties Leasing',
      replyTo: 'choicepropertygroup@hotmail.com',
      noReply: false
    });
    return true;
  } catch (error) {
    console.error('sendApplicantConfirmation error — appId: ' + appId + ' | to: ' + data['Email'] + ' | ' + error.toString());
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
    adminEmails.forEach(email => {
      MailApp.sendEmail({
        to: email,
        subject: `🔔 NEW APPLICATION: ${appId} - ${data['First Name']} ${data['Last Name']}`,
        htmlBody: htmlBody, name: 'Choice Properties System'
      });
    });
    return true;
  } catch (error) { console.error('sendAdminNotification error:', error); return false; }
}

function sendPaymentConfirmation(appId, applicantEmail, applicantName, phone) {
  try {
    const baseUrl       = ScriptApp.getService().getUrl();
    const dashboardLink = baseUrl + '?path=dashboard&id=' + appId;
    MailApp.sendEmail({
      to: applicantEmail,
      subject: `✅ Payment Confirmed - Application ${appId}`,
      htmlBody: EmailTemplates.paymentConfirmation(appId, applicantName, phone, dashboardLink),
      name: 'Choice Properties'
    });
    return true;
  } catch (error) { console.error('sendPaymentConfirmation error:', error); return false; }
}

function sendStatusUpdateEmail(appId, email, firstName, status, reason) {
  try {
    const baseUrl       = ScriptApp.getService().getUrl();
    const dashboardLink = baseUrl + '?path=dashboard&id=' + appId;
    MailApp.sendEmail({
      to: email,
      subject: status === 'approved' ? `✅ Application Approved - ${appId}` : `Application Update - ${appId}`,
      htmlBody: EmailTemplates.statusUpdate(appId, firstName, status, reason, dashboardLink),
      name: 'Choice Properties'
    });
    return true;
  } catch (error) { console.error('sendStatusUpdateEmail error:', error); return false; }
}

// ── [NEW] sendLeaseEmail ──────────────────────────────────
function sendLeaseEmail(appId, email, tenantName, phone, leaseLink, leaseData) {
  try {
    MailApp.sendEmail({
      to: email,
      subject: `📜 Your Lease is Ready to Sign - ${appId}`,
      htmlBody: EmailTemplates.leaseSent(appId, tenantName, leaseLink, leaseData),
      name: 'Choice Properties Leasing'
    });
    return true;
  } catch (error) { console.error('sendLeaseEmail error:', error); return false; }
}

// ── [NEW] sendLeaseSignedTenantEmail ─────────────────────
function sendLeaseSignedTenantEmail(appId, email, firstName, phone, leaseData) {
  try {
    const baseUrl       = ScriptApp.getService().getUrl();
    const dashboardLink = baseUrl + '?path=dashboard&id=' + appId;
    MailApp.sendEmail({
      to: email,
      subject: `🎉 Lease Signed - Welcome to Choice Properties! (${appId})`,
      htmlBody: EmailTemplates.leaseSignedTenant(appId, firstName, leaseData, dashboardLink),
      name: 'Choice Properties Leasing'
    });
    return true;
  } catch (error) { console.error('sendLeaseSignedTenantEmail error:', error); return false; }
}

// ── [NEW] sendLeaseSignedAdminAlert ──────────────────────
function sendLeaseSignedAdminAlert(appId, tenantName, email, phone, signature, property) {
  try {
    const adminEmails = getAdminEmails();
    const baseUrl     = ScriptApp.getService().getUrl();
    const adminUrl    = baseUrl + '?path=admin';
    adminEmails.forEach(adminEmail => {
      MailApp.sendEmail({
        to: adminEmail,
        subject: `✍️ LEASE SIGNED: ${appId} - ${tenantName}`,
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

  if (primary) methods.push(label('🥇', 'Primary', primary, primOth));
  if (second)  methods.push(label('🥈', 'Secondary', second, secOth));
  if (third)   methods.push(label('🥉', 'Third Choice', third, thirdOth));
  return methods;
}

// ============================================================
// markAsPaid()
// ============================================================
function markAsPaid(appId, notes) {
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
    if (sheet.getRange(rowIndex, col['Payment Status']).getValue() === 'paid') {
      throw new Error('Application already marked as paid');
    }
    sheet.getRange(rowIndex, col['Payment Status']).setValue('paid');
    sheet.getRange(rowIndex, col['Payment Date']).setValue(new Date());
    if (notes) {
      const curr = sheet.getRange(rowIndex, col['Admin Notes']).getValue();
      const note = `[${new Date().toLocaleString()}] Payment marked as paid. ${notes}`;
      sheet.getRange(rowIndex, col['Admin Notes']).setValue(curr ? curr + '\n' + note : note);
    }
    const email     = sheet.getRange(rowIndex, col['Email']).getValue();
    const firstName = sheet.getRange(rowIndex, col['First Name']).getValue();
    const lastName  = sheet.getRange(rowIndex, col['Last Name']).getValue();
    const phone     = sheet.getRange(rowIndex, col['Phone']).getValue();
    sendPaymentConfirmation(appId, email, firstName + ' ' + lastName, phone);
    logEmail('payment_confirmation', email, 'success', appId);
    return { success: true, message: 'Application marked as paid' };
  } catch (error) {
    console.error('markAsPaid error:', error);
    logEmail('payment_confirmation', 'admin', 'failed', appId, error.toString());
    return { success: false, error: error.toString() };
  }
}

// ============================================================
// updateStatus()
// ============================================================
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
    if (sheet.getRange(rowIndex, col['Payment Status']).getValue() !== 'paid') {
      throw new Error('Cannot change status until payment is received');
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
// Lightweight check — returns a hash of all App IDs + statuses.
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
// renderApplicantDashboard()  — extended with lease status card
// ============================================================
// ============================================================
// renderApplicantDashboard() — ENHANCED UI
// ============================================================
function renderApplicantDashboard(appId) {
  const result = getApplication(appId);
  if (!result.success) return renderLoginPage('Invalid application ID or email. Please try again.');

  const app = result.application;
  const baseUrl = ScriptApp.getService().getUrl();

  // ── Status logic ──
  let statusColor, statusGradient, statusText, statusIcon, statusSubtext;
  if (app['Payment Status'] === 'unpaid') {
    statusColor = '#f59e0b'; statusGradient = 'linear-gradient(135deg,#f59e0b,#fbbf24)';
    statusText = 'Pending Payment'; statusIcon = '⏳';
    statusSubtext = 'Action required — payment needed to proceed';
  } else if (app['Status'] === 'approved' && (app['Lease Status'] === 'signed' || app['Lease Status'] === 'active')) {
    statusColor = '#10b981'; statusGradient = 'linear-gradient(135deg,#059669,#10b981)';
    statusText = 'Lease Signed'; statusIcon = '🏠';
    statusSubtext = 'Welcome! Your lease is fully executed';
  } else if (app['Lease Status'] === 'sent') {
    statusColor = '#3b82f6'; statusGradient = 'linear-gradient(135deg,#2563eb,#3b82f6)';
    statusText = 'Lease Ready to Sign'; statusIcon = '📜';
    statusSubtext = 'Please review and sign your lease agreement';
  } else if (app['Status'] === 'approved') {
    statusColor = '#10b981'; statusGradient = 'linear-gradient(135deg,#059669,#10b981)';
    statusText = 'Approved'; statusIcon = '✅';
    statusSubtext = 'Congratulations! Your application was approved';
  } else if (app['Status'] === 'denied') {
    statusColor = '#ef4444'; statusGradient = 'linear-gradient(135deg,#dc2626,#ef4444)';
    statusText = 'Not Approved'; statusIcon = '📋';
    statusSubtext = 'Thank you for your application';
  } else if (app['Payment Status'] === 'paid') {
    statusColor = '#6366f1'; statusGradient = 'linear-gradient(135deg,#4f46e5,#6366f1)';
    statusText = 'Under Review'; statusIcon = '🔍';
    statusSubtext = 'Your application is being reviewed';
  } else {
    statusColor = '#64748b'; statusGradient = 'linear-gradient(135deg,#475569,#64748b)';
    statusText = 'Received'; statusIcon = '📝';
    statusSubtext = 'We have received your application';
  }

  // ── Progress steps ──
  const steps = [
    { label: 'Submitted', done: true },
    { label: 'Payment', done: app['Payment Status'] === 'paid' },
    { label: 'Under Review', done: app['Payment Status'] === 'paid' && (app['Status'] === 'approved' || app['Status'] === 'denied') },
    { label: 'Decision', done: app['Status'] === 'approved' || app['Status'] === 'denied' },
    { label: 'Lease', done: app['Lease Status'] === 'signed' || app['Lease Status'] === 'active' }
  ];
  const progressHtml = steps.map((s, i) => `
    <div style="display:flex;flex-direction:column;align-items:center;flex:1;position:relative;">
      ${i < steps.length - 1 ? `<div style="position:absolute;top:16px;left:50%;width:100%;height:3px;background:${s.done ? statusColor : '#e2e8f0'};z-index:0;"></div>` : ''}
      <div style="width:34px;height:34px;border-radius:50%;background:${s.done ? statusColor : '#e2e8f0'};color:${s.done ? 'white' : '#94a3b8'};display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;position:relative;z-index:1;box-shadow:${s.done ? '0 4px 10px rgba(0,0,0,.15)' : 'none'};">${s.done ? '✓' : (i + 1)}</div>
      <span style="font-size:11px;font-weight:600;color:${s.done ? '#1e293b' : '#94a3b8'};margin-top:7px;text-align:center;line-height:1.2;">${s.label}</span>
    </div>`).join('');

  // ── Lease card ──
  const leaseStatus = app['Lease Status'] || 'none';
  let leaseCardHtml = '';
  if (leaseStatus === 'sent') {
    const leaseLink = baseUrl + '?path=lease&id=' + appId;
    leaseCardHtml = `
      <div style="background:white;border-radius:18px;overflow:hidden;box-shadow:0 4px 20px rgba(37,99,235,.12);margin:0 0 20px;border:1.5px solid #bfdbfe;">
        <div style="background:linear-gradient(135deg,#1d4ed8,#3b82f6);padding:18px 24px;display:flex;align-items:center;gap:14px;">
          <div style="width:46px;height:46px;background:rgba(255,255,255,.2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">📜</div>
          <div><div style="color:white;font-weight:700;font-size:17px;">Your Lease is Ready to Sign</div><div style="color:rgba(255,255,255,.8);font-size:13px;margin-top:2px;">Please review carefully before signing</div></div>
        </div>
        <div style="padding:20px 24px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
            <div style="background:#f0f9ff;border-radius:12px;padding:14px;text-align:center;"><div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Monthly Rent</div><div style="font-size:22px;font-weight:800;color:#1d4ed8;">$${parseFloat(app['Monthly Rent']||0).toLocaleString()}</div></div>
            <div style="background:#f0fdf4;border-radius:12px;padding:14px;text-align:center;"><div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Move-in Total</div><div style="font-size:22px;font-weight:800;color:#059669;">$${parseFloat(app['Move-in Costs']||0).toLocaleString()}</div></div>
          </div>
          <div style="background:#f8fafc;border-radius:10px;padding:12px 16px;margin-bottom:16px;">
            <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #e2e8f0;font-size:14px;"><span style="color:#64748b;font-weight:500;">Lease Start Date</span><span style="font-weight:600;color:#1e293b;">${app['Lease Start Date']||'—'}</span></div>
            <div style="display:flex;justify-content:space-between;padding:7px 0;font-size:14px;"><span style="color:#64748b;font-weight:500;">Security Deposit</span><span style="font-weight:600;color:#1e293b;">$${parseFloat(app['Security Deposit']||0).toLocaleString()}</span></div>
          </div>
          <a href="${leaseLink}" style="display:block;background:linear-gradient(to right,#059669,#10b981);color:white;text-align:center;padding:16px;border-radius:50px;font-weight:700;font-size:17px;text-decoration:none;letter-spacing:.2px;box-shadow:0 6px 18px rgba(16,185,129,.3);">✍️ Review &amp; Sign My Lease</a>
          <p style="font-size:12px;color:#f59e0b;text-align:center;margin:10px 0 0;font-weight:600;">⏰ Please sign within 48 hours to hold your unit</p>
        </div>
      </div>`;
  } else if (leaseStatus === 'signed' || leaseStatus === 'active') {
    leaseCardHtml = `
      <div style="background:white;border-radius:18px;overflow:hidden;box-shadow:0 4px 20px rgba(16,185,129,.12);margin:0 0 20px;border:1.5px solid #a7f3d0;">
        <div style="background:linear-gradient(135deg,#059669,#10b981);padding:18px 24px;display:flex;align-items:center;gap:14px;">
          <div style="width:46px;height:46px;background:rgba(255,255,255,.2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">🏠</div>
          <div><div style="color:white;font-weight:700;font-size:17px;">Lease Signed — Welcome Home!</div><div style="color:rgba(255,255,255,.8);font-size:13px;margin-top:2px;">Your tenancy is confirmed</div></div>
        </div>
        <div style="padding:20px 24px;">
          <div style="background:#f0fdf4;border-radius:12px;padding:4px 0;margin-bottom:16px;">
            ${[['Property',app['Property Address']||'—'],['Move-in Date',app['Lease Start Date']||'—'],['Lease Ends',app['Lease End Date']||'—'],['Monthly Rent','$'+parseFloat(app['Monthly Rent']||0).toLocaleString()],['Signed By',app['Tenant Signature']||'—']].map(([l,v],i,a)=>`<div style="display:flex;justify-content:space-between;padding:10px 16px;${i<a.length-1?'border-bottom:1px solid #d1fae5;':''}font-size:14px;"><span style="color:#64748b;font-weight:500;">${l}</span><span style="font-weight:600;color:#1e293b;">${v}</span></div>`).join('')}
          </div>
          <p style="font-size:13px;color:#059669;text-align:center;font-weight:600;margin:0;">Questions? Text us at <strong>707-706-3137</strong></p>
        </div>
      </div>`;
  }

  // ── Payment methods ──
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

  // ── Extra detail sections ──
  let extraHtml = '';
  if (app['Has Co-Applicant'] && app['Co-Applicant First Name']) {
    extraHtml += `<div style="margin-bottom:20px;"><h4 style="font-size:14px;font-weight:700;color:#1e293b;margin:0 0 12px;display:flex;align-items:center;gap:8px;"><span style="background:#e0e7ff;color:#4f46e5;padding:5px 10px;border-radius:20px;font-size:13px;">👥 Co-Applicant / Guarantor</span></h4><div style="background:#f8fafc;border-radius:12px;padding:16px;font-size:14px;"><div style="display:grid;gap:8px;"><div><span style="color:#64748b;font-weight:500;">Role:</span> <span style="font-weight:600;">${app['Additional Person Role']||'Not specified'}</span></div><div><span style="color:#64748b;font-weight:500;">Name:</span> <span style="font-weight:600;">${app['Co-Applicant First Name']||''} ${app['Co-Applicant Last Name']||''}</span></div><div><span style="color:#64748b;font-weight:500;">Email:</span> <span style="font-weight:600;">${app['Co-Applicant Email']||''}</span></div><div><span style="color:#64748b;font-weight:500;">Phone:</span> <span style="font-weight:600;">${app['Co-Applicant Phone']||''}</span></div></div></div></div>`;
  }
  if (app['Vehicle Make']) {
    extraHtml += `<div style="margin-bottom:20px;"><h4 style="font-size:14px;font-weight:700;color:#1e293b;margin:0 0 12px;display:flex;align-items:center;gap:8px;"><span style="background:#fef3c7;color:#d97706;padding:5px 10px;border-radius:20px;font-size:13px;">🚗 Vehicle</span></h4><div style="background:#f8fafc;border-radius:12px;padding:16px;font-size:14px;"><div style="display:grid;gap:8px;"><div><span style="color:#64748b;font-weight:500;">Make:</span> <span style="font-weight:600;">${app['Vehicle Make']}</span></div><div><span style="color:#64748b;font-weight:500;">Model:</span> <span style="font-weight:600;">${app['Vehicle Model']||''}</span></div><div><span style="color:#64748b;font-weight:500;">Year:</span> <span style="font-weight:600;">${app['Vehicle Year']||''}</span></div></div></div></div>`;
  }
  if (app['Preferred Contact Method'] || app['Preferred Time']) {
    extraHtml += `<div style="margin-bottom:20px;"><h4 style="font-size:14px;font-weight:700;color:#1e293b;margin:0 0 12px;display:flex;align-items:center;gap:8px;"><span style="background:#dcfce7;color:#16a34a;padding:5px 10px;border-radius:20px;font-size:13px;">📱 Contact Preferences</span></h4><div style="background:#f8fafc;border-radius:12px;padding:16px;font-size:14px;"><div style="display:grid;gap:8px;"><div><span style="color:#64748b;font-weight:500;">Method:</span> <span style="font-weight:600;">${app['Preferred Contact Method']||'Not specified'}</span></div><div><span style="color:#64748b;font-weight:500;">Times:</span> <span style="font-weight:600;">${app['Preferred Time']||'Any'}</span></div><div><span style="color:#64748b;font-weight:500;">Notes:</span> <span style="font-weight:600;">${app['Preferred Time Specific']||'None'}</span></div></div></div></div>`;
  }

  return HtmlService.createHtmlOutput(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Application Status — Choice Properties</title>
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

    /* ── Top bar ── */
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

    /* ── Status hero card ── */
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

    /* ── Progress tracker ── */
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

    /* ── Payment pending alert ── */
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

    /* ── Info grid ── */
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

    /* ── Toggle button ── */
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

    /* ── Contact card (replaces dark footer) ── */
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

    /* Keep .contact-footer for JS DOM queries — rendered invisible */
    .contact-footer { display: none; }

    /* ── Back link ── */
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

    /* ── Responsive ── */
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

    /* ── Animations ── */
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
      <h5>⏳ Payment Required</h5>
      <p>Your application is on hold. Our team will text you at <strong>${app['Phone']}</strong> within 24 hours to collect your $50 application fee.</p>
      <div>
        ${paymentMethods.map(m => `<span class="pay-method-pill">🎯 ${m.label}: ${m.value}</span>`).join('')}
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
    ${leaseCardHtml ? `<div style="padding:0 24px 4px;">${leaseCardHtml}</div>` : ''}

    <!-- Toggle extra details -->
    <button class="toggle-btn" onclick="toggleDetails(this)" id="toggleBtn" aria-expanded="false">
      <i class="fas fa-chevron-right" id="toggleIcon"></i> Show Full Application Details
    </button>
    <div class="extra-details" id="extraDetails">
      ${extraHtml || '<p style="color:#94a3b8;font-size:14px;padding:0 0 20px;">No additional details on file.</p>'}
    </div>

    <!-- Contact footer kept for JS DOM queries — visually hidden via CSS -->
    <div class="contact-footer"></div>
  </div>

  <!-- Contact card — professional replacement for the old dark footer -->
  <div class="contact-card">
    <div class="contact-card-header">
      <div class="contact-card-icon"><i class="fas fa-headset"></i></div>
      <div>
        <div class="contact-card-title">Questions? We're here to help.</div>
        <div class="contact-card-sub">Choice Properties · Troy, MI</div>
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
          <div class="contact-row-value">2265 Livernois, Suite 500 · Troy, MI 48083</div>
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

  // ══════════════════════════════════════════════════════════
  // LIVE STATUS WATCHER — Applicant Dashboard
  // Polls every 15s. When status changes, smoothly updates
  // the hero banner, progress tracker, and lease card —
  // no page reload, no lost scroll position.
  // ══════════════════════════════════════════════════════════
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
      refreshBtn.title = 'Status updates automatically — no refresh needed';
    }

    // Check every 5 seconds — catches admin changes within moments
    _watchTimer = setInterval(checkForStatusChange, 5000);
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
      .withFailureHandler(function() { /* silent — don't alarm the user */ })
      .getApplicationLiveStatus(APP_ID);
  }

  function applyLiveStatusUpdate(data) {
    const pay   = data.paymentStatus || 'unpaid';
    const stat  = data.appStatus     || 'pending';
    const lease = data.leaseStatus   || 'none';

    // ── Compute new display values ──
    let gradient, icon, title, subtitle, progressStep;
    if (pay === 'unpaid') {
      gradient = 'linear-gradient(135deg,#f59e0b,#fbbf24)';
      icon = '⏳'; title = 'Pending Payment';
      subtitle = 'Action required — payment needed to proceed';
      progressStep = 0;
    } else if (stat === 'approved' && (lease === 'signed' || lease === 'active')) {
      gradient = 'linear-gradient(135deg,#059669,#10b981)';
      icon = '🏠'; title = 'Lease Signed';
      subtitle = 'Welcome! Your lease is fully executed';
      progressStep = 4;
    } else if (lease === 'sent') {
      gradient = 'linear-gradient(135deg,#2563eb,#3b82f6)';
      icon = '📜'; title = 'Lease Ready to Sign';
      subtitle = 'Please review and sign your lease agreement';
      progressStep = 3;
    } else if (stat === 'approved') {
      gradient = 'linear-gradient(135deg,#059669,#34d399)';
      icon = '✅'; title = 'Application Approved!';
      subtitle = 'Congratulations — your lease will be sent shortly';
      progressStep = 2;
    } else if (stat === 'denied') {
      gradient = 'linear-gradient(135deg,#dc2626,#ef4444)';
      icon = '❌'; title = 'Application Declined';
      subtitle = 'Please contact us for more information';
      progressStep = -1;
    } else {
      gradient = 'linear-gradient(135deg,#6366f1,#8b5cf6)';
      icon = '🔍'; title = 'Under Review';
      subtitle = 'Our team is reviewing your application';
      progressStep = 1;
    }

    // ── Animate the banner ──
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

    // ── Update progress steps ──
    updateProgressSteps(progressStep, stat === 'denied');

    // ── Update / inject lease card if lease was just sent or signed ──
    if (lease === 'sent' || lease === 'signed' || lease === 'active') {
      updateLeaseCard(data, lease);
    }

    // ── Remove payment alert if now paid ──
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

    // ── Show a non-intrusive toast notification ──
    showStatusToast('✨ Your status has been updated: ' + title);
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
      // No lease card yet — inject one above the toggle button
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
    const rent      = data.monthlyRent      ? '\$' + parseFloat(data.monthlyRent).toLocaleString()      : '—';
    const deposit   = data.securityDeposit  ? '\$' + parseFloat(data.securityDeposit).toLocaleString()  : '—';
    const movein    = data.moveInCosts      ? '\$' + parseFloat(data.moveInCosts).toLocaleString()       : '—';
    const startDate = data.leaseStartDate   || '—';
    const endDate   = data.leaseEndDate     || '—';
    const btnHtml   = isSigned ? '' :
      '<a href="?path=lease&id=' + APP_ID + '" style="display:block;margin-top:12px;' +
      'background:linear-gradient(to right,#2563eb,#3b82f6);color:white;text-align:center;' +
      'padding:13px;border-radius:12px;font-size:14px;font-weight:700;text-decoration:none;">' +
      '✍️ Review & Sign My Lease</a>';
    return '<div style="background:' + (isSigned ? 'linear-gradient(135deg,#f0fdf4,#dcfce7)' : 'linear-gradient(135deg,#eff6ff,#dbeafe)') + ';' +
      'border:1.5px solid ' + (isSigned ? '#86efac' : '#93c5fd') + ';border-radius:16px;padding:18px 20px;">' +
      '<div style="font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;' +
      'color:' + (isSigned ? '#15803d' : '#1e40af') + ';margin-bottom:12px;">' +
      (isSigned ? '🏠 Lease Executed' : '📜 Lease Ready to Sign') + '</div>' +
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
</body>
</html>
  `).setTitle('Application ' + app['App ID'] + ' — Choice Properties');
}

// ============================================================
// renderAdminPanel() — ENHANCED UI
// ============================================================
function renderAdminPanel(authToken) {
  initializeSheets();
  const ss = getSpreadsheet();

  let isAuthorized = false;
  let userEmail    = 'Admin';
  if (authToken && validateAdminToken(authToken)) {
    isAuthorized = true;
    userEmail    = 'choiceproperties404@gmail.com';
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
  <title>Admin Dashboard — Choice Properties</title>
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

    /* ── Sidebar + layout ── */
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

    /* ── Main content ── */
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

    /* ── Stats row — horizontally scrollable on mobile ── */
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

    /* ── Search + filters ── */
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

    /* ── Application cards ── */
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

    /* ── Action buttons — larger for touch ── */
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
    .btn-text  { background:#f0fdf4; color:#15803d; border: 1.5px solid #86efac; }

    /* ── Modals ── */
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

    /* ── Loading spinner ── */
    .spinner-wrap { text-align: center; padding: 40px; display: none; }
    .spinner-ring {
      display: inline-block;
      width: 40px; height: 40px;
      border: 4px solid #e2e8f0;
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin .7s linear infinite;
    }

    /* ── Empty state ── */
    .empty-state { text-align: center; padding: 60px 20px; color: #94a3b8; }
    .empty-state .icon { font-size: 48px; margin-bottom: 12px; }
    .empty-state p { font-size: 15px; font-weight: 600; }

    /* ── Mobile bottom nav (replaces hidden sidebar) ── */
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

    /* ── Responsive ── */
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

  <!-- ── Sidebar ── -->
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

  <!-- ── Main ── -->
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
      </div>
    </div>

    <div class="page-content">

      <!-- Stats row — horizontally scrollable on mobile -->
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

  <!-- Mobile bottom nav — visible on ≤ 640px, replaces the hidden sidebar -->
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

<!-- ── Action Confirmation Modal ── -->
<div class="modal-overlay" id="confirmModal">
  <div class="modal-box">
    <div class="modal-header">
      <h5 id="modalTitle">Confirm Action</h5>
      <p id="modalSubtitle"></p>
    </div>
    <div class="modal-body">
      <div class="contact-info-box" id="contactInfo"></div>
      <div id="notesField" style="display:none;">
        <label class="form-label">Reason / Notes (optional)</label>
        <textarea class="form-control" id="actionNotes" rows="3" placeholder="Provide a reason for this action..."></textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="modal-btn btn-cancel" onclick="closeModal()">Cancel</button>
      <button class="modal-btn btn-confirm-action" id="modalConfirmBtn">Confirm</button>
    </div>
  </div>
</div>

<!-- ── Send Lease Modal ── -->
<div class="modal-overlay" id="leaseModal">
  <div class="modal-box">
    <div class="modal-header">
      <h5>📜 Send Lease Agreement</h5>
      <p id="leaseModalSubtitle" style="color:#64748b;"></p>
    </div>
    <div class="modal-body">
      <div id="leaseAlertArea"></div>
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

  // ══════════════════════════════════════════════════════════
  // LIVE POLLING ENGINE — Admin Dashboard
  // Polls server every 20s. Only re-renders if data changed.
  // ══════════════════════════════════════════════════════════
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

    // Load data immediately on first open — no recurring timer
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
          // Data changed — fetch full dataset
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
          // Initial render — just set everything
          renderApplications(_allApplications);
        } else {
          // Incremental update — patch only changed cards
          patchChangedCards(prevData, _allApplications);
          updateStats(_allApplications);
          setLiveStatus('updated');
          showToast('🔄 Dashboard updated automatically', 'success');
        }
      })
      .withFailureHandler(function() { setLiveStatus('error'); })
      .getAllApplications();
  }

  // Patch only cards whose status changed — no full re-render flicker
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
        // New application — prepend it
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
        // Status changed — smoothly replace this card
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

  // ── Move-in preview ──
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

  // ── Lease modal ──
  function showLeaseModal(appId, tenantName, contactMethod, contactTimes) {
    currentAppId = appId;
    pausePolling();
    document.getElementById('leaseModalSubtitle').textContent = tenantName + '  ·  ' + appId;
    ['leaseRent','leaseDeposit','leaseStartDate','leaseNotes'].forEach(id => document.getElementById(id).value = '');
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
    const rent      = document.getElementById('leaseRent').value;
    const deposit   = document.getElementById('leaseDeposit').value;
    const startDate = document.getElementById('leaseStartDate').value;
    const notes     = document.getElementById('leaseNotes').value;
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
          showToast('✅ Lease sent! The tenant has been emailed a signing link.', 'success');
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
      .generateAndSendLease(currentAppId, rent, deposit, startDate, notes);
  }

  // ── Action modal ──
  function showConfirmModal(action, appId, applicantName, contactMethod, contactTimes) {
    currentAction = action; currentAppId = appId;
    pausePolling();
    const config = {
      markPaid : { title: 'Mark as Paid',         sub: 'A payment confirmation email will be sent to the applicant.', btn: 'Confirm Payment',  notes: false },
      approve  : { title: 'Approve Application',   sub: 'An approval email will be sent to the applicant.',            btn: 'Approve',          notes: false },
      deny     : { title: 'Deny Application',       sub: 'The applicant will be notified by email.',                    btn: 'Deny Application', notes: true }
    };
    const c = config[action];
    document.getElementById('modalTitle').textContent    = c.title;
    document.getElementById('modalSubtitle').textContent = applicantName + ' · ' + appId;
    document.getElementById('contactInfo').innerHTML     = '<strong>' + (action === 'deny' ? 'Applicant:' : 'Contact:') + '</strong> ' + contactMethod + ' · ' + contactTimes;
    document.getElementById('notesField').style.display = c.notes ? 'block' : 'none';
    document.getElementById('actionNotes').value        = '';
    document.getElementById('modalConfirmBtn').textContent = c.btn;
    document.getElementById('confirmModal').classList.add('open');
    document.body.classList.add('modal-open');
  }
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
      // Immediately fetch fresh data and update dashboard
      fetchAndRenderAll('');
    };
    const onFail = err => {
      _actionInProgress = false;
      btn.disabled = false;
      showToast('Error: ' + err, 'error');
    };
    if      (currentAction === 'markPaid') google.script.run.withSuccessHandler(onSuccess).withFailureHandler(onFail).markAsPaid(currentAppId, notes);
    else if (currentAction === 'approve')  google.script.run.withSuccessHandler(onSuccess).withFailureHandler(onFail).updateStatus(currentAppId, 'approved', notes);
    else if (currentAction === 'deny')     google.script.run.withSuccessHandler(onSuccess).withFailureHandler(onFail).updateStatus(currentAppId, 'denied', notes);
  };

  // ── Close modals on backdrop click ──
  ['confirmModal','leaseModal'].forEach(id => {
    document.getElementById(id).addEventListener('click', function(e) {
      if (e.target === this) {
        this.classList.remove('open');
        document.body.classList.remove('modal-open');
        if (id === 'confirmModal') { document.getElementById('modalConfirmBtn').disabled = false; }
        resumePolling();
      }
    });
  });

  // ── Toast notifications ──
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

  // ── Build client-side card HTML (live-update version, mirrors buildAdminCard) ──
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
    const canMarkPaid  = app['Payment Status'] === 'unpaid';
    const canApprove   = app['Payment Status'] === 'paid' && app['Status'] === 'pending';
    const canDeny      = canApprove;
    const canSendLease = app['Status'] === 'approved' && leaseStatus !== 'signed' && leaseStatus !== 'active';
    const dateStr      = app['Timestamp'] ? new Date(app['Timestamp']).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '';
    const phoneClean   = (app['Phone'] || '').replace(/\\D/g, '');

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
            <span class="status-badge \${badgeClass}">\${statusText}</span>
          </div>
          <div class="card-info-row">
            <a href="mailto:\${app['Email']}" class="info-chip" aria-label="Email \${app['Email']}"><i class="fas fa-envelope" style="opacity:.6;"></i> \${app['Email']}</a>
            <a href="tel:\${phoneClean}" class="info-chip" aria-label="Call \${app['Phone']}"><i class="fas fa-phone" style="opacity:.6;"></i> \${app['Phone']}</a>
            <span class="info-chip"><i class="fas fa-house" style="opacity:.6;"></i> \${app['Property Address']||'No property'}</span>
            <span class="info-chip"><i class="fas fa-mobile-screen-button" style="opacity:.6;"></i> \${contactMethod}</span>
            <span class="info-chip"><i class="fas fa-clock" style="opacity:.6;"></i> \${contactTimes}</span>
          </div>
          \${payPrefsHtml}
          <div class="card-actions">
            <button class="act-btn btn-pay"   onclick="showConfirmModal('markPaid','\${app['App ID']}','\${safeName}','\${safeContact}','\${safeTimes}')" \${canMarkPaid?'':'disabled'} aria-label="Mark as paid"><i class="fas fa-coins"></i> Mark Paid</button>
            <button class="act-btn btn-appr"  onclick="showConfirmModal('approve','\${app['App ID']}','\${safeName}','\${safeContact}','\${safeTimes}')" \${canApprove?'':'disabled'} aria-label="Approve"><i class="fas fa-circle-check"></i> Approve</button>
            <button class="act-btn btn-deny"  onclick="showConfirmModal('deny','\${app['App ID']}','\${safeName}','\${safeContact}','\${safeTimes}')" \${canDeny?'':'disabled'} aria-label="Deny"><i class="fas fa-circle-xmark"></i> Deny</button>
            <button class="act-btn btn-lease" onclick="showLeaseModal('\${app['App ID']}','\${safeName}','\${safeContact}','\${safeTimes}')" \${canSendLease?'':'disabled'} aria-label="Send lease"><i class="fas fa-file-signature"></i> Send Lease</button>
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

  window.onload = function() {
    currentFilter = 'all';
    currentSearch = '';
    applyFilterAndSearch();
    // Boot the live polling engine — starts watching for changes immediately
    initLivePolling();
  };
</script>
</body>
</html>
  `).setTitle('Admin Dashboard — Choice Properties');
}

// ── Helper: build admin card server-side (initial render, enhanced) ──
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
  const canMarkPaid   = app['Payment Status'] === 'unpaid';
  const canApprove    = app['Payment Status'] === 'paid' && app['Status'] === 'pending';
  const canDeny       = canApprove;
  const canSendLease  = app['Status'] === 'approved' && leaseStatus !== 'signed' && leaseStatus !== 'active';
  const dateStr       = app['Timestamp'] ? new Date(app['Timestamp']).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '';

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
          <span class="status-badge ${badgeClass}">${statusText}</span>
        </div>
        <div class="card-info-row">
          <a href="mailto:${app['Email']}" class="info-chip" aria-label="Email ${app['Email']}"><i class="fas fa-envelope" style="opacity:.6;"></i> ${app['Email']}</a>
          <a href="tel:${(app['Phone']||'').replace(/\D/g,'')}" class="info-chip" aria-label="Call ${app['Phone']}"><i class="fas fa-phone" style="opacity:.6;"></i> ${app['Phone']}</a>
          <span class="info-chip"><i class="fas fa-house" style="opacity:.6;"></i> ${app['Property Address']||'No property'}</span>
          <span class="info-chip"><i class="fas fa-mobile-screen-button" style="opacity:.6;"></i> ${contactMethod}</span>
          <span class="info-chip"><i class="fas fa-clock" style="opacity:.6;"></i> ${contactTimes}</span>
        </div>
        ${payPrefsHtml}
        <div class="card-actions">
          <button class="act-btn btn-pay"   onclick="showConfirmModal('markPaid','${app['App ID']}','${safeName}','${safeContact}','${safeTimes}')" ${canMarkPaid?'':'disabled'} aria-label="Mark as paid"><i class="fas fa-coins"></i> Mark Paid</button>
          <button class="act-btn btn-appr"  onclick="showConfirmModal('approve','${app['App ID']}','${safeName}','${safeContact}','${safeTimes}')" ${canApprove?'':'disabled'} aria-label="Approve"><i class="fas fa-circle-check"></i> Approve</button>
          <button class="act-btn btn-deny"  onclick="showConfirmModal('deny','${app['App ID']}','${safeName}','${safeContact}','${safeTimes}')" ${canDeny?'':'disabled'} aria-label="Deny"><i class="fas fa-circle-xmark"></i> Deny</button>
          <button class="act-btn btn-lease" onclick="showLeaseModal('${app['App ID']}','${safeName}','${safeContact}','${safeTimes}')" ${canSendLease?'':'disabled'} aria-label="Send lease"><i class="fas fa-file-signature"></i> Send Lease</button>
          <a href="${baseUrl}?path=dashboard&id=${app['App ID']}" target="_blank" class="act-btn btn-view" aria-label="View dashboard"><i class="fas fa-eye"></i> View</a>
          <a href="sms:7077063137?body=Hi%20${encodeURIComponent(app['First Name']||'')}%2C%20this%20is%20Choice%20Properties%20re%20app%20${app['App ID']}" class="act-btn btn-text" aria-label="Text applicant"><i class="fas fa-comment-sms"></i> Text</a>
        </div>
      </div>
    </div>`;
}

// ============================================================
// runCompleteBackendTest() — dev helper (unchanged)
// ============================================================
function runCompleteBackendTest() {
  console.log('🚀 TEST FUNCTION — kept for development');
}
