// src/models/userModel.js (unchanged)
const pool = require('../config/db');

class UserModel {
  static async createUser({ name, email, password_hash, accept_terms }) {
    const query = `
      INSERT INTO users (name, email, password_hash, accept_terms)
      VALUES ($1, $2, $3, $4)
      RETURNING user_id, name, email, created_at;
    `;
    const values = [name, email, password_hash, accept_terms];
    try {
      const { rows } = await pool.query(query, values);
      return rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async findByEmail(email) {
    const query = `
      SELECT user_id, name, email, password_hash, created_at
      FROM users
      WHERE email = $1;
    `;
    try {
      const { rows } = await pool.query(query, [email]);
      return rows[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = UserModel;