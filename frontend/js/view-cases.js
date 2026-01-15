
const user = JSON.parse(localStorage.getItem("user"));

// Check if admin is viewing another user's leads via query params
const urlParams = new URLSearchParams(window.location.search);
const targetUserId = urlParams.get('userId');
const targetUsername = urlParams.get('username');
const targetRole = urlParams.get('role');

let fetchUrl;

if (user.role === "admin" && targetUserId) {
  // Admin ALWAYS stays admin
  fetchUrl = `/api/leads?userId=${user.id}&role=admin&viewUser=${targetUserId}`;
} else {
  fetchUrl = `/api/leads?userId=${user.id}&role=${user.role}`;
}

fetch(fetchUrl)

  .then(res => res.json())
  .then(leads => {
    allLeads = leads;
    filteredLeads = leads.slice();
    populateStageFilter();
    renderTable();
    
    // Update heading if admin is viewing employee leads
    if (user.role === "admin" && targetUserId && targetRole === "employee") {
      const heading = document.getElementById("pageHeading");
      if (heading) {
        heading.textContent = `Leads created by: ${targetUsername}`;
      }
    }
  })
  .catch(err => console.error(err));


// const user = JSON.parse(localStorage.getItem("user"));

// const url =
//   user.role === "admin"
//     ? "/api/leads"
//     : `/api/leads?userId=${user.id}&role=${user.role}`;

// const res = await fetch(url);

// if (user.role !== "admin") {
//   alert("Access denied");
//   window.location.href = "/dashboard.html";
// }

console.log("View Cases JS loaded");

let allLeads = [];
let filteredLeads = [];
let currentPage = 1;
const paginationEl = document.getElementById("pagination");
const tbody = document.querySelector("#leadsTable tbody");
const searchInput = document.getElementById("searchInput");
const filterStage = document.getElementById("filterStage");
const rowsPerPageSelect = document.getElementById("rowsPerPage");
const refreshBtn = document.getElementById("refreshBtn");
const emptyState = document.getElementById("emptyState");

async function fetchLeads() {
  try {
    let fetchUrl;
    
    // Check if admin is viewing another user's leads via query params
    const urlParams = new URLSearchParams(window.location.search);
    const targetUserId = urlParams.get('userId');
    const targetUsername = urlParams.get('username');
    const targetRole = urlParams.get('role');

    if (user.role === "admin" && targetUserId) {
      fetchUrl = `/api/leads?userId=${user.id}&role=admin&viewUser=${targetUserId}`;
    } else {
      fetchUrl = `/api/leads?userId=${user.id}&role=${user.role}`;
    }


    const res = await fetch(fetchUrl);

    const leads = await res.json();
    allLeads = Array.isArray(leads) ? leads : [];
    // default filtered set
    filteredLeads = allLeads.slice();
    populateStageFilter();
    renderTable();
    
    // Update heading if admin is viewing employee leads
    if (user.role === "admin" && targetUserId && targetRole === "employee") {
      const heading = document.getElementById("pageHeading");
      if (heading) {
        heading.textContent = `Leads created by: ${targetUsername}`;
      }
    }
  } catch (err) {
    console.error("Error loading leads:", err);
  }
}

function populateStageFilter() {
  if (!filterStage) return;
  const stages = new Set(allLeads.map(l => l.data?.loanStage).filter(Boolean));
  // clear except first option
  filterStage.querySelectorAll('option:not(:first-child)').forEach(n => n.remove());
  Array.from(stages).sort().forEach(s => {
    const opt = document.createElement('option');
    opt.value = s; opt.textContent = s;
    filterStage.appendChild(opt);
  });
}

function formatDate(ts) {
  if (!ts) return "-";
  const d = new Date(ts);
  if (isNaN(d)) return String(ts);
  return d.toLocaleString();
}

