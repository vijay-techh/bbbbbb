console.log('admin-users.js v2 loaded');
const user = JSON.parse(localStorage.getItem("user"));

if (!user || user.role !== "admin") {
  alert("Admin access only");
  window.location.href = "/dashboard.html";
}

let allUsers = [];
let editingUserId = null; // Track if we're editing a user

/* ---------------- TOAST ---------------- */
function showToast(msg, timeout = 3000) {
  const t = document.getElementById("toast");
  if (!t) return alert(msg);
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), timeout);
}

/* ---------------- RENDER USERS ---------------- */
function renderUsers(filter = "") {
  const tbodyAdmins = document.getElementById("adminsTableBody");
  const tbodyManagers = document.getElementById("managersTableBody");
  const tbodyEmployees = document.getElementById("employeesTableBody");
  const tbodyDealers = document.getElementById("dealersTableBody");

  tbodyAdmins.innerHTML = "";
  tbodyManagers.innerHTML = "";
  tbodyEmployees.innerHTML = "";
  tbodyDealers.innerHTML = "";

  const term = filter.trim().toLowerCase();

  const filtered = allUsers.filter(u => {
    if (!term) return true;
    return (
      (u.username || "").toLowerCase().includes(term) ||
      (u.role || "").toLowerCase().includes(term)
    );
  });

  filtered.forEach(u => {
    const tr = document.createElement("tr");

    const status = u.status || "active";
    const statusClass = status === "active" ? "status-active" : "status-disabled";

tr.innerHTML = `
  <td>${u.username}</td>
  <td>
    ${u.password ? `<span class="pw-text">••••••••</span><button type="button" class="pw-toggle" style="margin-left:8px">👁️</button>` : '••••••••'}
  </td>
  <td>${formatRole(u.role)}</td>
  <td>
    <span class="status-pill ${statusClass}">
      ${status}
    </span>
  </td>
  <td class="info-cell"></td>
  <td>${u.last_login ? new Date(u.last_login).toLocaleString() : "-"}</td>
`;
// Add Info button for managers
const infoCell = tr.querySelector(".info-cell");

if (u.role === "manager" || u.role === "employee") {
  const infoBtn = document.createElement("button");
  infoBtn.className = "info-btn";
  infoBtn.textContent = "ⓘ";
  infoBtn.title = "View info";

  if (u.role === "manager") {
    infoBtn.addEventListener("click", () => openManagerInfo(u.id));
  }

  if (u.role === "employee") {
    infoBtn.addEventListener("click", () => openEmployeeInfo(u.id));
  }

  infoCell.appendChild(infoBtn);
} else {
  infoCell.textContent = "—";
}


document.getElementById("closeInfoBtn")?.addEventListener("click", closeManagerInfo);

    // attach password toggle handler when a toggle button exists
    const pwToggle = tr.querySelector('.pw-toggle');
    if (pwToggle) {
      const pwText = tr.querySelector('.pw-text');
      let revealed = false;
      pwToggle.addEventListener('click', () => {
        revealed = !revealed;
        pwText.textContent = revealed ? (u.password || '') : '••••••••';
        pwToggle.innerHTML = revealed ? '🙈' : '👁️';
        pwToggle.title = revealed ? 'Hide password' : 'Show password';
        pwToggle.setAttribute('aria-label', revealed ? 'Hide password' : 'Show password');
      });
    }

    const actionsTd = document.createElement("td");

    const statusBtn = document.createElement("button");
    statusBtn.className = "action-btn";
    statusBtn.textContent = status === "active" ? "Disable" : "Enable";
    statusBtn.addEventListener("click", () => toggleStatus(u.id, status === "active" ? "inactive" : "active"));
    if (u.role === "admin" || u.id === user.id) {
      statusBtn.disabled = true;
      statusBtn.title = "This user cannot be disabled";
    }

    const editBtn = document.createElement("button");
    editBtn.className = "action-btn";
    editBtn.textContent = "Edit";
    editBtn.style.marginLeft = "6px";
    editBtn.addEventListener("click", () => openEdit(u.id));

    const viewBtn = document.createElement("button");
    viewBtn.className = "action-btn";
    viewBtn.textContent = "View";
    viewBtn.style.marginLeft = "6px";

    if (user.role === "admin" && (u.role === "employee" || u.role === "manager")) {
      viewBtn.addEventListener("click", () => viewEmployeeLeads(u.id, u.username, u.role || "employee"));
    } else if (user.role === "manager" && u.id === user.id) {
      viewBtn.addEventListener("click", () => viewEmployeeLeads(u.id, u.username, "manager"));
    } else {
      viewBtn.disabled = true;
      if (u.role === "admin") viewBtn.title = "Cannot view admin leads";
      else if (user.role === "manager" && u.id !== user.id) viewBtn.title = "Manager can only view their own leads";
      else viewBtn.title = "Only admin can view other users' leads";
    }

    const delBtn = document.createElement("button");
    delBtn.className = "action-btn danger";
    delBtn.textContent = "Delete";
    delBtn.style.marginLeft = "6px";
    if (u.role === "admin") {
      delBtn.disabled = true;
      delBtn.title = "Admin users cannot be deleted";
    } else {
      delBtn.addEventListener("click", () => deleteUser(u.id, u.username, u.role));
    }

    actionsTd.appendChild(statusBtn);
    actionsTd.appendChild(editBtn);
    if (!viewBtn.disabled) actionsTd.appendChild(viewBtn);
    actionsTd.appendChild(delBtn);
    tr.appendChild(actionsTd);

    const role = (u.role || "employee").toLowerCase();
    if (role === "admin") tbodyAdmins.appendChild(tr);
    else if (role === "manager") tbodyManagers.appendChild(tr);
    else if (role === "dealer") tbodyDealers.appendChild(tr);
    else tbodyEmployees.appendChild(tr);
  });
}

