const express = require("express");
const path = require("path");
const cors = require("cors");
require("dotenv").config();

const pool = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

// Serve frontend static files
const FRONTEND_PATH = path.join(__dirname, "../frontend");
app.use(express.static(FRONTEND_PATH));

// ----------------- Utilities -----------------
function generateLoanId() {
  return Date.now().toString(); // simple unique id
}

// ----------------- Dashboard -----------------
app.get("/api/dashboard", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE stage = 'Disbursed') AS disbursed_cases,
        COALESCE(
          SUM(NULLIF(data->>'disbursedSanctionLoanAmount', '')::numeric),
          0
        ) AS disbursed_amount
      FROM leads
      WHERE stage = 'Disbursed'
    `);

    res.json(rows[0] || { disbursed_cases: 0, disbursed_amount: 0 });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ error: "Dashboard failed" });
  }
});

app.get("/api/dashboard/business-type", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT loan_type, COUNT(*) AS count
      FROM leads
      WHERE stage = 'Disbursed'
      GROUP BY loan_type
      ORDER BY count DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
});





app.get("/api/manager/stats", async (req, res) => {
  try {
    const { managerId } = req.query;

    const { rows } = await pool.query(`
      SELECT u.username, COUNT(l.loan_id) AS lead_count
      FROM users u
      LEFT JOIN leads l ON l.created_by = u.id
      WHERE u.id IN (
        SELECT child_id FROM manager_employees WHERE parent_id = $1
      )
      GROUP BY u.username
      ORDER BY lead_count DESC
    `, [managerId]);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
});





// ----------------- Auth (temporary) -----------------
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const { rows } = await pool.query(
      `SELECT id, username, role, status FROM users WHERE username=$1 AND password=$2 AND status='active' AND deleted_at IS NULL`,
      [username, password]
    );

    if (!rows.length) return res.status(401).json({ error: "Invalid credentials or account disabled" });

    await pool.query("UPDATE users SET last_login = NOW() WHERE id = $1", [rows[0].id]);

    res.json({ id: rows[0].id, username: rows[0].username, role: rows[0].role });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// ----------------- Loan ID -----------------
app.get("/api/next-loan-id", (req, res) => {
  res.json({ loanId: generateLoanId() });
});

// ----------------- Users (public) -----------------
app.post("/api/users", async (req, res) => {
  try {
    const { username, password } = req.body;
    await pool.query("INSERT INTO users (username, password, role) VALUES ($1,$2,'employee')", [username, password]);
    res.json({ success: true });
  } catch (err) {
    console.error("Create user error:", err);
    res.status(500).json({ error: "Failed to create user" });
  }
});

app.delete("/api/users/:id", async (req, res) => {
  try {
    await pool.query("UPDATE users SET deleted_at = NOW(), status = 'inactive' WHERE id=$1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Delete failed" });
  }
});

// ----------------- Leads -----------------
app.post("/api/leads", async (req, res) => {
  try {
    const userId = Number(req.body.userId);
    
    // HARD VALIDATION - Never allow NULL created_by
    if (!userId || isNaN(userId)) {
      console.error("INVALID userId:", req.body.userId);
      return res.status(400).json({
        success: false,
        error: "Valid userId required"
      });
    }

    const loanId = generateLoanId();
    
    console.log("CREATING LEAD:", {
      loanId,
      userId,
      role: req.body.role,
      loanType: req.body.loanType,
      stage: req.body.loanStage || "Lead"
    });

    // Insert lead with proper created_by
    await pool.query(
      `INSERT INTO leads (loan_id, loan_type, stage, data, created_by) 
       VALUES ($1, $2, $3, $4, $5)`,
      [
        loanId,
        req.body.loanType,
        req.body.loanStage || "Lead",
        req.body,
        userId  // Always populated, never NULL
      ]
    );

    console.log("LEAD CREATED SUCCESSFULLY:", loanId);

    // 🎯 NOTIFICATION SYSTEM: Create notifications for admins if creator is employee or manager
    try {
      console.log("🔔 Starting notification creation process...");
      
      // Get creator details
      const creatorResult = await pool.query(
        "SELECT username, role FROM users WHERE id = $1 AND deleted_at IS NULL",
        [userId]
      );
      
      console.log("Creator query result:", creatorResult.rows);
      
      if (creatorResult.rows.length > 0) {
        const creator = creatorResult.rows[0];
        console.log("Creator found:", creator);
        
        // Only create notifications for employees and managers
        if (creator.role === 'employee' || creator.role === 'manager') {
          console.log("✅ Creator is employee/manager, creating notifications...");
          
          // Get all admin users
          const adminsResult = await pool.query(
            "SELECT id FROM users WHERE role = 'admin' AND deleted_at IS NULL"
          );
          
          console.log("Admin users found:", adminsResult.rows.length);
          
          if (adminsResult.rows.length > 0) {
            const notificationMessage = `${creator.username} (${creator.role}) created lead ${loanId}`;
            console.log("Notification message:", notificationMessage);
            
            // Insert notification for each admin
            for (const admin of adminsResult.rows) {
              console.log(`Creating notification for admin ${admin.id}`);
              await pool.query(
                `INSERT INTO notifications (user_id, message, is_read, created_at, type) 
                 VALUES ($1, $2, false, NOW(), 'lead_created')`,
                [admin.id, notificationMessage]
              );
            }
            
            console.log(`✅ Created notifications for ${adminsResult.rows.length} admins: ${notificationMessage}`);
          } else {
            console.log("❌ No admin users found");
          }
        } else {
          console.log(`❌ Creator is ${creator.role}, not creating notifications`);
        }
      } else {
        console.log("❌ Creator not found in database");
      }
    } catch (notificationErr) {
      console.error("❌ NOTIFICATION CREATION ERROR:", notificationErr);
      // Don't fail the lead creation if notification fails
    }

    res.status(201).json({ success: true, loanId });

  } catch (err) {
    console.error("LEAD CREATION ERROR:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to create lead" 
    });
  }
});

app.get("/api/leads/:loanId", async (req, res) => {
  try {
    const { loanId } = req.params;
    const result = await pool.query("SELECT * FROM leads WHERE loan_id = $1", [loanId]);
    if (!result.rows.length) return res.status(404).json({ success: false });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

app.put("/api/leads/:loanId", async (req, res) => {
  try {
    const { loanId } = req.params;
    await pool.query(`UPDATE leads SET stage = $1, data = $2 WHERE loan_id = $3`, [req.body.loanStage || "Lead", req.body, loanId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

app.get("/api/leads", async (req, res) => {
  try {
    const userId = Number(req.query.userId);
    const role = req.query.role;

    if (!userId || !role) {
      return res.status(400).json({ error: "userId and role required" });
    }

    let query = "";
    let params = [];

    // ✅ ADMIN → ALL LEADS
    if (role === "admin") {
      query = `
        SELECT *
        FROM leads
        ORDER BY created_at DESC
      `;
    }

    // ✅ MANAGER → own + assigned employees
    else if (role === "manager") {
      query = `
        SELECT *
        FROM leads
        WHERE created_by = $1
           OR created_by IN (
             SELECT employee_id
             FROM manager_employees
             WHERE manager_id = $1
           )
        ORDER BY created_at DESC
      `;
      params = [userId];
    }

    // ✅ EMPLOYEE → only own
    else {
      query = `
        SELECT *
        FROM leads
        WHERE created_by = $1
        ORDER BY created_at DESC
      `;
      params = [userId];
    }

    const { rows } = await pool.query(query, params);
    res.json(rows);

  } catch (err) {
    console.error("Fetch leads error:", err);
    res.status(500).json({ error: "Failed to fetch leads" });
  }
});















app.delete("/api/leads/:loanId", async (req, res) => {
  try {
    const { loanId } = req.params;
    const result = await pool.query("DELETE FROM leads WHERE loan_id = $1", [loanId]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE ERROR:', err);
    res.status(500).json({ success: false, error: 'Delete failed' });
  }
});

// ----------------- PINCODE validation -----------------
app.post("/api/validate-pincode", async (req, res) => {
  const { pincode, district } = req.body;
  if (!pincode) return res.status(400).json({ error: "Pincode required" });
  try {
    const r = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
    const d = await r.json();
    if (d[0].Status !== "Success") return res.status(400).json({ error: "Invalid pincode" });
    const apiDistrict = d[0].PostOffice[0].District;
    if (district && apiDistrict.toLowerCase() !== district.toLowerCase()) {
      return res.status(400).json({ error: "PIN–District mismatch" });
    }
    res.json({ ok: true, district: apiDistrict });
  } catch (err) {
    console.error("Pincode validation error", err);
    res.status(500).json({ error: "Pincode validation failed" });
  }
});

// ----------------- Admin users -----------------
app.get("/api/admin/users", async (req, res) => {
  try {
    const adminId = parseInt(req.headers["x-admin-id"]);
    if (!adminId) return res.status(403).json({ error: "Unauthorized" });

    const adminCheck = await pool.query(
      "SELECT role FROM users WHERE id = $1 AND deleted_at IS NULL",
      [adminId]
    );

    if (!adminCheck.rows.length || adminCheck.rows[0].role !== "admin") {
      return res.status(403).json({ error: "Only admins may access this resource" });
    }

    const { rows } = await pool.query(`
      SELECT
        u.id,
        u.username,
        u.password,
        u.role,
        u.status,
        u.last_login,
        mp.first_name,
        mp.dob,
        mp.joining_date,
        mp.pan,
        mp.aadhar,
        mp.mobile,
        mp.email,
        mp.location,
        mp.account_no,
        mp.ifsc,
        mp.bank_name
      FROM users u
      LEFT JOIN manager_profiles mp ON mp.user_id = u.id
      WHERE u.deleted_at IS NULL
      ORDER BY u.id
    `);

    res.json(rows);
  } catch (err) {
    console.error("FETCH USERS ERROR:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});




//tharun
app.post("/api/admin/users", async (req, res) => {
  try {
    const { username, password, role, profile } = req.body;

    console.log("ADMIN CREATE USER:", req.body);

    if (!username || !password || !role) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const roleNormalized = role.toLowerCase();
    const allowed = ["manager", "employee", "dealer"];

    if (!allowed.includes(roleNormalized)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    if (roleNormalized === "manager") {
      if (!profile) {
        return res.status(400).json({ error: "Manager profile required" });
      }
      if (!profile.firstName || !profile.mobile || !profile.email) {
        return res.status(400).json({ error: "Incomplete manager profile" });
      }
    }
if (roleNormalized === "manager") {
  if (
    !profile ||
    !profile.firstName ||
    !profile.mobile ||
    !profile.email ||
    !profile.bank ||
    !profile.bank.accountNo ||
    !profile.bank.ifsc ||
    !profile.bank.bankName
  ) {
    return res.status(400).json({ error: "Incomplete manager profile" });
  }
}

    // Insert user
    const userRes = await pool.query(
      `INSERT INTO users (username, password, role, status)
       VALUES ($1, $2, $3, 'active')
       RETURNING id`,
      [username, password, roleNormalized]
    );

    const userId = userRes.rows[0].id;

    // Insert manager KYC if manager
    if (roleNormalized === "manager") {
      await pool.query(
        `INSERT INTO manager_profiles
        (user_id, first_name, dob, joining_date, pan, aadhar, mobile, email, location, account_no, ifsc, bank_name)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          userId,
          profile.firstName,
          profile.dob,
          profile.joiningDate,
          profile.pan,
          profile.aadhar,
          profile.mobile,
          profile.email,
          profile.location,
          profile.bank.accountNo,
          profile.bank.ifsc,
          profile.bank.bankName
        ]
      );

    }

    res.json({ success: true });
    
} catch (err) {
  console.error("CREATE USER ERROR:", err);

  if (err.code === "23505") {
    return res.status(400).json({ error: "Username already exists" });
  }

  res.status(500).json({ error: "Failed to create user" });
}

});