function highlightText(text, searchTerm) {
  if (!searchTerm) return text;
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

function renderTable() {
  if (!tbody) return;
  const rowsPerPage = Number(rowsPerPageSelect.value) || 10;
  const start = (currentPage - 1) * rowsPerPage;
  const paged = filteredLeads.slice(start, start + rowsPerPage);
  const searchTerm = (searchInput.value || '').trim();

  tbody.innerHTML = "";
  if (paged.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  paged.forEach(lead => {
    const tr = document.createElement('tr');
    
    // Apply highlighting to key fields
    const loanId = highlightText(lead.loan_id || '-', searchTerm);
    const name = highlightText(lead.data?.name || '-', searchTerm);
    const mobile = highlightText(lead.data?.mobile || '-', searchTerm);
    const loanAmount = highlightText(lead.data?.loanAmount || '-', searchTerm);
    const bankFinance = highlightText(lead.data?.bankFinance || lead.data?.loanDsa || '-', searchTerm);
    const loanStage = highlightText(lead.data?.loanStage || '-', searchTerm);
    
    tr.innerHTML = `
      <td>${loanId}</td>
      <td>${name}</td>
      <td>${mobile}</td>
      <td>${loanAmount}</td>
      <td>${bankFinance}</td>
      <td>${loanStage}</td>
      <td>${formatDate(lead.updatedAt || lead.createdAt)}</td>
      <td class="actions">
        <a href="/used-car-loan.html?loanId=${loanId}&view=1" class="viewBtn">View</a>
        <a href="/used-car-loan.html?loanId=${lead.loan_id}">Edit</a>
        <button data-id="${lead.loan_id}" class="deleteBtn">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  renderPagination(rowsPerPage);
  attachRowHandlers();

  // clicking a table row (outside actions) should open edit form
  tbody.querySelectorAll('tr').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.actions')) return; // ignore clicks inside actions cell
      const id = row.querySelector('td')?.textContent?.trim();
      if (id) window.location.href = `/used-car-loan.html?loanId=${id}`;
    });
  });
}

function attachRowHandlers() {
  // view button removed; row-click opens the edit form now
  tbody.querySelectorAll('.deleteBtn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = btn.dataset.id;
      if (!confirm('Delete lead ' + id + '?')) return;
      try {
        const res = await fetch(`/api/leads/${id}`, { method: 'DELETE' });
        if (res.ok) {
          await fetchLeads();
        } else {
          alert('Delete failed');
        }
      } catch (err) { console.error(err); alert('Delete error'); }
    });
  });

  // 'View' now navigates to the edit page (same as Edit link)
}

function renderPagination(rowsPerPage) {
  if (!paginationEl) return;
  const total = filteredLeads.length;
  const pages = Math.max(1, Math.ceil(total / rowsPerPage));
  paginationEl.innerHTML = '';

  const prev = document.createElement('button'); prev.textContent = 'Prev';
  prev.disabled = currentPage <= 1;
  prev.addEventListener('click', () => { currentPage = Math.max(1, currentPage-1); renderTable(); });
  paginationEl.appendChild(prev);

  const info = document.createElement('div'); info.textContent = `Page ${currentPage} of ${pages} — ${total} leads`;
  paginationEl.appendChild(info);

  const next = document.createElement('button'); next.textContent = 'Next';
  next.disabled = currentPage >= pages;
  next.addEventListener('click', () => { currentPage = Math.min(pages, currentPage+1); renderTable(); });
  paginationEl.appendChild(next);
}

function applyFilters() {
  const q = (searchInput.value || '').trim().toLowerCase();
  const stage = filterStage.value;
  
  filteredLeads = allLeads.filter(l => {
    // Create searchable text from multiple fields
    const searchableText = [
      l.loan_id || '',
      l.data?.name || '',
      l.data?.mobile || '',
      l.data?.email || '',
      l.data?.pan || '',
      l.data?.loanAmount || '',
      l.data?.bankFinance || '',
      l.data?.loanDsa || '',
      l.data?.loanStage || '',
      l.data?.caseDealer || '',
      l.data?.vehicle || '',
      l.data?.rcNo || '',
      l.data?.basicRefNameMobile || ''
    ].join(' ').toLowerCase();
    
    // Stage filter
    if (stage && l.data?.loanStage !== stage) return false;
    
    // Search filter - comprehensive partial matching
    if (q) {
      // Split search query into multiple terms for better matching
      const searchTerms = q.split(' ').filter(term => term.length > 0);
      
      // Check if ALL search terms are found in any field
      const allTermsMatch = searchTerms.every(term => {
        return searchableText.includes(term);
      });
      
      if (!allTermsMatch) return false;
    }
    
    return true;
  });
  
  // Sort results: exact matches first, then partial matches
  if (q) {
    filteredLeads.sort((a, b) => {
      const aText = [
        a.loan_id || '',
        a.data?.name || '',
        a.data?.mobile || ''
      ].join(' ').toLowerCase();
      
      const bText = [
        b.loan_id || '',
        b.data?.name || '',
        b.data?.mobile || ''
      ].join(' ').toLowerCase();
      
      // Exact match priority
      const aExact = aText.includes(q);
      const bExact = bText.includes(q);
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // Loan ID exact match gets highest priority
      const aLoanExact = a.loan_id?.toLowerCase() === q;
      const bLoanExact = b.loan_id?.toLowerCase() === q;
      
      if (aLoanExact && !bLoanExact) return -1;
      if (!aLoanExact && bLoanExact) return 1;
      
      // Name exact match
      const aNameExact = a.data?.name?.toLowerCase() === q;
      const bNameExact = b.data?.name?.toLowerCase() === q;
      
      if (aNameExact && !bNameExact) return -1;
      if (!aNameExact && bNameExact) return 1;
      
      // Mobile exact match
      const aMobileExact = a.data?.mobile === q;
      const bMobileExact = b.data?.mobile === q;
      
      if (aMobileExact && !bMobileExact) return -1;
      if (!aMobileExact && bMobileExact) return 1;
      
      // Alphabetical sort as fallback
      return aText.localeCompare(bText);
    });
  }
  
  currentPage = 1;
  renderTable();
}

// const user = JSON.parse(localStorage.getItem("user"));

// fetch(`/api/leads?userId=${user.id}&role=${user.role}`)
//   .then(res => res.json())
//   .then(data => renderCases(data));

// Modal logic
const modalBackdrop = document.getElementById('leadModalBackdrop');
const modalContent = document.getElementById('modalContent');
const closeModalBtn = document.getElementById('closeModal');
function openModal(lead) {
  if (!lead) return;
  modalContent.textContent = JSON.stringify(lead, null, 2);
  modalBackdrop.style.display = 'flex';
}

// Events
if (searchInput) searchInput.addEventListener('input', () => { applyFilters(); });
if (filterStage) filterStage.addEventListener('change', () => { applyFilters(); });
if (rowsPerPageSelect) rowsPerPageSelect.addEventListener('change', () => { currentPage = 1; renderTable(); });
if (refreshBtn) refreshBtn.addEventListener('click', () => fetchLeads());

// initial load
fetchLeads();
