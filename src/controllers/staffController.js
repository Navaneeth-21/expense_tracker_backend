// src/controllers/staffController.js
const pool = require('../config/db');

// Helper function to calculate the number of days between two dates
const calculateDaysBetween = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Convert milliseconds to days
};

// Helper function to calculate active days in a given month
const calculateActiveDaysInMonth = async (staffId, year, month) => {
  // Get the start and end of the month
  const startOfMonth = new Date(year, month - 1, 1); // month is 1-based, Date is 0-based
  const endOfMonth = new Date(year, month, 0); // Last day of the month
  const totalDaysInMonth = endOfMonth.getDate();

  // Fetch status changes for the staff member
  const query = `
    SELECT status, change_date
    FROM staff_status_log
    WHERE staff_id = $1
      AND change_date <= $2
    ORDER BY change_date ASC;
  `;
  const { rows } = await pool.query(query, [staffId, endOfMonth]);

  // If no status changes, check the staff's initial status
  if (rows.length === 0) {
    const staffQuery = `
      SELECT status, created_at
      FROM staff
      WHERE staff_id = $1;
    `;
    const staffResult = await pool.query(staffQuery, [staffId]);
    if (staffResult.rows.length === 0) return 0;

    const { status, created_at } = staffResult.rows[0];
    if (new Date(created_at) > endOfMonth) return 0; // Staff wasn't created yet
    return status === 'active' ? totalDaysInMonth : 0;
  }

  let activeDays = 0;
  let currentStatus = rows[0].status;
  let lastChangeDate = new Date(rows[0].change_date);

  // If the staff was created before the start of the month, use the first status
  const staffQuery = `
    SELECT created_at
    FROM staff
    WHERE staff_id = $1;
  `;
  const staffResult = await pool.query(staffQuery, [staffId]);
  const createdAt = new Date(staffResult.rows[0].created_at);

  if (createdAt < startOfMonth) {
    if (currentStatus === 'active') {
      activeDays += calculateDaysBetween(startOfMonth, lastChangeDate);
    }
  } else {
    lastChangeDate = createdAt; // Start counting from created_at
  }

  // Iterate through status changes
  for (let i = 1; i < rows.length; i++) {
    const changeDate = new Date(rows[i].change_date);
    if (changeDate < startOfMonth) {
      currentStatus = rows[i].status;
      lastChangeDate = changeDate;
      continue;
    }
    if (changeDate > endOfMonth) break;

    if (currentStatus === 'active') {
      activeDays += calculateDaysBetween(lastChangeDate, changeDate);
    }
    currentStatus = rows[i].status;
    lastChangeDate = changeDate;
  }

  // Handle the period from the last change to the end of the month
  if (currentStatus === 'active') {
    const endDate = endOfMonth < new Date() ? endOfMonth : new Date();
    activeDays += calculateDaysBetween(lastChangeDate, endDate);
  }

  return Math.min(activeDays, totalDaysInMonth); // Cap at total days in the month
};

// Helper function to calculate performance for a given month
const calculatePerformance = async (staffId, year, month) => {
  const totalDaysInMonth = new Date(year, month, 0).getDate();
  const activeDays = await calculateActiveDaysInMonth(staffId, year, month);

  if (totalDaysInMonth === 0) return 0;
  const performance = (activeDays / totalDaysInMonth) * 100;
  return Math.round(performance); // Round to nearest integer
};

