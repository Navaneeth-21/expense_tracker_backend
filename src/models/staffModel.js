// src/models/staffModel.js
const db = require("../config/db");

// Fetch all staff members for the authenticated user
const getAllStaff = async (userId) => {
  const query = `SELECT * FROM staff WHERE user_id = $1 ORDER BY created_at DESC`;
  const values = [userId];
  try {
    const result = await db.query(query, values);
    return result.rows;
  } catch (error) {
    console.error("Error fetching staff members:", error);
    throw new Error("Failed to fetch staff members");
  }
};

// Add a new staff member with user_id
const addStaff = async (userId, name, role, email, phone) => {
  const query = `
    INSERT INTO staff (user_id, name, role, email, phone)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *`;
  const values = [userId, name, role, email, phone];
  try {
    const result = await db.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error("Error adding staff member:", error);
    throw error; // Let controller handle specific errors
  }
};

// Remove a staff member (restrict to user's staff)
const removeStaff = async (userId, id) => {
  const query = `DELETE FROM staff WHERE staff_id = $1 AND user_id = $2 RETURNING *`;
  const values = [id, userId];
  try {
    const result = await db.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error("Error removing staff member:", error);
    throw new Error("Failed to remove staff member");
  }
};

// Keep getStaffDataById as is if it’s used elsewhere
const getStaffDataById = async (staffId) => {
  const query = `SELECT * FROM staff_data WHERE staff_id = $1 ORDER BY created_at DESC`;
  const values = [staffId];
  try {
    const result = await db.query(query, values);
    return result.rows;
  } catch (error) {
    console.error("Error fetching staff data by staff ID:", error);
    throw new Error("Failed to fetch staff data");
  }
};

module.exports = { getStaffDataById, getAllStaff, addStaff, removeStaff };