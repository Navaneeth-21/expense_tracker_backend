// src/models/expenseModel.js
const pool = require('../config/db');

const createExpense = async ({ user_id, category_id, amount, description, expense_date }) => {
  const query = `
    INSERT INTO expenses (user_id, category_id, amount, description, expense_date)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;
  const values = [user_id, category_id, amount, description, expense_date];
  const { rows } = await pool.query(query, values);
  return rows[0];
};

const getExpensesByUser = async (userId) => {
  const query = `
    SELECT e.*, c.name AS category_name
    FROM expenses e
    JOIN categories c ON e.category_id = c.category_id
    WHERE e.user_id = $1
    ORDER BY e.expense_date DESC;
  `;
  const { rows } = await pool.query(query, [userId]);
  return rows;
};

module.exports = { createExpense, getExpensesByUser };