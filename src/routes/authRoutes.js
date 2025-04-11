const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticateToken = require('../middlewares/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/validate-token', authenticateToken, authController.validateToken);

module.exports = router;