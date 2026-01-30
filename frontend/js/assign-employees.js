const user = JSON.parse(localStorage.getItem("user"));
if (!user || user.role !== "admin") {
  showToast("Admin access only");
  location.href = "/dashboard.html";
}

let managers = [];
let employees = [];
let dealers = [];
let currentAssignments = [];

// Toast notification
function showToast(msg, timeout = 3000) {
  const t = document.getElementById("toast");
  if (!t) return alert(msg);
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), timeout);
}

async function loadUsers() {
  try {
    const admin = JSON.parse(localStorage.getItem("user")) || {};
    const res = await fetch("/api/admin/users", {
      headers: { "x-admin-id": admin.id }
    });
    if (!res.ok) throw new Error("Failed to fetch users");

    const users = await res.json();
    allUsers = users.map(u => ({ ...u, id: Number(u.id) }));
    console.log('All users:', users);
    
    managers = users
      .filter(u => u.role === "manager" && u.status === "active")
      .map(u => ({ ...u, id: Number(u.id) }));

    employees = users
      .filter(u => u.role === "employee" && u.status === "active")
      .map(u => ({ ...u, id: Number(u.id) }));

    dealers = users
      .filter(u => u.role === "dealer" && u.status === "active")
      .map(u => ({ ...u, id: Number(u.id) }));
    
    console.log('Managers:', managers);
    console.log('Employees:', employees);
    console.log('Dealers:', dealers);

    loadAllAssignments();
    
    // Add search functionality
    const searchInput = document.getElementById("employeeSearch");
    if (searchInput) {
      searchInput.addEventListener("input", renderEmployees);
    }
  } catch (err) {
    console.error(err);
    showToast("Failed to load users");
  }
}

async function onManagerChange(e) {
  const statusEl = document.querySelector(".section-title p");
  const bossId = e.target.value;
  if (bossId) {
    statusEl.textContent = "Loading current assignments...";
    loadCurrentAssignments(bossId);
  } else {
    statusEl.textContent = "Select a manager to view current assignments";
    renderEmployees();
  }
}



async function loadCurrentAssignments(bossId) {
  try {
    const selectedBoss = [...managers, ...employees].find(
      u => u.id === Number(bossId)
    );

    if (!selectedBoss) {
      console.error("Boss not found for ID:", bossId);
      return;
    }

    console.log("Boss:", selectedBoss.username, "Role:", selectedBoss.role);

    let res;

    if (selectedBoss.role === "employee") {
      // EMPLOYEE → DEALER
      res = await fetch(`/api/admin/employee-dealers/${bossId}`);
    } else {
      // MANAGER → EMPLOYEE
      res = await fetch(`/api/admin/manager-employees/${bossId}`);
    }

    if (!res.ok) throw new Error("Assignments API failed");

    const data = await res.json();

    console.log("Assignments raw:", data);

    // API returns array of IDs → normalize
    currentAssignments = (Array.isArray(data) ? data : []).map(id =>
      Number(id)
    );

    console.log("Assignments normalized:", currentAssignments);

    renderEmployees();
  } catch (err) {
    console.error("loadCurrentAssignments error:", err);
    showToast("Failed to load current assignments");
  }
}



