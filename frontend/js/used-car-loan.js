
const urlParams = new URLSearchParams(window.location.search);
const loanId = urlParams.get("loanId");
const isEditMode = !!loanId;

// let user = null;

// try {
//   const raw = localStorage.getItem("user");
//   if (raw) user = JSON.parse(raw);
// } catch {
//   localStorage.removeItem("user");
// }

// if (!user) {
//   window.location.href = "/index.html";
//   throw new Error("Unauthenticated");
// }

// console.log("Used Car Loan JS loaded");

/* =========================
   INPUT VALIDATION & UPPERCASE
========================= */

// Enforce uppercase for inputs with data-uppercase attribute
function enforceUppercase() {
  const uppercaseInputs = document.querySelectorAll("[data-uppercase]");
  uppercaseInputs.forEach((input) => {
    const toUpper = () => {
      input.value = input.value.toUpperCase();
    };
    input.addEventListener("input", toUpper);
    input.addEventListener("blur", toUpper);
    toUpper();
  });
}

// Restrict to alphabets only (with spaces) for name fields
function enforceAlphabetsOnly() {
  const alphabetInputs = document.querySelectorAll("[data-alphabets]");
  alphabetInputs.forEach((input) => {
    input.addEventListener("input", (e) => {
      // Allow only letters, spaces, and common name characters
      e.target.value = e.target.value.replace(/[^A-Za-z\s\.\-]/g, "");
    });
    input.addEventListener("keypress", (e) => {
      // Prevent non-alphabetic characters (except space, period, hyphen)
      const char = String.fromCharCode(e.which);
      if (!/[A-Za-z\s\.\-]/.test(char)) {
        e.preventDefault();
      }
    });
  });
}

// Restrict to numbers only for numeric fields
function enforceNumbersOnly() {
  const numberInputs = document.querySelectorAll("[data-numbers]");
  numberInputs.forEach((input) => {
    input.addEventListener("input", (e) => {
      // Remove any non-numeric characters
      e.target.value = e.target.value.replace(/[^0-9]/g, "");
    });
    input.addEventListener("keypress", (e) => {
      // Allow only digits
      const char = String.fromCharCode(e.which);
      if (!/[0-9]/.test(char)) {
        e.preventDefault();
      }
    });
  });
}

// Initialize all validations
enforceUppercase();
enforceAlphabetsOnly();
enforceNumbersOnly();

// Toggle Basic 'Case Dealer' and 'Ref Name / Mob No' visibility based on Source
function toggleBasicFieldsBySource() {
  const source = document.getElementById('source');
  if (!source) return;

  const caseDealer = document.getElementById('basicCaseDealer');
  const ref = document.getElementById('basicRefNameMobile');
  const dealerSelect = document.getElementById('basicCaseDealerSelect');

  const wrapperCase = document.getElementById('basicCaseDealerWrapper') || (caseDealer && (caseDealer.closest('div') || caseDealer.parentElement));
  const wrapperRef = document.getElementById('basicRefWrapper') || (ref && (ref.closest('div') || ref.parentElement));
  const wrapperSelect = document.getElementById('basicCaseDealerSelectWrapper') || (dealerSelect && (dealerSelect.closest('div') || dealerSelect.parentElement));

  function applyVisibility() {
    const val = (source.value || '').toLowerCase().trim();

    if (val === 'others') {
      if (wrapperCase) wrapperCase.classList.remove('hidden');
      if (wrapperRef) wrapperRef.classList.remove('hidden');
      if (wrapperSelect) wrapperSelect.classList.add('hidden');
      if (caseDealer) caseDealer.required = true;
      if (ref) ref.required = true;
      if (dealerSelect) dealerSelect.required = false;
    } else if (val === 'dealer') {
      if (wrapperSelect) wrapperSelect.classList.remove('hidden');
      if (wrapperCase) wrapperCase.classList.add('hidden');
      // Show Ref Name / Mob No for manual editing when dealer selected
      if (wrapperRef) wrapperRef.classList.remove('hidden');
      if (dealerSelect) dealerSelect.required = true;
      if (caseDealer) caseDealer.required = false;
      if (ref) ref.required = false;
    } else {
      if (wrapperCase) wrapperCase.classList.add('hidden');
      if (wrapperRef) wrapperRef.classList.add('hidden');
      if (wrapperSelect) wrapperSelect.classList.add('hidden');
      if (caseDealer) caseDealer.required = false;
      if (ref) ref.required = false;
      if (dealerSelect) dealerSelect.required = false;
    }
  }

  source.addEventListener('change', applyVisibility);
  // ensure initial state
  applyVisibility();
}

/* =========================
   ROLE-BASED FIELD VISIBILITY (DEALER ONLY)
========================= */

// Initialize role-based field visibility for dealers only
function initializeRoleBasedVisibility() {
  const user = getUserFromStorage();
  if (!user) return;

  // Only apply restrictions for dealers
  if (user.role === 'dealer') {
    // Add dealer mode class to body
    document.body.classList.add('dealer-mode');
    
    // Hide all dealer-hidden sections
    const hiddenSections = document.querySelectorAll('.dealer-hidden');
    hiddenSections.forEach(section => {
      section.style.display = 'none';
    });
    
    // Show only dealer-visible sections (they're already visible by default)
    const visibleSections = document.querySelectorAll('.dealer-visible');
    visibleSections.forEach(section => {
      section.style.display = 'block';
    });
    
    // Remove required attribute from hidden fields to prevent validation issues
    const hiddenFields = document.querySelectorAll('.dealer-hidden input[required], .dealer-hidden select[required], .dealer-hidden textarea[required]');
    hiddenFields.forEach(field => {
      field.removeAttribute('required');
      field.dataset.wasRequired = 'true'; // Mark as was required for later
    });
    
    // Update form header for dealer
    updateFormHeaderForDealer();
    
    // Add submit button for dealer
    addDealerSubmitButton();
  }
  // For admin, manager, and employee - do nothing, show full form
}

// Get user from localStorage
function getUserFromStorage() {
  try {
    const rawUser = localStorage.getItem('user');
    return rawUser ? JSON.parse(rawUser) : null;
  } catch (error) {
    console.error('Error getting user from storage:', error);
    return null;
  }
}

// Update form header for dealer
function updateFormHeaderForDealer() {
  const headerTitle = document.querySelector('.form-header h1');
  const headerDescription = document.querySelector('.form-header p');
  
  if (headerTitle) {
    headerTitle.textContent = 'Used Car Loan Application - Dealer Portal';
  }
  
  if (headerDescription) {
    headerDescription.textContent = 'Fill in the basic information below. Our team will complete the remaining details.';
  }
}

// Add submit button for dealer
function addDealerSubmitButton() {
  const form = document.getElementById('leadForm');
  if (!form) return;
  
  // Check if dealer submit button already exists
  if (document.getElementById('dealerSubmitBtn')) return;
  
  const submitSection = document.createElement('div');
  submitSection.style.cssText = 'text-align: center; margin: 2rem 0; padding: 2rem; background: #f8fafc; border-radius: 12px; border: 2px dashed #d1d5db;';
  
  submitSection.innerHTML = `
    <p style="margin: 0 0 1rem 0; color: #6b7280; font-weight: 500;">
      📋 Once you submit this form, our team will review and complete the remaining information.
    </p>
    <button type="button" id="dealerSubmitBtn" class="btn btn-primary" style="background: #10b981; color: white; padding: 1rem 2rem; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
      Submit Application for Review
    </button>
  `;
  
  form.appendChild(submitSection);
  
  // Add click handler for dealer submit
  document.getElementById('dealerSubmitBtn').addEventListener('click', handleDealerSubmit);
}

