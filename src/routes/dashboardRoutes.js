// src/routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const authenticateToken = require('../middlewares/auth');
const { 
  getFinancialOverview, 
  getRecentTransactions, 
  getExpenseCategories 
} = require('../controllers/dashboardController');

router.get('/financial-overview', authenticateToken, getFinancialOverview);
router.get('/recent-transactions', authenticateToken, getRecentTransactions);
router.get('/expense-categories', authenticateToken, getExpenseCategories);

module.exports = router;