function renderEmployees() {
  const div = document.getElementById("employeeList");
  div.innerHTML = "";

  const assignableUsers = [...employees, ...dealers];
  const searchTerm = document.getElementById("employeeSearch").value.toLowerCase().trim();
  
  // Filter employees based on search with exact match priority
  const filteredUsers = assignableUsers.filter(user => {
    if (!searchTerm) return true; // Show all if search is empty
    
    const userName = user.username.toLowerCase();
    const userRole = user.role.toLowerCase();
    
    // Exact match gets highest priority
    if (userName === searchTerm || userRole === searchTerm) {
      return true;
    }
    
    // Partial match for username
    if (userName.includes(searchTerm)) {
      return true;
    }
    
    // Partial match for role
    if (userRole.includes(searchTerm)) {
      return true;
    }
    
    return false;
  });

  // Sort results: exact matches first, then alphabetical
  filteredUsers.sort((a, b) => {
    const aName = a.username.toLowerCase();
    const bName = b.username.toLowerCase();
    const aRole = a.role.toLowerCase();
    const bRole = b.role.toLowerCase();
    
    const aExactMatch = aName === searchTerm || aRole === searchTerm;
    const bExactMatch = bName === searchTerm || bRole === searchTerm;
    
    // Exact matches come first
    if (aExactMatch && !bExactMatch) return -1;
    if (!aExactMatch && bExactMatch) return 1;
    
    // Then sort alphabetically
    return aName.localeCompare(bName);
  });

  if (filteredUsers.length === 0) {
    div.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <p>No employees or dealers found for "${searchTerm}"</p>
        <small>Try searching by username (exact) or role (employee/dealer/manager)</small>
      </div>
    `;
    updateSelectedCount();
    return;
  }

  filteredUsers.forEach(e => {
    const isAssigned = currentAssignments.some(
      id => Number(id) === Number(e.id)
    );
    const employeeItem = document.createElement("div");
    employeeItem.className = `employee-item ${isAssigned ? 'selected' : ''}`;
    employeeItem.dataset.employeeId = e.id;
    
    employeeItem.innerHTML = `
      <input type="checkbox" class="employee-checkbox" value="${e.id}" ${isAssigned ? 'checked' : ''}>
      <div class="employee-info">
        <div class="employee-name">${e.username}</div>
        <div class="employee-role">${e.role}</div>
      </div>
      <div class="employee-avatar">${e.username.charAt(0).toUpperCase()}</div>
    `;

    employeeItem.addEventListener('click', (e) => {
      if (e.target.type !== 'checkbox') {
        const checkbox = employeeItem.querySelector('.employee-checkbox');
        checkbox.checked = !checkbox.checked;
        updateEmployeeSelection(employeeItem, checkbox.checked);
      }
    });

    const checkbox = employeeItem.querySelector('.employee-checkbox');
    checkbox.addEventListener('change', () => {
      updateEmployeeSelection(employeeItem, checkbox.checked);
    });

    div.appendChild(employeeItem);
  });

  updateSelectedCount();
}

function updateEmployeeSelection(employeeItem, isChecked) {
  if (isChecked) {
    employeeItem.classList.add('selected');
  } else {
    employeeItem.classList.remove('selected');
  }
  updateSelectedCount();
}

function updateSelectedCount() {
  const checked = document.querySelectorAll("#employeeList input:checked");
  const count = checked.length;
  document.getElementById("selectedCount").textContent = count;
  
  const saveBtn = document.getElementById("saveBtn");
  saveBtn.disabled = count === 0;
}

function clearSelection() {
  const checkboxes = document.querySelectorAll("#employeeList input:checked");
  checkboxes.forEach(cb => {
    cb.checked = false;
    const employeeItem = cb.closest('.employee-item');
    if (employeeItem) {
      employeeItem.classList.remove('selected');
    }
  });
  updateSelectedCount();
  showToast("Selection cleared");
}

async function saveAssignments() {
  const managerId = Number(document.getElementById("managerSelect").value);
  if (!managerId) return showToast("Select a manager first");

  const checked = [...document.querySelectorAll("#employeeList input:checked")]
    .map(cb => Number(cb.value));

  const selectedBoss = [...managers, ...employees].find(u => u.id === managerId);
  if (!selectedBoss) return;

  // VALIDATION
  for (const childId of checked) {
    const child = [...employees, ...dealers].find(u => u.id === childId);
    if (!child) continue;

    if (child.role === "employee" && selectedBoss.role === "employee") {
      showToast("❌ Employee cannot be assigned to Employee");
      return;
    }

    if (child.role === "manager") {
      showToast("❌ Manager cannot be assigned");
      return;
    }

    if (child.role === "dealer" && selectedBoss.role === "dealer") {
      showToast("❌ Dealer cannot be assigned to Dealer");
      return;
    }
  }

  const toAdd = checked.filter(id => !currentAssignments.includes(id));
  const toRemove = currentAssignments.filter(id => !checked.includes(id));

  try {
    /* ---------- ADD ---------- */
    for (const childId of toAdd) {
      if (selectedBoss.role === "employee") {
        // EMPLOYEE → DEALER
        await fetch("/api/admin/assign-dealer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeId: managerId,
            dealerId: childId
          })
        });
      } else {
        // MANAGER → EMPLOYEE
        await fetch("/api/admin/assign-employee", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            managerId,
            employeeId: childId
          })
        });
      }
    }

    /* ---------- REMOVE ---------- */
    for (const childId of toRemove) {
      if (selectedBoss.role === "employee") {
        // EMPLOYEE → DEALER
        await fetch("/api/admin/unassign-dealer", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeId: managerId,
            dealerId: childId
          })
        });
      } else {
        // MANAGER → EMPLOYEE
        await fetch("/api/admin/unassign-employee", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            managerId,
            employeeId: childId
          })
        });
      }
    }

    showToast("Assignments updated successfully");

    await loadCurrentAssignments(managerId);
    await loadAllAssignments();
    await loadEmployeeAssignments();

  } catch (err) {
    console.error(err);
    showToast("Failed to save assignments");
  }
}


async function loadAllAssignments() {
  try {
    const tbody = document.getElementById("assignmentsTableBody");
    tbody.innerHTML = '<tr><td colspan="4" class="loading-row"><div class="loading"><div class="spinner"></div>Loading assignments...</div></td></tr>';

    const assignments = [];
    
    // Get assignments for each manager
    console.log('Processing managers for assignments table:', managers);
    console.log('Available employees:', employees);
    console.log('Available dealers:', dealers);
    
    for (const manager of managers) {
      try {
        const res = await fetch(`/api/admin/manager-employees/${manager.id}`);
        if (res.ok) {
          const employeeIds = await res.json();
          console.log(`Manager ${manager.username} (ID: ${manager.id}) - Raw employeeIds from API:`, employeeIds, 'Type:', typeof employeeIds, 'IsArray:', Array.isArray(employeeIds));
          
          // Ensure employeeIds is an array
          const normalizedIds = Array.isArray(employeeIds) ? employeeIds : [];
          
          if (normalizedIds.length > 0) {
            // Normalize IDs to numbers for comparison
            const normalizedEmployeeIds = normalizedIds.map(id => Number(id));
            console.log(`Manager ${manager.username} - Normalized employee IDs:`, normalizedEmployeeIds);
            
            // Find matching employees and dealers
              const assignedEmployees = allUsers.filter(u => {
                return u.role === "employee" && normalizedEmployeeIds.includes(Number(u.id));
              if (isMatch) {
                console.log(`  ✓ Matched employee/dealer: ${u.username} (ID: ${userId})`);
              }
              return isMatch;
            });

            console.log(`Manager ${manager.username} - Found ${assignedEmployees.length} matching employees/dealers out of ${normalizedIds.length} assigned IDs`);
            
            // Always add manager if they have any assignments (even if some IDs don't match)
            if (assignedEmployees.length > 0) {
              assignments.push({
                manager,
                employees: assignedEmployees
              });

              console.log(`✓ Added manager ${manager.username} to assignments`);
            } else {
              console.warn(`⚠ Manager ${manager.username} has ${normalizedIds.length} assignments but none match current employees/dealers`);
            }
          } else {
            console.log(`Manager ${manager.username} has no assignments`);
          }
        } else {
          const errorText = await res.text();
          console.error(`Failed to load assignments for manager ${manager.username} (ID: ${manager.id}):`, res.status, errorText);
        }
      } catch (err) {
        console.error(`Error loading assignments for manager ${manager.username}:`, err);
      }
    }

    console.log('Final assignments data:', assignments);
    console.log(`Total managers processed: ${managers.length}, Managers with assignments shown: ${assignments.length}`);
    renderAssignmentsTable(assignments);
    
    // Also load employee assignments
    await loadEmployeeAssignments();
  } catch (err) {
    console.error(err);
    const tbody = document.getElementById("assignmentsTableBody");
    tbody.innerHTML = '<tr><td colspan="4" class="no-assignments">Failed to load assignments</td></tr>';
  }
}

function renderAssignmentsTable(assignments) {
  const tbody = document.getElementById("assignmentsTableBody");
  
  if (assignments.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="no-assignments">No assignments found</td></tr>';
    return;
  }

  tbody.innerHTML = assignments.map(assignment => {
    const manager = assignment.manager;
    const assignedEmployees = assignment.employees;
    
        const employeeTags = assignedEmployees.map(emp => `
      <span class="employee-tag">
        ${emp.username}
        <button class="mini-unassign"
          onclick="unassignSingle(${manager.id}, ${emp.id}, '${manager.username}', '${emp.username}')">
          ✕
        </button>
      </span>
    `).join('');


    return `
      <tr>
        <td><strong>${manager.username}</strong></td>
        <td>
          <div class="employee-tags">
            ${employeeTags}
          </div>
        </td>
        <td>
          <span class="employee-count">${assignedEmployees.length}</span>
        </td>
        <td>
          <button class="action-btn unassign" onclick="unassignAllFromManager(${manager.id}, '${manager.username}')">
            Unassign All
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

async function unassignAllFromManager(managerId, managerName) {
  if (!confirm(`Are you sure you want to unassign all employees from ${managerName}?`)) {
    return;
  }

  try {
    const res = await fetch(`/api/admin/manager-employees/${managerId}`);
    const employeeIds = await res.json();
    
    if (!employeeIds || employeeIds.length === 0) {
      showToast(`No employees assigned to ${managerName}`);
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const employeeId of employeeIds) {
      try {
        console.log(`Attempting to unassign employee ${employeeId} from manager ${managerId}`);
        
       const unassignRes = await fetch("/api/admin/unassign-employee", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentId: Number(managerId),
          childId: Number(employeeId)
        })
      });

        
        console.log(`Unassign response status:`, unassignRes.status);
        
        if (unassignRes.ok) {
          const result = await unassignRes.json();
          console.log(`Unassign success for employee ${employeeId}:`, result);
          successCount++;
        } else {
          const errorText = await unassignRes.text();
          console.error(`Failed to unassign employee ${employeeId}. Status: ${unassignRes.status}, Error: ${errorText}`);
          errorCount++;
        }
      } catch (err) {
        console.error(`Exception when unassigning employee ${employeeId}:`, err);
        errorCount++;
      }
    }

    if (successCount > 0 && errorCount === 0) {
      showToast(`Successfully unassigned ${successCount} employee(s) from ${managerName}`);
    } else if (successCount > 0) {
      showToast(`Partially successful: unassigned ${successCount} employee(s), ${errorCount} failed`);
    } else {
      showToast(`Failed to unassign any employees from ${managerName}. Check console for details.`);
    }
    
    // Refresh current assignments if this manager is selected
    const currentManagerId = document.getElementById("managerSelect").value;
    if (currentManagerId == managerId) {
      await loadCurrentAssignments(managerId);
    }
    
    // Refresh table
    await loadAllAssignments();
    
    // Also refresh employee assignments table
    await loadEmployeeAssignments();
  } catch (err) {
    console.error(err);
    showToast("Failed to unassign employees");
  }
}

