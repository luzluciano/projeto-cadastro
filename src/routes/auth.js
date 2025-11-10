const express = require('express');
const router = express.Router();
const { login, verifyToken } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Login
router.post('/login', login);

// Verificar token
router.get('/verify-token', authenticateToken, verifyToken);

module.exports = router;