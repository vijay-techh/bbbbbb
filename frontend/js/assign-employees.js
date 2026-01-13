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

    populateManagerSelect();
    renderEmployees();
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

function populateManagerSelect() {
  const mgrSelect = document.getElementById("managerSelect");
  mgrSelect.innerHTML = "";

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Select a manager or employee...";
  mgrSelect.appendChild(defaultOption);

  // Add managers to dropdown
  managers.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = `${m.username} (Manager)`;
    mgrSelect.appendChild(opt);
  });

  // Add employees to dropdown (they can be bosses)
  employees.forEach(e => {
    const opt = document.createElement("option");
    opt.value = e.id;
    opt.textContent = `${e.username} (Employee)`;
    mgrSelect.appendChild(opt);
  });

  mgrSelect.addEventListener("change", onManagerChange);

  // Auto-select first available manager
  const availableManagers = [...managers, ...employees];
  if (availableManagers.length > 0) {
    mgrSelect.value = availableManagers[0].id;
    loadCurrentAssignments(availableManagers[0].id);
  }
}

async function loadCurrentAssignments(bossId) {
  try {
    console.log("Boss ID (before):", bossId, typeof bossId);

    const res = await fetch(`/api/admin/manager-employees/${bossId}`);
    const data = await res.json();

    console.log("Assignments raw:", data);
    console.log("Assignments types:", data.map(x => typeof x));
    console.log("Assignment fields:", data.length > 0 ? Object.keys(data[0]) : 'No data');

    // Update currentAssignments with the latest data from server
    // Try different possible field names that the API might return
    currentAssignments = data.map(r => {
      console.log("Processing assignment:", r);
      // Try multiple possible field names
      const childId = r.employee_id || r.child_id || r.childId || r.employeeId;
      console.log("Found childId:", childId, "for assignment:", r);
      return Number(childId);
    });

    console.log("Assignments normalized:", currentAssignments);

    renderEmployees();
  } catch (err) {
    console.error(err);
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
  const managerId = document.getElementById("managerSelect").value;
  if (!managerId) return showToast("Select a manager first");

  const checked = [...document.querySelectorAll("#employeeList input:checked")]
    .map(cb => Number(cb.value));

  // Get the selected boss details
  const selectedBoss = [...managers, ...employees].find(u => u.id === Number(managerId));
  
  // Validate assignment rules
  for (const employeeId of checked) {
    const employee = [...employees, ...dealers].find(u => u.id === employeeId);
    
    if (!employee) continue;
    
    // Rules:
    // Employee → Manager (allowed)
    // Dealer → Manager (allowed) 
    // Dealer → Employee (allowed)
    // Employee → Employee (NOT allowed)
    // Manager → Anyone (NOT allowed)
    // Dealer → Dealer (NOT allowed)
    
    if (employee.role === 'employee' && selectedBoss.role === 'employee') {
      showToast(`❌ Cannot assign Employee "${employee.username}" to Employee "${selectedBoss.username}". Employees can only be assigned to Managers.`);
      return;
    }
    
    if (employee.role === 'manager') {
      showToast(`❌ Cannot assign Manager "${employee.username}" to anyone. Managers cannot be assigned.`);
      return;
    }
    
    if (employee.role === 'dealer' && selectedBoss.role === 'dealer') {
      showToast(`❌ Cannot assign Dealer "${employee.username}" to Dealer "${selectedBoss.username}". Dealers can only be assigned to Managers or Employees.`);
      return;
    }
  }

  const toAdd = checked.filter(id => !currentAssignments.includes(id));
  const toRemove = currentAssignments.filter(id => !checked.includes(id));

try {
  // ADD new assignments
  for (const employeeId of toAdd) {
    await fetch("/api/admin/assign-employee", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        managerId: Number(managerId),
        employeeId: Number(employeeId)
      })
    });
  }   // ← THIS BRACE WAS MISSING

  // REMOVE unchecked assignments
  for (const employeeId of toRemove) {
    await fetch("/api/admin/unassign-employee", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        managerId: Number(managerId),
        employeeId: Number(employeeId)
      })
    });
  }

  if (toAdd.length > 0 && toRemove.length > 0) {
    showToast(`Added ${toAdd.length} and removed ${toRemove.length} assignment(s)`);
  } else if (toAdd.length > 0) {
    showToast(`Successfully assigned ${toAdd.length} user(s)`);
  } else if (toRemove.length > 0) {
    showToast(`Successfully unassigned ${toRemove.length} user(s)`);
  } else {
    showToast("No changes made");
  }

  await loadCurrentAssignments(managerId);
  setTimeout(async () => {
    await loadAllAssignments();
    await loadEmployeeAssignments();
  }, 500);

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
            const assignedEmployees = [...employees, ...dealers].filter(u => {
              const userId = Number(u.id);
              const isMatch = normalizedEmployeeIds.includes(userId);
              if (isMatch) {
                console.log(`  ✓ Matched employee/dealer: ${u.username} (ID: ${userId})`);
              }
              return isMatch;
            });

            console.log(`Manager ${manager.username} - Found ${assignedEmployees.length} matching employees/dealers out of ${normalizedIds.length} assigned IDs`);
            
            // Always add manager if they have any assignments (even if some IDs don't match)
            if (assignedEmployees.length > 0) {
              assignments.push({
                manager: manager,
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
        const res = await fetch(`/api/admin/manager-employees/${employee.id}`);
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
    const res = await fetch(`/api/admin/manager-employees/${employeeId}`);
    const dealerIds = await res.json();
    
    if (!dealerIds || dealerIds.length === 0) {
      showToast(`No dealers assigned to ${employeeName}`);
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const dealerId of dealerIds) {
      try {
        console.log(`Attempting to unassign dealer ${dealerId} from employee ${employeeId}`);
        
        const unassignRes = await fetch("/api/admin/unassign-employee", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            managerId: Number(employeeId),
            employeeId: Number(dealerId)
          })
        });

        console.log(`Unassign response status:`, unassignRes.status);
        
        if (unassignRes.ok) {
          const result = await unassignRes.json();
          console.log(`Unassign success for dealer ${dealerId}:`, result);
          successCount++;
        } else {
          const errorText = await unassignRes.text();
          console.error(`Failed to unassign dealer ${dealerId}. Status: ${unassignRes.status}, Error: ${errorText}`);
          errorCount++;
        }
      } catch (err) {
        console.error(`Exception when unassigning dealer ${dealerId}:`, err);
        errorCount++;
      }
    }

    if (successCount > 0 && errorCount === 0) {
      showToast(`Successfully unassigned ${successCount} dealer(s) from ${employeeName}`);
    } else if (successCount > 0) {
      showToast(`Partially successful: unassigned ${successCount} dealer(s), ${errorCount} failed`);
    } else {
      showToast(`Failed to unassign any dealers from ${employeeName}. Check console for details.`);
    }
    
    // Refresh employee assignments table
    await loadEmployeeAssignments();
  } catch (err) {
    console.error('Error in unassignAllFromEmployee:', err);
    showToast('Failed to unassign dealers');
  }
}


async function unassignSingle(managerId, employeeId, managerName, employeeName) {
  if (!confirm(`Unassign ${employeeName} from ${managerName}?`)) return;

  try {
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

    // Refresh everything
    await loadCurrentAssignments(managerId);
    await loadAllAssignments();
    await loadEmployeeAssignments();

  } catch (err) {
    console.error(err);
    showToast("Failed to unassign");
  }
}



// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  loadUsers();
});