/* ---------------- VIEW EMPLOYEE/MANAGER LEADS ---------------- */
function viewEmployeeLeads(userId, username, role) {
  // Redirect to view-cases.html with query parameters to filter by user
  window.location.href = `/view-cases.html?userId=${userId}&username=${encodeURIComponent(username)}&role=${role}`;
}

/* ---------------- LOAD USERS ---------------- */
async function loadUsers() {
  try {
    const admin = JSON.parse(localStorage.getItem("user")) || {};
    const res = await fetch("/api/admin/users", {
      headers: { "x-admin-id": admin.id }
    });
    if (!res.ok) throw new Error("Failed to fetch users");

    const users = await res.json();
    allUsers = Array.isArray(users) ? users : [];

    const search = document.getElementById("userSearch");
    renderUsers(search ? search.value : "");
  } catch (err) {
    console.error(err);
    showToast("Failed to load users");
  }
}

/* ---------------- MODAL ---------------- */
function openModal(title) {
  document.getElementById("modalTitle").textContent = title;

  const backdrop = document.getElementById("modalBackdrop");
  if (!backdrop) {
    console.error("modalBackdrop not found in DOM");
    return;
  }

  backdrop.classList.add("show");
}
function closeModal() {
  const backdrop = document.getElementById("modalBackdrop");
  if (backdrop) backdrop.classList.remove("show");

  document.getElementById("modalUsername").value = "";
  document.getElementById("modalPassword").value = "";
  document.getElementById("modalRole").value = "employee";
  editingUserId = null; // Reset editing state
}
function openCreate() {
  openModal("Create User");

  const role = document.getElementById("modalRole").value;
  toggleRoleSections(role);
}


function openEdit(id) {
  const u = allUsers.find(x => x.id === id);
  if (!u) return showToast("User not found");

  editingUserId = id; // Set editing state
  document.getElementById("modalUsername").value = u.username;
  document.getElementById("modalPassword").value = ""; // Clear password for security
  document.getElementById("modalRole").value = u.role || "employee";
  openModal("Edit User");
}

