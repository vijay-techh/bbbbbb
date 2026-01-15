const rawUser = localStorage.getItem("user");
const user = rawUser ? JSON.parse(rawUser) : null;

if (!user) {
  window.location.href = "/index.html";
}

// Hide admin navigation options for non-admin users
const adminMenu = document.getElementById("adminUsersMenu");
const assignMenu = document.getElementById("assignEmployeesMenu");
const dealerKhataMenu = document.getElementById("dealerKhataMenu");
const myKhataMenu = document.getElementById("myKhataMenu");

if (user.role === "admin") {
  if (adminMenu) adminMenu.style.display = "block";
  if (assignMenu) assignMenu.style.display = "block";
  if (dealerKhataMenu) dealerKhataMenu.style.display = "block";
  
  // Show notification bell for admins
  const notificationBell = document.getElementById("notificationBell");
  if (notificationBell) {
    notificationBell.style.display = "block";
  }
} else if (user.role === "dealer") {
  // Show dealer menu for dealers
  if (myKhataMenu) myKhataMenu.style.display = "block";
  
  // Show notification bell for dealers
  const notificationBell = document.getElementById("notificationBell");
  if (notificationBell) {
    notificationBell.style.display = "block";
  }
  
  // Change logo to WheelsPartner for dealers
  const logo = document.getElementById("logo");
  if (logo) {
    logo.textContent = "WheelsPartner";
  }
  
  // Hide admin menus
  if (adminMenu) adminMenu.style.display = "none";
  if (assignMenu) assignMenu.style.display = "none";
  if (dealerKhataMenu) dealerKhataMenu.style.display = "none";
} else {
  // Hide for manager and employee roles
  if (adminMenu) adminMenu.style.display = "none";
  if (assignMenu) assignMenu.style.display = "none";
  if (dealerKhataMenu) dealerKhataMenu.style.display = "none";
  if (myKhataMenu) myKhataMenu.style.display = "none";
}

function logout() {
  localStorage.removeItem("token");
  window.location.href = "index.html";
}

// 🎯 NOTIFICATION SYSTEM
let notificationPollingInterval;

async function loadNotifications() {
  if (user.role !== "admin" && user.role !== "dealer") {
    console.log("❌ User is not admin or dealer, skipping notifications");
    return;
  }
  
  console.log(`🔔 Loading notifications for ${user.role}:`, user.id);
  
  try {
    const endpoint = user.role === "admin" ? "/api/admin/notifications" : "/api/dealer/notifications";
    const header = user.role === "admin" ? { "x-admin-id": user.id } : { "x-dealer-id": user.id };
    
    const res = await fetch(endpoint, {
      headers: header
    });
    
    console.log("📡 Notifications API response status:", res.status);
    
    if (!res.ok) throw new Error("Failed to load notifications");
    
    const data = await res.json();
    console.log("📨 Notifications data received:", data);
    
    // Update badge
    const badge = document.getElementById("notificationBadge");
    if (badge) {
      badge.textContent = data.unreadCount || 0;
      badge.style.display = data.unreadCount > 0 ? "flex" : "none";
      console.log("🔢 Badge updated:", data.unreadCount);
    } else {
      console.log("❌ Notification badge element not found");
    }
    
    // Update notification list
    renderNotifications(data.notifications || []);
    
  } catch (err) {
    console.error("❌ Load notifications error:", err);
  }
}

function renderNotifications(notifications) {
  const notificationList = document.getElementById("notificationList");
  if (!notificationList) return;
  
  if (notifications.length === 0) {
    notificationList.innerHTML = '<div class="no-notifications">No notifications</div>';
    return;
  }
  
  notificationList.innerHTML = notifications.map(notification => {
    const time = formatNotificationTime(notification.created_at);
    const unreadClass = !notification.is_read ? 'unread' : '';
    
    return `
      <div class="notification-item ${unreadClass}">
        <div class="notification-message">${notification.message}</div>
        <div class="notification-time">Time: ${time}</div>
      </div>
    `;
  }).join('');
}

