// src/routes/expenseRoutes.js
const express = require('express');
const { addExpense, getExpenses } = require('../controllers/expenseController');
const authenticateToken = require('../middlewares/auth');

const router = express.Router();
router.post('/add', authenticateToken, addExpense);
router.get('/', authenticateToken, getExpenses);

module.exports = router;