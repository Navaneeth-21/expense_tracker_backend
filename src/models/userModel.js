const pool = require('../config/db');

const findByEmail = async (email) => {
  const query = `
    SELECT user_id, name, email, password_hash, accept_terms, created_at, role
    FROM users
    WHERE email = $1;
  `;
  const values = [email];
  const result = await pool.query(query, values);
  return result.rows[0] || null;
};

const createUser = async (userData) => {
  const { name, email, password_hash, accept_terms, role } = userData;
  const query = `
    INSERT INTO users (name, email, password_hash, accept_terms, role, created_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    RETURNING user_id, name, email, password_hash, accept_terms, role, created_at;
  `;
  const values = [name, email, password_hash, accept_terms, role || 'staff'];
  const result = await pool.query(query, values);
  return result.rows[0];
};

module.exports = { findByEmail, createUser };