async function loadEmployeeAssignments() {
  try {
    const tbody = document.getElementById("employeeAssignmentsTableBody");
    tbody.innerHTML = '<tr><td colspan="4" class="loading-row"><div class="loading"><div class="spinner"></div>Loading employee assignments...</div></td></tr>';

    const employeeAssignments = [];
    
    // Get assignments for each employee
    console.log('Processing employees for employee assignments table:', employees);
    console.log('Available dealers:', dealers);
    
    for (const employee of employees) {
      try {
        const res = await fetch(`/api/admin/employee-dealers/${employee.id}`);
        console.log(`API response for employee ${employee.username}:`, res.status, res.ok);
        
        if (res.ok) {
          const dealerIds = await res.json();
          console.log(`Employee ${employee.username} assigned dealers:`, dealerIds);
          console.log('Dealer IDs type:', typeof dealerIds, Array.isArray(dealerIds) ? 'array' : 'not array');
          
          if (dealerIds && dealerIds.length > 0) {
            const assignedDealers = dealers.filter(dealer =>
              dealerIds.some(id => Number(id) === Number(dealer.id))
            );

            console.log(`Found assigned dealers for ${employee.username}:`, assignedDealers);

            if (assignedDealers.length > 0) {
              employeeAssignments.push({
                employee: employee,
                dealers: assignedDealers
              });
            }
          }
        } else {
          console.error(`Failed to load assignments for employee ${employee.username}`);
        }
      } catch (err) {
        console.error(`Error loading assignments for employee ${employee.username}:`, err);
      }
    }

    console.log('Final employee assignments data:', employeeAssignments);
    console.log('Employee assignments count:', employeeAssignments.length);
    
    renderEmployeeAssignmentsTable(employeeAssignments);
  } catch (err) {
    console.error(err);
    const tbody = document.getElementById("employeeAssignmentsTableBody");
    tbody.innerHTML = '<tr><td colspan="4" class="no-assignments">Failed to load employee assignments</td></tr>';
  }
}