// Handle dealer form submission
function handleDealerSubmit() {
  const form = document.getElementById('leadForm');
  if (!form) return;
  
  // Validate only visible fields
  const visibleRequiredFields = form.querySelectorAll('.dealer-visible [required], .dealer-visible input[required], .dealer-visible select[required], .dealer-visible textarea[required]');
  let isValid = true;
  let firstInvalidField = null;
  
  // Clear previous validation states
  visibleRequiredFields.forEach(field => {
    field.style.borderColor = '';
  });
  
  // Validate visible required fields
  visibleRequiredFields.forEach(field => {
    if (!field.value.trim()) {
      field.style.borderColor = '#ef4444';
      if (!firstInvalidField) firstInvalidField = field;
      isValid = false;
    }
  });
  
  if (!isValid) {
    alert('Please fill in all required fields before submitting.');
    if (firstInvalidField) {
      firstInvalidField.focus();
      firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }
  
  // Show confirmation
  if (confirm('Are you sure you want to submit this application? Our team will review and complete the remaining details.')) {
    // Mark as dealer submitted
    markAsDealerSubmitted();
    
    // Submit to server with dealer assignment logic
    submitDealerForm();
    
    // Show success message
    showDealerSuccessMessage();
  }
}

// Submit dealer form to server
function submitDealerForm() {
  const form = document.getElementById('leadForm');
  if (!form) return;
  
  const user = getUserFromStorage();
  if (!user) {
    alert('User session not found. Please login again.');
    return;
  }
  
  // Collect all form data
  const formData = new FormData(form);
  const data = {};
  
  // Add all form fields
  for (let [key, value] of formData.entries()) {
    data[key] = value;
  }
  
  // Add user information
  data.userId = user.id;
  data.role = user.role;
  data.loanType = data.loanType || 'used-car-loan';
  data.loanStage = 'Lead';
  
  // Mark as dealer submitted
  data.dealerSubmitted = 'true';
  data.dealerSubmittedTime = new Date().toISOString();
  
  console.log('Submitting dealer lead:', data);
  
  // Submit to server
  fetch('/api/leads', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
  })
  .then(response => response.json())
  .then(result => {
    if (result.success) {
      console.log('Dealer lead submitted successfully:', result.loanId);
      // Update loan ID if server generated a new one
      if (result.loanId && data.loanId !== result.loanId) {
        document.getElementById('loanId').value = result.loanId;
      }
    } else {
      console.error('Failed to submit dealer lead:', result.error);
      alert('Failed to submit application. Please try again.');
    }
  })
  .catch(error => {
    console.error('Error submitting dealer lead:', error);
    alert('Error submitting application. Please try again.');
  });
}

// Mark form as dealer submitted
function markAsDealerSubmitted() {
  const loanId = document.getElementById('loanId')?.value;
  if (loanId) {
    localStorage.setItem(`dealer_submitted_${loanId}`, 'true');
    localStorage.setItem(`dealer_submitted_time_${loanId}`, new Date().toISOString());
  }
}

// Show success message for dealer
function showDealerSuccessMessage() {
  const submitSection = document.getElementById('dealerSubmitBtn')?.parentElement;
  if (submitSection) {
    submitSection.innerHTML = `
      <div style="text-align: center; padding: 2rem;">
        <div style="font-size: 3rem; margin-bottom: 1rem;">✅</div>
        <h3 style="color: #10b981; margin: 0 0 0.5rem 0;">Application Submitted Successfully!</h3>
        <p style="color: #6b7280; margin: 0;">
          Your application has been submitted for review. Our team will complete the remaining details and contact you if needed.
        </p>
        <button type="button" onclick="window.location.href='/dashboard.html'" style="margin-top: 1rem; padding: 0.75rem 1.5rem; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">
          Back to Dashboard
        </button>
      </div>
    `;
  }
}

/* =========================
   AUTOMATIC LOAN ID GENERATION
========================= */
function generateLoanId() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  
  // Get current counter from localStorage or start with 0
  const storageKey = `loanCounter_${year}${month}`;
  let counter = parseInt(localStorage.getItem(storageKey) || '0');
  
  // Generate loan ID: YYYYMM0001 format (don't increment yet)
  const loanId = `${year}${month}${String(counter + 1).padStart(4, '0')}`;
  
  return { loanId, storageKey, counter };
}

function incrementLoanCounter(storageKey, currentCounter) {
  // Only increment when form is actually submitted
  const newCounter = currentCounter + 1;
  localStorage.setItem(storageKey, newCounter.toString());
}

// Set loan ID and initialize form when page loads
document.addEventListener('DOMContentLoaded', function() {
  // Initialize role-based field visibility for dealers only
  initializeRoleBasedVisibility();
  
  // Initialize progress tracking
  updateProgress();
  
  // Initialize loan ID
  const loanIdField = document.getElementById('loanId');
    if (loanIdField && !loanId) {   // 👈 do NOT generate when editing
      const { loanId } = generateLoanId();
      loanIdField.value = loanId;

    loanIdField.readOnly = true;
    
    // Add visual indicator that it's auto-generated
    loanIdField.style.backgroundColor = '#f8fafc';
    loanIdField.style.color = '#6b7280';
    loanIdField.title = 'Auto-generated Loan ID - will be finalized on submission';
  }

  // Initialize date/time
  const dateTimeField = document.getElementById("dateTime");
  if (dateTimeField) {
    dateTimeField.value = new Date().toLocaleString();
  }

  // Add input event listeners for progress tracking
  const allInputs = document.querySelectorAll('input, select, textarea');
  allInputs.forEach(input => {
    input.addEventListener('input', updateProgress);
    input.addEventListener('change', updateProgress);
  });

  // Add form validation
  const form = document.getElementById('leadForm');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }

  // Initialize basic field visibility based on Source selection
  try { toggleBasicFieldsBySource(); } catch (e) { /* ignore if elements missing */ }

  // Load dealer options from server (admin users) if possible
  try { loadDealerOptions(); } catch (e) { /* ignore */ }

  // Initialize EMI / IRR calculation display
  try { initEmiCalculator(); } catch (e) { /* ignore */ }

  // Initialize MFG dropdowns
  const mfgMonth = document.getElementById("mfgMonth");
  const mfgYear = document.getElementById("mfgYear");
  const vehicleAgeInput = document.getElementById("vehicleAge");

  if (mfgMonth) {
    const monthNames = [
      "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
      "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
    ];
    monthNames.forEach((name, index) => {
      const opt = document.createElement("option");
      const monthNumber = String(index + 1).padStart(2, "0");
      opt.value = monthNumber;
      opt.textContent = `${monthNumber} - ${name}`;
      mfgMonth.appendChild(opt);
    });
  }

  if (mfgYear) {
    for (let y = 2010; y <= 2030; y++) {
      const opt = document.createElement("option");
      opt.value = y;
      opt.textContent = y;
      mfgYear.appendChild(opt);
    }
  }

  function updateVehicleAge() {
    if (!mfgMonth || !mfgYear || !vehicleAgeInput) return;
    const monthVal = Number(mfgMonth.value);
    const yearVal = Number(mfgYear.value);

    if (!monthVal || !yearVal) {
      vehicleAgeInput.value = "";
      return;
    }

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    let years = currentYear - yearVal;
    let months = currentMonth - monthVal;
    
    if (months < 0) {
      years--;
      months += 12;
    }
    
    const totalMonths = (years * 12) + months;
    vehicleAgeInput.value = totalMonths + " months";
  }

  // Add event listeners for vehicle age calculation
  if (mfgMonth && mfgYear) {
    mfgMonth.addEventListener("change", updateVehicleAge);
    mfgYear.addEventListener("change", updateVehicleAge);
  }

  // Initialize input validations
  enforceUppercase();
  enforceAlphabetsOnly();
  enforceNumbersOnly();
});

// Progress tracking function
function updateProgress() {
  const requiredFields = document.querySelectorAll('[required]');
  const filledRequiredFields = Array.from(requiredFields).filter(field => {
    if (field.type === 'checkbox') return field.checked;
    return field.value.trim() !== '';
  });
  
  const progress = Math.round((filledRequiredFields.length / requiredFields.length) * 100);
  const progressBar = document.getElementById('progressBar');
  if (progressBar) {
    progressBar.style.width = progress + '%';
  }
  
  return progress;
}

// EMI & IRR helpers
function formatCurrency(v) {
  if (v === null || v === undefined || isNaN(v)) return '-';
  return '₹' + Number(v).toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}

function formatPercent(v) {
  if (v === null || v === undefined || isNaN(v)) return '-';
  return Number(v).toFixed(2) + '% p.a.';
}

function computeAndShowEmi() {
  const loanAmountEl = document.getElementById('loanAmount');
  const tenureEl = document.getElementById('loanTenure');
  const irrEl = document.getElementById('irr');
  const emiDisplay = document.getElementById('emiDisplay');
  const irrDisplay = document.getElementById('irrDisplay');

  if (!loanAmountEl || !tenureEl || !irrEl || !emiDisplay || !irrDisplay) return;

  const P = parseFloat(loanAmountEl.value) || 0;
  const n = parseInt(tenureEl.value) || 0; // expecting months
  const annualRate = parseFloat(irrEl.value) || 0;

  if (!P || !n) {
    emiDisplay.textContent = '';
    irrDisplay.textContent = annualRate ? formatPercent(annualRate) : '';
    return;
  }

  const r = annualRate / 12 / 100; // monthly rate
  let emi = 0;
  if (r === 0) {
    emi = P / n;
  } else {
    const x = Math.pow(1 + r, n);
    emi = P * r * x / (x - 1);
  }

  emiDisplay.textContent = 'Estimated EMI: ' + formatCurrency(emi) + ' / month';
  irrDisplay.textContent = formatPercent(annualRate);
}