/* ---------------- CREATE / EDIT USER ---------------- */
async function submitModal() {
  const username = document.getElementById("modalUsername").value.trim();
  const password = document.getElementById("modalPassword").value;
  const role = document.getElementById("modalRole").value;

  if (!username) return showToast("Username required");
  if (role === "admin") return showToast("Cannot create admin users");

  let profile = null;

  if (role === "manager") {
    profile = {
  firstName: document.getElementById("mgrFirstName").value.trim(),
  dob: document.getElementById("mgrDob").value,
  joiningDate: document.getElementById("mgrJoiningDate").value,  // 👈 THIS LINE
  pan: document.getElementById("mgrPan").value.trim(),
  aadhar: document.getElementById("mgrAadhar").value.trim(),
  mobile: document.getElementById("mgrMobile").value.trim(),
  email: document.getElementById("mgrEmail").value.trim(),
  location: document.getElementById("mgrLocation").value.trim(),
  bank: {
    accountNo: document.getElementById("mgrAccountNo").value.trim(),
    ifsc: document.getElementById("mgrIfsc").value.trim(),
    bankName: document.getElementById("mgrBank").value.trim()
  }
};



    // basic validation
    if (
      !profile.firstName ||
      !profile.mobile ||
      !profile.email ||
      !profile.bank.accountNo ||
      !profile.bank.ifsc ||
      !profile.bank.bankName
    ) {
      return showToast("All manager & bank details are required");
    }

  }


  let employeeProfile = null;

  if (role === "employee") {
      profile = null; // 🔥 FORCE CLEAR

    employeeProfile = {
      employeeId: document.getElementById("employee_id").value.trim(),
      firstName: document.getElementById("first_name").value.trim(),
      lastName: document.getElementById("last_name").value.trim(),

      panNo: document.getElementById("pan_no").value.trim(),
      aadharNo: document.getElementById("aadhar_no").value.trim(),

      dob: document.getElementById("dob").value || null,
      joiningDate: document.getElementById("joining_date").value || null,

      mobileNo: document.getElementById("mobile_no").value.trim(),
      fatherMobileNo: document.getElementById("father_mobile_no").value.trim(),
      motherMobileNo: document.getElementById("mother_mobile_no").value.trim(),

      personalEmail: document.getElementById("personal_email").value.trim(),
      officeEmail: document.getElementById("office_email").value.trim(),

      location: document.getElementById("location").value.trim(),

      bank: {
        accountNo: document.getElementById("account_no").value.trim(),
        ifsc: document.getElementById("ifsc").value.trim(),
        bankName: document.getElementById("bank_name").value.trim(),
        bankBranch: document.getElementById("bank_branch").value.trim()
      }
    };

    // basic validation
    if (
      !employeeProfile.employeeId ||
      !employeeProfile.firstName ||
      !employeeProfile.mobileNo ||
      !employeeProfile.bank.accountNo ||
      !employeeProfile.bank.ifsc
    ) {
      return showToast("Employee & bank details are required");
    }
  }

  try {
    let res, data;
    
    if (editingUserId) {
      // EDIT existing user
      console.log("EDITING USER:", { id: editingUserId, username, password, role });
      
      res = await fetch(`/api/admin/users/${editingUserId}`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-id": user.id 
        },
        body: JSON.stringify({ username, password })
      });

      data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      showToast("User updated successfully");
    } else {
      // CREATE new user
      if (!password) return showToast("Password required for new users");
      
      console.log("CREATING USER:", { username, password, role, profile,  employeeProfile });

          res = await fetch("/api/admin/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-id": user.id
          },
          body: JSON.stringify({
            username,
            password,
            role,
            profile,   // 👈 THIS was missing
            employeeProfile   // employee profile

          })
        });


      data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      showToast("User created successfully");
    }

    closeModal();
    loadUsers(); // Refresh the user list

  } catch (err) {
    console.error(err);
    showToast(err.message || "Failed to save user");
  }
}











const roleSelect = document.getElementById("modalRole");
if (roleSelect) {
  roleSelect.addEventListener("change", e => {
    const isManager = e.target.value === "manager";
    const mf = document.getElementById("managerFields");
    if (mf) mf.style.display = isManager ? "block" : "none";
  });
}

