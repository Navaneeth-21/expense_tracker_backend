// src/routes/staffRoutes.js
const express = require('express');
const { fetchAllStaff, addStaff, removeStaff, updateStaffTransactions,updateStaffStatus  } = require('../controllers/staffController');
const authenticateToken = require('../middlewares/auth');

const router = express.Router();

router.get('/all', authenticateToken, fetchAllStaff);
router.post('/add', authenticateToken, addStaff);
router.delete('/:id', authenticateToken, removeStaff);
router.put('/:id/transactions', authenticateToken, updateStaffTransactions);
router.put('/:id/status', authenticateToken, updateStaffStatus);

module.exports = router;