function initEmiCalculator() {
  const loanAmountEl = document.getElementById('loanAmount');
  const tenureEl = document.getElementById('loanTenure');
  const irrEl = document.getElementById('irr');
  if (loanAmountEl) loanAmountEl.addEventListener('input', computeAndShowEmi);
  if (tenureEl) tenureEl.addEventListener('change', computeAndShowEmi);
  if (irrEl) irrEl.addEventListener('input', computeAndShowEmi);
  // initial compute
  computeAndShowEmi();
}

// Fetch dealers (users with role 'dealer') and populate the dealer select
async function loadDealerOptions() {
  const dealerSelect = document.getElementById('basicCaseDealerSelect');
  if (!dealerSelect) return;

  // Try to use logged-in user id as admin header if available
  let admin = null;
  try { admin = JSON.parse(localStorage.getItem('user') || 'null'); } catch (e) { admin = null; }

  try {
    const headers = {};
    if (admin && admin.id) headers['x-admin-id'] = admin.id;

    const res = await fetch('/api/admin/users', { headers });
    if (!res.ok) {
      // cannot fetch (likely not admin) — leave default options
      return;
    }

    const users = await res.json();
    const dealers = Array.isArray(users) ? users.filter(u => (u.role || '').toLowerCase() === 'dealer' && u.status !== 'inactive') : [];

    // Clear existing (but keep first placeholder)
    const placeholder = dealerSelect.querySelector('option[value=""]');
    dealerSelect.innerHTML = '';
    if (placeholder) dealerSelect.appendChild(placeholder);

    dealers.forEach(d => {
      const opt = document.createElement('option');
      // Prefer a readable name if available, fall back to username
      opt.textContent = d.username || (d.first_name || 'Dealer');
      opt.value = d.username || d.id;
      dealerSelect.appendChild(opt);
    });

    // keep an 'Others' option
    const othersOpt = document.createElement('option');
    othersOpt.value = 'Others';
    othersOpt.textContent = 'Others';
    dealerSelect.appendChild(othersOpt);

    // If user selects 'Others' in dealer select, show manual Case Dealer input
    dealerSelect.addEventListener('change', () => {
      const wrapperCase = document.getElementById('basicCaseDealerWrapper');
      if (!wrapperCase) return;
      if ((dealerSelect.value || '').toLowerCase() === 'others') {
        wrapperCase.classList.remove('hidden');
        const caseDealer = document.getElementById('basicCaseDealer'); if (caseDealer) caseDealer.required = true;
      } else {
        wrapperCase.classList.add('hidden');
        const caseDealer = document.getElementById('basicCaseDealer'); if (caseDealer) caseDealer.required = false;
      }
    });

  } catch (err) {
    console.error('Failed to load dealers', err);
  }
}