function renderEmployeeAssignmentsTable(employeeAssignments) {
  const tbody = document.getElementById("employeeAssignmentsTableBody");
  
  if (employeeAssignments.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="no-assignments">No employee assignments found</td></tr>';
    return;
  }

  tbody.innerHTML = employeeAssignments.map(assignment => {
    const employee = assignment.employee;
    const assignedDealers = assignment.dealers;
    
    const dealerTags = assignedDealers.map(dealer => `
      <span class="employee-tag">
        ${dealer.username}
        <button class="mini-unassign"
          onclick="unassignSingle(${employee.id}, ${dealer.id}, '${employee.username}', '${dealer.username}')">
          ✕
        </button>
      </span>
    `).join('');


    return `
      <tr>
        <td><strong>${employee.username}</strong></td>
        <td>
          <div class="employee-tags">
            ${dealerTags}
          </div>
        </td>
        <td>
          <span class="employee-count">${assignedDealers.length}</span>
        </td>
        <td>
          <button class="action-btn unassign" data-employee-id="${employee.id}" data-employee-name="${employee.username}">
            Unassign All
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Add event delegation for unassign buttons
document.addEventListener('click', (e) => {
  if (e.target.matches('.action-btn.unassign')) {
    const employeeId = e.target.dataset.employeeId;
    const employeeName = e.target.dataset.employeeName;
    unassignAllFromEmployee(Number(employeeId), employeeName);
  }
});

async function unassignAllFromEmployee(employeeId, employeeName) {
  if (!confirm(`Are you sure you want to unassign all dealers from ${employeeName}?`)) {
    return;
  }

  try {
    // ✅ Correct API
    const res = await fetch(`/api/admin/employee-dealers/${employeeId}`);
    const dealerIds = await res.json();
    
    if (!dealerIds || dealerIds.length === 0) {
      showToast(`No dealers assigned to ${employeeName}`);
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const dealerId of dealerIds) {
      try {
        // ✅ Correct unassign API + payload
        const unassignRes = await fetch("/api/admin/unassign-dealer", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeId: Number(employeeId),
            dealerId: Number(dealerId)
          })
        });

        if (unassignRes.ok) {
          successCount++;
        } else {
          errorCount++;
          const errTxt = await unassignRes.text();
          console.error("Unassign dealer error:", errTxt);
        }
      } catch (err) {
        console.error("Dealer unassign exception:", err);
        errorCount++;
      }
    }

    if (successCount > 0 && errorCount === 0) {
      showToast(`Successfully unassigned ${successCount} dealer(s) from ${employeeName}`);
    } else if (successCount > 0) {
      showToast(`Partially unassigned: ${successCount} success, ${errorCount} failed`);
    } else {
      showToast(`Failed to unassign dealers from ${employeeName}`);
    }

    // 🔄 Refresh UI
    await loadEmployeeAssignments();
    if (selectedEmployeeId === employeeId) {
      await renderAvailableDealersGrid();
    }

  } catch (err) {
    console.error('Error in unassignAllFromEmployee:', err);
    showToast('Failed to unassign dealers');
  }
}


async function unassignSingle(managerId, employeeId, managerName, employeeName) {
  if (!confirm(`Unassign ${employeeName} from ${managerName}?`)) return;

  // 🔥 FIND WHO THE BOSS IS
  const selectedBoss = [...managers, ...employees].find(
    u => u.id === Number(managerId)
  );

  try {

    /* ===========================
       EMPLOYEE → DEALER
    ============================ */
    if (selectedBoss?.role === "employee") {
      const res = await fetch("/api/admin/unassign-dealer", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: Number(managerId),
          dealerId: Number(employeeId)
        })
      });

      if (!res.ok) throw new Error("Unassign dealer failed");

      showToast(`${employeeName} unassigned from ${managerName}`);

      await loadEmployeeAssignments();
      return; // ⛔ IMPORTANT
    }

    /* ===========================
       MANAGER → EMPLOYEE
    ============================ */
    const res = await fetch("/api/admin/unassign-employee", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        managerId: Number(managerId),
        employeeId: Number(employeeId)
      })
    });

    if (!res.ok) throw new Error("Unassign failed");

    showToast(`${employeeName} unassigned from ${managerName}`);

    await loadCurrentAssignments(managerId);
    await loadAllAssignments();
    await loadEmployeeAssignments();

  } catch (err) {
    console.error(err);
    showToast("Failed to unassign");
  }
}



function renderManagersGrid() {
  const div = document.getElementById("managerList");
  div.innerHTML = "";

  managers.forEach(m => {
    const el = document.createElement("div");
    el.className = "employee-item";
    el.textContent = m.username;
    el.dataset.id = m.id;

    el.onclick = () => {
      selectedManagerId = m.id;
      selectedEmployeeId = null;
      highlightSelection("managerList", m.id);
      renderAvailableEmployeesGrid();
    };

    div.appendChild(el);
  });
}


async function renderAvailableEmployeesGrid() {
  if (!selectedManagerId) return;

  const res = await fetch(`/api/admin/manager-employees/${selectedManagerId}`);
  const assignedIds = (await res.json()).map(Number);

  const div = document.getElementById("availableEmployees");
  div.innerHTML = "";

  employees.forEach(emp => {
    const el = document.createElement("div");
    el.className = "employee-item";
    el.textContent = emp.username;
    el.dataset.id = emp.id;

    if (assignedIds.includes(emp.id)) el.classList.add("selected");

    el.onclick = async () => {
      if (el.classList.contains("selected")) {
        // unassign
        await fetch("/api/admin/unassign-employee", {
          method: "DELETE",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify({
            managerId: selectedManagerId,
            employeeId: emp.id
          })
        });
      } else {


    // assign
    await fetch("/api/admin/assign-employee", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        managerId: selectedManagerId,
        employeeId: emp.id
      })
    });

      }

      renderAvailableEmployeesGrid();
      loadAllAssignments();
    };

    div.appendChild(el);
  });
}


function renderEmployeesGrid() {
  const div = document.getElementById("employeeListGrid");
  div.innerHTML = "";

  employees.forEach(e => {
    const el = document.createElement("employee-item");    const box = document.createElement("div");
    box.className = "employee-item";
    box.textContent = e.username;
    box.dataset.id = e.id;

    box.onclick = () => {
      selectedEmployeeId = e.id;
      selectedManagerId = null;
      highlightSelection("employeeListGrid", e.id);
      renderAvailableDealersGrid();
    };

    div.appendChild(box);
  });
}

async function renderAvailableDealersGrid() {
  if (!selectedEmployeeId) return;

  const res = await fetch(`/api/admin/employee-dealers/${selectedEmployeeId}`);
  const assignedIds = (await res.json()).map(Number);

  const div = document.getElementById("availableDealers");
  div.innerHTML = "";

  dealers.forEach(d => {
    const el = document.createElement("div");
    el.className = "employee-item";
    el.textContent = d.username;
    el.dataset.id = d.id;

    if (assignedIds.includes(d.id)) el.classList.add("selected");

    el.onclick = async () => {
      if (el.classList.contains("selected")) {
        // unassign
        await fetch("/api/admin/unassign-dealer", {
          method: "DELETE",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify({
            employeeId: selectedEmployeeId,
            dealerId: d.id
          })
        });
      } else {
        // assign
        await fetch("/api/admin/assign-dealer", {
          method: "POST",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify({
            employeeId: selectedEmployeeId,
            dealerId: d.id
          })
        });
      }

      renderAvailableDealersGrid();
      loadEmployeeAssignments();
    };

    div.appendChild(el);
  });
}


function highlightSelection(containerId, id) {
  document.querySelectorAll(`#${containerId} .employee-item`)
    .forEach(i => i.classList.remove("selected"));

  const el = document.querySelector(
    `#${containerId} .employee-item[data-id='${id}']`
  );
  if (el) el.classList.add("selected");
}


async function buildAssignmentMaps() {
  employeeToManagerMap.clear();
  dealerToEmployeeMap.clear();

  // MANAGER → EMPLOYEE
  for (const manager of managers) {
    const res = await fetch(`/api/admin/manager-employees/${manager.id}`);
    if (res.ok) {
      const empIds = await res.json();
      empIds.forEach(eid => {
        employeeToManagerMap.set(Number(eid), manager.id);
      });
    }
  }

  // EMPLOYEE → DEALER
  for (const employee of employees) {
    const res = await fetch(`/api/admin/employee-dealers/${employee.id}`);
    if (res.ok) {
      const dealerIds = await res.json();
      dealerIds.forEach(did => {
        dealerToEmployeeMap.set(Number(did), employee.id);
      });
    }
  }

  console.log("employeeToManagerMap", employeeToManagerMap);
  console.log("dealerToEmployeeMap", dealerToEmployeeMap);
}

async function buildAssignmentMaps() {
  employeeToManagerMap.clear();
  dealerToEmployeeMap.clear();

  // MANAGER → EMPLOYEE
  for (const manager of managers) {
    const res = await fetch(`/api/admin/manager-employees/${manager.id}`);
    if (res.ok) {
      const empIds = await res.json();
      empIds.forEach(eid => {
        employeeToManagerMap.set(Number(eid), manager.id);
      });
    }
  }

  // EMPLOYEE → DEALER
  for (const employee of employees) {
    const res = await fetch(`/api/admin/employee-dealers/${employee.id}`);
    if (res.ok) {
      const dealerIds = await res.json();
      dealerIds.forEach(did => {
        dealerToEmployeeMap.set(Number(did), employee.id);
      });
    }
  }

  console.log("employeeToManagerMap", employeeToManagerMap);
  console.log("dealerToEmployeeMap", dealerToEmployeeMap);
}


// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  await loadUsers();

  // render pure grids only
  renderManagersGrid();
  renderEmployeesGrid();

  // auto-load tables (no selection needed)
  await loadAllAssignments();
  await loadEmployeeAssignments();
});