/* ---------------- DELETE USER ---------------- */
async function deleteUser(id, username, role) {
  if (role === "admin") return;

  const typed = prompt(
    `Type the username "${username}" to confirm deletion`
  );

  if (typed !== username) return;

  try {
    const admin = JSON.parse(localStorage.getItem("user"));

    const res = await fetch(`/api/admin/users/${id}`, {
      method: "DELETE",
      headers: { "x-admin-id": admin.id }
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    loadUsers();
    showToast("User deleted");
  } catch (err) {
    showToast(err.message);
  }
}

/* ---------------- TOGGLE STATUS ---------------- */
async function toggleStatus(id, status) {
  try {
    const admin = JSON.parse(localStorage.getItem("user"));

    const res = await fetch(`/api/admin/users/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-id": admin.id
      },
      body: JSON.stringify({ status })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    loadUsers();
  } catch (err) {
    showToast(err.message);
  }
}

/* ---------------- ROLE FORMAT ---------------- */
function formatRole(role) {
  if (role === "admin") return "Admin";
  if (role === "manager") return "Manager";
  return "Employee";
}

/* ---------------- EVENTS ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("openCreateBtn")?.addEventListener("click", openCreate);
  document.getElementById("modalCancel")?.addEventListener("click", closeModal);
  document.getElementById("modalSubmit")?.addEventListener("click", submitModal);
  document
    .getElementById("userSearch")
    ?.addEventListener("input", e => renderUsers(e.target.value));
//   document.getElementById("modalRole").addEventListener("change", e => {
//   const isManager = e.target.value === "manager";
//   document.getElementById("managerFields").style.display = isManager ? "block" : "none";
  
// });
const roleSelect = document.getElementById("modalRole");
const managerFields = document.getElementById("managerFields");
const employeeSection = document.getElementById("employeeSection");

function toggleRoleSections(role) {
  const managerFields = document.getElementById("managerFields");
  const employeeSection = document.getElementById("employeeSection");

  // hide all first
  if (managerFields) managerFields.style.display = "none";
  if (employeeSection) employeeSection.style.display = "none";

  // show based on role
  if (role === "manager") {
    managerFields.style.display = "block";
  }

  if (role === "employee") {
    employeeSection.style.display = "block";
  }
}

// initial state (important when modal opens)
toggleRoleSections(roleSelect.value);

// on change
roleSelect.addEventListener("change", e => {
  toggleRoleSections(e.target.value);
});



  loadUsers();
});

function openManagerInfo(userId) {
  const u = allUsers.find(x => x.id === userId);
  if (!u) return;

  document.getElementById("managerInfoBody").innerHTML = `
    <div style="line-height:1.8">
      <b>${u.first_name || "-"}</b><br>

      📅 <b>DOB:</b> ${u.dob ? new Date(u.dob).toLocaleDateString() : "-"}<br>
      🗓 <b>Joining:</b> ${u.joining_date ? new Date(u.joining_date).toLocaleDateString() : "-"}<br>

      🪪 <b>PAN:</b> ${u.pan || "-"}<br>
      🧾 <b>Aadhar:</b> ${u.aadhar || "-"}<br>

      📞 <b>Mobile:</b> ${u.mobile || "-"}<br>
      ✉️ <b>Email:</b> ${u.email || "-"}<br>
      📍 <b>Location:</b> ${u.location || "-"}<br>

      <hr>

      🏦 <b>Bank Name:</b> ${u.bank_name || "-"}<br>
      💳 <b>Account No:</b> ${u.account_no || "-"}<br>
      🏷 <b>IFSC:</b> ${u.ifsc || "-"}
    </div>
  `;

  document.getElementById("infoBackdrop").classList.add("show");
}


function closeManagerInfo() {
  document.getElementById("infoBackdrop").classList.remove("show");
}
async function openEmployeeInfo(userId) {
  try {
    const res = await fetch(`/api/admin/employee-info/${userId}`);
    const data = await res.json();

    if (!res.ok) throw new Error(data.error);

    document.getElementById("managerInfoBody").innerHTML = `
      <div style="line-height:1.8">
        <b>${data.first_name} ${data.last_name || ""}</b><br>

        🆔 <b>Employee ID:</b> ${data.employee_id}<br>

        📅 <b>DOB:</b> ${data.dob ? new Date(data.dob).toLocaleDateString() : "-"}<br>
        🗓 <b>Joining:</b> ${data.joining_date ? new Date(data.joining_date).toLocaleDateString() : "-"}<br>

        🪪 <b>PAN:</b> ${data.pan_no || "-"}<br>
        🧾 <b>Aadhar:</b> ${data.aadhar_no || "-"}<br>

        📞 <b>Mobile:</b> ${data.mobile_no || "-"}<br>
        👨‍👩‍👦 <b>Father:</b> ${data.father_mobile_no || "-"}<br>
        👩 <b>Mother:</b> ${data.mother_mobile_no || "-"}<br>

        ✉️ <b>Personal Email:</b> ${data.personal_email || "-"}<br>
        🏢 <b>Office Email:</b> ${data.office_email || "-"}<br>

        📍 <b>Location:</b> ${data.location || "-"}<br>

        <hr>

        🏦 <b>Bank:</b> ${data.bank_name || "-"}<br>
        💳 <b>Account No:</b> ${data.account_no || "-"}<br>
        🏷 <b>IFSC:</b> ${data.ifsc || "-"}<br>
        🌿 <b>Branch:</b> ${data.bank_branch || "-"}
      </div>
    `;

    document.getElementById("modalTitle").textContent = "Employee Info";
    document.getElementById("infoBackdrop").classList.add("show");

  } catch (err) {
    console.error(err);
    showToast(err.message || "Failed to load employee info");
  }
}

// window.openManagerInfo = function (userId) {
//   const u = allUsers.find(x => x.id === userId);
//   if (!u) {
//     console.error("Manager not found", userId);
//     return;
//   }

//   document.getElementById("managerInfoBody").innerHTML = `
//     <strong>${u.first_name || "-"}</strong><br>
//     📞 ${u.mobile || "-"}<br>
//     ✉️ ${u.email || "-"}<br>
//     📍 ${u.location || "-"}<br>
//     🏦 ${u.bank_name || "-"}
//   `;

//   document.getElementById("infoBackdrop").classList.add("show");
// };

// window.closeManagerInfo = function () {
//   document.getElementById("infoBackdrop").classList.remove("show");
// };