// Form validation and submission
function handleFormSubmit(e) {
  e.preventDefault();
  
  const form = e.target;
  const requiredFields = form.querySelectorAll('[required]');
  let isValid = true;
  let firstInvalidField = null;
  
  // Clear previous validation states
  requiredFields.forEach(field => {
    field.style.borderColor = '';
  });
  
  // Validate required fields
  requiredFields.forEach(field => {
    if (!field.value.trim()) {
      isValid = false;
      field.style.borderColor = 'var(--error-color)';
      if (!firstInvalidField) firstInvalidField = field;
    }
  });
  
  if (!isValid) {
    // Show error message
    showError('Please fill in all required fields');
    // Scroll to first invalid field
    if (firstInvalidField) {
      firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstInvalidField.focus();
    }
    return;
  }
  
  // Show loading state
  showLoading();
  
  // Simulate form submission (replace with actual submission logic)
  setTimeout(() => {
    hideLoading();
    showSuccess('Application submitted successfully!');
    // Reset form or redirect as needed
    setTimeout(() => {
      if (confirm('Would you like to submit another application?')) {
        form.reset();
        updateProgress();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 2000);
  }, 2000);
}

// UI Helper functions
function showError(message) {
  showNotification(message, 'error');
}

function showSuccess(message) {
  showNotification(message, 'success');
}

function showNotification(message, type = 'info') {
  // Remove existing notifications
  const existing = document.querySelector('.notification');
  if (existing) existing.remove();
  
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  // Style the notification
  Object.assign(notification.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '1rem 1.5rem',
    borderRadius: 'var(--border-radius)',
    color: 'white',
    fontWeight: '600',
    zIndex: '1000',
    animation: 'slideIn 0.3s ease-out',
    maxWidth: '400px'
  });
  
  if (type === 'error') {
    notification.style.background = 'var(--error-color)';
  } else if (type === 'success') {
    notification.style.background = 'var(--success-color)';
  } else {
    notification.style.background = 'var(--primary-color)';
  }
  
  document.body.appendChild(notification);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

function showLoading() {
  const submitBtn = document.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Submitting...';
    submitBtn.classList.add('loading');
  }
  
  // Add loading overlay
  const overlay = document.createElement('div');
  overlay.className = 'loading-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    color: white;
    font-size: 1.2rem;
    font-weight: 600;
  `;
  overlay.innerHTML = '🚗 Processing your application...';
  document.body.appendChild(overlay);
}

function hideLoading() {
  const submitBtn = document.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = '🚀 Submit Application';
    submitBtn.classList.remove('loading');
  }
  
  // Remove loading overlay
  const overlay = document.querySelector('.loading-overlay');
  if (overlay) overlay.remove();
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
  
  .notification {
    box-shadow: var(--shadow-lg);
  }
  
  .loading {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;
document.head.appendChild(style);

// Loan tenure dropdown (01 to 96 months)
const loanTenure = document.getElementById("loanTenure");
const emiPaid = document.getElementById("emiPaid");
for (let t = 1; t <= 96; t++) {
  const padded = String(t).padStart(2, "0");
  if (loanTenure) {
    const opt = document.createElement("option");
    opt.value = padded;
    opt.textContent = padded;
    loanTenure.appendChild(opt);
  }
  if (emiPaid) {
    const opt2 = document.createElement("option");
    opt2.value = padded;
    opt2.textContent = padded;
    emiPaid.appendChild(opt2);
  }
}

// Show BT-specific fields when type is BT Topup or Int BT
const loanTypeSelect = document.getElementById("loanType");
const btFields = document.getElementById("btFields");
const btInputs = document.querySelectorAll("[data-bt-required='true']");
const dsaSelect = document.getElementById("loanDsa");
const dsaCodeField = document.getElementById("dsaCodeField");
const dsaCodeInput = document.getElementById("loanDsaCode");
const maritalStatus = document.getElementById("MaritalStatus");
const spouseNameField = document.getElementById("spouseNameField");
const spouseNameInput = document.getElementById("spouseName");
const addAltNoBtn = document.getElementById("addAltNoBtn");
const extraAltMobileContainer = document.getElementById("extraAltMobileContainer");
const extraAltMobileInput = document.getElementById("extraAltMobile");
const cibilDisplay = document.getElementById("cibilDisplay");
const cibilPromptBtn = document.getElementById("cibilPromptBtn");
const cibilScoreInput = document.getElementById("cibilScore");
const cibilIndicatorInput = document.getElementById("cibilIndicator");
const cibilColorButtons = document.querySelectorAll(".cibil-color-btn");
const cibilToggleBtn = document.getElementById("cibilToggleBtn");
const cibilDetailsSection = document.getElementById("cibilDetails");
const motorInsuranceFields = document.getElementById("motorInsuranceFields");
const addAdditionalApplicantBtn = document.getElementById("addAdditionalApplicantBtn");
const additionalApplicantsContainer = document.getElementById("additionalApplicantsContainer");
let additionalApplicantCount = 0;
const MAX_ADDITIONAL_APPLICANTS = 2;

function updateCibilDisplay(score) {
  if (!cibilDisplay) return;
  if (score) {
    cibilDisplay.textContent = `Score: ${score}`;
  } else {
    cibilDisplay.textContent = "Not Entered";
  }
}

function setCibilIndicator(color) {
  if (!cibilDisplay || !cibilIndicatorInput) return;
  cibilDisplay.classList.remove("red", "yellow", "green");
  cibilColorButtons.forEach((btn) => btn.classList.remove("active"));
  if (color) {
    cibilDisplay.classList.add(color);
    cibilIndicatorInput.value = color;
    const activeBtn = Array.from(cibilColorButtons).find(
      (btn) => btn.dataset.color === color
    );
    if (activeBtn) activeBtn.classList.add("active");
  } else {
    cibilIndicatorInput.value = "";
  }
}

if (cibilPromptBtn && cibilScoreInput) {
  cibilPromptBtn.addEventListener("click", () => {
    const current = cibilScoreInput.value || "";
    const value = prompt("Enter CIBIL Score", current);
    if (value === null) return;
    const trimmed = value.trim();
    cibilScoreInput.value = trimmed;
    updateCibilDisplay(trimmed);
  });
  updateCibilDisplay(cibilScoreInput.value);
}

if (cibilColorButtons.length) {
  cibilColorButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const color = btn.dataset.color;
      setCibilIndicator(color);
    });
  });
  setCibilIndicator(cibilIndicatorInput?.value || "");
}

if (cibilToggleBtn && cibilDetailsSection) {
  const updateToggleUi = () => {
    const isOpen = !cibilDetailsSection.classList.contains("hidden");
    cibilToggleBtn.setAttribute("aria-expanded", isOpen);
    cibilToggleBtn.textContent = isOpen ? "−" : "+";
    cibilToggleBtn.classList.toggle("plus-state", !isOpen);
    cibilToggleBtn.classList.toggle("minus-state", isOpen);
  };

  cibilToggleBtn.addEventListener("click", () => {
    cibilDetailsSection.classList.toggle("hidden");
    updateToggleUi();
  });

  updateToggleUi();
}

function toggleBtFields() {
  const isBt =
    loanTypeSelect &&
    (loanTypeSelect.value === "BT Topup" || loanTypeSelect.value === "Int BT");
  if (btFields) {
    btFields.classList.toggle("hidden", !isBt);
  }
  btInputs.forEach((input) => {
    input.required = !!isBt;
    if (!isBt) input.value = "";
  });
}

if (loanTypeSelect) {
  loanTypeSelect.addEventListener("change", toggleBtFields);
  toggleBtFields();
}

function toggleDsaCode() {
  const showCode = dsaSelect && dsaSelect.value === "Others";
  if (dsaCodeField) {
    dsaCodeField.classList.toggle("hidden", !showCode);
  }
  if (dsaCodeInput) {
    dsaCodeInput.required = !!showCode;
    if (!showCode) dsaCodeInput.value = "";
  }
}

if (dsaSelect) {
  dsaSelect.addEventListener("change", toggleDsaCode);
  toggleDsaCode();
}

function toggleSpouseField() {
  const needsSpouse = maritalStatus && (maritalStatus.value === "Married" || maritalStatus.value === "Divorced");
  if (spouseNameField) {
    spouseNameField.classList.toggle("hidden", !needsSpouse);
  }
  if (spouseNameInput) {
    spouseNameInput.required = !!needsSpouse;
    if (!needsSpouse) spouseNameInput.value = "";
  }
}

if (maritalStatus) {
  maritalStatus.addEventListener("change", toggleSpouseField);
  toggleSpouseField();
}

if (addAltNoBtn && extraAltMobileContainer && extraAltMobileInput) {
  addAltNoBtn.addEventListener("click", () => {
    const isHidden = extraAltMobileContainer.classList.contains("hidden");
    extraAltMobileContainer.classList.toggle("hidden", !isHidden);
    const nowHidden = extraAltMobileContainer.classList.contains("hidden");
    addAltNoBtn.textContent = nowHidden ? "+" : "−";
    addAltNoBtn.classList.toggle("plus-state", nowHidden);
    addAltNoBtn.classList.toggle("minus-state", !nowHidden);
    addAltNoBtn.setAttribute(
      "aria-label",
      nowHidden ? "Add alternate number" : "Remove alternate number"
    );
    if (isHidden) {
      extraAltMobileInput.focus();
    } else {
      extraAltMobileInput.value = "";
    }
  });
}

function createAdditionalApplicantBlock(index) {
  const block = document.createElement("div");
  block.className = "additional-applicant-block";
  block.id = `additionalApplicant${index}`;
  block.innerHTML = `
    <div class="additional-applicant-header">
      <h4>Applicant ${index}</h4>
      <button type="button" class="icon-btn minus-state compact remove-additional-applicant" data-target="${index}" aria-label="Remove applicant ${index}">− Remove</button>
    </div>
     <div class="sub-section">
      <h5>Applicant Profile</h5>

      <div class="grid">

        <div class="form-field">
          <label for="additionalApplicant${index}Type">APPLICANT TYPE *</label>
          <select id="additionalApplicant${index}Type">
            <option value="">APPLICANT TYPE *</option>
            ${index === 3
              ? '<option value="Guarantor">Guarantor</option>'
              : '<option value="Co-Applicant">Co-Applicant</option><option value="Guarantor">Guarantor</option>'}
          </select>
        </div>

        <div class="form-field">
          <label for="additionalApplicant${index}Relation">APPLICANT RELATION</label>
          <select id="additionalApplicant${index}Relation">
            <option value="">APPLICANT RELATION</option>
            <option>Spouse</option><option>Father</option><option>Mother</option>
            <option>Brother</option><option>Sister</option>
            <option>Son</option><option>Daughter</option>
            <option>Grand Father</option><option>Grand Mother</option>
            <option>Friend</option><option>Relative</option>
          </select>
        </div>

        <div class="form-field">
          <label for="additionalApplicant${index}Name">NAME *</label>
          <input id="additionalApplicant${index}Name" data-uppercase data-alphabets />
        </div>

        <div class="form-field">
          <label for="additionalApplicant${index}Gender">GENDER *</label>
          <select id="additionalApplicant${index}Gender">
            <option value="">GENDER *</option>
            <option>Male</option>
            <option>Female</option>
            <option>Rather Not To Say</option>
          </select>
        </div>

        <div class="form-field">
          <label for="additionalApplicant${index}Pan">PAN NO</label>
          <input id="additionalApplicant${index}Pan" data-uppercase maxlength="10" />
        </div>

        <div class="form-field">
          <label for="additionalApplicant${index}Mobile">MOBILE NO</label>
          <input id="additionalApplicant${index}Mobile" data-numbers maxlength="10" />
        </div>

        <div class="form-field">
          <label for="additionalApplicant${index}Email">EMAIL ID</label>
          <input id="additionalApplicant${index}Email" type="email" />
        </div>

        <div class="form-field">
          <label for="additionalApplicant${index}MaritalStatus">MARITAL STATUS</label>
          <select id="additionalApplicant${index}MaritalStatus">
            <option value="">MARITAL STATUS</option>
            <option>Single</option>
            <option>Married</option>
            <option>Divorced</option>
          </select>
        </div>

        <div class="form-field additional-applicant-spouse-field" id="additionalApplicant${index}SpouseField" style="display: none;">
          <label for="additionalApplicant${index}SpouseName">SPOUSE NAME *</label>
          <input id="additionalApplicant${index}SpouseName" data-uppercase data-alphabets />
        </div>

        <div class="form-field">
          <label for="additionalApplicant${index}FatherName">FATHER NAME</label>
          <input id="additionalApplicant${index}FatherName" data-uppercase data-alphabets />
        </div>

        <div class="form-field">
          <label for="additionalApplicant${index}MotherName">MOTHER NAME</label>
          <input id="additionalApplicant${index}MotherName" data-uppercase data-alphabets />
        </div>

      </div>
    </div>

    <div class="sub-section">
  <h5>Current Address</h5>

  <div class="grid">

    <div class="form-field">
      <label for="additionalApplicant${index}CurrentProof">ADDRESS PROOF *</label>
      <select id="additionalApplicant${index}CurrentProof">
        <option value="">ADDRESS PROOF *</option>
        <option>Aadhaar</option>
        <option>Voter ID</option>
        <option>Gas Bill</option>
        <option>EB Bill</option>
        <option>Tax Paid Receipt</option>
        <option>Rent Agreements</option>
      </select>
    </div>

    <div class="form-field">
      <label for="additionalApplicant${index}CurrentLandmark">LAND MARK</label>
      <input
        id="additionalApplicant${index}CurrentLandmark"
        data-uppercase
      />
    </div>

    <div class="form-field">
      <label for="additionalApplicant${index}CurrentPincode">PIN CODE</label>
      <input
        id="additionalApplicant${index}CurrentPincode"
        data-numbers
        maxlength="6"
      />
    </div>

    <div class="form-field">
      <label for="additionalApplicant${index}CurrentDistrict">DISTRICT</label>
      <input
        id="additionalApplicant${index}CurrentDistrict"
        data-uppercase
        data-alphabets
      />
    </div>

    <div class="form-field hidden" style="grid-column: span 2;">
      <label for="additionalApplicant${index}CurrentPinDropdown">SELECT PIN</label>
      <select id="additionalApplicant${index}CurrentPinDropdown">
        <option value="">Select PIN</option>
      </select>
    </div>

    <div class="form-field">
      <label for="additionalApplicant${index}CurrentRelation">OHP OWNER RELATION *</label>
      <select id="additionalApplicant${index}CurrentRelation">
        <option value="">OHP OWNER RELATION *</option>
        <option>SPOUSE</option>
        <option>SELF-OWNED</option>
        <option>PARANTEL</option>
        <option>RENTED</option>
      </select>
    </div>

  </div>
</div>

<div class="sub-section">
  <h5>Permanent Address</h5>

  <div style="margin-bottom: 15px;">
    <label style="display:flex;align-items:center;gap:8px;font-weight:500;">
      <input type="checkbox" id="additionalApplicant${index}CopyPermanentFromCurrent" />
      Same as Current Address
    </label>
  </div>

  <div class="grid">

    <div class="form-field">
      <label for="additionalApplicant${index}PermanentProof">ADDRESS PROOF *</label>
      <select id="additionalApplicant${index}PermanentProof">
        <option value="">ADDRESS PROOF *</option>
        <option>Aadhaar</option>
        <option>Voter ID</option>
        <option>Gas Bill</option>
        <option>EB Bill</option>
        <option>Tax Paid Receipt</option>
        <option>Rent Agreements</option>
      </select>
    </div>

    <div class="form-field">
      <label for="additionalApplicant${index}PermanentLandmark">LAND MARK</label>
      <input
        id="additionalApplicant${index}PermanentLandmark"
        data-uppercase
      />
    </div>

    <div class="form-field">
      <label for="additionalApplicant${index}PermanentPincode">PIN CODE</label>
      <input
        id="additionalApplicant${index}PermanentPincode"
        data-numbers
        maxlength="6"
      />
    </div>

    <div class="form-field">
      <label for="additionalApplicant${index}PermanentDistrict">DISTRICT</label>
      <input
        id="additionalApplicant${index}PermanentDistrict"
        data-uppercase
        data-alphabets
      />
    </div>

    <div class="form-field hidden" style="grid-column: span 2;">
      <label for="additionalApplicant${index}PermanentPinDropdown">SELECT PIN</label>
      <select id="additionalApplicant${index}PermanentPinDropdown">
        <option value="">Select PIN</option>
      </select>
    </div>

    <div class="form-field">
      <label for="additionalApplicant${index}PermanentRelation">OHP OWNER RELATION *</label>
      <select id="additionalApplicant${index}PermanentRelation">
        <option value="">OHP OWNER RELATION *</option>
        <option>SPOUSE</option>
        <option>SELF-OWNED</option>
        <option>PARANTEL</option>
        <option>RENTED</option>
      </select>
    </div>

  </div>
</div>


    <div class="sub-section">
  <h5>Employment & Office</h5>

  <div class="grid">

    <div class="form-field">
      <label for="additionalApplicant${index}EmploymentProfile">
        CUSTOMER PROFILE *
      </label>
      <select id="additionalApplicant${index}EmploymentProfile">
        <option value="">CUSTOMER PROFILE *</option>
        <option>Self-Employed</option>
        <option>Salaried</option>
        <option>ITR</option>
        <option>Agriculture</option>
        <option>Pension</option>
      </select>
    </div>

        <div class="form-field">
          <label for="additionalApplicant${index}BusinessName">
            BUSINESS / OFFICE / DESIGNATION NAME
          </label>
          <input
            id="additionalApplicant${index}BusinessName"
            data-uppercase
          />
        </div>

        <div class="form-field">
          <label for="additionalApplicant${index}MonthlyIncome">
            MONTHLY INCOME
          </label>
          <input
            id="additionalApplicant${index}MonthlyIncome"
            type="number"
          />
        </div>

    <div class="form-field">
      <label for="additionalApplicant${index}BusinessProof">
        BUSINESS PROOF *
      </label>
      <select id="additionalApplicant${index}BusinessProof">
        <option value="">BUSINESS PROOF *</option>
        <option>NIP</option>
        <option>Pay slips</option>
        <option>RTC</option>
        <option>GST</option>
        <option>ITR</option>
        <option>License</option>
        <option>Pension Statements</option>
      </select>
    </div>

    <div class="form-field" style="grid-column: span 3;">
      <label for="additionalApplicant${index}OfficeAddress">
        FULL ADDRESS
      </label>
      <textarea
        id="additionalApplicant${index}OfficeAddress"
      ></textarea>
    </div>

  </div>
</div>

  `;
  return block;
}

// Ensure remove button is disabled when any field in the block has a value.
function setupRemoveButtonBehavior(block) {
  if (!block) return;
  const removeBtn = block.querySelector('.remove-additional-applicant');
  if (!removeBtn) return;

  function isBlockEmpty() {
    const fields = Array.from(block.querySelectorAll('input, select, textarea'));
    return !fields.some(f => {
      if (f.type === 'checkbox' || f.type === 'radio') return f.checked;
      return String(f.value || '').trim() !== '';
    });
  }

  function updateRemoveState() {
    const empty = isBlockEmpty();
    removeBtn.disabled = !empty ? true : false;
    removeBtn.style.opacity = empty ? '1' : '0.5';
    removeBtn.style.cursor = empty ? 'pointer' : 'not-allowed';
    removeBtn.setAttribute('aria-disabled', (!empty).toString());
  }

  // Attach listeners to all fields in the block
  const fields = Array.from(block.querySelectorAll('input, select, textarea'));
  fields.forEach(f => {
    f.addEventListener('input', updateRemoveState);
    f.addEventListener('change', updateRemoveState);
  });

  // Initialize state
  updateRemoveState();
}

function isApplicantBlockEmpty(block) {
  if (!block) return true;
  const fields = Array.from(block.querySelectorAll('input, select, textarea'));
  return !fields.some(f => {
    if (f.type === 'checkbox' || f.type === 'radio') return f.checked;
    return String(f.value || '').trim() !== '';
  });
}

function initializeAdditionalApplicants() {
  if (!addAdditionalApplicantBtn || !additionalApplicantsContainer) return;

  addAdditionalApplicantBtn.addEventListener("click", () => {
    if (!additionalApplicantsContainer) return;
    const existingCount = additionalApplicantsContainer.querySelectorAll('.additional-applicant-block').length;
    if (existingCount >= MAX_ADDITIONAL_APPLICANTS) return;

    // Visible applicant numbers should be 2 and 3 (primary applicant is 1)
    const visibleIndex = existingCount + 2;
    const block = createAdditionalApplicantBlock(visibleIndex);
    additionalApplicantsContainer.appendChild(block);
    initAdditionalApplicantPin(visibleIndex);
    initAdditionalApplicantSpouseField(visibleIndex);
    initAdditionalApplicantAddressCopy(visibleIndex);

    // Re-apply validation to dynamically created fields
    enforceUppercase();
    enforceAlphabetsOnly();
    enforceNumbersOnly();

    // Setup remove button behavior (enabled only when block is empty)
    if (typeof setupRemoveButtonBehavior === 'function') setupRemoveButtonBehavior(block);

    const nameInput = block.querySelector("[id$='Name']");
if (nameInput) nameInput.required = false;

    block.scrollIntoView({ behavior: "smooth", block: "center" });

    // Disable add button when max reached
    const newCount = additionalApplicantsContainer.querySelectorAll('.additional-applicant-block').length;
    if (newCount >= MAX_ADDITIONAL_APPLICANTS) {
      addAdditionalApplicantBtn.disabled = true;
      addAdditionalApplicantBtn.style.opacity = '0.5';
      addAdditionalApplicantBtn.style.cursor = 'not-allowed';
    }
  });

  additionalApplicantsContainer.addEventListener("click", (event) => {
    const removeBtn = event.target.closest(".remove-additional-applicant");
    if (!removeBtn) return;
    const block = removeBtn.closest(".additional-applicant-block");
    if (block) {
      // Prevent removal if block contains any entered data
      if (!isApplicantBlockEmpty(block)) {
        alert("Cannot remove applicant: fields contain data. Clear fields to enable removal.");
        return;
      }

      block.remove();

      // Re-enable add button if below max
      const newCount = additionalApplicantsContainer.querySelectorAll('.additional-applicant-block').length;
      if (newCount < MAX_ADDITIONAL_APPLICANTS) {
        addAdditionalApplicantBtn.disabled = false;
        addAdditionalApplicantBtn.style.opacity = '1';
        addAdditionalApplicantBtn.style.cursor = 'pointer';
      }
    }
  });
}

initializeAdditionalApplicants();

// Copy Permanent = Current
const copyPermanentCheckbox = document.getElementById("copyPermanentFromCurrent");
const currentAddressFields = {
  proof: document.getElementById("currentAddressProof"),
  landmark: document.getElementById("currentLandmark"),
  pincode: document.getElementById("currentPincode"),
  district: document.getElementById("currentDistrict"),
  relation: document.getElementById("currentOhpRelation")
};
const permanentAddressFields = {
  proof: document.getElementById("permanentAddressProof"),
  landmark: document.getElementById("permanentLandmark"),
  pincode: document.getElementById("permanentPincode"),
  district: document.getElementById("permanentDistrict"),
  relation: document.getElementById("permanentOhpRelation")
};

let savedPermanentValues = null;

function copyFromCurrent() {
  permanentAddressFields.proof.value = currentAddressFields.proof.value;
  permanentAddressFields.landmark.value = currentAddressFields.landmark.value;
  permanentAddressFields.pincode.value = currentAddressFields.pincode.value;
  if (permanentAddressFields.district && currentAddressFields.district) {
    permanentAddressFields.district.value = currentAddressFields.district.value;
  }
  permanentAddressFields.relation.value = currentAddressFields.relation.value;
}

function clearPermanent() {
  permanentAddressFields.proof.value = "";
  permanentAddressFields.landmark.value = "";
  permanentAddressFields.pincode.value = "";
  if (permanentAddressFields.district) permanentAddressFields.district.value = "";
  permanentAddressFields.relation.value = "";
}

if (copyPermanentCheckbox) {
  copyPermanentCheckbox.addEventListener("change", (e) => {
    if (e.target.checked) {
      savedPermanentValues = {
        proof: permanentAddressFields.proof.value,
        landmark: permanentAddressFields.landmark.value,
        pincode: permanentAddressFields.pincode.value,
        district: permanentAddressFields.district?.value,
        relation: permanentAddressFields.relation.value
      };
      copyFromCurrent();
    } else {
      if (savedPermanentValues) {
        permanentAddressFields.proof.value = savedPermanentValues.proof;
        permanentAddressFields.landmark.value = savedPermanentValues.landmark;
        permanentAddressFields.pincode.value = savedPermanentValues.pincode;
        if (permanentAddressFields.district) permanentAddressFields.district.value = savedPermanentValues.district || "";
        permanentAddressFields.relation.value = savedPermanentValues.relation;
      } else {
        clearPermanent();
      }
      savedPermanentValues = null;
    }
  });
}

// Disbursed Logic
const loanStage = document.getElementById("loanStage");
const disbursedFields = document.getElementById("disbursedFields");
const disbursedTenure = document.getElementById("disbursedTenure");
const disbursedEmiDate = document.getElementById("disbursedEmiDate");

// Populate Disbursed Tenure (1-96)
if (disbursedTenure) {
  for (let i = 1; i <= 96; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = i;
    disbursedTenure.appendChild(opt);
  }
}

// Populate Disbursed EMI Date (1-31)
if (disbursedEmiDate) {
  for (let i = 1; i <= 31; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = i;
    disbursedEmiDate.appendChild(opt);
  }
}

// Toggle Disbursed Fields
const utrFields = document.getElementById("utrFields");
const addPaymentBtn = document.getElementById("addPaymentBtn");
const removePaymentBtn = document.getElementById("removePaymentBtn");
const paymentContainer = document.getElementById("paymentContainer");
let paymentCount = 0;
const MAX_PAYMENTS = 5;

function toggleDisbursedFields() {
  if (loanStage && disbursedFields) {
    const isDisbursed = loanStage.value === "Disbursed";
    disbursedFields.classList.toggle("hidden", !isDisbursed);
    
    // Toggle UTR fields
    if (utrFields) {
      utrFields.classList.toggle("hidden", !isDisbursed);
      
      // Auto-fill UTR Date if Disbursed and empty
      const utrDateInput = document.getElementById("utrDate1");
      if (isDisbursed && utrDateInput && !utrDateInput.value) {
         const today = new Date().toISOString().split('T')[0];
         utrDateInput.value = today;
      }
    }

    if (motorInsuranceFields) {
      motorInsuranceFields.classList.toggle("hidden", !isDisbursed);
    }

    // Toggle required for disbursed fields if necessary
    const requiredInputs = disbursedFields.querySelectorAll("input:not([readonly]), select");
    requiredInputs.forEach(input => {
      input.required = isDisbursed;
    });

    // Auto-fill Date if Disbursed and empty
    const disbursedDateInput = document.getElementById("disbursedDate");
    if (isDisbursed && disbursedDateInput && !disbursedDateInput.value) {
      const today = new Date().toISOString().split('T')[0];
      disbursedDateInput.value = today;
    }
  }
}

// Payment Add/Remove Logic
if (addPaymentBtn && removePaymentBtn && paymentContainer) {
  addPaymentBtn.addEventListener("click", () => {
    if (paymentCount >= MAX_PAYMENTS) return;
    
    paymentCount++;
    const newBlock = createPaymentBlock(paymentCount);
    paymentContainer.appendChild(newBlock);
    
    // Re-apply validation to dynamically created fields
    enforceUppercase();
    enforceAlphabetsOnly();
    enforceNumbersOnly();
    
    updatePaymentButtons();
  });
  
  removePaymentBtn.addEventListener("click", () => {
    if (paymentCount <= 0) return;
    
    const blockToRemove = document.getElementById(`paymentBlock${paymentCount}`);
    if (blockToRemove) {
      blockToRemove.remove();
      paymentCount--;
    }
    
    updatePaymentButtons();
  });
}

function createPaymentBlock(index) {
  const block = document.createElement("div");
  block.className = "payment-block";
  block.id = `paymentBlock${index}`;
  block.style.marginTop = index === 1 ? "0" : "20px";
  block.style.borderTop = index === 1 ? "none" : "1px solid #eee";
  block.style.paddingTop = index === 1 ? "0" : "15px";
  block.innerHTML = `
          <h4 style="margin-bottom: 10px; color: #555;">
      Payment ${index}
    </h4>

    <div class="grid">

      <div class="form-field">
        <label for="utrDate${index}">DATE</label>
        <input id="utrDate${index}" type="date" />
      </div>

      <div class="form-field">
        <label for="utrAmount${index}">AMOUNT</label>
        <input
          id="utrAmount${index}"
          type="number"
        />
      </div>

      <div class="form-field">
        <label for="utrNo${index}">UTR NO</label>
        <input
          id="utrNo${index}"
          data-uppercase
        />
      </div>

      <div class="form-field">
        <label for="utrAcHolderName${index}">AC HOLDER NAME</label>
        <input
          id="utrAcHolderName${index}"
          data-uppercase
          data-alphabets
        />
      </div>

      <div class="form-field">
        <label for="utrBankName${index}">BANK NAME</label>
        <input
          id="utrBankName${index}"
          data-uppercase
          data-alphabets
        />
      </div>

      <div class="form-field">
        <label for="utrAcNo${index}">AC NO</label>
        <input
          id="utrAcNo${index}"
          data-numbers
        />
      </div>

      <div class="form-field">
        <label for="utrIfsc${index}">IFSC</label>
        <input
          id="utrIfsc${index}"
          data-uppercase
        />
      </div>

      <div class="form-field">
        <label for="utrRemarks${index}">REMARKS</label>
        <input
          id="utrRemarks${index}"
        />
      </div>

    </div>

    `;

  const dateInput = block.querySelector(`#utrDate${index}`);
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().split("T")[0];
  }

  // Attach listeners to update remove button state when payment fields change
  const inputs = Array.from(block.querySelectorAll('input'));
  inputs.forEach(i => {
    i.addEventListener('input', updatePaymentButtons);
    i.addEventListener('change', updatePaymentButtons);
  });

  return block;
}