function formatNotificationTime(createdAt) {
  const date = new Date(createdAt);
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
}

async function markAllNotificationsAsRead() {
  if (user.role !== "admin" && user.role !== "dealer") return;
  
  try {
    const endpoint = user.role === "admin" ? "/api/admin/notifications/read" : "/api/dealer/notifications/read";
    const header = user.role === "admin" ? { "x-admin-id": user.id } : { "x-dealer-id": user.id };
    
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { 
        ...header,
        "Content-Type": "application/json"
      }
    });
    
    if (!res.ok) throw new Error("Failed to mark notifications as read");
    
    const result = await res.json();
    console.log(`Marked ${result.markedAsRead} notifications as read`);
    
    // Reload notifications to update UI
    await loadNotifications();
    
  } catch (err) {
    console.error("Mark notifications read error:", err);
  }
}

function toggleNotificationDropdown() {
  const dropdown = document.getElementById("notificationDropdown");
  if (dropdown) {
    dropdown.classList.toggle("show");
    
    // If opening, mark all as read
    if (dropdown.classList.contains("show")) {
      markAllNotificationsAsRead();
    }
  }
}

// Initialize notification system
function initNotificationSystem() {
  console.log("🚀 Initializing notification system for user:", user.role, user.id);
  
  if (user.role !== "admin" && user.role !== "dealer") {
    console.log("❌ User is not admin or dealer, notification system disabled");
    return;
  }
  
  console.log(`✅ ${user.role} user detected, setting up notifications`);
  
  // Load notifications on page load
  loadNotifications();
  
  // Set up polling for real-time updates (every 5 seconds)
  notificationPollingInterval = setInterval(() => {
    console.log("⏰ Polling for notifications...");
    loadNotifications();
  }, 5000);
  
  // Event listeners
  const notificationBell = document.getElementById("notificationBell");
  const markAllReadBtn = document.getElementById("markAllRead");
  
  if (notificationBell) {
    console.log("✅ Notification bell found, adding click listener");
    notificationBell.addEventListener("click", toggleNotificationDropdown);
  } else {
    console.log("❌ Notification bell element not found");
  }
  
  if (markAllReadBtn) {
    console.log("✅ Mark all read button found, adding click listener");
    markAllReadBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      markAllNotificationsAsRead();
    });
  } else {
    console.log("❌ Mark all read button not found");
  }
  
  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    const notificationBell = document.getElementById("notificationBell");
    const dropdown = document.getElementById("notificationDropdown");
    
    if (notificationBell && dropdown && 
        !notificationBell.contains(e.target) && 
        !dropdown.contains(e.target)) {
      dropdown.classList.remove("show");
    }
  });
  
  console.log("🎉 Notification system initialized successfully");
}

async function loadDashboard() {
  try {
    const res = await fetch("/api/dashboard");
    if (!res.ok) throw new Error("Dashboard API failed");

    const data = await res.json();

    document.getElementById("totalAmount").innerText =
      Number(data.disbursed_amount || 0).toLocaleString("en-IN");

    document.getElementById("totalCases").innerText =
      data.disbursed_cases || 0;

  } catch (err) {
    console.error(err);
  }
}


async function loadBusinessType() {
  const res = await fetch("/api/dashboard/business-type");
  const data = await res.json();

  const bar = document.getElementById("businessTypeBar");
  bar.innerHTML = "";

  if (!data.length) {
    bar.innerHTML = "<p>No disbursed data</p>";
    return;
  }

  const max = Math.max(...data.map(d => d.count));

  data.forEach(row => {
    const div = document.createElement("div");
    div.className = "bar-fill";
    div.style.width = (row.count / max) * 100 + "%";
    div.textContent = `${row.loan_type} (${row.count})`;
    bar.appendChild(div);
  });
}


loadDashboard();
loadBusinessType();

// Initialize notification system
initNotificationSystem();

setInterval(() => {
  loadDashboard();
  loadBusinessType();
}, 5000);