// Fetch all staff members for the authenticated user
const fetchAllStaff = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const currentDate = new Date(); // Current date (April 12, 2025)
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1; // 1-based month

    const query = `
      SELECT 
        staff_id,
        user_id,
        name,
        role,
        status,
        performance,
        transactions,
        last_active,
        recent_activity,
        email,
        phone,
        created_at
      FROM staff
      WHERE user_id = $1
      ORDER BY created_at DESC;
    `;
    const { rows } = await pool.query(query, [userId]);

    // Calculate performance for each staff member for the current month
    const updatedRows = await Promise.all(
      rows.map(async (staff) => {
        const performance = await calculatePerformance(staff.staff_id, year, month);

        // Update the performance in the database
        const updateQuery = `
          UPDATE staff
          SET performance = $1
          WHERE staff_id = $2
          RETURNING performance;
        `;
        await pool.query(updateQuery, [performance, staff.staff_id]);

        return { ...staff, performance };
      })
    );

    res.json(updatedRows);
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Add a new staff member
const addStaff = async (req, res) => {
  const { name, role, email, phone } = req.body;
  const userId = req.user.user_id;

  if (!name || !role || !email || !phone) {
    return res.status(400).json({ error: 'All fields (name, role, email, phone) are required' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  if (!/^\d{10}$/.test(phone)) {
    return res.status(400).json({ error: 'Phone must be a 10-digit number' });
  }

  try {
    const query = `
      INSERT INTO staff (user_id, name, role, email, phone, transactions, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING 
        staff_id,
        user_id,
        name,
        role,
        status,
        performance,
        transactions,
        last_active,
        recent_activity,
        email,
        phone,
        created_at;
    `;
    const values = [userId, name, role, email, phone, 0, 'active'];
    const { rows } = await pool.query(query, values);
    const newStaff = rows[0];

    // Log the initial status in staff_status_log
    const logQuery = `
      INSERT INTO staff_status_log (staff_id, status, change_date)
      VALUES ($1, $2, $3);
    `;
    await pool.query(logQuery, [newStaff.staff_id, 'active', newStaff.created_at]);

    // Calculate initial performance for the current month
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const performance = await calculatePerformance(newStaff.staff_id, year, month);

    // Update the performance in the database
    const updateQuery = `
      UPDATE staff
      SET performance = $1
      WHERE staff_id = $2
      RETURNING performance;
    `;
    await pool.query(updateQuery, [performance, newStaff.staff_id]);

    res.status(201).json({ staff: { ...newStaff, performance }, message: 'Staff member added successfully' });
  } catch (error) {
    console.error('Error adding staff:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update status for a staff member
const updateStaffStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user.user_id;

  if (!['active', 'inactive'].includes(status)) {
    return res.status(400).json({ error: 'Status must be "active" or "inactive"' });
  }

  try {
    // Update the status in the staff table
    const updateQuery = `
      UPDATE staff
      SET status = $1
      WHERE staff_id = $2 AND user_id = $3
      RETURNING staff_id, status;
    `;
    const updateResult = await pool.query(updateQuery, [status, id, userId]);

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Staff member not found or not authorized' });
    }

    // Log the status change in staff_status_log
    const logQuery = `
      INSERT INTO staff_status_log (staff_id, status)
      VALUES ($1, $2);
    `;
    await pool.query(logQuery, [id, status]);

    // Recalculate performance for the current month
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const performance = await calculatePerformance(id, year, month);

    // Update the performance in the database
    const performanceQuery = `
      UPDATE staff
      SET performance = $1
      WHERE staff_id = $2
      RETURNING performance;
    `;
    const performanceResult = await pool.query(performanceQuery, [performance, id]);

    res.json({
      message: 'Status and performance updated successfully',
      staff: {
        staff_id: id,
        status,
        performance: performanceResult.rows[0].performance,
      },
    });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update transactions for a staff member
const updateStaffTransactions = async (req, res) => {
  const { id } = req.params;
  const { transactions } = req.body;
  const userId = req.user.user_id;

  if (typeof transactions !== 'number' || transactions < 0) {
    return res.status(400).json({ error: 'Transactions must be a non-negative number' });
  }

  try {
    // Update transactions
    const updateQuery = `
      UPDATE staff
      SET transactions = $1
      WHERE staff_id = $2 AND user_id = $3
      RETURNING staff_id, transactions;
    `;
    const updateResult = await pool.query(updateQuery, [transactions, id, userId]);

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Staff member not found or not authorized' });
    }

    // Recalculate performance for the current month
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const performance = await calculatePerformance(id, year, month);

    // Update the performance in the database
    const performanceQuery = `
      UPDATE staff
      SET performance = $1
      WHERE staff_id = $2
      RETURNING performance;
    `;
    const performanceResult = await pool.query(performanceQuery, [performance, id]);

    res.json({
      message: 'Transactions and performance updated successfully',
      staff: {
        staff_id: id,
        transactions,
        performance: performanceResult.rows[0].performance,
      },
    });
  } catch (error) {
    console.error('Error updating transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Remove a staff member
const removeStaff = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.user_id;

  try {
    const query = `
      DELETE FROM staff
      WHERE staff_id = $1 AND user_id = $2
      RETURNING staff_id;
    `;
    const { rows } = await pool.query(query, [id, userId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Staff member not found or not authorized' });
    }
    res.json({ message: 'Staff member removed successfully' });
  } catch (error) {
    console.error('Error removing staff:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Export all functions
module.exports = { fetchAllStaff, addStaff, updateStaffStatus, updateStaffTransactions, removeStaff };