function updatePaymentButtons() {
  if (!removePaymentBtn || !addPaymentBtn) return;
  // Show remove button if at least 1 payment
  if (paymentCount <= 0) {
    removePaymentBtn.classList.add('hidden');
  } else {
    removePaymentBtn.classList.remove('hidden');
  }

  // Disable remove button if any payment block has entered data (prevent accidental deletion)
  const anyPaymentHasData = isAnyPaymentHasData();
  removePaymentBtn.disabled = anyPaymentHasData || paymentCount <= 0;
  removePaymentBtn.style.opacity = removePaymentBtn.disabled ? '0.5' : '1';
  removePaymentBtn.style.cursor = removePaymentBtn.disabled ? 'not-allowed' : 'pointer';

  // Disable/Hide add button if max reached (optional, or just disable)
  if (paymentCount >= MAX_PAYMENTS) {
    addPaymentBtn.disabled = true;
    addPaymentBtn.style.opacity = "0.5";
    addPaymentBtn.style.cursor = "not-allowed";
  } else {
    addPaymentBtn.disabled = false;
    addPaymentBtn.style.opacity = "1";
    addPaymentBtn.style.cursor = "pointer";
  }
}

function isAnyPaymentHasData() {
  const blocks = Array.from(document.querySelectorAll('.payment-block'));
  return blocks.some(block => {
    const inputs = Array.from(block.querySelectorAll('input'));
    return inputs.some(i => {
      // Ignore auto-filled date fields (utrDate...) — only consider other inputs as user-entered data
      if (i.type === 'date' || /utrDate/i.test(i.id)) return false;
      return String(i.value || '').trim() !== '';
    });
  });
}