app.patch("/api/admin/users/:id", async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const adminId = parseInt(req.headers["x-admin-id"]);
    const { username, password } = req.body;

    if (!adminId) return res.status(403).json({ error: 'Unauthorized' });
    if (!username) return res.status(400).json({ error: 'Username required' });

    const adminRes = await pool.query("SELECT role FROM users WHERE id = $1 AND deleted_at IS NULL", [adminId]);
    if (!adminRes.rows.length || adminRes.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Only admins may edit users' });
    }

    const userRes = await pool.query("SELECT role FROM users WHERE id = $1 AND deleted_at IS NULL", [userId]);
    if (!userRes.rows.length) return res.status(404).json({ error: 'User not found' });
    
    // Prevent editing admin users
    if (userRes.rows[0].role === 'admin') {
      return res.status(403).json({ error: 'Admin users cannot be edited' });
    }

    // Check if username already exists for another user
    if (username) {
      const existingUser = await pool.query(
        "SELECT id FROM users WHERE username = $1 AND id != $2 AND deleted_at IS NULL",
        [username, userId]
      );
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'Username already exists' });
      }
    }

    // Build update query dynamically
    let updateFields = [];
    let updateValues = [];
    let paramIndex = 1;

    if (username) {
      updateFields.push(`username = $${paramIndex++}`);
      updateValues.push(username);
    }

    if (password) {
      updateFields.push(`password = $${paramIndex++}`);
      updateValues.push(password);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateValues.push(userId); // Add userId for WHERE clause

    const updateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`;
    
    await pool.query(updateQuery, updateValues);

    res.json({ success: true });

  } catch (err) {
    console.error('Edit user error:', err);
    res.status(500).json({ error: 'Failed to edit user' });
  }
});



app.delete("/api/admin/users/:id", async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const adminId = parseInt(req.headers["x-admin-id"]);

    if (!adminId) return res.status(403).json({ error: "Unauthorized" });
    if (userId === adminId) return res.status(400).json({ error: "You cannot delete your own account" });

    const userRes = await pool.query("SELECT role FROM users WHERE id = $1 AND deleted_at IS NULL", [userId]);
    if (!userRes.rows.length) return res.status(404).json({ error: "User not found" });
    const role = userRes.rows[0].role;

    // Prevent admin deleting himself
    if (userId === adminId) return res.status(400).json({ error: "You cannot delete your own account" });

    // Prevent admin deleting another admin
    if (role === 'admin') {
      const adminRes = await pool.query("SELECT role FROM users WHERE id = $1 AND deleted_at IS NULL", [adminId]);
      if (!adminRes.rows.length || adminRes.rows[0].role !== 'admin') {
        return res.status(403).json({ error: "Only admins can delete admin users" });
      }
      return res.status(403).json({ error: "Admin users cannot be deleted" });
    }

    // Soft delete the user
    await pool.query("UPDATE users SET deleted_at = NOW(), status = 'inactive' WHERE id = $1", [userId]);
    res.json({ success: true });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

app.patch("/api/admin/users/:id/status", async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const adminId = parseInt(req.headers["x-admin-id"]);
    const { status } = req.body; // expected 'active' or 'disabled'

    if (!adminId) return res.status(403).json({ error: 'Unauthorized' });
    if (!['active', 'inactive'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    if (userId === adminId) return res.status(400).json({ error: 'You cannot change your own status' });

    const adminRes = await pool.query("SELECT role FROM users WHERE id = $1 AND deleted_at IS NULL", [adminId]);
    if (!adminRes.rows.length || adminRes.rows[0].role !== 'admin') return res.status(403).json({ error: 'Only admins may change user status' });

    const userRes = await pool.query("SELECT role FROM users WHERE id = $1 AND deleted_at IS NULL", [userId]);
    if (!userRes.rows.length) return res.status(404).json({ error: 'User not found' });
    if (userRes.rows[0].role === 'admin') return res.status(403).json({ error: 'Admin cannot be disabled' });

    await pool.query("UPDATE users SET status = $1 WHERE id = $2", [status, userId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Status update error:', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

app.post("/api/admin/assign-employee", async (req, res) => {
  try {
    const { parentId, childId, managerId, employeeId } = req.body;
    
    // Support both parameter naming conventions
    const finalManagerId = parentId || managerId;
    const finalEmployeeId = childId || employeeId;

    if (!finalManagerId || !finalEmployeeId) {
      return res.status(400).json({ error: "managerId & employeeId required" });
    }

    await pool.query(
      `INSERT INTO manager_employees (manager_id, employee_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [finalManagerId, finalEmployeeId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Assign error:", err);
    res.status(500).json({ error: "Assignment failed" });
  }
});

