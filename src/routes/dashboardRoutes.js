// src/routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const authenticateToken = require('../middlewares/auth');
const { 
  getFinancialOverview, 
  getRecentTransactions, 
  getExpenseCategories,
  getMonthlyAnalytics,
  getProperties
} = require('../controllers/dashboardController');

router.get('/financial-overview', authenticateToken, getFinancialOverview);
router.get('/recent-transactions', authenticateToken, getRecentTransactions);
router.get('/expense-categories', authenticateToken, getExpenseCategories);
router.get('/monthly-analytics', authenticateToken, getMonthlyAnalytics);
router.get('/properties', authenticateToken, getProperties); 

module.exports = router;