if (loanStage) {
  loanStage.addEventListener("change", toggleDisbursedFields);
  toggleDisbursedFields(); // Run on load
}

// Motor Insurance Validity Calculation
function calculateInsuranceValidity() {
  const expiryDateInput = document.getElementById("motorInsuranceExpiry");
  const validityDaysInput = document.getElementById("motorInsuranceValidity");
  
  if (!expiryDateInput || !validityDaysInput) return;
  
  const expiryDate = new Date(expiryDateInput.value);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to start of day for accurate calculation
  expiryDate.setHours(0, 0, 0, 0); // Set to start of day for accurate calculation
  
  if (expiryDate && !isNaN(expiryDate.getTime())) {
    const timeDiff = expiryDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    
    if (daysDiff >= 0) {
      validityDaysInput.value = `${daysDiff} days remaining`;
      validityDaysInput.style.color = '#10b981'; // Green
    } else {
      validityDaysInput.value = `${Math.abs(daysDiff)} days expired`;
      validityDaysInput.style.color = '#ef4444'; // Red
    }
  } else {
    validityDaysInput.value = '';
    validityDaysInput.style.color = '#6b7280'; // Gray
  }
}

// Add event listener for insurance expiry date
document.addEventListener('DOMContentLoaded', function() {
  const motorInsuranceExpiryInput = document.getElementById("motorInsuranceExpiry");
  if (motorInsuranceExpiryInput) {
    motorInsuranceExpiryInput.addEventListener('change', calculateInsuranceValidity);
    motorInsuranceExpiryInput.addEventListener('input', calculateInsuranceValidity);
  }
});

