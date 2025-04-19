// src/controllers/expenseController.js
const { createExpense, getExpensesByUser } = require('../models/expenseModel');
const pool = require('../config/db');

exports.addExpense = async (req, res) => {
  const { category_id, amount, description, expense_date } = req.body;
  const user_id = req.user.user_id;
  try {
    if (!category_id) return res.status(400).json({ error: 'Category ID is required' });
    // Optional: Verify category_id exists
    const categoryCheck = await pool.query('SELECT 1 FROM categories WHERE category_id = $1', [category_id]);
    if (categoryCheck.rowCount === 0) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }
    const newExpense = await createExpense({ user_id, category_id, amount, description, expense_date });
    res.status(201).json(newExpense);
  } catch (error) {
    console.error('Error adding expense:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getExpenses = async (req, res) => {
  try {
    const expenses = await getExpensesByUser(req.user.user_id);
    res.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};