app.get("/api/admin/manager-employees/:managerId", async (req, res) => {
  try {
    const { managerId } = req.params;
    const { rows } = await pool.query(`
      SELECT me.employee_id 
      FROM manager_employees me
      JOIN users u ON u.id = me.employee_id
      WHERE me.manager_id = $1 AND u.deleted_at IS NULL AND u.status = 'active'
    `, [managerId]);
    res.json(rows.map(r => r.employee_id));
  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
});











app.delete("/api/admin/unassign-employee", async (req, res) => {
  try {
    const { managerId, employeeId, parentId, childId } = req.body;
    
    // Support both parameter naming conventions
    const finalManagerId = managerId || parentId;
    const finalEmployeeId = employeeId || childId;
    
    console.log("Unassign request received:", { managerId: finalManagerId, employeeId: finalEmployeeId });

    // First check if the assignment exists
    const checkResult = await pool.query(
      "SELECT * FROM manager_employees WHERE manager_id = $1 AND employee_id = $2",
      [finalManagerId, finalEmployeeId]
    );
    
    console.log("Existing assignment check:", checkResult.rows);

    if (checkResult.rows.length === 0) {
      console.log("No assignment found to delete");
      return res.status(404).json({ error: "Assignment not found" });
    }

    const deleteResult = await pool.query(
      "DELETE FROM manager_employees WHERE manager_id = $1 AND employee_id = $2",
      [finalManagerId, finalEmployeeId]
    );

    console.log("Delete result:", deleteResult);

    res.json({ success: true, deleted: deleteResult.rowCount });
  } catch (err) {
    console.error("Unassign error:", err);
    res.status(500).json({ error: "Unassign failed" });
  }
});

// ----------------- Admin Notifications -----------------
app.get("/api/admin/notifications", async (req, res) => {
  try {
    const adminId = parseInt(req.headers["x-admin-id"]);
    if (!adminId) return res.status(403).json({ error: "Unauthorized" });

    // Validate admin
    const adminCheck = await pool.query(
      "SELECT role FROM users WHERE id = $1 AND deleted_at IS NULL",
      [adminId]
    );
    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Get notifications ordered by newest first
    const notificationsResult = await pool.query(
      `SELECT id, message, is_read, created_at, type 
       FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [adminId]
    );

    res.json({
      notifications: notificationsResult.rows,
      unreadCount: notificationsResult.rows.filter(n => !n.is_read).length
    });

  } catch (err) {
    console.error("Get notifications error:", err);
    res.status(500).json({ error: "Failed to get notifications" });
  }
});

app.post("/api/admin/notifications/read", async (req, res) => {
  try {
    const adminId = parseInt(req.headers["x-admin-id"]);
    if (!adminId) return res.status(403).json({ error: "Unauthorized" });

    // Validate admin
    const adminCheck = await pool.query(
      "SELECT role FROM users WHERE id = $1 AND deleted_at IS NULL",
      [adminId]
    );
    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Mark all notifications for this admin as read
    const result = await pool.query(
      `UPDATE notifications 
       SET is_read = true 
       WHERE user_id = $1 AND is_read = false`,
      [adminId]
    );

    res.json({ 
      success: true, 
      markedAsRead: result.rowCount 
    });

  } catch (err) {
    console.error("Mark notifications read error:", err);
    res.status(500).json({ error: "Failed to mark notifications as read" });
  }
});
// Start server in non-production; also export app for tests
const PORT = process.env.PORT || 3001;
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => console.log(`🚀 Running locally on http://localhost:${PORT}`));
}


module.exports = app;
// ... (rest of the code remains the same)