// Auto Calculations
const calcFields = {
  sanction: document.getElementById("disbursedSanctionLoanAmount"),
  loanIns: document.getElementById("disbursedLoanInsuranceCharges"),
  motorIns: document.getElementById("disbursedMotorInsurance"),
  pf: document.getElementById("disbursedPfCharges"),
  doc: document.getElementById("disbursedDocumentationCharges"),
  other: document.getElementById("disbursedOtherCharges"),
  rto: document.getElementById("disbursedRtoCharges"),
  challan: document.getElementById("disbursedChallanFineCharges"),
  total: document.getElementById("disbursedTotalLoanAmount"),
  net: document.getElementById("disbursedNetLoanAmount")
};

function calculateDisbursedAmounts() {
  const getVal = (el) => Number(el?.value) || 0;

  const sanction = getVal(calcFields.sanction);
  const loanIns = getVal(calcFields.loanIns);
  const motorIns = getVal(calcFields.motorIns);
  
  // Total Loan Amount = Sanction + Loan Ins + Motor Ins
  if (calcFields.total) {
    calcFields.total.value = sanction + loanIns + motorIns;
  }

  const pf = getVal(calcFields.pf);
  const doc = getVal(calcFields.doc);
  const other = getVal(calcFields.other);
  const rto = getVal(calcFields.rto);
  const challan = getVal(calcFields.challan);

  // Net Loan Amount = Sanction - PF - Doc - Other - RTO - Challan
  if (calcFields.net) {
    calcFields.net.value = sanction - pf - doc - other - rto - challan;
  }
}

// Attach listeners
Object.values(calcFields).forEach(el => {
  if (el && !el.readOnly) {
    el.addEventListener("input", calculateDisbursedAmounts);
  }
});


// Submit
document.getElementById("leadForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  if (loanStage && loanStage.value === "Disbursed") {
    toggleDisbursedFields();
  }

  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) {
    alert("Session expired");
    window.location.href = "/index.html";
    return;
  }

  const leadData = {};
  leadData.userId = user.id;
  leadData.role = user.role;

  // Collect all fields
  document.querySelectorAll("input, select, textarea").forEach(el => {
    if (el.id) leadData[el.id] = el.value;
  });

  // 🚨 decide create or update
  const url = loanId
    ? `/api/leads/${loanId}`    // EDIT
    : `/api/leads`;            // CREATE

  const method = loanId ? "PUT" : "POST";

  console.log("Saving lead", { mode: method, loanId });

  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(leadData)
  });

  const result = await res.json();

  if (!res.ok) {
    alert(`Failed to save: ${result.error || "Unknown error"}`);
    return;
  }

  // if new lead, redirect into edit mode
  if (!loanId) {
    window.location.href = `/used-car-loan.html?loanId=${result.loan_id}`;
  } else {
  window.location.href = "/view-cases.html";
  }
});


// --- RTO Documents Multi-Select Logic ---
const rtoOptions = [
  "RC CARD",
  "INSURANCE",
  "FORM SET 29/30",
  "FORM 34",
  "EMMISION COPY",
  "CC",
  "FORCLOSURE LETTER",
  "LOAN CLOSURE PROOF",
  "B-EXTRACT",
  "NOC",
  "SELLER KYC",
  "PAYMENT (D/A) KYC"
];

const rtoDisplay = document.getElementById("rtoDocsDisplay");
const rtoDropdown = document.getElementById("rtoDocsDropdown");
const rtoHiddenInput = document.getElementById("disbursedRtoDocs");
let selectedRtoDocs = [];

function renderRtoDropdown() {
  if (!rtoDropdown) return;
  rtoDropdown.innerHTML = "";
  rtoOptions.forEach(opt => {
    const div = document.createElement("div");
    div.className = "multi-select-option";
    if (selectedRtoDocs.includes(opt)) {
      div.classList.add("selected");
    }
    div.textContent = opt;
    div.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleRtoOption(opt);
    });
    rtoDropdown.appendChild(div);
  });
}

function updateRtoDisplay() {
  if (!rtoDisplay) return;
  rtoDisplay.innerHTML = "";
  
  if (selectedRtoDocs.length === 0) {
    rtoDisplay.innerHTML = '<span class="multi-select-placeholder">Select RTO Documents...</span>';
  } else {
    selectedRtoDocs.forEach(opt => {
      const tag = document.createElement("span");
      tag.className = "multi-select-tag";
      tag.textContent = opt;
      const removeBtn = document.createElement("span");
      removeBtn.textContent = "×";
      removeBtn.style.cursor = "pointer";
      removeBtn.style.marginLeft = "4px";
      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleRtoOption(opt);
      });
      tag.appendChild(removeBtn);
      rtoDisplay.appendChild(tag);
    });
  }
  
  if (rtoHiddenInput) {
    rtoHiddenInput.value = selectedRtoDocs.join(", ");
  }
}

function toggleRtoOption(opt) {
  if (selectedRtoDocs.includes(opt)) {
    selectedRtoDocs = selectedRtoDocs.filter(item => item !== opt);
  } else {
    selectedRtoDocs.push(opt);
  }
  renderRtoDropdown();
  updateRtoDisplay();
}

// Initialize
if (rtoDisplay && rtoDropdown) {
  renderRtoDropdown();
  
  rtoDisplay.addEventListener("click", (e) => {
    e.stopPropagation();
    rtoDropdown.classList.toggle("active");
  });

  document.addEventListener("click", (e) => {
    if (!rtoDisplay.contains(e.target) && !rtoDropdown.contains(e.target)) {
      rtoDropdown.classList.remove("active");
    }
  });
}

// function disableFormForView() {
//   // disable inputs, textareas and selects
//   document.querySelectorAll('input,textarea,select').forEach(el => {
//     // keep hidden inputs enabled (they may be needed)
//     if (el.type === 'hidden') return;
//     try { el.disabled = true; } catch (e) {}
//     try { el.readOnly = true; } catch (e) {}
//   });

//   // disable other buttons (like add/remove) but keep navigation/back buttons enabled if needed
//   document.querySelectorAll('button').forEach(b => {
//     if (b.type === 'submit') return;
//     // allow any button with data-allow-view attribute to remain enabled
//     if (b.hasAttribute('data-allow-view')) return;
//     b.disabled = true;
//   });
// }






















// =========================
// VIEW / EDIT MODE DETECTION
// =========================

if (loanId) {
  fetch(`/api/leads/${loanId}`)
    .then(res => res.json())
    .then(lead => {
  if (!lead || !lead.data) {
    console.error("Invalid lead response", lead);
    return;
  }
  const data = lead.data;

      // ####
      // =========================
      // ✅ Restore UTR Payments (EDIT)
      // =========================
      if (data && Array.isArray(data.payments)) {
        data.payments.forEach((payment, index) => {
          const block = createPaymentBlock(index + 1);
          paymentContainer.appendChild(block);

          Object.keys(payment).forEach(key => {
            const el = document.getElementById(key);
            if (el) el.value = payment[key];
          });

          paymentCount = index + 1;
        });

        // Re-apply validation to payment blocks
        enforceUppercase();
        enforceAlphabetsOnly();
        enforceNumbersOnly();
        
        updatePaymentButtons();
      }

      // =========================
      // 1️⃣ Restore normal fields
      // =========================
      Object.keys(data).forEach(key => {
        const el = document.getElementById(key);
        if (el) el.value = data[key];
      });






















      // =========================
      // 2️⃣ Restore CIBIL UI
      // =========================
      updateCibilDisplay(data.cibilScore);
      setCibilIndicator(data.cibilIndicator);
      // =========================
      // 3️⃣ FORCE Disbursed fields to show on edit
      // =========================
      if (loanStage && loanStage.value === "Disbursed") {
        toggleDisbursedFields();
      }

      // =========================
      // 4️⃣ Restore RTO Documents
      // =========================
      if (data.disbursedRtoDocs) {
        selectedRtoDocs = data.disbursedRtoDocs
          .split(",")
          .map(v => v.trim())
          .filter(Boolean);

        renderRtoDropdown();
        updateRtoDisplay();
      }

      // =========================
      // 3️⃣ Restore Additional Applicants
      // =========================








          // =========================
          // 🧩 Rebuild Additional Applicants from flat fields
          // =========================
          if (!data.additionalApplicants) {
            const applicants = [];

            [2, 3].forEach(i => {
              const prefix = `additionalApplicant${i}`;

              // detect if applicant exists by checking name
              if (data[`${prefix}Name`]) {
                const obj = {};

                Object.keys(data).forEach(key => {
                  if (key.startsWith(prefix)) {
                    const cleanKey = key.replace(prefix, "");
                    obj[cleanKey] = data[key];
                  }
                });

                applicants.push(obj);
              }
            });

            if (applicants.length) {
              data.additionalApplicants = applicants;
            }
          }









      if (Array.isArray(data.additionalApplicants)) {
        data.additionalApplicants.forEach((applicant, idx) => {
          if (idx >= MAX_ADDITIONAL_APPLICANTS) return;

          const visibleIndex = idx + 2;
          const block = createAdditionalApplicantBlock(visibleIndex);
          additionalApplicantsContainer.appendChild(block);
          initAdditionalApplicantPin(visibleIndex);
          initAdditionalApplicantSpouseField(visibleIndex);
          initAdditionalApplicantAddressCopy(visibleIndex);









              Object.keys(applicant).forEach(key => {
                const fieldId = `additionalApplicant${visibleIndex}${key}`;
                const el = document.getElementById(fieldId);
                if (el) el.value = applicant[key];
              });














              
          // After populating values, update remove button state
          if (typeof setupRemoveButtonBehavior === 'function') setupRemoveButtonBehavior(block);
          
          // Re-apply validation to additional applicant fields
          enforceUppercase();
          enforceAlphabetsOnly();
          enforceNumbersOnly();
        });

        if (data.additionalApplicants.length >= MAX_ADDITIONAL_APPLICANTS) {
          addAdditionalApplicantBtn.disabled = true;
          addAdditionalApplicantBtn.style.opacity = "0.5";
        }
      }

      // Re-apply validation after all data is restored
      enforceUppercase();
      enforceAlphabetsOnly();
      enforceNumbersOnly();
      
      // Disable form for view mode
      // disableFormForView();
    })
    .catch(err => {
      console.error("Failed to load lead", err);
    });
}


// ####






// ===== PIN ↔ DISTRICT REUSABLE MODULE =====

const PIN_API = "https://api.postalpincode.in";

// simple loader
function setLoading(input, loading) {
  input.style.background = loading ? "#f3f5f8" : "";
}

// debounce helper
function debounce(fn, delay = 500) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function show(el) { el && el.classList.remove("hidden"); }
function hide(el) { el && el.classList.add("hidden"); }

// PIN → District
async function handlePinToDistrict(pinInput, districtInput, dropdown) {
  const pin = pinInput.value.trim();
  if (!/^\d{6}$/.test(pin)) return;

  setLoading(pinInput, true);

  try {
    const res = await fetch(`${PIN_API}/pincode/${pin}`);
    const data = await res.json();

    if (data[0].Status === "Success") {
      districtInput.value = data[0].PostOffice[0].District;
      hide(dropdown);
    } else {
      districtInput.value = "";
      alert("Invalid PIN code");
    }
  } catch (e) {
    console.error("PIN lookup failed", e);
  } finally {
    setLoading(pinInput, false);
  }
}

// District → PIN dropdown
async function handleDistrictToPin(districtInput, pinInput, dropdown) {
  const district = districtInput.value.trim();
  if (!district) return;

  setLoading(districtInput, true);

  try {
    const res = await fetch(`${PIN_API}/postoffice/${district}`);
    const data = await res.json();

    if (data[0].Status !== "Success") {
      hide(dropdown);
      alert("Invalid District");
      return;
    }

    dropdown.innerHTML = `<option value="">Select PIN</option>`;
    data[0].PostOffice.forEach(po => {
      const opt = document.createElement("option");
      opt.value = po.Pincode;
      opt.textContent = `${po.Pincode} – ${po.Name}`;
      dropdown.appendChild(opt);
    });

    show(dropdown);
  } catch (e) {
    console.error("District lookup failed", e);
  } finally {
    setLoading(districtInput, false);
  }
}

// Attach logic to any address block
function initPinDistrict({ pinId, districtId, dropdownId }) {
  const pin = document.getElementById(pinId);
  const district = document.getElementById(districtId);
  const dropdown = document.getElementById(dropdownId);

  if (!pin || !district || !dropdown) return;

  pin.addEventListener(
    "blur",
    debounce(() => handlePinToDistrict(pin, district, dropdown))
  );

  district.addEventListener(
    "blur",
    debounce(() => handleDistrictToPin(district, pin, dropdown))
  );

  dropdown.addEventListener("change", () => {
    if (dropdown.value) {
      pin.value = dropdown.value;
      hide(dropdown);
    }
  });
}

initPinDistrict({
  pinId: "currentPincode",
  districtId: "currentDistrict",
  dropdownId: "currentPinDropdown"
});

initPinDistrict({
  pinId: "permanentPincode",
  districtId: "permanentDistrict",
  dropdownId: "permanentPinDropdown"
});

function initAdditionalApplicantPin(index) {
  initPinDistrict({
    pinId: `additionalApplicant${index}CurrentPincode`,
    districtId: `additionalApplicant${index}CurrentDistrict`,
    dropdownId: `additionalApplicant${index}CurrentPinDropdown`
  });

  initPinDistrict({
    pinId: `additionalApplicant${index}PermanentPincode`,
    districtId: `additionalApplicant${index}PermanentDistrict`,
    dropdownId: `additionalApplicant${index}PermanentPinDropdown`
  });
}

function initAdditionalApplicantSpouseField(index) {
  const maritalStatusSelect = document.getElementById(`additionalApplicant${index}MaritalStatus`);
  const spouseField = document.getElementById(`additionalApplicant${index}SpouseField`);
  const spouseInput = document.getElementById(`additionalApplicant${index}SpouseName`);
  
  if (!maritalStatusSelect || !spouseField || !spouseInput) return;
  
  function toggleSpouseField() {
    const needsSpouse = maritalStatusSelect.value === "Married" || maritalStatusSelect.value === "Divorced";
    spouseField.style.display = needsSpouse ? "block" : "none";
    spouseInput.required = needsSpouse;
    if (!needsSpouse) {
      spouseInput.value = "";
    }
  }
  
  maritalStatusSelect.addEventListener("change", toggleSpouseField);
  toggleSpouseField(); // Initialize on load
}

function initAdditionalApplicantAddressCopy(index) {
  const copyCheckbox = document.getElementById(`additionalApplicant${index}CopyPermanentFromCurrent`);
  if (!copyCheckbox) return;
  
  // Field mappings for copying
  const fieldMappings = [
    ['CurrentProof', 'PermanentProof'],
    ['CurrentLandmark', 'PermanentLandmark'],
    ['CurrentPincode', 'PermanentPincode'],
    ['CurrentDistrict', 'PermanentDistrict'],
    ['CurrentRelation', 'PermanentRelation']
  ];
  
  function copyPermanentFromCurrent() {
    const isChecked = copyCheckbox.checked;
    
    fieldMappings.forEach(([source, target]) => {
      const sourceField = document.getElementById(`additionalApplicant${index}${source}`);
      const targetField = document.getElementById(`additionalApplicant${index}${target}`);
      
      if (sourceField && targetField) {
        if (isChecked) {
          targetField.value = sourceField.value;
          targetField.readOnly = true;
          targetField.style.backgroundColor = '#f8fafc';
          targetField.style.color = '#6b7280';
        } else {
          targetField.readOnly = false;
          targetField.style.backgroundColor = '';
          targetField.style.color = '';
        }
      }
    });
  }
  
  copyCheckbox.addEventListener('change', copyPermanentFromCurrent);
  copyPermanentFromCurrent(); // Initialize on load
}
